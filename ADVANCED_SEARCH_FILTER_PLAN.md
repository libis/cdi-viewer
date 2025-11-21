# Advanced Search & Filter - Implementation Plan

## Overview

Enhance the existing search and filter capabilities to help users navigate and work with complex JSON-LD documents more effectively.

## Current State

- ✅ Basic text search (case-insensitive, searches nodes and properties, highlights matches)
- ✅ "Show SHACL Only" filter (hides extra fields)
- ✅ Collapse/Expand all functionality
- ✅ Search hides non-matching nodes and expands matching ones

## Goals

1. Make search more powerful and user-friendly
2. Provide flexible filtering options for different use cases
3. Help users find specific content quickly in large documents
4. Support both simple and advanced users (progressive disclosure)

---

## Phase 1: Search Enhancements (Quick Wins)

### 1.1 Search Result Counter

**What:** Display "X matches found" or "X of Y" when navigating
**Why:** Provides immediate feedback on search effectiveness
**Complexity:** Low
**UI Location:** Next to or inside search input

**Implementation:**

- Count matching nodes after search
- Display counter badge/text near search input
- Update counter on search input changes
- Show "No matches" when count = 0

**Technical Details:**

```javascript
// Track matches globally
let searchMatches = [];
let currentMatchIndex = 0;

// After filtering nodes:
searchMatches = $(".node-card:not(.hidden-by-search)").toArray();
updateSearchCounter();

function updateSearchCounter() {
  if (searchTerm === "") {
    $("#search-counter").text("");
  } else if (searchMatches.length === 0) {
    $("#search-counter").text("No matches").css("color", "#dc3545");
  } else {
    $("#search-counter")
      .text(`${searchMatches.length} found`)
      .css("color", "#28a745");
  }
}
```

### 1.2 Clear Search Button

**What:** × icon button inside search input to clear search quickly
**Why:** Standard UX pattern, saves user from selecting all text
**Complexity:** Low
**UI Location:** Inside search input on the right

**Implementation:**

- Add × button inside input (position: absolute)
- Show/hide based on whether input has text
- Click clears input and triggers search clear
- Fade in/out animation for polish

**Technical Details:**

```html
<div style="position: relative; width: 300px;">
  <input id="search-input" class="form-control" ... />
  <button
    id="clear-search-btn"
    style="position: absolute; right: 5px; top: 5px; display: none;"
  >
    <span class="glyphicon glyphicon-remove"></span>
  </button>
</div>
```

```javascript
$("#search-input").on("input", function () {
  if ($(this).val()) {
    $("#clear-search-btn").fadeIn(200);
  } else {
    $("#clear-search-btn").fadeOut(200);
  }
  // ... existing search logic
});

$("#clear-search-btn").click(function () {
  $("#search-input").val("").trigger("input").focus();
});
```

### 1.3 Navigate Between Matches (Previous/Next)

**What:** Buttons to jump between search results with keyboard shortcuts
**Why:** Essential for large documents with many matches
**Complexity:** Medium
**UI Location:** Next to search input or below it

**Implementation:**

- Add Previous (↑) and Next (↓) buttons
- Track current match index
- Scroll to current match and highlight it differently
- Keyboard shortcuts: F3/Enter (next), Shift+F3 (previous)
- Wrap around at start/end of matches

**Technical Details:**

```javascript
let currentMatchIndex = -1;

function navigateToMatch(direction) {
  if (searchMatches.length === 0) return;

  // Update index
  if (direction === "next") {
    currentMatchIndex = (currentMatchIndex + 1) % searchMatches.length;
  } else {
    currentMatchIndex =
      (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
  }

  // Scroll to match
  const matchCard = $(searchMatches[currentMatchIndex]);
  matchCard.addClass("current-search-match");
  $(".node-card").not(matchCard).removeClass("current-search-match");

  matchCard[0].scrollIntoView({ behavior: "smooth", block: "center" });

  // Update counter: "3 of 15"
  $("#search-counter").text(
    `${currentMatchIndex + 1} of ${searchMatches.length}`
  );
}

// Keyboard shortcuts
$(document).on("keydown", function (e) {
  if ($("#search-input").is(":focus")) {
    if (e.key === "Enter") {
      e.preventDefault();
      navigateToMatch(e.shiftKey ? "previous" : "next");
    }
  }
  if (e.key === "F3") {
    e.preventDefault();
    navigateToMatch(e.shiftKey ? "previous" : "next");
  }
});
```

