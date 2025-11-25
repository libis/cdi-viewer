// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

// === CDI Previewer: Tree Rendering & Node/Property Display ===

import {
  getJsonData,
  getIsEditMode,
  getShaclShapesStore,
  addChangedElement,
  hasChangedElement,
  logDebug,
  logInfo,
} from "./state.js";
import { iconSpan } from "./render-utils.js";
import { collectChangesFromDOM } from "./data-extraction.js";
import { createTestId, quickEl } from "./dom-utils.js";
import { classifyProperty } from "./cdi-shacl-helpers.js";
import { scheduleValidation } from "./validation.js";
import { humanizeKey } from "./text-utils.js";
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
  deleteNode,
} from "./cdi-graph-helpers.js";
import { showAlert, showConfirm } from "./modal-dialogs.js";
import { getCompactNodeId } from "./uri-utils.js";
import {
  resetGraphStructure,
  buildGraphStructure,
  setParentRelationship,
  markNodeRendered,
  isNodeRendered,
  getRootNodeIds,
  getNodeById,
  nodeExists,
} from "./graph-structure.js";

export function renderData() {
  const jsonData = getJsonData();

  const content = $("#content");
  content.empty();

  // Reset graph structure tracking
  resetGraphStructure();
  buildGraphStructure();

  if (!jsonData || !jsonData["@graph"]) {
    content
      .empty()
      .append(
        quickEl("div", { class: "alert alert-warning" }, ["No data to display"])
      );
    return;
  }

  // Get root nodes from graph structure
  const rootNodeIds = getRootNodeIds();
  const rootNodes = rootNodeIds
    .map((id) => getNodeById(id))
    .filter((n) => n !== null);

  // Render root nodes (they will recursively render their children)
  rootNodes.forEach((node, index) => {
    const nodeCard = renderNodeTree(node, index, 0);
    content.append(nodeCard);
  });

  // After rendering the main tree, check for any unreachable nodes
  // (can happen with disconnected components or cycles)
  const allNonBlankNodes = jsonData["@graph"]
    .filter((n) => !n["@id"].startsWith("_:"))
    .map((n) => n["@id"]);

  allNonBlankNodes.forEach((nodeId) => {
    if (!isNodeRendered(nodeId)) {
      const node = getNodeById(nodeId);
      if (node) {
        logDebug(`Rendering unreachable node: ${nodeId}`);
        const nodeCard = renderNodeTree(node, 0, 0);
        content.append(nodeCard);
      }
    }
  });
}

// Helper: Check if a value is a pure reference (no properties other than @id, @type, @context)
function isPureReference(value) {
  // String reference like "#Sample_Key"
  if (typeof value === "string" && isNodeReference(value)) {
    return true;
  }
  // Object reference like {"@id": "#Sample_Key"}
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const keys = Object.keys(value);
    const nonMetadataKeys = keys.filter(
      (k) => k !== "@id" && k !== "@type" && k !== "@context"
    );
    // Has @id and no other properties (except @type/@context)
    return value["@id"] && nonMetadataKeys.length === 0;
  }
  return false;
}

// Helper: Extract the reference ID from either format
function extractReferenceId(value) {
  if (typeof value === "string" && isNodeReference(value)) {
    return value;
  }
  if (value && typeof value === "object" && value["@id"]) {
    return value["@id"];
  }
  return null;
}

// Helper: Determine if a value is string-style or object-style reference
function isStringStyleReference(value) {
  return typeof value === "string" && isNodeReference(value);
}

// Extract all @id references from a value (handles arrays, nested objects, and string references)
export function extractNodeReferences(value) {
  const refs = [];
  if (Array.isArray(value)) {
    value.forEach((item) => {
      const refId = extractReferenceId(item);
      if (refId) {
        refs.push(refId);
      }
    });
  } else {
    const refId = extractReferenceId(value);
    if (refId) {
      refs.push(refId);
    }
  }
  return refs;
}

