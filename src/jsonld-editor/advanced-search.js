// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

/**
 * Advanced Search & Filter Module
 * 
 * Provides enhanced search capabilities:
 * - Case-sensitive search
 * - Regex search
 * - Navigate between matches
 * - Search result counter
 */

import { highlightText } from "./render.js";
import { getFilterState } from "./advanced-filter.js";

// Search state
let searchMatches = [];
let currentMatchIndex = -1;
let caseSensitive = false;
let useRegex = false;
let lastSearchTerm = "";

/**
 * Check if text matches search term with current settings
 */
function matchesSearch(text, searchTerm) {
  if (!searchTerm) {
    return true;
  }
  
  if (useRegex) {
    try {
      const flags = caseSensitive ? "g" : "gi";
      const regex = new RegExp(searchTerm, flags);
      return regex.test(text);
    } catch (e) {
      // Invalid regex - show error
      $("#search-error").text("Invalid regex").fadeIn();
      setTimeout(() => $("#search-error").fadeOut(), 3000);
      return false;
    }
  } else {
    const compareText = caseSensitive ? text : text.toLowerCase();
    const compareTerm = caseSensitive ? searchTerm : searchTerm.toLowerCase();
    return compareText.includes(compareTerm);
  }
}

/**
 * Perform search with current settings
 */
export function performSearch() {
  const searchTerm = $("#search-input").val();
  lastSearchTerm = searchTerm;
  
  // Clear error
  $("#search-error").hide();
  
  // Clear previous highlights
  $(".search-highlight").contents().unwrap();
  $(".current-search-match").removeClass("current-search-match");
  
  if (searchTerm === "") {
    // Show all
    $(".node-card").removeClass("hidden-by-search");
    searchMatches = [];
    currentMatchIndex = -1;
    updateSearchCounter();
    updateNavigationButtons();
    return;
  }

  // Filter nodes and properties
  searchMatches = [];
  
  // Get search scope from filter state
  const filterState = getFilterState();
  const searchInNames = filterState.searchScope.includes("names");
  const searchInValues = filterState.searchScope.includes("values");
  const searchInIds = filterState.searchScope.includes("ids");
  const searchInTypes = filterState.searchScope.includes("types");
  
  $(".node-card").each(function () {
    const card = $(this);
    let matches = false;
    
    // Check node ID
    if (searchInIds) {
      const nodeId = card.find(".node-id").text();
      if (matchesSearch(nodeId, searchTerm)) {
        matches = true;
      }
    }
    
    // Check node type
    if (searchInTypes) {
      const nodeType = card.find(".node-type").text();
      if (matchesSearch(nodeType, searchTerm)) {
        matches = true;
      }
    }
    
    // Check properties
    if (searchInNames || searchInValues) {
      card.find(".property-label, .property-path, .value-display").each(function() {
        const isLabel = $(this).hasClass("property-label") || $(this).hasClass("property-path");
        
        if ((searchInNames && isLabel) || (searchInValues && !isLabel)) {
          const text = $(this).text();
          if (matchesSearch(text, searchTerm)) {
            matches = true;
            return false; // Break loop
          }
        }
      });
    }

    if (matches) {
      card.removeClass("hidden-by-search").removeClass("collapsed");
      highlightText(card, searchTerm);
      searchMatches.push(card[0]);
    } else {
      card.addClass("hidden-by-search");
    }
  });

  // Reset current match index
  currentMatchIndex = -1;
  
  updateSearchCounter();
  updateNavigationButtons();
  
  // If there are matches, navigate to first one
  if (searchMatches.length > 0) {
    navigateToMatch("next");
  }
}

/**
 * Update the search counter display
 */
function updateSearchCounter() {
  const counter = $("#search-counter");
  
  if (lastSearchTerm === "") {
    counter.text("");
  } else if (searchMatches.length === 0) {
    counter.text("No matches").css("color", "#dc3545");
  } else if (currentMatchIndex >= 0) {
    counter.text(`${currentMatchIndex + 1} of ${searchMatches.length}`).css("color", "#28a745");
  } else {
    counter.text(`${searchMatches.length} found`).css("color", "#28a745");
  }
}

/**
 * Enable/disable navigation buttons
 */
function updateNavigationButtons() {
  const hasMatches = searchMatches.length > 0;
  $("#prev-match-btn").prop("disabled", !hasMatches);
  $("#next-match-btn").prop("disabled", !hasMatches);
}

/**
 * Navigate to next or previous match
 */
export function navigateToMatch(direction) {
  if (searchMatches.length === 0) {
    return;
  }
  
  // Update index
  if (direction === "next") {
    currentMatchIndex = (currentMatchIndex + 1) % searchMatches.length;
  } else {
    currentMatchIndex = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
  }
  
  // Scroll to match and highlight it
  const matchCard = $(searchMatches[currentMatchIndex]);
  
  // Remove previous current match highlight
  $(".current-search-match").removeClass("current-search-match");
  
  // Add current match highlight
  matchCard.addClass("current-search-match");
  
  // Scroll to match
  matchCard[0].scrollIntoView({ behavior: "smooth", block: "center" });
  
  // Update counter
  updateSearchCounter();
}

/**
 * Clear search
 */
export function clearSearch() {
  $("#search-input").val("");
  performSearch();
}

/**
 * Toggle case sensitivity
 */
export function toggleCaseSensitive() {
  caseSensitive = !caseSensitive;
  $("#toggle-case-btn").toggleClass("active", caseSensitive);
  
  // Re-run search if there's a search term
  if ($("#search-input").val()) {
    performSearch();
  }
}

/**
 * Toggle regex mode
 */
export function toggleRegex() {
  useRegex = !useRegex;
  $("#toggle-regex-btn").toggleClass("active", useRegex);
  
  // Re-run search if there's a search term
  if ($("#search-input").val()) {
    performSearch();
  }
}

/**
 * Setup advanced search event handlers
 */
export function setupAdvancedSearchHandlers() {
  // Search input
  $("#search-input").on("input", function() {
    const hasText = $(this).val().length > 0;
    
    // Show/hide clear button
    if (hasText) {
      $("#clear-search-btn").fadeIn(200);
    } else {
      $("#clear-search-btn").fadeOut(200);
    }
    
    performSearch();
  });

  // Clear button
  $("#clear-search-btn").click(function() {
    clearSearch();
    $("#search-input").focus();
  });

  // Case sensitivity toggle
  $("#toggle-case-btn").click(function() {
    toggleCaseSensitive();
  });

  // Regex toggle
  $("#toggle-regex-btn").click(function() {
    toggleRegex();
  });

  // Navigation buttons
  $("#prev-match-btn").click(function() {
    navigateToMatch("previous");
  });

  $("#next-match-btn").click(function() {
    navigateToMatch("next");
  });

  // Keyboard shortcuts
  $(document).on("keydown", function(e) {
    // F3 or Enter in search box
    if (e.key === "F3" || (e.key === "Enter" && $("#search-input").is(":focus"))) {
      e.preventDefault();
      if (searchMatches.length > 0) {
        navigateToMatch(e.shiftKey ? "previous" : "next");
      }
    }
  });
  
  // Add error message element if it doesn't exist
  if ($("#search-error").length === 0) {
    $("#search-counter").after('<span id="search-error" class="search-error" style="display: none;"></span>');
  }
}