**CSS:**

```css
.current-search-match {
  box-shadow: 0 0 0 3px #007bff;
  animation: pulse 1s ease-in-out;
}

@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 0 0 3px #007bff;
  }
  50% {
    box-shadow: 0 0 0 6px rgba(0, 123, 255, 0.5);
  }
}
```

### 1.4 Case Sensitivity Toggle

**What:** Button to toggle case-sensitive search
**Why:** Sometimes users need exact case matching
**Complexity:** Low
**UI Location:** Small button next to search input

**Implementation:**

- Toggle button with icon (Aa)
- Stores state (default: case-insensitive)
- Re-runs search when toggled
- Visual indicator when case-sensitive mode active

**Technical Details:**

```javascript
let caseSensitive = false;

$("#toggle-case-btn").click(function () {
  caseSensitive = !caseSensitive;
  $(this).toggleClass("active");

  // Re-run current search
  $("#search-input").trigger("input");
});

// In search logic:
const searchTerm = caseSensitive
  ? $("#search-input").val()
  : $("#search-input").val().toLowerCase();

// When comparing:
const nodeId = caseSensitive
  ? card.find(".node-id").text()
  : card.find(".node-id").text().toLowerCase();
```

### 1.5 Regex Search Support

**What:** Toggle to enable regex pattern matching
**Why:** Power users need pattern matching (e.g., `\d{4}` for years)
**Complexity:** Medium
**UI Location:** Toggle button next to search input

**Implementation:**

- Toggle button with icon (.\*)
- Try/catch for invalid regex
- Show error message for invalid patterns
- Visual indicator when regex mode active

**Technical Details:**

```javascript
let useRegex = false;

$("#toggle-regex-btn").click(function () {
  useRegex = !useRegex;
  $(this).toggleClass("active");
  $("#search-input").trigger("input");
});

// In search logic:
function matchesSearch(text, searchTerm) {
  if (!searchTerm) return true;

  if (useRegex) {
    try {
      const flags = caseSensitive ? "g" : "gi";
      const regex = new RegExp(searchTerm, flags);
      return regex.test(text);
    } catch (e) {
      // Invalid regex
      $("#search-error").text("Invalid regex pattern").show();
      return false;
    }
  } else {
    const compareText = caseSensitive ? text : text.toLowerCase();
    const compareTerm = caseSensitive ? searchTerm : searchTerm.toLowerCase();
    return compareText.includes(compareTerm);
  }
}
```

---

## Phase 2: Advanced Filter Panel

### 2.1 Filter Panel UI Structure

**What:** Collapsible panel below search bar with filter options
**Why:** Organize multiple filters without cluttering the main UI
**Complexity:** Medium
**UI Location:** Below toolbar, above content

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ 🔍 Search: [________________] [×] [Aa] [.*] [↑] [↓] │
│    "5 of 23 matches"                                │
│                                                     │
│ ▼ Advanced Filters [Clear All]                     │
│   ┌───────────────────────────────────────────┐   │
│   │ Node Type: [All Types ▼]                  │   │
│   │ Validation: [All ▼] [□ Valid □ Invalid]   │   │
│   │ Properties: [○ All ● SHACL ○ Extra]       │   │
│   │ Empty Values: [□ Hide empty properties]   │   │
│   │ Search Scope: [☑ Names ☑ Values ☑ IDs]   │   │
│   └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Implementation:**

- Collapsible section (chevron icon to expand/collapse)
- Remembers state (localStorage)
- Smooth animation when expanding/collapsing
- "Clear All" button to reset all filters

**Technical Details:**

