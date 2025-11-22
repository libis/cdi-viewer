// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

// === CDI Previewer: SHACL Validation Logic (using shacl-engine with SPARQL support) ===

import rdfDataModel from "@rdfjs/data-model";
import rdfDataset from "@rdfjs/dataset";
import Validator from "shacl-engine/Validator.js";
import { validations as sparqlValidations } from "shacl-engine/sparql.js";
import {
  getShaclShapesStore,
  getJsonData,
  setValidationReport,
} from "./state.js";
import { jsonLdToN3Store } from "./cdi-shacl-loader.js";

// RDF factory for creating RDF/JS compliant datasets
// Use rdfDataModel directly and add dataset method via Object.assign to preserve prototype
const rdf = Object.assign(
  Object.create(Object.getPrototypeOf(rdfDataModel)),
  rdfDataModel,
  {
    dataset: rdfDataset.dataset,
  }
);

// Track timeout for clearing status messages
let statusClearTimeout = null;

// Track debounced validation
let validationDebounceTimeout = null;
let isValidationRunning = false;

/**
 * Clears any pending status message timeout
 */
function clearStatusTimeout() {
  if (statusClearTimeout) {
    clearTimeout(statusClearTimeout);
    statusClearTimeout = null;
  }
}

/**
 * Sets a status message with optional auto-clear
 */
export function setValidationStatus(html, autoClearMs = 0) {
  clearStatusTimeout();
  $("#validation-status").html(html);

  if (autoClearMs > 0) {
    statusClearTimeout = setTimeout(() => {
      $("#validation-status").html("");
      statusClearTimeout = null;
    }, autoClearMs);
  }
}

/**
 * Convert N3 Store to RDF/JS Dataset
 */
function storeToDataset(store) {
  const dataset = rdf.dataset();
  store.getQuads(null, null, null, null).forEach((q) => {
    // N3.js quads are already RDF/JS compliant, can add directly
    dataset.add(q);
  });
  return dataset;
}

/**
 * Schedules validation with debouncing (3 seconds)
 * Ensures only one validation runs at a time
 */
export function scheduleValidation() {
  // Clear any pending debounce
  if (validationDebounceTimeout) {
    clearTimeout(validationDebounceTimeout);
  }

  // Schedule new validation
  validationDebounceTimeout = setTimeout(async () => {
    validationDebounceTimeout = null;

    // Wait if validation is already running
    if (isValidationRunning) {
      // Reschedule after current validation completes
      scheduleValidation();
      return;
    }

    await validateData();
  }, 3000);
}

/**
 * Validates the current JSON-LD data against loaded SHACL shapes.
 * Displays validation results in the UI.
 */
