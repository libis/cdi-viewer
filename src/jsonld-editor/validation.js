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
 * Runs validation end-to-end on the current jsonData and updates #validation-status
 */
export async function validateData() {
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

    // Run the validation process
    const report = await validator.validate({ dataset: dataDataset });

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
      let detailsHtml =
        '<div class="validation-violations" style="display: none;"><h4>Validation Violations:</h4><ul>';
      violations.forEach((v) => {
        const nodeId = v.focusNode.split("/").pop();
        detailsHtml += `<li><strong>${nodeId}</strong> - ${v.path}: ${v.message}</li>`;
      });
      detailsHtml += "</ul></div>";
      $("#validation-details").html(detailsHtml);

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
  }
}

/**
 * Update property rows with validation results
 */
function updatePropertyValidation(violations) {
  // Clear previous validation states
  $(".property-row")
    .removeClass("invalid")
    .find(".validation-message")
    .remove();

  // Group violations by focus node and path
  violations.forEach((violation) => {
    if (violation.focusNode && violation.path) {
      const nodeId = violation.focusNode;
      const path = violation.path;

      // Find matching property row
      const propertyRow = $(
        `.property-row[data-node-id="${nodeId}"][data-property="${path}"]`
      );

      if (propertyRow.length > 0) {
        propertyRow.addClass("invalid");

        // Add validation message
        const message = violation.message || "Validation failed";
        const msgDiv = $("<div>").addClass("validation-message").text(message);
        propertyRow.append(msgDiv);
      }
    }
  });
}