```javascript
// Filter state
const filterState = {
  nodeTypes: [],
  validation: "all", // all, valid, invalid, modified, missing-required
  propertyStatus: "all", // all, shacl-only, extra-only
  hideEmpty: false,
  searchScope: ["names", "values", "ids"],
};

function saveFilterState() {
  localStorage.setItem("cdi-viewer-filters", JSON.stringify(filterState));
}

function loadFilterState() {
  const saved = localStorage.getItem("cdi-viewer-filters");
  if (saved) {
    Object.assign(filterState, JSON.parse(saved));
  }
}

// Apply all active filters
function applyFilters() {
  $(".node-card").each(function () {
    const card = $(this);
    let visible = true;

    // Check each filter
    visible = visible && passesNodeTypeFilter(card);
    visible = visible && passesValidationFilter(card);
    visible = visible && passesPropertyStatusFilter(card);
    visible = visible && passesEmptyValueFilter(card);

    if (visible) {
      card.removeClass("hidden-by-filter");
    } else {
      card.addClass("hidden-by-filter");
    }
  });

  updateActiveFilterBadge();
}
```

### 2.2 Filter by Node Type

**What:** Multi-select dropdown to filter by @type values
**Why:** Focus on specific node types (e.g., only Datasets)
**Complexity:** Medium

**Implementation:**

- Extract all unique @types from current document
- Multi-select dropdown (with checkboxes)
- "Select All" / "Deselect All" options
- Shows count of each type
- Updates when document changes

**Technical Details:**

```javascript
function extractNodeTypes() {
  const types = new Set();
  $(".node-card").each(function () {
    const typeText = $(this).find(".node-type").text();
    if (typeText) {
      types.add(typeText);
    }
  });
  return Array.from(types).sort();
}

function populateNodeTypeFilter() {
  const types = extractNodeTypes();
  const select = $("#node-type-filter");
  select.empty();

  types.forEach((type) => {
    const count = $(`.node-type:contains("${type}")`).length;
    select.append(`
      <label>
        <input type="checkbox" value="${type}" checked>
        ${type} (${count})
      </label>
    `);
  });
}

function passesNodeTypeFilter(card) {
  if (filterState.nodeTypes.length === 0) return true; // No filter = show all

  const nodeType = card.find(".node-type").text();
  return filterState.nodeTypes.includes(nodeType);
}
```

### 2.3 Filter by Validation Status

**What:** Filter nodes by validation state
**Why:** Focus on fixing errors or reviewing changes
**Complexity:** Medium

**Options:**

- All (no filter)
- Valid only (no validation errors)
- Invalid only (has validation errors)
- Modified only (has been edited)
- Missing required fields

**Implementation:**

- Radio buttons or dropdown
- Uses existing validation data
- Highlights count of each category
- Updates after validation runs

**Technical Details:**

```javascript
function passesValidationFilter(card) {
  const status = filterState.validation;
  if (status === "all") return true;

  if (status === "valid") {
    return !card.find(".validation-error").length;
  }
  if (status === "invalid") {
    return card.find(".validation-error").length > 0;
  }
  if (status === "modified") {
    return card.find(".modified").length > 0;
  }
  if (status === "missing-required") {
    return card.find(".required.empty").length > 0;
  }

  return true;
}

function updateValidationFilterCounts() {
  const counts = {
    valid: $(".node-card").not(":has(.validation-error)").length,
    invalid: $(".node-card:has(.validation-error)").length,
    modified: $(".node-card:has(.modified)").length,
    missingRequired: $(".node-card:has(.required.empty)").length,
  };

  // Update UI with counts
  $("#filter-valid").text(`Valid (${counts.valid})`);
  $("#filter-invalid").text(`Invalid (${counts.invalid})`);
  // etc.
}
```

### 2.4 Filter by Property Status

**What:** Show only SHACL-defined properties, extra properties, or both
**Why:** Focus on schema compliance or custom extensions
**Complexity:** Low (extends existing SHACL filter)

**Options:**

- All properties (default)
- SHACL-defined only
- Extra fields only

