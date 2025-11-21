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

// Filter state
const filterState = {
  validation: "all", // all, valid, invalid, modified, missing-required
  propertyStatus: "all", // all, shacl-only, extra-only
  hideEmpty: false,
  searchScope: ["names", "values", "ids", "types"], // What to search in
};

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
  if (filterState.hideEmpty) {
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
  filterState.hideEmpty = false;
  filterState.searchScope = ["names", "values", "ids", "types"];
  
  // Update UI controls
  $("#validation-filter").val("all");
  $("input[name='property-status'][value='all']").prop("checked", true);
  $("#hide-empty-checkbox").prop("checked", false);
  $(".search-scope-checkbox").prop("checked", true);
  
  // Update UI
  updateActiveFilterBadge();
  
  // Re-apply filters (will show everything)
  applyFilters();
}

/**
 * Apply all active filters
 */
export function applyFilters() {
  // Apply validation filter
  applyValidationFilter();
  
  // Apply property status filter
  applyPropertyStatusFilter();
  
  // Apply empty value filter
  applyEmptyValueFilter();
  
  updateActiveFilterBadge();
  saveFilterState();
}

/**
 * Filter by validation status
 */
function applyValidationFilter() {
  if (filterState.validation === "all") {
    $(".node-card").removeClass("hidden-by-validation-filter");
    return;
  }
  
  $(".node-card").each(function() {
    const card = $(this);
    let show = false;
    
    if (filterState.validation === "valid") {
      show = card.find(".property-row.invalid, .validation-message").length === 0;
    } else if (filterState.validation === "invalid") {
      show = card.find(".property-row.invalid, .validation-message").length > 0;
    } else if (filterState.validation === "modified") {
      show = card.find(".modified").length > 0;
    } else if (filterState.validation === "missing-required") {
      show = card.find(".required.empty, .property-row.required:has(.value-display:empty)").length > 0;
    }
    
    if (show) {
      card.removeClass("hidden-by-validation-filter");
    } else {
      card.addClass("hidden-by-validation-filter");
    }
  });
}

/**
 * Filter by property status (SHACL/extra)
 */
function applyPropertyStatusFilter() {
  if (filterState.propertyStatus === "all") {
    $(".property-row").removeClass("hidden-by-property-filter");
  } else if (filterState.propertyStatus === "shacl-only") {
    $(".property-row.extra-field").addClass("hidden-by-property-filter");
    $(".property-row:not(.extra-field)").removeClass("hidden-by-property-filter");
  } else if (filterState.propertyStatus === "extra-only") {
    $(".property-row:not(.extra-field)").addClass("hidden-by-property-filter");
    $(".property-row.extra-field").removeClass("hidden-by-property-filter");
  }
  
  // Hide nodes with no visible properties
  $(".node-card").each(function() {
    const card = $(this);
    const visibleProps = card.find(".property-row:not(.hidden-by-property-filter):not(.hidden-by-empty-filter)").length;
    
    if (visibleProps === 0 && filterState.propertyStatus !== "all") {
      card.addClass("hidden-by-property-filter");
    } else {
      card.removeClass("hidden-by-property-filter");
    }
  });
}

/**
 * Hide/show empty properties
 */
function applyEmptyValueFilter() {
  if (!filterState.hideEmpty) {
    $(".property-row").removeClass("hidden-by-empty-filter");
    return;
  }
  
  $(".property-row").each(function() {
    const row = $(this);
    const valueDisplay = row.find(".value-display").text().trim();
    const arrayItems = row.find(".array-value").length;
    const nestedObjects = row.find(".nested-object").length;
    
    const isEmpty = valueDisplay === "" && arrayItems === 0 && nestedObjects === 0;
    
    if (isEmpty) {
      row.addClass("hidden-by-empty-filter");
    } else {
      row.removeClass("hidden-by-empty-filter");
    }
  });
}

/**
 * Update validation filter counts
 */
function updateValidationFilterCounts() {
  const counts = {
    all: $(".node-card").length,
    valid: $(".node-card").not(":has(.property-row.invalid, .validation-message)").length,
    invalid: $(".node-card:has(.property-row.invalid, .validation-message)").length,
    modified: $(".node-card:has(.modified)").length,
    missingRequired: $(".node-card:has(.required.empty, .property-row.required:has(.value-display:empty))").length
  };
  
  // Update dropdown labels
  $("#validation-filter option[value='all']").text(`All Nodes (${counts.all})`);
  $("#validation-filter option[value='valid']").text(`Valid Only (${counts.valid})`);
  $("#validation-filter option[value='invalid']").text(`Invalid Only (${counts.invalid})`);
  $("#validation-filter option[value='modified']").text(`Modified Only (${counts.modified})`);
  $("#validation-filter option[value='missing-required']").text(`Missing Required Fields (${counts.missingRequired})`);
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
  
  // Filter panel toggle
  $("#filter-panel-header").click(function() {
    const content = $("#filter-panel-content");
    const chevron = $("#filter-panel-chevron");
    
    if (content.is(":visible")) {
      content.slideUp(200);
      chevron.removeClass("glyphicon-chevron-up").addClass("glyphicon-chevron-down");
    } else {
      content.slideDown(200);
      chevron.removeClass("glyphicon-chevron-down").addClass("glyphicon-chevron-up");
    }
  });
  
  // Clear all filters button
  $("#clear-all-filters-btn").click(function(e) {
    e.stopPropagation(); // Don't toggle panel
    clearAllFilters();
  });
  
  // Validation filter
  $("#validation-filter").on("change", function() {
    filterState.validation = $(this).val();
    applyFilters();
  });
  
  // Property status filter
  $("input[name='property-status']").on("change", function() {
    filterState.propertyStatus = $(this).val();
    applyFilters();
  });
  
  // Hide empty checkbox
  $("#hide-empty-checkbox").on("change", function() {
    filterState.hideEmpty = $(this).is(":checked");
    applyFilters();
  });
  
  // Search scope checkboxes
  $(".search-scope-checkbox").on("change", function() {
    filterState.searchScope = $(".search-scope-checkbox:checked").map(function() {
      return $(this).val();
    }).get();
    
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
  
  // Apply saved filters
  applyFilters();
}

/**
 * Get current filter state
 */
export function getFilterState() {
  return { ...filterState };
}
