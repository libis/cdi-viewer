// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

// === CDI Previewer: Event Handlers ===
//
// Handles all user interactions: file loading, shape selection, edit mode, validation, etc.

import {
  setShapesUserSelected,
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
import { showAlert, showConfirm } from "./modal-dialogs.js";
import {
  normalizeToGraphFormat,
  migrateContextFormat,
} from "./cdi-json-ld-helpers.js";
import { loadShapes, maybeAutoSelectShapes } from "./cdi-shacl-loader.js";
import { renderData } from "./render.js";
import { validateDataImmediate, setValidationStatus } from "./validation.js";
import {
  collectChangesFromDOM,
  saveChanges,
  saveToDataverse,
  exportData,
} from "./data-extraction.js";
import { renderAddRootNodeComponent } from "./cdi-graph-helpers.js";
import { iconSpan, labelSpan } from "./render-utils.js";
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

        // Prefer shapes matching the loaded document (no-op when shapes
        // were chosen explicitly via ?shacl= or the dropdown).
        try {
          await maybeAutoSelectShapes(jsonData);
        } catch (autoError) {
          logWarn("Shape auto-selection failed:", autoError);
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
              await showAlert(
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

        const $loadedMsg = $("<div>")
          .addClass("alert alert-success")
          .css("margin-bottom", "10px");
        $loadedMsg.append($("<strong>").text("Loaded:"));
        $loadedMsg.append(document.createTextNode(" " + file.name));
        $("#content").prepend($loadedMsg);
      } catch (error) {
        logError("Error loading local file:", error);
        await showAlert("Failed to load file: " + error.message);
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
      $("#loadUrlValidationFeedback").empty();
      $("#confirmLoadBtn").prop("disabled", true);

      $("#loadDataverseModal").modal("show");
    });

  // URL validation for load modal
  $("#loadDataverseUrlInput").on("input", function () {
    const url = $(this).val().trim();
    const feedbackDiv = $("#loadUrlValidationFeedback");

    if (!url) {
      feedbackDiv.empty();
      $("#confirmLoadBtn").prop("disabled", true);
      return;
    }

    const parseResult = parseDataverseUrl(url);

    if (parseResult.valid && parseResult.type === "replace") {
      feedbackDiv.empty();
      const $okSpan = $("<span>").css("color", "#5cb85c");
      $okSpan.append($("<span>").addClass("glyphicon glyphicon-ok"));
      $okSpan.append(document.createTextNode(" Valid file URL"));
      feedbackDiv.append($okSpan);
      $("#confirmLoadBtn").prop("disabled", false);
    } else if (parseResult.valid && parseResult.type === "add") {
      feedbackDiv.empty();
      const $addSpan = $("<span>").css("color", "#d9534f");
      $addSpan.append($("<span>").addClass("glyphicon glyphicon-remove"));
      $addSpan.append(
        document.createTextNode(
          " This is a dataset URL. Please provide a file URL."
        )
      );
      feedbackDiv.append($addSpan);
      $("#confirmLoadBtn").prop("disabled", true);
    } else {
      feedbackDiv.empty();
      const $errSpan = $("<span>").css("color", "#d9534f");
      $errSpan.append($("<span>").addClass("glyphicon glyphicon-remove"));
      $errSpan.append(document.createTextNode(" " + parseResult.error));
      feedbackDiv.append($errSpan);
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
        await showAlert("Please enter a file URL.");
        return;
      }

      const parseResult = parseDataverseUrl(url);
      if (!parseResult.valid || parseResult.type !== "replace") {
        await showAlert("Please enter a valid file URL.");
        return;
      }

      // Close modal and show loading
      $("#loadDataverseModal").modal("hide");

      try {
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

        // Prefer shapes matching the loaded document (no-op when shapes
        // were chosen explicitly via ?shacl= or the dropdown).
        try {
          await maybeAutoSelectShapes(jsonData);
        } catch (autoError) {
          logWarn("Shape auto-selection failed:", autoError);
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
              await showAlert(
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

        const $loadedFromDataverse = $("<div>")
          .addClass("alert alert-success")
          .css("margin-bottom", "10px");
        $loadedFromDataverse.append(
          $("<strong>").text("Loaded from Dataverse:")
        );
        $loadedFromDataverse.append(document.createTextNode(" " + filename));
        $("#content").prepend($loadedFromDataverse);
      } catch (error) {
        logError("Error loading file from Dataverse:", error);
        await showAlert(
          "Error loading file from Dataverse:\n\n" +
            error.message +
            "\n\nPlease check:\n• The URL is correct\n• The file is published (or provide an API token)\n• The file is in JSON-LD format"
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
        .empty()
        .append(iconSpan("glyphicon glyphicon-eye-open"))
        .append(document.createTextNode(" View Mode"))
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
        .empty()
        .append(iconSpan("glyphicon glyphicon-edit"))
        .append(document.createTextNode(" Enable Editing"))
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
    setTimeout(async () => {
      const validationReport = getValidationReport();
      if (validationReport && !validationReport.conforms) {
        const confirmed = await showConfirm(
          "Your data has validation errors. Do you want to save anyway?"
        );
        if (!confirmed) {
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
      feedbackDiv.empty();
      updateSaveButtonState();
      return;
    }

    const parseResult = parseDataverseUrl(url);

    if (parseResult.valid) {
      const actionText =
        parseResult.type === "replace"
          ? "replace existing file"
          : "add new file to dataset";
      // Build safe DOM nodes instead of injecting an interpolated HTML string
      feedbackDiv.empty();
      const okSpan = $("<span>")
        .css("color", "#5cb85c")
        .append($("<span>").addClass("glyphicon glyphicon-ok"));
      okSpan.append(document.createTextNode(" Valid URL - will " + actionText));
      feedbackDiv.append(okSpan);
    } else {
      // Error message is user/server-derived; ensure we add it as text to avoid HTML injection
      feedbackDiv.empty();
      const errSpan = $("<span>").css("color", "#d9534f");
      errSpan.append($("<span>").addClass("glyphicon glyphicon-remove"));
      errSpan.append(document.createTextNode(" " + String(parseResult.error)));
      feedbackDiv.append(errSpan);
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
    // Manual choice: content-based auto-selection must not override it.
    setShapesUserSelected(true);

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

      $("#validation-status")
        .empty()
        .append(labelSpan("No shapes loaded - generic mode", "warning"));
      setTimeout(() => {
        $("#validation-status").empty();
      }, 2000);
      return;
    } else {
      // Hide custom URL input
      $("#custom-shape-url").hide().val("");

      // Load the selected shape
      try {
        $("#validation-status")
          .empty()
          .append(labelSpan("Loading shapes...", "info"));
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
          setValidationStatus(labelSpan("Shapes loaded", "success"), 0);
        }
      } catch (error) {
        logError("Error loading custom shape:", error);
        $("#validation-status")
          .empty()
          .append(
            $("<span>")
              .addClass("validation-badge invalid")
              .text("Shape load failed")
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
        await showAlert("Please enter a valid URL");
        return;
      }

      try {
        $("#validation-status")
          .empty()
          .append(labelSpan("Loading custom shapes...", "info"));
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
          setValidationStatus(labelSpan("Shapes loaded", "success"), 0);
        }
      } catch (error) {
        logError("Error loading custom shape:", error);
        $("#validation-status")
          .empty()
          .append(
            $("<span>")
              .addClass("validation-badge invalid")
              .text("Custom shape load failed")
          );
        await showAlert(
          `Failed to load custom SHACL shapes from:\n${customUrl}\n\nError: ${error.message}\n\nPlease check:\n• The URL is accessible\n• The file is valid Turtle (.ttl) format\n• CORS is enabled on the server`
        );
      }
    }
  });

  // Setup namespace management handlers
  setupNamespaceHandlers();
}
