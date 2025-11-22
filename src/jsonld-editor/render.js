// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

// === CDI Previewer: Tree Rendering & Node/Property Display ===

import { getJsonData, getIsEditMode, getShaclShapesStore } from "./state.js";
import { classifyProperty } from "./cdi-shacl-helpers.js";
import { scheduleValidation } from "./validation.js";
import { updateSaveButton } from "./data-extraction.js";
import {
  getPropertySuggestions,
  createPropertySuggestionsSection,
} from "./property-suggestions.js";
import {
  convertPropertyToArray,
  convertPropertyToSingle,
  getAllNodesForReference,
  addReferenceToProperty,
  createAndReferenceNewNode,
} from "./cdi-graph-helpers.js";
import { showAlert, showConfirm } from "./modal-dialogs.js";

// Track which nodes have been rendered to avoid duplicates
const renderedNodes = new Set();

export function renderData() {
  const jsonData = getJsonData();

  console.log("🎨 RENDER START");

  const content = $("#content");
  content.empty();
  renderedNodes.clear(); // Reset for each render

  if (!jsonData || !jsonData["@graph"]) {
    content.html('<div class="alert alert-warning">No data to display</div>');
    return;
  }

  // Build tree structure: find which nodes are referenced by others
  const referencedIds = new Set();

  jsonData["@graph"].forEach((node) => {
    Object.keys(node).forEach((key) => {
      if (key !== "@id" && key !== "@type" && key !== "@context") {
        const value = node[key];
        const refs = extractNodeReferences(value);
        refs.forEach((ref) => referencedIds.add(ref));
      }
    });
  });

  // Root nodes are those not referenced by any other node
  // IMPORTANT: Blank nodes (_:xxx) should never be root nodes - they must always be referenced
  const rootNodes = jsonData["@graph"].filter(
    (n) => !referencedIds.has(n["@id"]) && !n["@id"].startsWith("_:")
  );

  // Render root nodes (they will recursively render their children)
  rootNodes.forEach((node, index) => {
    const nodeCard = renderNodeTree(node, index, 0);
    content.append(nodeCard);
  });
}

// Extract all @id references from a value (handles arrays, nested objects, and string references)
export function extractNodeReferences(value) {
  const refs = [];
  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (typeof item === "object" && item["@id"]) {
        refs.push(item["@id"]);
      } else if (typeof item === "string" && isNodeReference(item)) {
        refs.push(item);
      }
    });
  } else if (typeof value === "object" && value !== null && value["@id"]) {
    refs.push(value["@id"]);
  } else if (typeof value === "string" && isNodeReference(value)) {
    refs.push(value);
  }
  return refs;
}

// Check if a string value looks like a node reference
export function isNodeReference(str) {
  const jsonData = getJsonData();
  if (typeof str !== "string") {
    return false;
  }
  // Check if it starts with # or _: (common node ID patterns)
  if (str.startsWith("#") || str.startsWith("_:")) {
    // Verify this ID actually exists in the graph
    return jsonData["@graph"].some((n) => n["@id"] === str);
  }
  return false;
}