**Implementation:**

- Radio buttons
- Uses existing .extra-field class
- Hides properties, not entire nodes (unless node has no visible props)

**Technical Details:**

```javascript
function applyPropertyStatusFilter() {
  if (filterState.propertyStatus === "all") {
    $(".property-row").removeClass("hidden-by-filter");
  } else if (filterState.propertyStatus === "shacl-only") {
    $(".property-row.extra-field").addClass("hidden-by-filter");
    $(".property-row:not(.extra-field)").removeClass("hidden-by-filter");
  } else if (filterState.propertyStatus === "extra-only") {
    $(".property-row:not(.extra-field)").addClass("hidden-by-filter");
    $(".property-row.extra-field").removeClass("hidden-by-filter");
  }

  // Hide nodes with no visible properties
  $(".node-card").each(function () {
    const visibleProps = $(this).find(
      ".property-row:not(.hidden-by-filter)"
    ).length;
    if (visibleProps === 0) {
      $(this).addClass("hidden-by-filter-no-props");
    } else {
      $(this).removeClass("hidden-by-filter-no-props");
    }
  });
}
```

### 2.5 Hide Empty Properties

**What:** Toggle to hide properties with no values
**Why:** Reduce clutter, focus on populated data
**Complexity:** Low

**Implementation:**

- Checkbox toggle
- Hides properties where value is empty string, empty array, or null
- Shows count of hidden properties

**Technical Details:**

```javascript
function passesEmptyValueFilter(property) {
  if (!filterState.hideEmpty) return true;

  const value = property.find(".value-display").text().trim();
  const arrayItems = property.find(".array-value").length;

  return value !== "" || arrayItems > 0;
}

function applyEmptyValueFilter() {
  let hiddenCount = 0;

  $(".property-row").each(function () {
    if (filterState.hideEmpty && !passesEmptyValueFilter($(this))) {
      $(this).addClass("hidden-by-empty-filter");
      hiddenCount++;
    } else {
      $(this).removeClass("hidden-by-empty-filter");
    }
  });

  // Show count
  $("#empty-filter-count").text(
    hiddenCount > 0 ? `(${hiddenCount} hidden)` : ""
  );
}
```

### 2.6 Search Scope Selection

**What:** Choose what to search: property names, values, node IDs, or all
**Why:** More precise search results, faster for large documents
**Complexity:** Medium

**Options:**

- Property names
- Property values
- Node IDs
- Node types
- All (default)

**Implementation:**

- Checkboxes for each scope
- Must have at least one checked
- Updates search results immediately

**Technical Details:**

```javascript
// In search function:
const searchInNames = filterState.searchScope.includes("names");
const searchInValues = filterState.searchScope.includes("values");
const searchInIds = filterState.searchScope.includes("ids");
const searchInTypes = filterState.searchScope.includes("types");

$(".node-card").each(function () {
  const card = $(this);
  let matches = false;

  if (searchInIds) {
    const nodeId = card.find(".node-id").text();
    if (matchesSearch(nodeId, searchTerm)) matches = true;
  }

  if (searchInTypes) {
    const nodeType = card.find(".node-type").text();
    if (matchesSearch(nodeType, searchTerm)) matches = true;
  }

  if (searchInNames || searchInValues) {
    card.find(".property-row").each(function () {
      if (searchInNames) {
        const propName = $(this).find(".property-label").text();
        if (matchesSearch(propName, searchTerm)) matches = true;
      }
      if (searchInValues) {
        const propValue = $(this).find(".value-display").text();
        if (matchesSearch(propValue, searchTerm)) matches = true;
      }
    });
  }

  // Show/hide card based on matches
  if (matches) {
    card.removeClass("hidden-by-search");
  } else {
    card.addClass("hidden-by-search");
  }
});
```

---

## Phase 3: Visual Enhancements

### 3.1 Active Filter Badge

**What:** Visual indicator showing number of active filters
**Why:** User needs to know filters are active
**Complexity:** Low

**Implementation:**

