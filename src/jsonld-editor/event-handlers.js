// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

// === CDI Previewer: Event Handlers ===
//
// Handles all user interactions: file loading, shape selection, edit mode, validation, etc.

import {
  LOG_LEVEL,
  log,
  logWarn,
  logError,
  setOriginalFileName,
  setJsonData,
  setOriginalData,
  setExpandedJsonLd,
  getJsonData,
  getIsEditMode,
  setIsEditMode,
  getShaclShapesStore,
  setShaclShapesStore,
  setShaclShapes,
  setDefaultTypeNamespace,
  getValidationReport,
  setFileId,
  setSiteUrl,
  getChangedElementsCount,
  getIsEmbeddedMode,
} from "./state.js";
import {
  normalizeToGraphFormat,
  migrateContextFormat,
} from "./cdi-json-ld-helpers.js";
import { loadShapes } from "./cdi-shacl-loader.js";
import { renderData } from "./render.js";
import { validateDataImmediate, setValidationStatus } from "./validation.js";
import {
  collectChangesFromDOM,
  saveChanges,
  saveToDataverse,
  exportData,
} from "./data-extraction.js";
import { renderAddRootNodeComponent } from "./cdi-graph-helpers.js";
import { parseDataverseUrl } from "./dataverse-url-parser.js";
import {
  setupNamespaceHandlers,
  updateNamespaceSectionVisibility,
} from "./namespace-manager.js";
import {
  setupAdvancedSearchHandlers,
  performSearch,
} from "./advanced-search.js";