export function renderNodeTree(node, index, depth) {
  const isEditMode = getIsEditMode();
  const shaclShapesStore = getShaclShapesStore();

  const id = node["@id"] || `_:blank${index}`;
  const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];

  // Mark this node as rendered
  renderedNodes.add(id);

  // Only indent depth > 0 with a constant 8px (not cumulative since nodes are nested)
  const card = $("<div>")
    .addClass("node-card tree-node")
    .attr("data-node-id", id)
    .attr("data-testid", `node-card-${id.replace(/[^a-zA-Z0-9]/g, "_")}`);
  if (depth > 0) {
    card.css("margin-left", "8px");
  }

  // Header with collapse functionality
  const header = $("<div>")
    .addClass("node-header")
    .attr("data-testid", `node-header-${id.replace(/[^a-zA-Z0-9]/g, "_")}`);
  const leftSide = $("<div>")
    .css("display", "flex")
    .css("align-items", "center");
  leftSide.append(
    $("<span>")
      .addClass("glyphicon glyphicon-chevron-down collapse-icon")
      .css("margin-right", "10px")
  );
  leftSide.append(
    $("<span>")
      .addClass("node-id")
      .attr("data-testid", `node-id-${id.replace(/[^a-zA-Z0-9]/g, "_")}`)
      .text(id)
  );
  types.forEach((type, idx) => {
    if (type) {
      leftSide.append(
        $("<span>")
          .addClass("node-type")
          .attr("data-testid", `node-type-${idx}`)
          .text(type)
      );
    }
  });
  header.append(leftSide);

  // Add click handler to collapse/expand
  header.click(function () {
    card.toggleClass("collapsed");
  });

  card.append(header);

  // Body with properties
  const body = $("<div>")
    .addClass("node-body")
    .attr("data-testid", `node-body-${id.replace(/[^a-zA-Z0-9]/g, "_")}`);
  if (!isEditMode) {
    body.addClass("view-mode");
  }

  // Render all properties except @id and @type
  Object.keys(node).forEach((key) => {
    if (key !== "@id" && key !== "@type" && key !== "@context") {
      const propertyRow = renderPropertyTree(key, node[key], id, types, depth);
      body.append(propertyRow);
    }
  });

  card.append(body);

  // Add property suggestions in edit mode
  if (isEditMode && shaclShapesStore) {
    const suggestions = getPropertySuggestions(node, types);

    if (suggestions.length > 0) {
      const suggestionsSection = createPropertySuggestionsSection(
        suggestions,
        id,
        body
      );
      card.append(suggestionsSection);
    } else {
      // Even with no SHACL suggestions, allow adding custom properties using unified UI
      const suggestionsSection = createPropertySuggestionsSection(
        [], // No SHACL suggestions
        id
      );
      card.append(suggestionsSection);
    }
  }

  return card;
}

export function renderPropertyTree(key, value, nodeId, nodeTypes, depth) {
  const jsonData = getJsonData();
  const container = $("<div>");

  // First render the property itself
  const row = renderProperty(key, value, nodeId, nodeTypes);
  container.append(row);

  // Then check if this property references other nodes
  const refs = extractNodeReferences(value);
  if (refs.length > 0) {
    refs.forEach((refId) => {
      const refNode = jsonData["@graph"].find((n) => n["@id"] === refId);
      if (refNode) {
        // Only render inline if this node hasn't been rendered yet
        if (!renderedNodes.has(refId)) {
          const childCard = renderNodeTree(refNode, 0, depth + 1);
          container.append(childCard);
        } else {
          // Node already rendered elsewhere - show a reference link
          const refLink = $("<div>").addClass("node-reference-link").css({
            "margin-left": "8px",
            padding: "3px",
            "margin-bottom": "2px",
          });

          const jumpBtn = $("<button>")
            .addClass("btn btn-sm btn-default")
            .html(
              `<span class="glyphicon glyphicon-arrow-right"></span> → ${refId}`
            )
            .attr("title", "Click to jump to this node")
            .click(function (e) {
              e.preventDefault();
              const targetCard = $(`.node-card[data-node-id="${refId}"]`);
              if (targetCard.length) {
                targetCard.removeClass("collapsed");
                targetCard[0].scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
                targetCard.addClass("highlight");
                setTimeout(() => targetCard.removeClass("highlight"), 2000);
              }
            });

          refLink.append(jumpBtn);
          container.append(refLink);
        }
      }
    });
  }

  return container;
}

