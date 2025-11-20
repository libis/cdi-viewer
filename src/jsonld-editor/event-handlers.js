// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

// === CDI Previewer: Event Handlers ===
//
// Handles all user interactions: file loading, shape selection, edit mode, validation, etc.

import { 
  LOG_LEVEL,
  log,
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
  getValidationReport
} from './state.js';
import { normalizeToGraphFormat } from './cdi-json-ld-helpers.js';
import { loadShapes } from './cdi-shacl-loader.js';
import { renderData } from './render.js';
import { validateData } from './validation.js';
import { collectChangesFromDOM, saveChanges, saveToDataverse, exportData } from './data-extraction.js';
import { addRootNode } from './cdi-graph-helpers.js';
import { highlightText } from './render.js';

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
      if (!file) {return;}

      try {
        const fileText = await file.text();
        const parsedData = JSON.parse(fileText);

        // Set filename for export
        setOriginalFileName(file.name);

        // Normalize to @graph format
        const normalizedData = await normalizeToGraphFormat(parsedData);
        setJsonData(normalizedData);

        const jsonData = getJsonData();
        if (!jsonData["@graph"]) {
          throw new Error("Failed to normalize JSON-LD structure.");
        }

        setOriginalData(JSON.parse(JSON.stringify(jsonData)));

        // Expand JSON-LD
        try {
          const expanded = await jsonld.expand(jsonData);
          setExpandedJsonLd(expanded);
        } catch (expandError) {
          console.warn("Could not expand JSON-LD:", expandError);
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
              console.error("Failed to load SHACL shapes:", shapeError);
              alert("Warning: Failed to load SHACL shapes. Continuing in generic mode.\n\n" + shapeError.message);
            }
          } else {
            log(LOG_LEVEL.INFO, "No SHACL shapes selected - rendering in generic JSON-LD mode");
          }
        }

        // Render the data (always, even without shapes)
        renderData();

        $("#content").prepend(`
                        <div class="alert alert-success" style="margin-bottom: 10px;">
                            <strong>Loaded:</strong> ${file.name}
                        </div>
                    `);
      } catch (error) {
        console.error("Error loading local file:", error);
        alert("Failed to load file: " + error.message);
      }

      // Reset input so same file can be selected again
      $(this).val("");
    });

  // Toggle edit mode
  $("#toggle-edit-btn").click(function () {
    // Collect any changes before switching modes
    collectChangesFromDOM();
    
    const currentEditMode = getIsEditMode();
    setIsEditMode(!currentEditMode);
    const isEditMode = getIsEditMode();

    if (isEditMode) {
      $(this)
        .html('<span class="glyphicon glyphicon-eye-open"></span> View Mode')
        .removeClass("btn-primary")
        .addClass("btn-warning");
      $("#save-btn").removeClass("hidden");
      $("#add-root-node-btn").removeClass("hidden");

      // Auto-validate when entering edit mode
      validateData();
    } else {
      $(this)
        .html('<span class="glyphicon glyphicon-edit"></span> Enable Editing')
        .removeClass("btn-warning")
        .addClass("btn-primary");
      $("#save-btn").addClass("hidden");
      $("#add-root-node-btn").addClass("hidden");
    }

    renderData();
  });

  // Add Root Node
  $("#add-root-node-btn").click(function () {
    addRootNode();
  });

  // Save changes
  $("#save-btn").click(function () {
    // Validate before saving
    validateData();

    // Check if validation passed
    setTimeout(() => {
      const validationReport = getValidationReport();
      if (validationReport && !validationReport.conforms) {
        if (!confirm("Your data has validation errors. Do you want to save anyway?")) {
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

  // Validate
  $("#validate-btn").click(function () {
    validateData();
  });

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

  // Toggle SHACL-only filter
  $("#filter-shacl-btn").click(function () {
    const btn = $(this);
    $("body").toggleClass("filter-shacl-only");

    if ($("body").hasClass("filter-shacl-only")) {
      btn.addClass("active");
      btn.html('<span class="glyphicon glyphicon-filter"></span> Show All');

      // Hide nodes that have no SHACL-defined properties visible
      $(".node-card").each(function () {
        const card = $(this);
        const visibleProps = card.find(
          ".property-row:not(.extra-field)"
        ).length;
        if (visibleProps === 0) {
          card.addClass("hidden-by-filter");
        }
      });
    } else {
      btn.removeClass("active");
      btn.html(
        '<span class="glyphicon glyphicon-filter"></span> Show SHACL Only'
      );

      // Show all nodes again
      $(".node-card").removeClass("hidden-by-filter");
    }
  });

  // Search functionality
  $("#search-input").on("input", function () {
    const searchTerm = $(this).val().toLowerCase();

    if (searchTerm === "") {
      // Show all
      $(".node-card").removeClass("hidden-by-search");
      $(".search-highlight").contents().unwrap();
    } else {
      // Filter nodes and properties
      $(".node-card").each(function () {
        const card = $(this);
        const nodeId = card.find(".node-id").text().toLowerCase();
        const nodeType = card.find(".node-type").text().toLowerCase();
        const propertyTexts = card
          .find(".property-label, .property-path, .value-display")
          .map(function () {
            return $(this).text().toLowerCase();
          })
          .get()
          .join(" ");

        const matches =
          nodeId.includes(searchTerm) ||
          nodeType.includes(searchTerm) ||
          propertyTexts.includes(searchTerm);

        if (matches) {
          card.removeClass("hidden-by-search").removeClass("collapsed");
          highlightText(card, searchTerm);
        } else {
          card.addClass("hidden-by-search");
        }
      });
    }
  });

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

        // Re-render to apply new shape classifications if data is loaded
        if (getJsonData()) {
          renderData();
        }

        // Re-validate if in edit mode
        if (getIsEditMode()) {
          validateData();
        } else {
          $("#validation-status").html(
            '<span class="label label-success">Shapes loaded</span>'
          );
          setTimeout(() => {
            $("#validation-status").html("");
          }, 2000);
        }
      } catch (error) {
        console.error("Error loading shape:", error);
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

        // Re-render to apply new shape classifications if data is loaded
        if (getJsonData()) {
          renderData();
        }

        // Re-validate if in edit mode
        if (getIsEditMode()) {
          validateData();
        } else {
          $("#validation-status").html(
            '<span class="label label-success">Custom shapes loaded</span>'
          );
          setTimeout(() => {
            $("#validation-status").html("");
          }, 2000);
        }
      } catch (error) {
        console.error("Error loading custom shape:", error);
        $("#validation-status").html(
          '<span class="validation-badge invalid">Custom shape load failed</span>'
        );
        alert(
          `Failed to load custom SHACL shapes from:\n${customUrl}\n\nError: ${error.message}\n\nPlease check:\n• The URL is accessible\n• The file is valid Turtle (.ttl) format\n• CORS is enabled on the server`
        );
      }
    }
  });
}