export async function validateData() {
  // Prevent parallel execution
  if (isValidationRunning) {
    return;
  }

  isValidationRunning = true;

  // Clear any pending timeout from previous messages (e.g., "Shapes loaded")
  clearStatusTimeout();

  $("#validation-status").html(
    '<span class="label label-info">Validating...</span>'
  );

  try {
    // Check if SHACL shapes are loaded
    const shaclShapesStore = getShaclShapesStore();
    if (!shaclShapesStore) {
      $("#validation-status").html(
        '<span class="label label-warning">No SHACL shapes loaded - cannot validate</span>'
      );
      $("#validation-details").html(
        '<div class="alert alert-info">Select SHACL shapes from the dropdown to enable validation.</div>'
      );
      return;
    }

    // Prepare shapes dataset from shaclShapesStore
    const shapesDataset = storeToDataset(shaclShapesStore);

    // Prepare data dataset: convert jsonData to N3 store, then to RDF/JS dataset
    const jsonData = getJsonData();
    const tempStore = await jsonLdToN3Store(jsonData);
    const dataDataset = storeToDataset(tempStore);

    // Create validator instance for the shapes in the dataset
    const validator = new Validator(shapesDataset, {
      factory: rdf,
      validations: sparqlValidations, // Enable SPARQL constraints
    });

    // Debug: Log what shapes and targets are loaded
    console.log("SHACL shapes loaded:", shapesDataset.size, "triples");
    console.log("Data to validate:", dataDataset.size, "triples");

    // Run the validation process
    const report = await validator.validate({ dataset: dataDataset });

    console.log("Validation report - conforms:", report.conforms);
    console.log("Validation report - results count:", report.results.length);

    setValidationReport(report);

    const violations = [];

    for (const result of report.results) {
      // Map SHACL result to our simple violation structure
      const focusNode =
        result.focusNode && result.focusNode.value
          ? result.focusNode.value
          : null;

      let path = null;
      if (result.path) {
        if (result.path.value) {
          // NamedNode path
          path = result.path.value.split("/").pop().split("#").pop();
        } else if (Array.isArray(result.path)) {
          // Fallback for complex paths: take last named node if available
          const lastSegment = result.path[result.path.length - 1];
          if (lastSegment && lastSegment.value) {
            path = lastSegment.value.split("/").pop().split("#").pop();
          }
        }
      }

      const message =
        Array.isArray(result.message) && result.message.length > 0
          ? result.message[0].value || String(result.message[0])
          : "SHACL constraint violation";

      violations.push({
        focusNode: focusNode || "unknown",
        path: path || "unknown",
        message,
        severity: result.severity ? result.severity.value : null,
      });
    }

    // Log violations to console for debugging
    if (violations.length > 0) {
      console.log("Validation violations:");
      violations.forEach((v, i) => {
        console.log(`  ${i + 1}. ${v.focusNode}`);
        console.log(`     Property: ${v.path}`);
        console.log(`     Message: ${v.message}`);
      });
    }

    // Update UI
    if (report.conforms) {
      $("#validation-status").html(
        '<span class="validation-badge valid">' +
          '<span class="glyphicon glyphicon-ok-circle"></span> Valid' +
          "</span>"
      );
      $("#validation-details").empty();
    } else {
      $("#validation-status").html(
        '<span class="validation-badge invalid">' +
          '<span class="glyphicon glyphicon-exclamation-sign"></span> ' +
          violations.length +
          " violation(s)" +
          "</span>" +
          '<button id="toggle-violations-btn" class="btn btn-sm btn-default" style="margin-left: 10px;">' +
          '<span class="glyphicon glyphicon-chevron-down"></span> Show Details' +
          "</button>"
      );

      // Show violations list (initially hidden)
      const $violationsContainer = $(
        '<div class="validation-violations" style="display: none;"><h4>Validation Violations:</h4><ol></ol></div>'
      );
      const $list = $violationsContainer.find("ol");

      violations.forEach((v) => {
        const nodeId = v.focusNode.split("/").pop();
        const $listItem = $("<li>");

        // Create clickable node ID button (matching reference button style)
        const $nodeBtn = $("<button>")
          .addClass("btn btn-sm btn-info reference-btn")
          .css({ marginRight: "8px" })
          .html(
            `<span class="glyphicon glyphicon-arrow-right"></span> ${nodeId}`
          )
          .attr("title", "Click to jump to this node")
          .click(function (e) {
            e.preventDefault();
            const targetCard = $(`.node-card[data-node-id="${nodeId}"]`);
            if (targetCard.length) {
              // Expand any collapsed parent cards
              targetCard.parents(".node-card").removeClass("collapsed");
              targetCard.removeClass("collapsed");
              targetCard[0].scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
              targetCard.addClass("highlight");
              setTimeout(() => targetCard.removeClass("highlight"), 2000);
            }
          });

        $listItem.append($nodeBtn);
        $listItem.append(`<span> - ${v.path}: ${v.message}</span>`);
        $list.append($listItem);
      });

      $("#validation-details").html($violationsContainer);

      // Add toggle handler
      $("#toggle-violations-btn").click(function () {
        const $details = $(".validation-violations");
        const $btn = $(this);
        const $icon = $btn.find(".glyphicon");

        if ($details.is(":visible")) {
          $details.slideUp(200);
          $icon
            .removeClass("glyphicon-chevron-up")
            .addClass("glyphicon-chevron-down");
          $btn.html(
            '<span class="glyphicon glyphicon-chevron-down"></span> Show Details'
          );
        } else {
          $details.slideDown(200);
          $icon
            .removeClass("glyphicon-chevron-down")
            .addClass("glyphicon-chevron-up");
          $btn.html(
            '<span class="glyphicon glyphicon-chevron-up"></span> Hide Details'
          );
        }
      });
    }

    // Update property rows with validation results
    updatePropertyValidation(violations);
  } catch (error) {
    console.error("Validation error:", error);

    let errorMsg = error.message;

    // Special handling for SPARQL constraint errors
    if (error.message.includes("SPARQLConstraintComponent")) {
      errorMsg =
        "The selected SHACL shapes contain SPARQL constraints, which are not supported in the browser. " +
        "Please use Core SHACL-compatible shapes (e.g., 'DDI-CDI 1.0 (Official)' or 'CDIF Discovery Core').";
    }

    $("#validation-status").html(
      '<span class="validation-badge invalid">Validation Error: ' +
        errorMsg +
        "</span>"
    );
    $("#validation-details").empty();
  } finally {
    // Always release the lock
    isValidationRunning = false;
  }
}