// Check if a string value looks like a node reference
export function isNodeReference(str) {
  if (typeof str !== "string") {
    return false;
  }
  // Check if it starts with # or _: (common node ID patterns)
  if (str.startsWith("#") || str.startsWith("_:")) {
    // Verify this ID actually exists in the graph
    return nodeExists(str);
  }
  return false;
}

export function renderNodeTree(node, index, depth, ancestors = new Set()) {
  const isEditMode = getIsEditMode();
  const shaclShapesStore = getShaclShapesStore();

  const id = node["@id"] || `_:blank${index}`;
  const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];

  // Mark this node as rendered using graph structure
  markNodeRendered(id);

  // Only indent depth > 0 with a constant 8px (not cumulative since nodes are nested)
  const card = $("<div>")
    .addClass("node-card tree-node")
    .attr("data-node-id", id)
    .attr("data-testid", createTestId("node-card", id));
  if (depth > 0) {
    card.css("margin-left", "8px");
  }

  // Header with collapse functionality
  const header = $("<div>")
    .addClass("node-header")
    .attr("data-testid", createTestId("node-header", id));
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
      .attr("data-testid", createTestId("node-id", id))
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

  // Add delete button in edit mode
  if (isEditMode) {
    const deleteBtn = $("<button>")
      .addClass("btn btn-xs btn-danger delete-node-btn")
      .attr("data-testid", createTestId("delete-node-btn", id))
      .empty()
      .append(iconSpan("glyphicon glyphicon-trash"))
      .css("margin-left", "10px")
      .click(async function (e) {
        e.stopPropagation(); // Prevent header collapse toggle
        if (
          await showConfirm(`Delete node ${id} and all references to it?`, {
            title: "Delete Node",
            confirmText: "Delete",
          })
        ) {
          if (deleteNode(id)) {
            // Collect any unsaved DOM changes before re-rendering
            collectChangesFromDOM();
            // Re-render to show updated graph
            renderData();
          }
        }
      });
    header.append(deleteBtn);
  }

  // Add click handler to collapse/expand
  header.click(function () {
    card.toggleClass("collapsed");
  });

  card.append(header);

  // Body with properties
  const body = $("<div>")
    .addClass("node-body")
    .attr("data-testid", createTestId("node-body", id));
  if (!isEditMode) {
    body.addClass("view-mode");
  }

  // Render all properties except @id and @type
  Object.keys(node).forEach((key) => {
    if (key !== "@id" && key !== "@type" && key !== "@context") {
      const propertyRow = renderPropertyTree(
        key,
        node[key],
        id,
        types,
        depth,
        ancestors
      );
      body.append(propertyRow);
    }
  });

    card.append(body);

    // If any property rows are marked changed, mark the node card too
    if (body.find('.property-row.changed').length > 0) {
      card.addClass('changed');
    }

  // Add property suggestions in edit mode (with or without SHACL shapes)
  if (isEditMode) {
    // Get SHACL suggestions if shapes are loaded, otherwise use empty array
    const suggestions = shaclShapesStore
      ? getPropertySuggestions(node, types)
      : [];

    // Always show the Add Properties section in edit mode
    // This allows custom property addition even without SHACL shapes
    const suggestionsSection = createPropertySuggestionsSection(
      suggestions,
      id
    );
    card.append(suggestionsSection);
  }

  return card;
}

