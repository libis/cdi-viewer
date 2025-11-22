// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

/**
 * Advanced Filter Module
 *
 * Provides filtering capabilities:
 * - Filter by node type
 * - Filter by validation status
 * - Filter by property status (SHACL/extra)
 * - Hide empty properties
 * - Search scope selection
 */

import { clearSearch } from "./advanced-search.js";

// Filter state
const filterState = {
  validation: "all", // all, valid, invalid, modified, missing-required
  propertyStatus: "all", // all, shacl-only, extra-only
  searchScope: ["names", "values", "ids", "types"], // What to search in
};

// Search predicate (set by search module)
let searchPredicate = null;

/**
 * Set search predicate from search module
 */
export function setSearchPredicate(predicate) {
  searchPredicate = predicate;
}

/**
 * Clear search predicate
 */
export function clearSearchPredicate() {
  searchPredicate = null;
}

/**
 * Get number of active filters
 */
function getActiveFilterCount() {
  let count = 0;

  if (filterState.validation !== "all") {
    count++;
  }
  if (filterState.propertyStatus !== "all") {
    count++;
  }
  if (filterState.searchScope.length < 4) {
    count++;
  } // Not all scopes

  return count;
}

/**
 * Update active filter badge
 */
function updateActiveFilterBadge() {
  const count = getActiveFilterCount();
  const badge = $("#active-filter-badge");

  if (count > 0) {
    badge.text(`${count} active`).show();
  } else {
    badge.hide();
  }
}

/**
 * Clear all filters
 */
export function clearAllFilters() {
  filterState.validation = "all";
  filterState.propertyStatus = "all";
  filterState.searchScope = ["names", "values", "ids", "types"];

  // Clear search (input field, case-sensitive, regex buttons)
  clearSearch();

  // Update UI controls
  $("#validation-filter").val("all");
  $("input[name='property-status'][value='all']").prop("checked", true);
  $(".search-scope-checkbox").prop("checked", true);

  // Update UI
  updateActiveFilterBadge();

  // Re-apply filters (will show everything)
  applyFilters();
}

/**
 * Apply all active filters using predicate-based approach
 * New strategy: Start with everything hidden, show matches and their ancestors
 */
export function applyFilters() {
  // Step 1: Hide everything
  $(".node-card, .property-row").addClass("hidden-by-filter");

  // Step 2: Determine which properties should be shown
  const propertyPredicates = [];

  // Property status filter
  if (filterState.propertyStatus !== "all") {
    propertyPredicates.push((element) => {
      if (filterState.propertyStatus === "shacl-only") {
        return !element.hasClass("extra-field");
      } else if (filterState.propertyStatus === "extra-only") {
        return element.hasClass("extra-field");
      }
      return true;
    });
  }

  // Show properties that match all predicates
  $(".property-row").each(function () {
    const property = $(this);
    const shouldShow =
      propertyPredicates.length === 0 ||
      propertyPredicates.every((predicate) => predicate(property));
    if (shouldShow) {
      property.removeClass("hidden-by-filter");
    }
  });

  // Step 3: Determine which nodes should be shown
  const nodePredicates = [];

  // Validation filter
  if (filterState.validation !== "all") {
    nodePredicates.push((element) => {
      const nodeId = element.attr("data-node-id");
      const hasInvalidClass = element.hasClass("invalid");
      const hasInvalidProps =
        element.find(`.property-row.invalid[data-node-id="${nodeId}"]`).length >
        0;
      const hasValidationMessages =
        element.find(".validation-message").length > 0;
      const isNodeInvalid =
        hasInvalidClass || hasInvalidProps || hasValidationMessages;

      if (filterState.validation === "invalid") {
        return isNodeInvalid;
      } else if (filterState.validation === "valid") {
        return !isNodeInvalid;
      } else if (filterState.validation === "modified") {
        return (
          element.hasClass("changed") ||
          element.find(`.property-row.changed[data-node-id="${nodeId}"]`)
            .length > 0
        );
      } else if (filterState.validation === "missing-required") {
        return (
          element.find(
            ".required.empty, .property-row.required:has(.value-display:empty)"
          ).length > 0
        );
      }
      return true;
    });
  }

  // Search filter
  if (searchPredicate) {
    nodePredicates.push(searchPredicate);
  }

  // Show nodes that match all predicates
  $(".node-card").each(function () {
    const node = $(this);
    const shouldShow =
      nodePredicates.length === 0 ||
      nodePredicates.every((predicate) => predicate(node));
    if (shouldShow) {
      node.removeClass("hidden-by-filter");
    }
  });

  // Step 4: Show parent nodes if they contain visible nodes or properties
  // Keep iterating until no more changes (propagate visibility up the tree)
  let changed = true;
  while (changed) {
    changed = false;
    const hiddenNodes = $(".node-card.hidden-by-filter");

    hiddenNodes.each(function () {
      const node = $(this);

      // Check if this node has any visible content (properties or child nodes)
      if (
        node.find(
          ".property-row:not(.hidden-by-filter), .node-card:not(.hidden-by-filter)"
        ).length > 0
      ) {
        node.removeClass("hidden-by-filter");
        changed = true;
      }
    });
  }

  updateActiveFilterBadge();
  saveFilterState();
}