- Badge next to "Advanced Filters" text
- Shows count (e.g., "3 active")
- Changes color when filters active
- Click to expand filter panel

**Technical Details:**

```javascript
function updateActiveFilterBadge() {
  let count = 0;

  if (filterState.nodeTypes.length > 0) count++;
  if (filterState.validation !== "all") count++;
  if (filterState.propertyStatus !== "all") count++;
  if (filterState.hideEmpty) count++;
  if (filterState.searchScope.length < 4) count++; // Not all scopes

  const badge = $("#active-filter-badge");
  if (count > 0) {
    badge.text(`${count} active`).show();
  } else {
    badge.hide();
  }
}
```

### 3.2 Filter Animation

**What:** Smooth fade-in/fade-out when filtering
**Why:** Better UX, less jarring
**Complexity:** Low

**Implementation:**

- CSS transitions on visibility changes
- Subtle scale/opacity animation
- Preserve scroll position when possible

**CSS:**

```css
.node-card {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.node-card.hidden-by-filter,
.node-card.hidden-by-search {
  opacity: 0;
  transform: scale(0.95);
  height: 0;
  overflow: hidden;
  margin: 0;
}
```

### 3.3 Empty State Messages

**What:** Helpful messages when filters/search return no results
**Why:** User knows it's working, just no matches
**Complexity:** Low

**Messages:**

- "No matches found. Try different search terms."
- "No nodes match the current filters. Try adjusting filters."
- "This document has no [node type]."

**Implementation:**

```javascript
function showEmptyState() {
  const visibleCards = $(
    ".node-card:not(.hidden-by-filter):not(.hidden-by-search)"
  );

  if (visibleCards.length === 0) {
    let message = "No results found.";

    if ($("#search-input").val()) {
      message =
        "No matches found. Try different search terms or adjust filters.";
    } else if (getActiveFilterCount() > 0) {
      message = "No nodes match the current filters.";
    }

    $("#empty-state")
      .html(
        `
      <div class="alert alert-info" style="margin: 20px;">
        <span class="glyphicon glyphicon-info-sign"></span>
        ${message}
      </div>
    `
      )
      .show();
  } else {
    $("#empty-state").hide();
  }
}
```

---

## Implementation Order (Recommended)

### Sprint 1: Quick Wins (2-3 hours)

1. ✅ Search result counter (30 min)
2. ✅ Clear search button (30 min)
3. ✅ Case sensitivity toggle (30 min)
4. ✅ Navigate between matches (1-1.5 hours)

**Deliverable:** Enhanced search with better UX

### Sprint 2: Regex & Filter Panel Foundation (2-3 hours)

5. ✅ Regex search support (1 hour)
6. ✅ Filter panel UI structure (1 hour)
7. ✅ Active filter badge (30 min)
8. ✅ Clear all filters button (30 min)

**Deliverable:** Advanced search and filter panel ready for filters

### Sprint 3: Core Filters (3-4 hours)

9. ✅ Filter by node type (1.5 hours)
10. ✅ Filter by validation status (1 hour)
11. ✅ Filter by property status (1 hour)
12. ✅ Hide empty properties (30 min)

**Deliverable:** All major filters working

### Sprint 4: Polish & Advanced Features (2-3 hours)

13. ✅ Search scope selection (1 hour)
14. ✅ Filter animations (30 min)
15. ✅ Empty state messages (30 min)
16. ✅ Save filter state (localStorage) (30 min)
17. ✅ Testing and bug fixes (1 hour)

**Deliverable:** Complete, polished search & filter system

---

## Testing Checklist

### Search

- [ ] Basic text search works
- [ ] Case sensitive toggle works correctly
- [ ] Regex mode accepts valid patterns
- [ ] Regex mode shows error for invalid patterns
- [ ] Search counter shows correct count
- [ ] Navigate next/previous works
- [ ] Navigate wraps around at end
- [ ] Current match is highlighted differently
- [ ] Clear button clears search
- [ ] Keyboard shortcuts work (Enter, F3, Shift+F3)

### Filters