export function renderPropertyTree(
  key,
  value,
  nodeId,
  nodeTypes,
  depth,
  ancestors = new Set()
) {
  const container = $("<div>");

  // First render the property itself
  const row = renderProperty(key, value, nodeId, nodeTypes);
  container.append(row);

  // Then check if this property references other nodes
  const refs = extractNodeReferences(value);
  if (refs.length > 0) {
    refs.forEach((refId) => {
      const refNode = getNodeById(refId);
      if (refNode) {
        // Detect cycles: if refId is in our ancestor chain, don't inline it
        // (it will be rendered as a clickable reference button instead)
        if (ancestors.has(refId)) {
          logInfo(
            `Cycle detected: ${nodeId} → ${refId}. Reference will be shown as clickable link.`
          );
          return; // Don't inline - the reference button in the property value is sufficient
        }

        // Only render inline if this node hasn't been rendered yet in the current tree
        if (!isNodeRendered(refId)) {
          // Track parent-child relationship: refId is a child of nodeId
          setParentRelationship(refId, nodeId);

          // Pass ancestors down to detect deeper cycles
          const newAncestors = new Set(ancestors);
          newAncestors.add(nodeId);

          const childCard = renderNodeTree(refNode, 0, depth + 1, newAncestors);
          container.append(childCard);
        }
        // else: Node already rendered elsewhere - the inline box already provides navigation
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
    .attr("data-testid", createTestId("property", key));

  // Check if this property has been changed (persistent tracking)
  const compositeId = `${nodeId}.${key}`;
  if (hasChangedElement(compositeId)) {
    row.addClass("changed");
  }

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
    .attr("data-testid", createTestId("badge", key));
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

    // Skip pure references - let them be rendered as clickable buttons
    if (isPureReference(val)) {
      return null;
    }

    const inlineCard = $("").addClass("node-card inline-node-card").css({
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
    if (!getIsEditMode()) {
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
        valDiv.append(createValueInput(val, classification));
      }

      // Add delete button in edit mode
      if (getIsEditMode()) {
        const deleteBtn = $("<button>")
          .addClass("btn btn-xs delete-btn")
          .attr("data-testid", `delete-array-value-btn-${idx}`)
          .empty()
          .append(iconSpan("glyphicon glyphicon-trash"))
          .click(async function () {
            if (
              await showConfirm("Delete this value?", {
                title: "Delete Value",
                confirmText: "Delete",
              })
            ) {
              valDiv.remove();
              row.addClass("changed");
              // Track this change persistently with composite ID
              const propertyKey = row.attr("data-property");
              const compositeId = `${nodeId}.${propertyKey}`;
              addChangedElement(compositeId);
            }
          });
        valDiv.append(deleteBtn);
      }

      valueContainer.append(valDiv);
    });
    if (getIsEditMode()) {
      const addBtn = $("<button>")
        .addClass("btn btn-sm btn-default add-value-btn")
        .attr("data-testid", createTestId("add-value-btn", key))
        .empty()
        .append(iconSpan("glyphicon glyphicon-plus"))
        .append(document.createTextNode(" Add Value"))
        .click(function () {
          const newValDiv = $("<div>").addClass("array-value");
          newValDiv.append(createValueInput("", classification));

          // Add delete button for the new value
          const deleteBtn = $("<button>")
            .addClass("btn btn-xs delete-btn")
            .attr("data-testid", createTestId("delete-array-value-btn", key))
            .empty()
            .append(iconSpan("glyphicon glyphicon-trash"))
            .css({ "margin-left": "10px" })
            .click(function () {
              newValDiv.addClass("deleted").fadeOut(300, function () {
                $(this).remove();
              });
            });
          newValDiv.append(deleteBtn);

          $(this).before(newValDiv);
        });
      valueContainer.append(addBtn);

      // Add Reference/Object button for arrays
      const addRefBtn = $("<button>")
        .addClass("btn btn-sm btn-info add-reference-btn")
        .attr("data-testid", createTestId("add-reference-btn", key))
        .empty()
        .append(iconSpan("glyphicon glyphicon-link"))
        .append(document.createTextNode(" Add Reference/Object"))
        .css({ "margin-left": "5px" })
        .click(function () {
          showAddReferenceModal(nodeId, key, true);
        });
      valueContainer.append(addRefBtn);
    }

    // Add "Convert to Single Value" button for arrays in edit mode
    if (getIsEditMode()) {
      const convertBtn = $("<button>")
        .addClass("btn btn-xs btn-default convert-btn")
        .attr("data-testid", createTestId("convert-to-single-btn", key))
        .empty()
        .append(iconSpan("glyphicon glyphicon-resize-small"))
        .append(document.createTextNode(" Convert to Single"))
        .css({ "margin-left": "10px" })
        .click(async function () {
          if (
            await showConfirm(
              "Convert this array to a single value? Only the first value will be kept.",
              { title: "Convert to Single", confirmText: "Convert" }
            )
          ) {
            collectChangesFromDOM();
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
      valueContainer.append(createValueInput(value, classification));
    }

    // Action buttons row for single values in edit mode
    if (getIsEditMode()) {
      const actionsRow = $("<div>")
        .addClass("property-actions")
        .css({ "margin-top": "5px" });

      // Delete button (for non-required fields only)
      if (!classification.isRequired) {
        const deleteBtn = $("<button>")
          .addClass("btn btn-xs btn-danger")
          .attr("data-testid", createTestId("delete-property-btn", key))
          .empty()
          .append(iconSpan("glyphicon glyphicon-trash"))
          .append(document.createTextNode(" Delete"))
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
            }
          });
        actionsRow.append(deleteBtn);
      }

      // Convert to Array button
      const convertToArrayBtn = $("<button>")
        .addClass("btn btn-xs btn-default")
        .attr("data-testid", createTestId("convert-to-array-btn", key))
        .empty()
        .append(iconSpan("glyphicon glyphicon-resize-full"))
        .append(document.createTextNode(" Convert to Array"))
        .css({ "margin-left": "5px" })
        .click(function () {
          collectChangesFromDOM();
          convertPropertyToArray(nodeId, key);
          renderData();
        });
      actionsRow.append(convertToArrayBtn);

      // Add Object/Reference button
      const addComplexBtn = $("<button>")
        .addClass("btn btn-xs btn-info")
        .empty()
        .append(iconSpan("glyphicon glyphicon-link"))
        .append(document.createTextNode(" Add Reference/Object"))
        .css({ "margin-left": "5px" })
        .click(function () {
          showAddReferenceModal(nodeId, key, false);
        });
      actionsRow.append(addComplexBtn);

      valueContainer.append(actionsRow);
    }
  }

  // Add description as info text if available
  if (classification.description && getIsEditMode()) {
    const infoText = $("<div>")
      .addClass("property-info")
      .text(classification.description);
    valueContainer.append(infoText);
  }

  row.append(valueContainer);
  return row;
}

function showAddReferenceModal(
  nodeId,
  propertyKey,
  forArray,
  replaceMode = false
) {
  const availableNodes = getAllNodesForReference();

  const actionText = replaceMode ? "Replace with" : forArray ? "Add" : "Add";

  // Build modal DOM using safe helpers (avoid string HTML concatenation)
  const $modal = quickEl("div", {
    class: "modal fade",
    id: "addReferenceModal",
    tabindex: -1,
    role: "dialog",
  });

  const $dialog = quickEl("div", { class: "modal-dialog", role: "document" });
  const $content = quickEl("div", { class: "modal-content" });

  // Header
  const $header = quickEl("div", { class: "modal-header" });
  const $closeBtn = quickEl(
    "button",
    { type: "button", class: "close", "data-dismiss": "modal" },
    [quickEl("span", {}, ["×"])]
  );
  const $title = quickEl("h4", { class: "modal-title" });
  $title.append(quickEl("span", { class: "glyphicon glyphicon-link" }));
  $title.append(
    document.createTextNode(` ${actionText} Reference or New Object`)
  );

  $header.append($closeBtn, $title);

  // Body
  const $body = quickEl("div", { class: "modal-body" });
  const $existingGroup = quickEl("div", { class: "form-group" });
  $existingGroup.append(
    quickEl("label", {}, [
      quickEl("strong", {}, ["Option 1: Reference Existing Node"]),
    ])
  );

  const $select = quickEl("select", {
    id: "existingNodeSelect",
    class: "form-control",
  });
  $select.append(
    quickEl("option", { value: "" }, ["-- Select an existing node --"])
  );
  availableNodes.forEach((node) => {
    // Use attribute/value setting + .text() semantics to avoid injecting HTML
    const $opt = quickEl("option");
    $opt.attr("value", node.id);
    $opt.text(`${node.id} (${node.type || "Unknown"})`);
    $select.append($opt);
  });
  $existingGroup.append($select);

  const $newObjGroup = quickEl("div", { class: "form-group" });
  $newObjGroup.append(
    quickEl("label", {}, [
      quickEl("strong", {}, ["Option 2: Create New Object"]),
    ])
  );
  $newObjGroup.append(
    quickEl("input", {
      type: "text",
      id: "newNodeType",
      class: "form-control",
      placeholder: "Enter object type (e.g., ValueAndConceptDescription)",
    })
  );
  $newObjGroup.append(
    quickEl("small", { class: "help-block" }, [
      "Leave empty to create generic Object",
    ])
  );

  $body.append($existingGroup, $newObjGroup);

  // Footer
  const $footer = quickEl("div", { class: "modal-footer" });
  $footer.append(
    quickEl(
      "button",
      { type: "button", class: "btn btn-default", "data-dismiss": "modal" },
      ["Cancel"]
    )
  );
  const $confirmBtn = quickEl("button", {
    type: "button",
    class: "btn btn-primary",
    id: "confirmAddReference",
  });
  $confirmBtn.append(quickEl("span", { class: "glyphicon glyphicon-ok" }));
  $confirmBtn.append(document.createTextNode(` ${actionText}`));
  $footer.append($confirmBtn);

  $content.append($header, $body, $footer);
  $dialog.append($content);
  $modal.append($dialog);

  // Remove any existing modal and append safely-built modal DOM
  $("#addReferenceModal").remove();
  $("body").append($modal);
  $("#addReferenceModal").modal("show");

  // Handle confirm
  $("#confirmAddReference")
    .off("click")
    .on("click", async function () {
      const existingNodeId = $("#existingNodeSelect").val();
      const newNodeType = $("#newNodeType").val().trim();

      if (existingNodeId) {
        // Add reference to existing node
        collectChangesFromDOM();
        addReferenceToProperty(
          nodeId,
          propertyKey,
          existingNodeId,
          forArray,
          replaceMode
        );
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
        collectChangesFromDOM();
        createAndReferenceNewNode(
          nodeId,
          propertyKey,
          type,
          forArray,
          replaceMode
        );
        $("#addReferenceModal").modal("hide");
        renderData();
      } else {
        await showAlert(
          "Please select an existing node or enter a type for a new node"
        );
      }
    });
}

export function createValueInput(value, classification) {
  // Check if value is a reference (either format)
  const refId = extractReferenceId(value);
  if (refId) {
    const refContainer = $("<div>")
      .addClass("reference-container")
      .attr(
        "data-reference-style",
        isStringStyleReference(value) ? "string" : "object"
      );

    // Create a clickable button to jump to the referenced node
    const jumpBtn = $("<button>")
      .addClass("btn btn-sm btn-info reference-btn")
      .attr("data-testid", createTestId("jump-to-node-btn", refId))
      .empty()
      .append(iconSpan("glyphicon glyphicon-arrow-right"))
      .append(document.createTextNode(" "))
      .append(document.createTextNode(String(refId)))
      .attr("title", "Click to jump to this node")
      .click(function (e) {
        e.preventDefault();
        const compactId = getCompactNodeId(refId);
        const targetCard = $(`.node-card[data-node-id="${compactId}"]`);
        if (targetCard.length) {
          // Expand any collapsed parent cards
          targetCard.parents(".node-card").removeClass("collapsed");
          // Expand the target card itself
          targetCard.removeClass("collapsed");
          // Scroll with the top of the card at the top of the viewport (with some offset)
          targetCard[0].scrollIntoView({ behavior: "smooth", block: "start" });
          // Add temporary highlight
          targetCard.addClass("highlight");
          setTimeout(() => targetCard.removeClass("highlight"), 2000);
        } else {
          showAlert("Referenced node not found: " + refId);
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
        const row = $(this).closest(".property-row");
        row.addClass("changed");
        // Track this change persistently with composite ID
        const propertyKey = row.attr("data-property");
        const cardNodeId = row
          .closest(".node-card")
          .find(".node-id")
          .first()
          .text();
        const compositeId = `${cardNodeId}.${propertyKey}`;
        addChangedElement(compositeId);
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
      const row = $(this).closest(".property-row");
      row.addClass("changed");
      // Track this change persistently with composite ID
      const propertyKey = row.attr("data-property");
      const cardNodeId = row
        .closest(".node-card")
        .find(".node-id")
        .first()
        .text();
      const compositeId = `${cardNodeId}.${propertyKey}`;
      addChangedElement(compositeId);

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

export function highlightText(element, searchTerm, options = {}) {
  const { caseSensitive = false, useRegex = false } = options;

  // Remove previous highlights
  element.find(".search-highlight").contents().unwrap();
  element
    .find("input.search-highlight, textarea.search-highlight")
    .removeClass("search-highlight");

  // Highlight matching text in regular elements (including badges)
  element
    .find(
      ".property-label, .property-path, .value-display, .node-id, .property-badge"
    )
    .each(function () {
      const $this = $(this);
      const text = $this.text();

      if (useRegex) {
        try {
          const flags = caseSensitive ? "g" : "gi";
          let lastIndex = 0;
          let match;

          // Use a new regex for each match to reset lastIndex
          const searchRegex = new RegExp(searchTerm, flags);
          // Build a safe DocumentFragment from text nodes and spans
          const frag = document.createDocumentFragment();
          while ((match = searchRegex.exec(text)) !== null) {
            // Add text before match as text node
            if (match.index > lastIndex) {
              frag.appendChild(
                document.createTextNode(text.substring(lastIndex, match.index))
              );
            }
            // Add highlighted match as a span node
            const span = document.createElement("span");
            span.className = "search-highlight";
            span.appendChild(document.createTextNode(match[0]));
            frag.appendChild(span);
            lastIndex = match.index + match[0].length;
            // Prevent infinite loop on zero-length matches
            if (match.index === searchRegex.lastIndex) {
              searchRegex.lastIndex++;
            }
          }
          // Add remaining text
          if (lastIndex < text.length) {
            frag.appendChild(
              document.createTextNode(text.substring(lastIndex))
            );
          }

          if (lastIndex > 0) {
            // Append the built fragment (composed of safe text nodes and spans)
            $this.empty();
            $this.append(frag);
          }
        } catch (e) {
          // Invalid regex - skip highlighting
        }
      } else {
        // Simple string search
        const compareText = caseSensitive ? text : text.toLowerCase();
        const compareTerm = caseSensitive
          ? searchTerm
          : searchTerm.toLowerCase();
        let index = compareText.indexOf(compareTerm);

        if (index >= 0) {
          const frag = document.createDocumentFragment();
          let lastIndex = 0;

          // Find all occurrences and build nodes for each segment
          while (index >= 0) {
            if (index > lastIndex) {
              frag.appendChild(
                document.createTextNode(text.substring(lastIndex, index))
              );
            }
            const span = document.createElement("span");
            span.className = "search-highlight";
            span.appendChild(
              document.createTextNode(
                text.substring(index, index + compareTerm.length)
              )
            );
            frag.appendChild(span);
            lastIndex = index + compareTerm.length;
            index = compareText.indexOf(compareTerm, lastIndex);
          }

          // Append remaining text
          if (lastIndex < text.length) {
            frag.appendChild(
              document.createTextNode(text.substring(lastIndex))
            );
          }

          // Replace content with composed fragment
          $this.empty();
          $this.append(frag);
        }
      }
    });

  // Handle input/textarea elements with lighter background highlighting
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
      // Use lighter yellow background for input fields
      $this.addClass("search-highlight");
    }
  });
}
