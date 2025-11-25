// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

/**
 * Advanced Search Module
 *
 * Provides enhanced search capabilities:
 * - Case-sensitive search
 * - Regex search
 * - Navigate between matches
 * - Search result counter
 */

import { highlightText } from "./render.js";

// Search state
let searchMatches = [];
let currentMatchIndex = -1;
let caseSensitive = false;
let useRegex = false;
let lastSearchTerm = "";
let searchRefreshTimeout = null;
let autoJump = false;
let searchAutoJumpTimeout = null;
const AUTO_JUMP_KEY = "searchAutoJump";
const AUTO_JUMP_DELAY = 700; // ms - pause after typing before auto jump

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
    const result = compareText.includes(compareTerm);
    return result;
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
  $("input.search-highlight, textarea.search-highlight").removeClass(
    "search-highlight"
  );
  $(".current-search-match").removeClass("current-search-match");

  if (searchTerm === "") {
    // Clear search predicate
    searchMatches = [];
    currentMatchIndex = -1;
    updateSearchCounter();
    updateNavigationButtons();
    return;
  }

  // Build search results (for highlighting and navigation)
  searchMatches = [];

  // Get search scope from checkboxes
  const searchInNames = $(".search-scope-checkbox[value='names']").is(
    ":checked"
  );
  const searchInValues = $(".search-scope-checkbox[value='values']").is(
    ":checked"
  );
  const searchInIds = $(".search-scope-checkbox[value='ids']").is(":checked");
  const searchInTypes = $(".search-scope-checkbox[value='types']").is(
    ":checked"
  );
  const searchInBadges = $(".search-scope-checkbox[value='badges']").is(
    ":checked"
  );

  // Create search predicate function
  const predicate = (card) => {
    // Check node ID - only check THIS node's ID, not inline children
    if (searchInIds) {
      const nodeIdText = card.find("> .node-header .node-id").first().text();
      if (matchesSearch(nodeIdText, searchTerm)) {
        return true;
      }
    }

    // Check node type - only check THIS node's type, not inline children
    if (searchInTypes) {
      const nodeType = card.find("> .node-header .node-type").text();
      if (matchesSearch(nodeType, searchTerm)) {
        return true;
      }
    }

    // Check property badges (required, optional, extra)
    if (searchInBadges) {
      const badges = card.find(".node-body .property-row .property-badge");
      let badgeMatch = false;
      badges.each(function () {
        const badgeText = $(this).text();
        if (matchesSearch(badgeText, searchTerm)) {
          badgeMatch = true;
          return false; // Break loop
        }
      });
      if (badgeMatch) {
        return true;
      }
    }

    // Check properties - only check THIS node's properties, not inline children
    if (searchInNames || searchInValues) {
      let found = false;

      // Check text elements (labels, paths, display values) that belong to THIS node
      // Note: Using .node-body .property-row to match the actual DOM structure
      // (the > direct child selector was too restrictive and didn't match)
      const propertyElements = card.find(
        ".node-body .property-row .property-label, .node-body .property-row .property-path, .node-body .property-row .value-display"
      );

      propertyElements.each(function () {
        const isLabel =
          $(this).hasClass("property-label") ||
          $(this).hasClass("property-path");

        if ((searchInNames && isLabel) || (searchInValues && !isLabel)) {
          const text = $(this).text();
          if (matchesSearch(text, searchTerm)) {
            found = true;
            return false; // Break loop
          }
        }
      });

      // Also check input/textarea values (in edit mode) - only THIS node's inputs
      if (!found && searchInValues) {
        card
          .find(
            ".node-body .property-row input, .node-body .property-row textarea"
          )
          .each(function () {
            const value = $(this).val();
            if (matchesSearch(value, searchTerm)) {
              found = true;
              return false; // Break loop
            }
          });
      }

      if (found) {
        return true;
      }
    }
    return false;
  };

  // Build list of matching nodes (for highlighting)
  searchMatches = [];
  $(".node-card").each(function () {
    const card = $(this);
    if (predicate(card)) {
      card.removeClass("collapsed");
      highlightText(card, searchTerm, { caseSensitive, useRegex });
    }
  });

  // Build searchMatches from all visible highlight spans
  $(".search-highlight").each(function () {
    searchMatches.push(this);
  });

  // Reset current match index
  currentMatchIndex = -1;

  updateSearchCounter();
  updateNavigationButtons();

  // Schedule auto-jump if option enabled: wait for a short pause after typing
  // to avoid disrupting the user while typing. If the option is disabled, do
  // nothing here (navigation remains explicit via Enter/F3 or nav buttons).
  if (searchAutoJumpTimeout) {
    clearTimeout(searchAutoJumpTimeout);
    searchAutoJumpTimeout = null;
  }

  if (autoJump && searchMatches.length > 0) {
    // Schedule a jump to the first match after a pause — only if we haven't
    // already navigated (currentMatchIndex === -1)
    searchAutoJumpTimeout = setTimeout(() => {
      if (currentMatchIndex === -1 && lastSearchTerm === searchTerm) {
        navigateToMatch("next");
      }
      searchAutoJumpTimeout = null;
    }, AUTO_JUMP_DELAY);
  }
}