- [ ] Filter panel expands/collapses
- [ ] Node type filter shows all types
- [ ] Node type multi-select works
- [ ] Validation filter shows correct counts
- [ ] Property status filter works
- [ ] Hide empty properties works
- [ ] Search scope checkboxes work
- [ ] Active filter badge shows correct count
- [ ] Clear all filters resets everything
- [ ] Filter state persists across page reloads

### Combinations

- [ ] Search + node type filter works
- [ ] Search + validation filter works
- [ ] Multiple filters work together
- [ ] Filters update after validation runs
- [ ] Filters update after editing
- [ ] Empty state messages appear correctly

### Performance

- [ ] Search is fast on large documents (100+ nodes)
- [ ] Filtering is smooth (no lag)
- [ ] Animations don't cause jank

---

## CSS Classes to Add

```css
/* Search enhancements */
.current-search-match {
  box-shadow: 0 0 0 3px #007bff !important;
  animation: pulse 1s ease-in-out;
}

.search-controls {
  display: flex;
  gap: 5px;
  align-items: center;
}

.search-counter {
  font-size: 12px;
  color: #6c757d;
  margin-left: 5px;
}

.clear-search-btn {
  position: absolute;
  right: 5px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #6c757d;
  cursor: pointer;
  padding: 5px;
}

.clear-search-btn:hover {
  color: #dc3545;
}

/* Filter panel */
.filter-panel {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 15px;
  margin-bottom: 15px;
}

.filter-panel.collapsed {
  padding-bottom: 0;
}

.filter-row {
  margin-bottom: 10px;
}

.filter-label {
  font-weight: bold;
  display: block;
  margin-bottom: 5px;
}

.active-filter-badge {
  background: #007bff;
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  margin-left: 5px;
}

/* Filter effects */
.node-card.hidden-by-filter,
.node-card.hidden-by-search,
.property-row.hidden-by-filter,
.property-row.hidden-by-empty-filter {
  display: none;
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #6c757d;
}

.empty-state .glyphicon {
  font-size: 48px;
  margin-bottom: 20px;
  opacity: 0.3;
}
```

---

## API/Function Signatures

```javascript
// Search functions
function performSearch(searchTerm, options = {}) {}
function navigateToMatch(direction) {} // "next" or "previous"
function highlightSearchMatches(container, searchTerm) {}
function clearSearch() {}

// Filter functions
function applyFilters() {}
function applyNodeTypeFilter() {}
function applyValidationFilter() {}
function applyPropertyStatusFilter() {}
function applyEmptyValueFilter() {}
function clearAllFilters() {}

// State management
function saveFilterState() {}
function loadFilterState() {}
function getActiveFilterCount() {}

// UI updates
function updateSearchCounter() {}
function updateActiveFilterBadge() {}
function updateValidationFilterCounts() {}
function showEmptyState(message) {}
function hideEmptyState() {}

// Helpers
function matchesSearch(text, searchTerm, useRegex, caseSensitive) {}
function extractNodeTypes() {}
function getValidationStatus(nodeCard) {}
```

---

## Notes & Considerations

### Performance

- Consider debouncing search input (currently runs on every keystroke)
- For very large documents (500+ nodes), consider virtual scrolling
- Cache extracted node types to avoid recalculating on every filter change

### Accessibility

- Ensure keyboard navigation works throughout
- ARIA labels for screen readers
- Visible focus indicators
- Announce filter results to screen readers

### Mobile Responsiveness

- Filter panel should stack vertically on small screens
- Search controls should remain usable on mobile
- Consider collapsing filter panel by default on mobile

### Future Enhancements (Not in Current Plan)

- Save/load filter presets
- Share filtered view via URL parameters
- Export filtered results
- Filter by property path patterns
- Filter by date ranges
- Statistical summary of filtered results

### Edge Cases to Handle

- Empty documents (no nodes)
- Invalid regex patterns (show error, don't break)
- All nodes filtered out (show helpful message)
- Search while editing (don't lose focus)
- Filters applied during validation (update counts)
