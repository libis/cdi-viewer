// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

/**
 * Unified Add Component
 *
 * Provides a consistent UI for adding both properties and root nodes:
 * - Dropdown for SHACL-defined items
 * - Custom input section with namespace selector
 * - Same look and feel for both use cases
 */

import { extractNamespaces } from "./namespace-manager.js";
import { showAlert } from "./modal-dialogs.js";
import { quickEl } from "./dom-utils.js";

/**
 * Create a unified add component (works for both properties and root nodes)
 *
 * @param {Object} options - Configuration object
 * @param {string} options.type - "property" or "rootNode"
 * @param {Array} options.suggestions - Array of suggestions (properties or node types)
 * @param {Function} options.onAdd - Callback when item is added: (item, suggestion) => void
 * @param {Function} options.onAddCustom - Callback when custom item is added: (fullName) => void
 * @returns {jQuery} The complete add component
 */
export function createUnifiedAddComponent(options) {
  const {
    type, // "property" or "rootNode"
    suggestions,
    onAdd,
    onAddCustom,
  } = options;

  const isProperty = type === "property";
  const title = isProperty ? "Add Properties" : "Add Root Node";
  const selectPlaceholder = isProperty
    ? "-- Select a property to add --"
    : "-- Select a node type to add --";
  const customLabel = isProperty ? "Custom property" : "Custom node type";

  const section = $("<div>").addClass("unified-add-section");

  // Title
  const titleElement = $("<h4>")
    .text(title)
    .css({ "margin-top": "0", "margin-bottom": "10px" });
  section.append(titleElement);

  // Sort suggestions: required first, then alphabetically
  const sortedSuggestions = [...suggestions].sort((a, b) => {
    if (a.required && !b.required) {
      return -1;
    }
    if (!a.required && b.required) {
      return 1;
    }
    return a.label.localeCompare(b.label);
  });

  const hasShacLSuggestions = sortedSuggestions.length > 0;

  // ===== SHACL-defined items dropdown =====
  const dropdownRow = $("<div>")
    .addClass("add-item-row")
    .css({ display: hasShacLSuggestions ? "flex" : "none" });

  const dropdownWrapper = $("<div>").addClass("item-dropdown-wrapper");
  const dropdown = $("<select>").addClass("item-dropdown");
  dropdown.append($("<option>").val("").text(selectPlaceholder));

  sortedSuggestions.forEach((suggestion) => {
    const option = $("<option>")
      .val(suggestion.path || suggestion.name)
      .attr("data-required", suggestion.required || false)
      .attr("data-complex", suggestion.isComplex || false)
      .attr("data-max-count", suggestion.maxCount || "")
      .data("suggestion", suggestion);

    let text = suggestion.label;
    if (suggestion.required) {
      text = "⚠ " + text + " (REQUIRED)";
    }
    if (suggestion.isComplex && isProperty) {
      text = text + " [object]";
    }
    if (suggestion.maxCount === 1) {
      text = text + " (max 1)";
    }

    option.text(text);
    dropdown.append(option);
  });

  dropdownWrapper.append(dropdown);
  dropdownRow.append(dropdownWrapper);

  // Add button for dropdown selection
  const addBtn = $("<button>")
    .addClass("btn btn-primary")
    .empty()
    .append(quickEl("span", { class: "glyphicon glyphicon-plus" }))
    .append(document.createTextNode(` Add ${isProperty ? "Property" : "Node"}`))
    .click(async function () {
      const selectedValue = dropdown.val();
      if (!selectedValue) {
        await showAlert(`Please select a ${isProperty ? "property" : "node type"} first`);
        return;
      }

      const selectedOption = dropdown.find("option:selected");
      const suggestion = selectedOption.data("suggestion");

      // Call the callback
      onAdd(selectedValue, suggestion);

      // Remove from dropdown if maxCount = 1
      if (suggestion.maxCount === 1) {
        selectedOption.remove();
      }

      dropdown.val("");
    });

  dropdownRow.append(addBtn);
  section.append(dropdownRow);

  // ===== Custom item input section =====
  // Always show custom input, with separator if SHACL suggestions exist
  const customSection = $("<div>")
    .addClass("custom-item-section")
    .css({
      "margin-top": hasShacLSuggestions ? "15px" : "0",
      "padding-top": hasShacLSuggestions ? "15px" : "0",
      "border-top": hasShacLSuggestions ? "1px solid #ddd" : "none",
    });

  const customLabel$ = $("<label>").text(`${customLabel}:`).css({
    display: "block",
    "margin-bottom": "5px",
    "font-weight": "bold",
    "font-size": "13px",
  });
  customSection.append(customLabel$);

  // Custom input row with namespace selector and text input
  const customInputRow = $("<div>")
    .addClass("custom-input-row")
    .css({ display: "flex", gap: "5px", "align-items": "center" });

  // Namespace selector
  const namespaceSelect = $("<select>")
    .addClass("form-control namespace-selector")
    .css({ width: "150px" });

  populateNamespaceSelector(namespaceSelect);

  customInputRow.append(namespaceSelect);

  // Text input for property/type name
  const customInput = $("<input>")
    .attr("type", "text")
    .attr("placeholder", isProperty ? "propertyName" : "NodeType")
    .addClass("form-control custom-name-input")
    .css({ flex: "1" });

  customInputRow.append(customInput);

  // Add custom button
  const addCustomBtn = $("<button>")
    .addClass("btn btn-success")
    .empty()
    .append(quickEl("span", { class: "glyphicon glyphicon-plus" }))
    .append(document.createTextNode(" Add"))
    .click(async function () {
      const prefix = namespaceSelect.val();
      const name = customInput.val().trim();

      if (!name) {
        await showAlert(`Please enter a ${isProperty ? "property" : "type"} name`);
        return;
      }

      // Construct full name
      const fullName =
        prefix && prefix !== "__ADD_NEW__" ? `${prefix}:${name}` : name;

      // Call the callback
      onAddCustom(fullName);

      // Clear input
      customInput.val("");
      namespaceSelect.val("");
    });

  customInputRow.append(addCustomBtn);
  customSection.append(customInputRow);

  // Handle "Add new namespace" selection
  namespaceSelect.on("change", function () {
    if ($(this).val() === "__ADD_NEW__") {
      // Open add namespace modal directly
      $("#add-namespace-btn").click();

      // Reset selector
      $(this).val("");
    }
  });

  // Allow Enter key to add
  customInput.on("keypress", function (e) {
    if (e.which === 13) {
      e.preventDefault();
      addCustomBtn.click();
    }
  });

  section.append(customSection);

  // Listen for namespace changes
  window.addEventListener("namespacesChanged", () => {
    updateNamespaceSelectors();
  });

  return section;
}

/**
 * Helper function to populate a namespace selector with current namespaces
 * @param {jQuery} selectElement - The select element to populate
 * @param {string} [currentValue] - Optional current value to restore
 */
function populateNamespaceSelector(selectElement, currentValue) {
  const namespaces = extractNamespaces();

  selectElement.empty();
  selectElement.append($("<option>").val("").text("(no prefix)"));

  Object.keys(namespaces)
    .sort()
    .forEach((prefix) => {
      // Skip special JSON-LD keywords
      if (!prefix.startsWith("@")) {
        selectElement.append(
          $("<option>")
            .val(prefix)
            .text(prefix + ":")
        );
      }
    });

  selectElement.append(
    $("<option>").val("__ADD_NEW__").text("+ Add new namespace...")
  );

  // Restore selection if provided and still valid
  if (currentValue && namespaces[currentValue]) {
    selectElement.val(currentValue);
  }
}

/**
 * Update namespace selectors in all unified add components
 * Call this after namespaces are added/removed
 */
export function updateNamespaceSelectors() {
  $(".namespace-selector").each(function () {
    const current = $(this).val();
    populateNamespaceSelector($(this), current);
  });
}