/**
 * Triggers immediate validation (for manual triggers like shape changes)
 */
export async function validateDataImmediate() {
  // Clear any pending debounce
  if (validationDebounceTimeout) {
    clearTimeout(validationDebounceTimeout);
    validationDebounceTimeout = null;
  }

  await validateData();
}

/**
 * Update property rows with validation results
 */
function updatePropertyValidation(violations) {
  // Clear previous validation states
  $(".property-row")
    .removeClass("invalid")
    .find(".validation-error-icon")
    .remove();

  $(".node-card").removeClass("invalid").find(".node-validation-icon").remove();

  // Initialize tooltips at the end
  const initTooltips = () => {
    $('[data-toggle="tooltip"]').tooltip();
  };

  // Group violations by node ID and path to consolidate messages
  const groupedViolations = new Map();
  violations.forEach((violation) => {
    const key = `${violation.focusNode}|${violation.path || "unknown"}`;
    if (!groupedViolations.has(key)) {
      groupedViolations.set(key, {
        focusNode: violation.focusNode,
        path: violation.path,
        messages: [],
      });
    }
    groupedViolations.get(key).messages.push(violation.message);
  });

  // Process each unique node/path combination
  groupedViolations.forEach((violation) => {
    const nodeId = violation.focusNode;
    const path = violation.path;

    // Extract fragment from full URI if present
    // HTML uses relative fragments (#Mass) while validation reports use full URIs (http://...#Mass)
    let nodeIdFragment = nodeId;
    if (nodeId && nodeId.includes("#")) {
      nodeIdFragment = "#" + nodeId.split("#").pop();
    }

    // Handle property-level violations (specific property path)
    if (nodeId && path && path !== "unknown") {
      const propertyRow = $(
        `.property-row[data-node-id="${nodeId}"][data-property="${path}"], .property-row[data-node-id="${nodeIdFragment}"][data-property="${path}"]`
      );

      if (propertyRow.length > 0) {
        propertyRow.addClass("invalid");

        // Add validation icon with consolidated messages
        const message =
          violation.messages.length > 0
            ? violation.messages.join("; ")
            : "Validation failed";
        const icon = $("<span>")
          .addClass(
            "glyphicon glyphicon-exclamation-sign validation-error-icon"
          )
          .attr(
            "data-testid",
            `validation-error-${path.replace(/[^a-zA-Z0-9]/g, "_")}`
          )
          .attr("title", message)
          .attr("data-toggle", "tooltip")
          .attr("data-placement", "top");

        const labelArea = propertyRow
          .find(".property-label, .property-path")
          .first();
        if (labelArea.length > 0) {
          labelArea.after(icon);
        } else {
          propertyRow.prepend(icon);
        }
      }
    }

    // Handle node-level violations (no specific property)
    if (nodeId && (!path || path === "unknown")) {
      const nodeCard = $(
        `.node-card[data-node-id="${nodeId}"], .node-card[data-node-id="${nodeIdFragment}"]`
      );

      if (nodeCard.length > 0) {
        nodeCard.addClass("invalid");

        // Add validation icon to node header with consolidated messages
        const message =
          violation.messages.length > 0
            ? violation.messages.join("; ")
            : "Node validation failed";
        const icon = $("<span>")
          .addClass("glyphicon glyphicon-exclamation-sign node-validation-icon")
          .attr(
            "data-testid",
            `node-validation-error-${nodeId.replace(/[^a-zA-Z0-9]/g, "_")}`
          )
          .attr("title", message)
          .attr("data-toggle", "tooltip")
          .attr("data-placement", "right")
          .css({
            color: "#dc3545",
            "margin-left": "10px",
            cursor: "help",
          });

        // Append icon after ALL type labels, not just the first one
        const nodeTypes = nodeCard.find(".node-type");
        if (nodeTypes.length > 0) {
          nodeTypes.last().after(icon);
        }
      }
    }
  });

  // Initialize tooltips
  setTimeout(initTooltips, 100);
}