/**
 * Update validation filter counts
 */
function updateValidationFilterCounts() {
  const counts = {
    all: $(".node-card").length,
    valid: $(".node-card")
      .not(".invalid")
      .not(":has(.property-row.invalid, .validation-message)").length,
    invalid: $(
      ".node-card.invalid, .node-card:has(.property-row.invalid, .validation-message)"
    ).length,
    modified: $(".node-card.changed, .node-card:has(.property-row.changed)")
      .length,
    missingRequired: $(
      ".node-card:has(.required.empty, .property-row.required:has(.value-display:empty))"
    ).length,
  };

  // Update dropdown labels
  $("#validation-filter option[value='all']").text(`All Nodes (${counts.all})`);
  $("#validation-filter option[value='valid']").text(
    `Valid Only (${counts.valid})`
  );
  $("#validation-filter option[value='invalid']").text(
    `Invalid Only (${counts.invalid})`
  );
  $("#validation-filter option[value='modified']").text(
    `Modified Only (${counts.modified})`
  );
  $("#validation-filter option[value='missing-required']").text(
    `Missing Required Fields (${counts.missingRequired})`
  );
}

/**
 * Save filter state to localStorage
 */
function saveFilterState() {
  try {
    localStorage.setItem("cdi-viewer-filters", JSON.stringify(filterState));
  } catch (e) {
    console.error("Failed to save filter state:", e);
  }
}

/**
 * Load filter state from localStorage
 */
function loadFilterState() {
  try {
    const saved = localStorage.getItem("cdi-viewer-filters");
    if (saved) {
      Object.assign(filterState, JSON.parse(saved));
      
      // Update UI controls to match loaded state
      $("#validation-filter").val(filterState.validation);
      $(`input[name='property-status'][value='${filterState.propertyStatus}']`).prop("checked", true);
      
      // Update search scope checkboxes
      $(".search-scope-checkbox").prop("checked", false);
      filterState.searchScope.forEach((scope) => {
        $(`#search-scope-${scope}`).prop("checked", true);
      });
      
      updateActiveFilterBadge();
    }
  } catch (e) {
    console.error("Failed to load filter state:", e);
  }
}

/**
 * Show filter panel (will show when data is loaded)
 */
export function showFilterPanel() {
  $("#filter-panel").fadeIn(300);
}

/**
 * Hide filter panel
 */
export function hideFilterPanel() {
  $("#filter-panel").hide();
}

/**
 * Setup advanced filter event handlers
 */
export function setupAdvancedFilterHandlers() {
  // Load saved filter state
  loadFilterState();

  // Advanced Filters button toggle
  $("#toggle-filter-panel").click(function () {
    const panel = $("#filter-panel");

    if (panel.is(":visible")) {
      panel.slideUp(200);
      $(this).removeClass("active");
    } else {
      panel.slideDown(200);
      $(this).addClass("active");
    }
  });

  // Clear all filters button
  $("#clear-all-filters-btn").click(function () {
    clearAllFilters();
  });

  // Validation filter
  $("#validation-filter").on("change", function () {
    filterState.validation = $(this).val();
    applyFilters();
  });

  // Property status filter
  $("input[name='property-status']").on("change", function () {
    filterState.propertyStatus = $(this).val();
    applyFilters();
  });

  // Search scope checkboxes
  $(".search-scope-checkbox").on("change", function () {
    filterState.searchScope = $(".search-scope-checkbox:checked")
      .map(function () {
        return $(this).val();
      })
      .get();

    // Ensure at least one is checked
    if (filterState.searchScope.length === 0) {
      $(this).prop("checked", true);
      filterState.searchScope = [$(this).val()];
      alert("At least one search scope must be selected.");
    }

    saveFilterState();
    updateActiveFilterBadge();

    // Re-run search if there's a search term
    if ($("#search-input").val()) {
      // Trigger search module to re-run
      $("#search-input").trigger("input");
    }
  });
}

/**
 * Initialize filters when data is loaded
 */
export function initializeFilters() {
  // Update validation counts
  updateValidationFilterCounts();

  // Apply current filters (including any loaded from localStorage)
  applyFilters();
}

/**
 * Get current filter state
 */
export function getFilterState() {
  return { ...filterState };
}