function renderProperty(key, value, nodeId, nodeTypes) {
  const row = $("<div>")
    .addClass("property-row")
    .attr("data-property", key)
    .attr("data-node-id", nodeId)
    .attr("data-testid", `property-${key.replace(/[^a-zA-Z0-9]/g, "_")}`);

  // Classify property using SHACL (pass nodeId for URI expansion)
  const classification = classifyProperty(nodeTypes || [], key, nodeId);

  // Apply CSS classes based on classification
  if (classification.isInShape) {
    row.addClass("shacl-defined");
  } else {
    row.addClass("extra-field");
  }

  if (classification.isRequired) {
    row.addClass("required");
  }

  // Add property badge
  const badge = $("<span>")
    .addClass("property-badge")
    .attr("data-testid", `badge-${key.replace(/[^a-zA-Z0-9]/g, "_")}`);
  if (classification.isRequired) {
    badge.addClass("required").text("REQUIRED");
  } else if (classification.isInShape) {
    badge.addClass("shacl-defined").text("SHACL");
  } else {
    badge.addClass("extra").text("EXTRA");
  }
  row.append(badge);

  // Add tooltip icon if there's a description
  if (classification.description) {
    const tooltip = $("<span>")
      .addClass("tooltip-icon glyphicon glyphicon-question-sign")
      .attr("title", classification.description)
      .css({ "margin-left": "5px", cursor: "help" });
    badge.after(tooltip);
  }

  // Label
  const label = $("<div>")
    .addClass("property-label")
    .attr("data-testid", "property-label")
    .text(humanizeKey(key));
  const path = $("<div>")
    .addClass("property-path")
    .attr("data-testid", "property-path")
    .text(key);
  row.append(label, path);

  // Value
  const valueContainer = $("<div>")
    .addClass("property-value")
    .attr("data-testid", "property-value");

  // Helper: render a nested object value using a small inline node card
  function renderInlineObject(val) {
    if (!val || typeof val !== "object" || Array.isArray(val)) {
      return null;
    }

    const inlineCard = $("<div>").addClass("node-card inline-node-card").css({
      "margin-top": "5px",
      "margin-bottom": "5px",
    });

    const header = $("<div>").addClass("node-header");
    const leftSide = $("<div>")
      .css("display", "flex")
      .css("align-items", "center");

    leftSide.append(
      $("<span>")
        .addClass("glyphicon glyphicon-chevron-down collapse-icon")
        .css("margin-right", "10px")
    );

    const nestedId = val["@id"];
    if (nestedId) {
      leftSide.append($("<span>").addClass("node-id").text(nestedId));
    }

    const nestedTypes = Array.isArray(val["@type"])
      ? val["@type"]
      : val["@type"]
        ? [val["@type"]]
        : [];
    nestedTypes.forEach((t) => {
      if (t) {
        leftSide.append($("<span>").addClass("node-type").text(t));
      }
    });

    header.append(leftSide);
    header.click(function () {
      inlineCard.toggleClass("collapsed");
    });

    inlineCard.append(header);

    const body = $("<div>").addClass("node-body");
    if (!isEditMode) {
      body.addClass("view-mode");
    }

    Object.keys(val).forEach((k) => {
      if (k === "@id" || k === "@type" || k === "@context") {
        return;
      }
      const nestedRow = renderProperty(
        k,
        val[k],
        nestedId || nodeId,
        nestedTypes
      );
      body.append(nestedRow);
    });

    inlineCard.append(body);
    return inlineCard;
  }

  if (Array.isArray(value)) {
    // Array of values
    value.forEach((val, idx) => {
      const valDiv = $("<div>").addClass("array-value");

      // Try to render nested objects (like schema:Role) as inline node cards
      const inlineCard = renderInlineObject(val);
      if (inlineCard) {
        valDiv.append(inlineCard);
      } else {
        valDiv.append(createValueInput(key, val, nodeId, idx, classification));
      }

      // Add delete button in edit mode
      if (isEditMode) {
        const deleteBtn = $("<button>")
          .addClass("btn btn-xs delete-btn")
          .attr("data-testid", `delete-array-value-btn-${idx}`)
          .html('<span class="glyphicon glyphicon-trash"></span>')
          .click(async function () {
            if (
              await showConfirm("Delete this value?", {
                title: "Delete Value",
                confirmText: "Delete",
              })
            ) {
              valDiv.remove();
              row.addClass("changed");
              updateSaveButton();
            }
          });
        valDiv.append(deleteBtn);
      }

      valueContainer.append(valDiv);
    });
    if (isEditMode) {
      const addBtn = $("<button>")
        .addClass("btn btn-sm btn-default add-value-btn")
        .attr(
          "data-testid",
          `add-value-btn-${key.replace(/[^a-zA-Z0-9]/g, "_")}`
        )
        .html('<span class="glyphicon glyphicon-plus"></span> Add Value')
        .click(function () {
          const newValDiv = $("<div>").addClass("array-value");
          newValDiv.append(
            createValueInput(key, "", nodeId, value.length, classification)
          );

          // Add delete button for the new value
          const deleteBtn = $("<button>")
            .addClass("btn btn-xs delete-btn")
            .html('<span class="glyphicon glyphicon-trash"></span>')
            .css({ "margin-left": "10px" })
            .click(function () {
              newValDiv.addClass("deleted").fadeOut(300, function () {
                $(this).remove();
              });
              updateSaveButton();
            });
          newValDiv.append(deleteBtn);

          $(this).before(newValDiv);
          updateSaveButton();
        });
      valueContainer.append(addBtn);

      // Add Reference/Object button for arrays
      const addRefBtn = $("<button>")
        .addClass("btn btn-sm btn-info add-reference-btn")
        .attr(
          "data-testid",
          `add-reference-btn-${key.replace(/[^a-zA-Z0-9]/g, "_")}`
        )
        .html(
          '<span class="glyphicon glyphicon-link"></span> Add Reference/Object'
        )
        .css({ "margin-left": "5px" })
        .click(function () {
          showAddReferenceModal(nodeId, key, true);
        });
      valueContainer.append(addRefBtn);
    }

    // Add "Convert to Single Value" button for arrays in edit mode
    if (isEditMode) {
      const convertBtn = $("<button>")
        .addClass("btn btn-xs btn-default convert-btn")
        .attr(
          "data-testid",
          `convert-to-single-btn-${key.replace(/[^a-zA-Z0-9]/g, "_")}`
        )
        .html(
          '<span class="glyphicon glyphicon-resize-small"></span> Convert to Single'
        )
        .css({ "margin-left": "10px" })
        .click(async function () {
          if (
            await showConfirm(
              "Convert this array to a single value? Only the first value will be kept.",
              { title: "Convert to Single", confirmText: "Convert" }
            )
          ) {
            convertPropertyToSingle(nodeId, key);
            renderData();
          }
        });
      valueContainer.append(convertBtn);
    }
  } else {
    // Single value
    const inlineCard = renderInlineObject(value);
    if (inlineCard) {
      valueContainer.append(inlineCard);
    } else {
      valueContainer.append(
        createValueInput(key, value, nodeId, null, classification)
      );
    }

    // Action buttons row for single values in edit mode
    if (isEditMode) {
      const actionsRow = $("<div>")
        .addClass("property-actions")
        .css({ "margin-top": "5px" });

      // Delete button (for non-required fields only)
      if (!classification.isRequired) {
        const deleteBtn = $("<button>")
          .addClass("btn btn-xs btn-danger")
          .attr(
            "data-testid",
            `delete-property-btn-${key.replace(/[^a-zA-Z0-9]/g, "_")}`
          )
          .html('<span class="glyphicon glyphicon-trash"></span> Delete')
          .click(async function () {
            if (
              await showConfirm("Delete this property?", {
                title: "Delete Property",
                confirmText: "Delete",
              })
            ) {
              row.addClass("deleted").fadeOut(300, function () {
                $(this).remove();
              });
              updateSaveButton();
            }
          });
        actionsRow.append(deleteBtn);
      }

      // Convert to Array button
      const convertToArrayBtn = $("<button>")
        .addClass("btn btn-xs btn-default")
        .attr(
          "data-testid",
          `convert-to-array-btn-${key.replace(/[^a-zA-Z0-9]/g, "_")}`
        )
        .html(
          '<span class="glyphicon glyphicon-resize-full"></span> Convert to Array'
        )
        .css({ "margin-left": "5px" })
        .click(function () {
          convertPropertyToArray(nodeId, key);
          renderData();
        });
      actionsRow.append(convertToArrayBtn);

      // Add Object/Reference button
      const addComplexBtn = $("<button>")
        .addClass("btn btn-xs btn-info")
        .html(
          '<span class="glyphicon glyphicon-link"></span> Add Reference/Object'
        )
        .css({ "margin-left": "5px" })
        .click(function () {
          showAddReferenceModal(nodeId, key, false);
        });
      actionsRow.append(addComplexBtn);

      valueContainer.append(actionsRow);
    }
  }

  // Add description as info text if available
  if (classification.description && isEditMode) {
    const infoText = $("<div>")
      .addClass("property-info")
      .text(classification.description);
    valueContainer.append(infoText);
  }

  row.append(valueContainer);
  return row;
}