export function setupEventHandlers() {
  // Load local file button
  $("#load-local-btn")
    .off("click")
    .click(function () {
      $("#local-file-input").click();
    });

  $("#local-file-input")
    .off("change")
    .on("change", async function (event) {
      const file = event.target.files && event.target.files[0];
      if (!file) {
        return;
      }

      try {
        const fileText = await file.text();
        const parsedData = JSON.parse(fileText);

        // Set filename for export
        setOriginalFileName(file.name);

        // Normalize to @graph format
        const normalizedData = await normalizeToGraphFormat(parsedData);
        setJsonData(normalizedData);

        // Migrate @context if needed (fix old @vocab issue)
        let jsonData = migrateContextFormat(getJsonData());
        setJsonData(jsonData);

        jsonData = getJsonData();
        if (!jsonData["@graph"]) {
          throw new Error("Failed to normalize JSON-LD structure.");
        }

        setOriginalData(JSON.parse(JSON.stringify(jsonData)));

        // Expand JSON-LD
        try {
          const expanded = await jsonld.expand(jsonData);
          setExpandedJsonLd(expanded);
        } catch (expandError) {
          logWarn("Could not expand JSON-LD:", expandError);
          setExpandedJsonLd(null);
        }

        // Load SHACL shapes if not already loaded
        if (!getShaclShapesStore()) {
          const selectedShape = $("#shape-selector").val();
          if (selectedShape) {
            try {
              await loadShapes(selectedShape);
              log(LOG_LEVEL.INFO, "SHACL shapes loaded for validation");
            } catch (shapeError) {
              logError("Failed to load SHACL shapes:", shapeError);
              alert(
                "Warning: Failed to load SHACL shapes. Continuing in generic mode.\n\n" +
                  shapeError.message
              );
            }
          } else {
            log(
              LOG_LEVEL.INFO,
              "No SHACL shapes selected - rendering in generic JSON-LD mode"
            );
          }
        }

        // Render the data (always, even without shapes)
        renderData();

        // Update namespace section visibility
        updateNamespaceSectionVisibility();

        // Trigger validation if shapes are loaded
        if (getShaclShapesStore()) {
          await validateDataImmediate();
        }

        // Update save button visibility (for standalone mode)
        if (typeof window.updateSaveButtonVisibility === "function") {
          window.updateSaveButtonVisibility();
        }

        $("#content").prepend(`
                        <div class="alert alert-success" style="margin-bottom: 10px;">
                            <strong>Loaded:</strong> ${file.name}
                        </div>
                    `);
      } catch (error) {
        logError("Error loading local file:", error);
        alert("Failed to load file: " + error.message);
      }

      // Reset input so same file can be selected again
      $(this).val("");
    });

  // Load from Dataverse button
  $("#load-dataverse-btn")
    .off("click")
    .click(function () {
      // Clear previous inputs
      $("#loadDataverseUrlInput").val("");
      $("#loadApiTokenInput").val("");
      $("#loadUrlValidationFeedback").html("");
      $("#confirmLoadBtn").prop("disabled", true);

      $("#loadDataverseModal").modal("show");
    });

  // URL validation for load modal
  $("#loadDataverseUrlInput").on("input", function () {
    const url = $(this).val().trim();
    const feedbackDiv = $("#loadUrlValidationFeedback");

    if (!url) {
      feedbackDiv.html("");
      $("#confirmLoadBtn").prop("disabled", true);
      return;
    }

    const parseResult = parseDataverseUrl(url);

    if (parseResult.valid && parseResult.type === "replace") {
      feedbackDiv.html(
        '<span style="color: #5cb85c;"><span class="glyphicon glyphicon-ok"></span> Valid file URL</span>'
      );
      $("#confirmLoadBtn").prop("disabled", false);
    } else if (parseResult.valid && parseResult.type === "add") {
      feedbackDiv.html(
        '<span style="color: #d9534f;"><span class="glyphicon glyphicon-remove"></span> This is a dataset URL. Please provide a file URL.</span>'
      );
      $("#confirmLoadBtn").prop("disabled", true);
    } else {
      feedbackDiv.html(
        `<span style="color: #d9534f;"><span class="glyphicon glyphicon-remove"></span> ${parseResult.error}</span>`
      );
      $("#confirmLoadBtn").prop("disabled", true);
    }
  });

  // Confirm load from Dataverse
  $("#confirmLoadBtn")
    .off("click")
    .click(async function () {
      const url = $("#loadDataverseUrlInput").val().trim();
      const apiToken = $("#loadApiTokenInput").val().trim();

      if (!url) {
        alert("Please enter a file URL.");
        return;
      }

      const parseResult = parseDataverseUrl(url);
      if (!parseResult.valid || parseResult.type !== "replace") {
        alert("Please enter a valid file URL.");
        return;
      }

      // Close modal and show loading
      $("#loadDataverseModal").modal("hide");

      try {
        // Show loading indicator
        $("body").append(
          '<div id="loading-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;"><div style="background: white; padding: 20px; border-radius: 5px;"><span class="glyphicon glyphicon-refresh spinning"></span> Loading file from Dataverse...</div></div>'
        );

        // Construct download URL
        const downloadUrl = `${parseResult.serverUrl}/api/access/datafile/${parseResult.fileId}`;

        // Build fetch options
        const fetchOptions = {
          method: "GET",
          headers: {},
        };

        if (apiToken) {
          fetchOptions.headers["X-Dataverse-key"] = apiToken;
        }

        // Fetch the file
        const response = await fetch(downloadUrl, fetchOptions);

        if (!response.ok) {
          throw new Error(
            `Failed to download file: ${response.status} ${response.statusText}`
          );
        }

        const fileText = await response.text();
        const parsedData = JSON.parse(fileText);

        // Try to get the original filename from file metadata API
        let filename = "dataverse-file.jsonld";
        try {
          const metadataUrl = `${parseResult.serverUrl}/api/files/${parseResult.fileId}`;
          const metadataFetchOptions = {
            method: "GET",
            headers: {},
          };
          if (apiToken) {
            metadataFetchOptions.headers["X-Dataverse-key"] = apiToken;
          }

          const metadataResponse = await fetch(
            metadataUrl,
            metadataFetchOptions
          );
          if (metadataResponse.ok) {
            const metadata = await metadataResponse.json();
            if (
              metadata.data &&
              metadata.data.dataFile &&
              metadata.data.dataFile.filename
            ) {
              filename = metadata.data.dataFile.filename;
            }
          }
        } catch (e) {
          logWarn("Could not fetch filename from metadata, using default:", e);
        }

        // Set filename and IDs for export and future saves
        setOriginalFileName(filename);
        setFileId(parseResult.fileId);
        setSiteUrl(parseResult.serverUrl);

        // Normalize to @graph format
        const normalizedData = await normalizeToGraphFormat(parsedData);
        setJsonData(normalizedData);

        // Migrate @context if needed (fix old @vocab issue)
        let jsonData = migrateContextFormat(getJsonData());
        setJsonData(jsonData);

        jsonData = getJsonData();
        if (!jsonData["@graph"]) {
          throw new Error("Failed to normalize JSON-LD structure.");
        }

        setOriginalData(JSON.parse(JSON.stringify(jsonData)));

        // Expand JSON-LD
        try {
          const expanded = await jsonld.expand(jsonData);
          setExpandedJsonLd(expanded);
        } catch (expandError) {
          logWarn("Could not expand JSON-LD:", expandError);
          setExpandedJsonLd(null);
        }

        // Load SHACL shapes if not already loaded
        if (!getShaclShapesStore()) {
          const selectedShape = $("#shape-selector").val();
          if (selectedShape) {
            try {
              await loadShapes(selectedShape);
              log(LOG_LEVEL.INFO, "SHACL shapes loaded for validation");
            } catch (shapeError) {
              logError("Failed to load SHACL shapes:", shapeError);
              alert(
                "Warning: Failed to load SHACL shapes. Continuing in generic mode.\\n\\n" +
                  shapeError.message
              );
            }
          }
        }

        // Render the data
        renderData();

        // Update namespace section visibility
        updateNamespaceSectionVisibility();

        // Update save button visibility (for standalone mode)
        if (typeof window.updateSaveButtonVisibility === "function") {
          window.updateSaveButtonVisibility();
        }

        $("#content").prepend(`
          <div class="alert alert-success" style="margin-bottom: 10px;">
            <strong>Loaded from Dataverse:</strong> ${filename}
          </div>
        `);
      } catch (error) {
        logError("Error loading file from Dataverse:", error);
        alert(
          "Error loading file from Dataverse:\\n\\n" +
            error.message +
            "\\n\\nPlease check:\\n• The URL is correct\\n• The file is published (or provide an API token)\\n• The file is in JSON-LD format"
        );
      } finally {
        // Remove loading overlay
        $("#loading-overlay").remove();
      }
    });

  // Toggle edit mode
  $("#toggle-edit-btn").click(async function () {
    const currentEditMode = getIsEditMode();

    // Only collect changes when LEAVING edit mode (going to view mode)
    // Don't collect when entering edit mode from view mode (no inputs to collect from!)
    if (currentEditMode) {
      collectChangesFromDOM();
    }

    setIsEditMode(!currentEditMode);
    const isEditMode = getIsEditMode();

    if (isEditMode) {
      $(this)
        .html('<span class="glyphicon glyphicon-eye-open"></span> View Mode')
        .removeClass("btn-primary")
        .addClass("btn-warning");
      $("#add-root-node-container").removeClass("hidden");
      renderAddRootNodeComponent();
      $("#add-namespace-btn").removeClass("hidden");

      // Render first, then auto-validate
      renderData();

      // Auto-validate when entering edit mode
      await validateDataImmediate();
    } else {
      $(this)
        .html('<span class="glyphicon glyphicon-edit"></span> Enable Editing')
        .removeClass("btn-warning")
        .addClass("btn-primary");
      $("#add-root-node-container").addClass("hidden");
      $("#add-namespace-btn").addClass("hidden");

      renderData();
    }

    // Update save button visibility based on changes (in both modes)
    if (window.updateSaveButtonVisibility) {
      window.updateSaveButtonVisibility();
    }
    // Re-apply search highlights after re-rendering (use setTimeout to ensure DOM is ready)
    setTimeout(() => {
      performSearch();
    }, 0);
  });

  // Save changes
  $("#save-btn").click(async function () {
    // Validate before saving
    await validateDataImmediate();
    // Check if validation passed
    setTimeout(() => {
      const validationReport = getValidationReport();
      if (validationReport && !validationReport.conforms) {
        if (
          !confirm(
            "Your data has validation errors. Do you want to save anyway?"
          )
        ) {
          return;
        }
      }
      saveChanges();
    }, 500);
  });

  // Confirm save button in modal
  $("#confirmSaveBtn").click(function () {
    saveToDataverse();
  });

  // Allow Enter key in API token input to trigger save
  $("#apiTokenInput").keypress(function (e) {
    if (e.which === 13) {
      // Enter key
      e.preventDefault();
      saveToDataverse();
    }
  });

  // URL validation for standalone mode
  $("#dataverseUrlInput").on("input", function () {
    const url = $(this).val().trim();
    const feedbackDiv = $("#urlValidationFeedback");

    if (!url) {
      feedbackDiv.html("");
      updateSaveButtonState();
      return;
    }

    const parseResult = parseDataverseUrl(url);

    if (parseResult.valid) {
      const actionText =
        parseResult.type === "replace"
          ? "replace existing file"
          : "add new file to dataset";
      feedbackDiv.html(
        `<span style="color: #5cb85c;"><span class="glyphicon glyphicon-ok"></span> Valid URL - will ${actionText}</span>`
      );
    } else {
      feedbackDiv.html(
        `<span style="color: #d9534f;"><span class="glyphicon glyphicon-remove"></span> ${parseResult.error}</span>`
      );
    }

    updateSaveButtonState();
  });

  // API token validation
  $("#apiTokenInput").on("input", function () {
    updateSaveButtonState();
  });

  // Filename validation
  $("#filenameInput").on("input", function () {
    updateSaveButtonState();
  });

  // Function to update save button visibility based on changes
  // Export this so it can be called when changes are tracked
  window.updateSaveButtonVisibility = function updateSaveButtonVisibility() {
    const hasChanges = getChangedElementsCount() > 0;
    const isEmbedded = getIsEmbeddedMode();

    // Show save button if:
    // - In standalone mode (always), OR
    // - In embedded mode AND there are changes
    if (!isEmbedded || hasChanges) {
      $("#save-btn").removeClass("hidden");
    } else {
      $("#save-btn").addClass("hidden");
    }
  };

  // Function to update save button state
  function updateSaveButtonState() {
    const isStandalone = $("#dataverseUrlGroup").is(":visible");
    const apiToken = $("#apiTokenInput").val().trim();
    const filename = $("#filenameInput").val().trim();

    let isValid = apiToken && filename;

    if (isStandalone) {
      const url = $("#dataverseUrlInput").val().trim();
      const parseResult = parseDataverseUrl(url);
      isValid = isValid && parseResult.valid;
    }

    $("#confirmSaveBtn").prop("disabled", !isValid);
  }

  // Export
  $("#export-btn").click(function () {
    exportData();
  });

  // Collapse all
  $("#collapse-all-btn").click(function () {
    $(".node-card").addClass("collapsed");
  });

  // Expand all
  $("#expand-all-btn").click(function () {
    $(".node-card").removeClass("collapsed");
  });

  // Advanced Search - setup handlers
  setupAdvancedSearchHandlers();

  // Shape selector change handler
  $("#shape-selector").on("change", async function () {
    const selectedSource = $(this).val();

    if (selectedSource === "custom") {
      // Show custom URL input
      $("#custom-shape-url").show();
      return; // Wait for user to enter URL and press Enter
    } else if (selectedSource === "") {
      // Deselected - clear shapes and go to generic mode
      $("#custom-shape-url").hide().val("");
      setShaclShapesStore(null);
      setShaclShapes(null);
      setDefaultTypeNamespace(null);
      log(LOG_LEVEL.INFO, "SHACL shapes cleared - generic JSON-LD mode");

      // Re-render Add Root Node component (will show empty dropdown)
      if (getIsEditMode()) {
        renderAddRootNodeComponent();
      }

      // Re-render to remove shape classifications if data is loaded
      if (getJsonData()) {
        renderData();
      }

      $("#validation-status").html(
        '<span class="label label-warning">No shapes loaded - generic mode</span>'
      );
      setTimeout(() => {
        $("#validation-status").html("");
      }, 2000);
      return;
    } else {
      // Hide custom URL input
      $("#custom-shape-url").hide().val("");

      // Load the selected shape
      try {
        $("#validation-status").html(
          '<span class="label label-info">Loading shapes...</span>'
        );
        await loadShapes(selectedSource);

        // Re-render Add Root Node component with new node types
        if (getIsEditMode()) {
          renderAddRootNodeComponent();
        }

        // Re-render to apply new shape classifications if data is loaded
        if (getJsonData()) {
          renderData();
        }

        // Re-validate regardless of mode to show current validation status
        if (getJsonData() && getJsonData()["@graph"]) {
          await validateDataImmediate();
        } else {
          // No data loaded yet, just show shapes loaded message
          setValidationStatus(
            '<span class="label label-success">Shapes loaded</span>',
            0 // Don't auto-clear
          );
        }
      } catch (error) {
        logError("Error loading custom shape:", error);
        $("#validation-status").html(
          '<span class="validation-badge invalid">Shape load failed</span>'
        );
      }
    }
  });

  // Custom shape URL input handler
  $("#custom-shape-url").on("keypress", async function (e) {
    if (e.which === 13) {
      // Enter key
      e.preventDefault();
      const customUrl = $(this).val().trim();

      if (!customUrl) {
        alert("Please enter a valid URL");
        return;
      }

      try {
        $("#validation-status").html(
          '<span class="label label-info">Loading custom shapes...</span>'
        );
        await loadShapes("custom", customUrl);

        // Re-render Add Root Node component with new node types
        if (getIsEditMode()) {
          renderAddRootNodeComponent();
        }

        // Re-render to apply new shape classifications if data is loaded
        if (getJsonData()) {
          renderData();
        }

        // Re-validate regardless of mode to show current validation status
        if (getJsonData() && getJsonData()["@graph"]) {
          await validateDataImmediate();
        } else {
          // No data loaded yet, just show shapes loaded message
          setValidationStatus(
            '<span class="label label-success">Shapes loaded</span>',
            0 // Don't auto-clear
          );
        }
      } catch (error) {
        logError("Error loading custom shape:", error);
        $("#validation-status").html(
          '<span class="validation-badge invalid">Custom shape load failed</span>'
        );
        alert(
          `Failed to load custom SHACL shapes from:\n${customUrl}\n\nError: ${error.message}\n\nPlease check:\n• The URL is accessible\n• The file is valid Turtle (.ttl) format\n• CORS is enabled on the server`
        );
      }
    }
  });

  // Setup namespace management handlers
  setupNamespaceHandlers();
}