/**
 * Update the search counter display
 */
function updateSearchCounter() {
  const counter = $("#search-counter");

  if (lastSearchTerm === "") {
    counter.text("").hide();
  } else if (searchMatches.length === 0) {
    counter.text("No matches").css("color", "#dc3545").show();
  } else if (currentMatchIndex >= 0) {
    counter
      .text(`${currentMatchIndex + 1} of ${searchMatches.length}`)
      .css("color", "#28a745")
      .show();
  } else {
    counter
      .text(`${searchMatches.length} found`)
      .css("color", "#28a745")
      .show();
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
    currentMatchIndex =
      (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
  }

  // Get the current highlight element
  const highlight = $(searchMatches[currentMatchIndex]);

  // Remove previous current match styling
  $(".current-search-match").removeClass("current-search-match");

  // Add current match styling to this highlight
  highlight.addClass("current-search-match");

  // Find and expand the parent card
  const parentCard = highlight.closest(".node-card");
  parentCard.parents(".node-card").removeClass("collapsed");
  parentCard.removeClass("collapsed");

  // Scroll to the highlight
  // CSS scroll-margin-top will automatically account for the sticky toolbar
  highlight[0].scrollIntoView({ behavior: "smooth", block: "start" });

  // Update counter
  updateSearchCounter();
}

/**
 * Clear search
 */
export function clearSearch() {
  $("#search-input").val("");
  caseSensitive = false;
  useRegex = false;
  $("#toggle-case-btn").removeClass("active");
  $("#toggle-regex-btn").removeClass("active");
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
 * Refresh search after content changes (debounced)
 */
export function refreshSearchAfterEdit() {
  // Only refresh if there's an active search
  if (lastSearchTerm === "") {
    return;
  }

  // Debounce to avoid excessive searches while typing
  if (searchRefreshTimeout) {
    clearTimeout(searchRefreshTimeout);
  }

  searchRefreshTimeout = setTimeout(() => {
    performSearch();
    searchRefreshTimeout = null;
  }, 300); // Wait 300ms after last change
}

/**
 * Setup advanced search event handlers
 */
export function setupAdvancedSearchHandlers() {
  // Search input
  $("#search-input").on("input", function () {
    const hasText = $(this).val().length > 0;

    // Show/hide clear button
    if (hasText) {
      $("#clear-search-btn").fadeIn(200);
    } else {
      $("#clear-search-btn").fadeOut(200);
    }

    performSearch();
  });

  // Auto-jump toggle: read saved preference and wire up handler
  try {
    const stored = localStorage.getItem(AUTO_JUMP_KEY);
    autoJump = stored === "true";
  } catch (e) {
    autoJump = false;
  }
  $("#auto-jump-toggle").prop("checked", autoJump);
  $("#auto-jump-toggle").on("change", function () {
    autoJump = $(this).is(":checked");
    try {
      localStorage.setItem(AUTO_JUMP_KEY, autoJump ? "true" : "false");
    } catch (e) {}
  });

  // When the search input loses focus, if autoJump is enabled, jump to first match
  $("#search-input").on("blur", function () {
    if (autoJump && searchMatches.length > 0 && currentMatchIndex === -1) {
      navigateToMatch("next");
    }
  });

  // Clear button
  $("#clear-search-btn").click(function () {
    clearSearch();
    $("#search-input").focus();
  });

  // Case sensitivity toggle
  $("#toggle-case-btn").click(function () {
    toggleCaseSensitive();
  });

  // Regex toggle
  $("#toggle-regex-btn").click(function () {
    toggleRegex();
  });

  // Navigation buttons
  $("#prev-match-btn").click(function () {
    navigateToMatch("previous");
  });

  $("#next-match-btn").click(function () {
    navigateToMatch("next");
  });

  // Search scope checkboxes
  $(".search-scope-checkbox").on("change", function () {
    // Re-run search if there's a search term
    if ($("#search-input").val()) {
      performSearch();
    }
  });

  // Keyboard shortcuts
  $(document).on("keydown", function (e) {
    // F3 or Enter in search box
    if (
      e.key === "F3" ||
      (e.key === "Enter" && $("#search-input").is(":focus"))
    ) {
      e.preventDefault();
      if (searchMatches.length > 0) {
        navigateToMatch(e.shiftKey ? "previous" : "next");
      }
    }
  });

  // Add error message element if it doesn't exist
  if ($("#search-error").length === 0) {
    $("#search-counter").after(
      '<span id="search-error" class="search-error" style="display: none;"></span>'
    );
  }

  // Auto-refresh search when content changes (in edit mode)
  // Use event delegation to handle dynamically added inputs
  $(document).on(
    "input change",
    ".property-row input, .property-row textarea",
    function () {
      refreshSearchAfterEdit();
    }
  );
}