function showAddReferenceModal(nodeId, propertyKey, forArray) {
  const availableNodes = getAllNodesForReference();

  const modalHtml = `
    <div class="modal fade" id="addReferenceModal" tabindex="-1" role="dialog">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <button type="button" class="close" data-dismiss="modal">
              <span>&times;</span>
            </button>
            <h4 class="modal-title">
              <span class="glyphicon glyphicon-link"></span>
              Add Reference or New Object
            </h4>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label><strong>Option 1: Reference Existing Node</strong></label>
              <select id="existingNodeSelect" class="form-control">
                <option value="">-- Select an existing node --</option>
                ${availableNodes
                  .map(
                    (node) =>
                      `<option value="${node.id}">${node.id} (${node.type || "Unknown"})</option>`
                  )
                  .join("")}
              </select>
            </div>
            <div class="form-group">
              <label><strong>Option 2: Create New Object</strong></label>
              <input type="text" id="newNodeType" class="form-control" 
                     placeholder="Enter object type (e.g., ValueAndConceptDescription)">
              <small class="help-block">Leave empty to create generic Object</small>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" id="confirmAddReference">
              <span class="glyphicon glyphicon-ok"></span> Add
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Remove existing modal
  $("#addReferenceModal").remove();
  $("body").append(modalHtml);
  $("#addReferenceModal").modal("show");

  // Handle confirm
  $("#confirmAddReference")
    .off("click")
    .on("click", async function () {
      const existingNodeId = $("#existingNodeSelect").val();
      const newNodeType = $("#newNodeType").val().trim();

      if (existingNodeId) {
        // Add reference to existing node
        addReferenceToProperty(nodeId, propertyKey, existingNodeId);
        $("#addReferenceModal").modal("hide");
        renderData();
      } else if (
        newNodeType ||
        (await showConfirm("Create new Object without type?", {
          title: "Create Object",
        }))
      ) {
        // Create new node
        const type = newNodeType || "Object";
        createAndReferenceNewNode(nodeId, propertyKey, type, forArray);
        $("#addReferenceModal").modal("hide");
        renderData();
      } else {
        await showAlert(
          "Please select an existing node or enter a type for a new node"
        );
      }
    });
}

export function createValueInput(
  key,
  value,
  nodeId,
  arrayIndex,
  classification
) {
  // Check if value is a reference to another node (has @id)
  if (value?.["@id"]) {
    const refId = value["@id"];
    const refContainer = $("<div>").addClass("reference-container");

    // Create a clickable button to jump to the referenced node
    const jumpBtn = $("<button>")
      .addClass("btn btn-sm btn-info reference-btn")
      .attr(
        "data-testid",
        `jump-to-node-btn-${refId.replace(/[^a-zA-Z0-9]/g, "_")}`
      )
      .html(`<span class="glyphicon glyphicon-arrow-right"></span> ${refId}`)
      .attr("title", "Click to jump to this node")
      .click(function (e) {
        e.preventDefault();
        const targetCard = $(`.node-card[data-node-id="${refId}"]`);
        if (targetCard.length) {
          targetCard.removeClass("collapsed");
          targetCard[0].scrollIntoView({ behavior: "smooth", block: "center" });
          targetCard.addClass("highlight");
          setTimeout(() => targetCard.removeClass("highlight"), 2000);
        } else {
          showAlert("Referenced node not found: " + refId);
        }
      });

    refContainer.append(jumpBtn);
    return refContainer;
  }

  // Check if string value is a node reference (like "#Sample_Key")
  if (typeof value === "string" && isNodeReference(value)) {
    const refContainer = $("<div>").addClass("reference-container");

    const jumpBtn = $("<button>")
      .addClass("btn btn-sm btn-info reference-btn")
      .attr(
        "data-testid",
        `jump-to-node-btn-${value.replace(/[^a-zA-Z0-9]/g, "_")}`
      )
      .html(`<span class="glyphicon glyphicon-arrow-right"></span> ${value}`)
      .attr("title", "Click to jump to this node")
      .click(function (e) {
        e.preventDefault();
        const targetCard = $(`.node-card[data-node-id="${value}"]`);
        if (targetCard.length) {
          targetCard.removeClass("collapsed");
          targetCard[0].scrollIntoView({ behavior: "smooth", block: "center" });
          targetCard.addClass("highlight");
          setTimeout(() => targetCard.removeClass("highlight"), 2000);
        } else {
          showAlert("Referenced node not found: " + value);
        }
      });

    refContainer.append(jumpBtn);
    return refContainer;
  }

  // Simple value (string, number, etc.) or complex object without @id
  const valueStr =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  const isEditMode = getIsEditMode();

  if (isEditMode) {
    // Check if this property has enumeration values (controlled vocabulary)
    if (
      classification &&
      classification.allowedValues &&
      classification.allowedValues.length > 0
    ) {
      // Create a dropdown select element
      const select = $("<select>")
        .addClass("form-control")
        .attr("data-original", valueStr);

      // Add empty option if field is not required
      if (!classification.isRequired) {
        select.append($("<option>").val("").text("-- Select --"));
      }

      // Add enumeration options
      classification.allowedValues.forEach((enumValue) => {
        const option = $("<option>").val(enumValue.uri).text(enumValue.label);

        // Check if this is the current value (match by URI or local part)
        const valueUri = valueStr.startsWith("http") ? valueStr : null;
        const valueLocalPart = valueStr.split("/").pop().split("#").pop();
        const enumLocalPart = enumValue.uri.split("/").pop().split("#").pop();

        if (
          valueUri === enumValue.uri ||
          valueLocalPart === enumLocalPart ||
          valueStr === enumValue.label
        ) {
          option.attr("selected", "selected");
        }

        select.append(option);
      });

      // Mark as changed when selection changes
      select.on("change", function () {
        $(this).closest(".property-row").addClass("changed");
        updateSaveButton();
      });

      return select;
    }

    // Not an enumeration - render regular input based on type
    const inputType = classification ? classification.inputType : "text";

    let input;
    if (valueStr.length > 50) {
      input = $("<textarea>").val(valueStr);
    } else {
      input = $("<input>").attr("type", inputType).val(valueStr);
    }

    input.attr("data-original", valueStr);
    input.on("input", function () {
      // Mark as changed
      $(this).closest(".property-row").addClass("changed");
      updateSaveButton();

      // Schedule auto-validation
      scheduleValidation();
    });

    return input;
  } else {
    // View mode - show as read-only text
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      // For complex objects, create a nested expandable section
      const nestedContainer = $("<div>").addClass("nested-object").css({
        "margin-left": "20px",
        "border-left": "2px solid #ddd",
        "padding-left": "10px",
        "margin-top": "5px",
      });

      Object.keys(value).forEach((nestedKey) => {
        if (nestedKey === "@id" || nestedKey === "@type") {
          return;
        } // Skip JSON-LD metadata for cleaner display

        const nestedRow = $("<div>")
          .addClass("property-row nested-property")
          .css({
            "margin-bottom": "8px",
            display: "flex",
            "align-items": "center",
          });

        const nestedLabel = $("<div>")
          .addClass("property-key")
          .css({
            "font-weight": "500",
            "min-width": "150px",
            color: "#555",
          })
          .text(humanizeKey(nestedKey.replace("schema:", "")));

        const nestedValueDiv = $("<div>").addClass("property-value").css({
          flex: "1",
        });

        const nestedValue = value[nestedKey];
        if (typeof nestedValue === "object" && nestedValue !== null) {
          nestedValueDiv.text(JSON.stringify(nestedValue));
        } else {
          nestedValueDiv.text(String(nestedValue));
        }

        nestedRow.append(nestedLabel, nestedValueDiv);
        nestedContainer.append(nestedRow);
      });

      return nestedContainer;
    } else {
      // For simple values, show as regular text
      return $("<div>").addClass("value-display").text(valueStr);
    }
  }
}

export function humanizeKey(key) {
  // Convert camelCase or snake_case to human readable
  return key
    .replace(/([A-Z])/g, " $1") // Add space before capital letters
    .replace(/_/g, " ") // Replace underscores with spaces
    .trim() // Remove leading/trailing spaces
    .split(" ") // Split into words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
    .join(" "); // Join back together
}

export function highlightText(element, searchTerm, options = {}) {
  const { caseSensitive = false, useRegex = false } = options;
  
  // Remove previous highlights
  element.find(".search-highlight").contents().unwrap();
  element.find("input.search-highlight, textarea.search-highlight").removeClass("search-highlight");

  // Highlight matching text in regular elements
  element
    .find(".property-label, .property-path, .value-display, .node-id")
    .each(function () {
      const $this = $(this);
      const text = $this.text();

      if (useRegex) {
        try {
          const flags = caseSensitive ? "g" : "gi";
          let lastIndex = 0;
          let html = "";
          let match;
          
          // Use a new regex for each match to reset lastIndex
          const searchRegex = new RegExp(searchTerm, flags);
          while ((match = searchRegex.exec(text)) !== null) {
            // Add text before match
            html += document.createTextNode(text.substring(lastIndex, match.index)).textContent;
            // Add highlighted match
            html += '<span class="search-highlight">' + 
                    document.createTextNode(match[0]).textContent + 
                    "</span>";
            lastIndex = match.index + match[0].length;
            // Prevent infinite loop on zero-length matches
            if (match.index === searchRegex.lastIndex) {
              searchRegex.lastIndex++;
            }
          }
          // Add remaining text
          html += document.createTextNode(text.substring(lastIndex)).textContent;
          
          if (lastIndex > 0) {
            $this.html(html);
          }
        } catch (e) {
          // Invalid regex - skip highlighting
        }
      } else {
        // Simple string search
        const compareText = caseSensitive ? text : text.toLowerCase();
        const compareTerm = caseSensitive ? searchTerm : searchTerm.toLowerCase();
        let index = compareText.indexOf(compareTerm);

        if (index >= 0) {
          let html = "";
          let lastIndex = 0;
          
          // Find all occurrences
          while (index >= 0) {
            html += document.createTextNode(text.substring(lastIndex, index)).textContent;
            html += '<span class="search-highlight">' +
                    document.createTextNode(text.substring(index, index + compareTerm.length)).textContent +
                    "</span>";
            lastIndex = index + compareTerm.length;
            index = compareText.indexOf(compareTerm, lastIndex);
          }
          html += document.createTextNode(text.substring(lastIndex)).textContent;
          
          $this.html(html);
        }
      }
    });

  // Handle input/textarea elements (can't highlight their internal text, so add class to the element)
  element.find("input, textarea").each(function () {
    const $this = $(this);
    const value = $this.val();

    let matches = false;
    if (useRegex) {
      try {
        const flags = caseSensitive ? "gi" : "gi";
        const searchRegex = new RegExp(searchTerm, flags);
        matches = searchRegex.test(value);
      } catch (e) {
        // Invalid regex
      }
    } else {
      const compareValue = caseSensitive ? value : value.toLowerCase();
      const compareTerm = caseSensitive ? searchTerm : searchTerm.toLowerCase();
      matches = compareValue.includes(compareTerm);
    }

    if (matches) {
      $this.addClass("search-highlight");
    }
  });
}
