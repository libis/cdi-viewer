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

/**
 * Create a unified add component (works for both properties and root nodes)
 * 
 * @param {Object} options - Configuration object
 * @param {string} options.type - "property" or "rootNode"
 * @param {Array} options.suggestions - Array of suggestions (properties or node types)
 * @param {Function} options.onAdd - Callback when item is added: (item, suggestion) => void
 * @param {Function} options.onAddCustom - Callback when custom item is added: (fullName) => void
 * @param {string} options.nodeId - Node ID (for properties only)
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
  section.append(
    $("<h4>")
      .text(title)
      .css({ "margin-top": "0", "margin-bottom": "10px" })
  );

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

  // ===== SHACL-defined items dropdown =====
  const dropdownRow = $("<div>").addClass("add-item-row");
  
  const dropdownWrapper = $("<div>").addClass("item-dropdown-wrapper");
  const dropdown = $("<select>").addClass("item-dropdown");
  dropdown.append($("<option>").val("").text(selectPlaceholder));

  sortedSuggestions.forEach((suggestion) => {
    const option = $("<option>")
      .val(suggestion.path || suggestion.name)
      .attr("data-required", suggestion.required || false)
      .attr("data-complex", suggestion.isComplex || false)
      .attr("data-max-count", suggestion.maxCount || "")
      .attr("data-description", suggestion.description || "")
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

  // Description area (shows when item is selected)
  const descArea = $("<div>")
    .addClass("item-description")
    .css({ 
      "margin": "5px 0 10px 0",
      "padding": "8px",
      "background": "#f0f0f0",
      "border-left": "3px solid #007bff",
      "display": "none",
      "font-size": "13px"
    });

  // Add button for dropdown selection
  const addBtn = $("<button>")
    .addClass("btn btn-primary")
    .html(`<span class="glyphicon glyphicon-plus"></span> Add ${isProperty ? 'Property' : 'Node'}`)
    .click(function () {
      const selectedValue = dropdown.val();
      if (!selectedValue) {
        alert(`Please select a ${isProperty ? 'property' : 'node type'} first`);
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
      descArea.hide();
    });

  dropdownRow.append(addBtn);
  section.append(dropdownRow);
  section.append(descArea);

  // Show description on selection change
  dropdown.on("change", function () {
    const selectedOption = $(this).find("option:selected");
    const description = selectedOption.attr("data-description");
    if (description) {
      descArea.text(description).show();
    } else {
      descArea.hide();
    }
  });

  // ===== Custom item input section =====
  const customSection = $("<div>")
    .addClass("custom-item-section")
    .css({
      "margin-top": "15px",
      "padding-top": "15px",
      "border-top": "1px solid #ddd"
    });

  const customLabel$ = $("<label>")
    .text(`${customLabel}:`)
    .css({ 
      "display": "block",
      "margin-bottom": "5px",
      "font-weight": "bold",
      "font-size": "13px"
    });
  customSection.append(customLabel$);

  // Custom input row with namespace selector and text input
  const customInputRow = $("<div>")
    .addClass("custom-input-row")
    .css({ "display": "flex", "gap": "5px", "align-items": "center" });

  // Namespace selector
  const namespaces = extractNamespaces();
  const namespaceSelect = $("<select>")
    .addClass("form-control namespace-selector")
    .css({ "width": "150px" });
  
  namespaceSelect.append($("<option>").val("").text("(no prefix)"));
  
  Object.keys(namespaces).sort().forEach(prefix => {
    // Skip special JSON-LD keywords
    if (!prefix.startsWith("@")) {
      namespaceSelect.append($("<option>").val(prefix).text(prefix + ":"));
    }
  });
  
  namespaceSelect.append($("<option>").val("__ADD_NEW__").text("+ Add new namespace..."));
  
  customInputRow.append(namespaceSelect);

  // Text input for property/type name
  const customInput = $("<input>")
    .attr("type", "text")
    .attr("placeholder", isProperty ? "propertyName" : "NodeType")
    .addClass("form-control custom-name-input")
    .css({ "flex": "1" });
  
  customInputRow.append(customInput);

  // Add custom button
  const addCustomBtn = $("<button>")
    .addClass("btn btn-success")
    .html('<span class="glyphicon glyphicon-plus"></span> Add')
    .click(function () {
      const prefix = namespaceSelect.val();
      const name = customInput.val().trim();

      if (!name) {
        alert(`Please enter a ${isProperty ? 'property' : 'type'} name`);
        return;
      }

      // Construct full name
      const fullName = prefix && prefix !== "__ADD_NEW__" ? `${prefix}:${name}` : name;

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

  return section;
}

/**
 * Update namespace selectors in all unified add components
 * Call this after namespaces are added/removed
 */
export function updateNamespaceSelectors() {
  const namespaces = extractNamespaces();
  
  $(".namespace-selector").each(function () {
    const current = $(this).val();
    $(this).empty();
    
    $(this).append($("<option>").val("").text("(no prefix)"));
    
    Object.keys(namespaces).sort().forEach(prefix => {
      if (!prefix.startsWith("@")) {
        $(this).append($("<option>").val(prefix).text(prefix + ":"));
      }
    });
    
    $(this).append($("<option>").val("__ADD_NEW__").text("+ Add new namespace..."));
    
    // Restore selection if still valid
    if (current && namespaces[current]) {
      $(this).val(current);
    }
  });
}
