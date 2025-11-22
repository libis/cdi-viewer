# Next Steps

## ✅ Recently Completed (November 2025)

### Advanced Search & Filter (November 21, 2025)

- ✅ **Enhanced Search:**
  - Search counter showing "X of Y matches"
  - Clear button with fade animations
  - Case-sensitive toggle (Aa button)
  - Regex search support (.\* button) with error handling
  - Previous/Next navigation buttons
  - Keyboard shortcuts: F3, Shift+F3, Enter
  - Current match highlighting with pulse animation
  - Integration with filter scope selection
- ✅ **Advanced Filter Panel:**
  - Collapsible panel with chevron toggle
  - Active filter badge showing count of active filters
  - Node type multi-select filter with counts
  - Validation status filter (all/valid/invalid/modified/missing required)
  - Property status filter (all/SHACL only/extra only)
  - Hide empty properties toggle
  - Search scope selection (names/values/IDs/types)
  - Clear all filters button
- ✅ **Integration & Persistence:**
  - LocalStorage state persistence across sessions
  - Auto-update after validation runs
  - All filters work together correctly
  - CSS classes for all filter types
  - Modular architecture (advanced-search.js, advanced-filter.js)

### SPARQL Target Support (November 2025)

- ✅ Implemented SPARQL target support in shacl-engine (~60 lines, 3 files)
- ✅ Added `sh:target` detection in UI for property classification
- ✅ Properties from SPARQL-targeted shapes now show as "SHACL-defined" (blue badges)
- ✅ Validated with CDIF Discovery shapes - working correctly in production

### Deployment & Build (November 2025)

- ✅ GitHub Actions workflow for automated builds and deployment
- ✅ Vendored shacl-engine with SPARQL support for independence
- ✅ N3 and jsonld exposed globally in bundle
- ✅ Live deployment at https://libis.github.io/cdi-viewer/
- ✅ KU Leuven favicon added

### Dataverse Integration (November 2025)

- ✅ Created single optimized bundle (1.2 MB) for dataverse-previewers
- ✅ Updated CdiPreview.html to use bundle
- ✅ Removed individual JS files (now bundled)
- ✅ Updated CDIF shapes with SPARQL target support
- ✅ **Save to Dataverse functionality:**
  - Replace existing file API integration
  - Add new file to dataset API integration
  - URL parser supporting 6 Dataverse URL formats (JSF, SPA, API)
  - Real-time URL validation with feedback
  - API token support for unpublished files
  - Filename suggestions from original file
- ✅ **Load from Dataverse functionality:**
  - Load button with URL input
  - Support for file URLs (all formats)
  - Optional API token for unpublished files
  - Automatic state transition to integrated mode
- ✅ **Save button visibility:**
  - Always visible in standalone mode (view + edit)
  - Only visible in edit mode for integrated mode
  - Shows on initial page load in standalone

### Namespace Management (November 2025)

- ✅ View current namespace prefixes from @context
- ✅ Add custom namespace prefixes with validation
- ✅ Remove custom namespaces (built-in protected)
- ✅ Modal-based UI (no scroll behavior)
- ✅ Collapsible namespace section in main UI
- ✅ Integration with property/node creation

### Document Creation (November 2025)

- ✅ Create new empty documents from scratch
- ✅ Shape-specific contexts and filenames
- ✅ Support for DDI-CDI, CDIF, DCAT-AP, DataCube, SKOS, generic
- ✅ Automatic initialization when adding root node to empty state

### Unified Add Component (November 2025)

- ✅ Consistent UX for adding properties and root nodes
- ✅ SHACL-defined items dropdown with descriptions
- ✅ Custom input section with namespace selector
- ✅ "Add new namespace" integration (opens modal directly)
- ✅ No more popup prompts for custom items
- ✅ Enter key support for quick adding
- ✅ Add Root Node inline component (not modal)

### UI Improvements (November 2025)

- ✅ Export button changed to green (consistent with I/O actions)
- ✅ Add Root Node button moved to bottom of form (inline component)

## 🎯 Current Focus

### Feature Freeze Declared (November 21, 2025)

All planned features for v1.0 release have been implemented. Focus now on:

- Documentation updates (ensuring all .md files reflect current state)
- Comprehensive testing
- Bug fixes only (no new features)

## 🎯 Next Steps After Feature Freeze

### 1. Comprehensive Testing (HIGH PRIORITY)

**Goal:** Validate all functionality before release

**Integrated Mode Testing:**

- Load viewer with fileId and siteUrl parameters
- Verify URL field hidden in save modal
- Verify filename pre-filled from metadata
- Test file replacement with API token
- Test error handling

**Standalone Mode Testing:**

- Load from Dataverse button functionality
- Save to Dataverse (replace + add to dataset)
- Create new documents and save
- Namespace management workflow
- Custom properties with namespace prefixes
- Advanced search and filter features

**End-to-End Workflows:**

- Load → enable edit → modify properties → save → verify
- Create new document → add nodes → add properties → export
- Load file → validate → fix violations → re-validate
- Add namespace → use in custom property → save → reload
- Search with filters → navigate matches → modify → save

**UI/UX Testing:**

- Advanced search (case/regex, navigation, keyboard shortcuts)
- Filter panel (all filter types, persistence)
- All button visibility states
- Modal interactions
- Namespace management

### 2. Bug Fixes (HIGH PRIORITY)

**Goal:** Fix any issues discovered during testing

**Failing Tests by Priority:**

**Critical (Affects Core Functionality - 11 tests):**
1. Property addition to custom namespace nodes not working (7 tests in custom-namespace-properties.spec.ts)
   - **BUG**: Adding properties to nodes with custom namespace types (e.g., myns:CustomType) fails
   - Add custom property to custom namespace node using inline UI
   - Add custom property without prefix to custom namespace node
   - Add multiple custom properties to same custom node
   - Edit custom property value in custom namespace node
   - Delete custom property from custom namespace node
   - Add complex property (node reference) to custom namespace node
   - Show validation for empty custom property name
   - **NOTE**: Regular DDI-CDI property addition works fine - only custom namespace nodes affected
2. Advanced filtering broken (10 tests in search-filter.spec.ts)
   - Filter by validation status (valid/invalid)
   - Filter by property status (SHACL/extra)
   - Combined filters
   - Clear all filters
   - Filter persistence in localStorage
   - Filter count badge
   - Bottom-up filtering (parent visibility)
   - Search and filter independence
3. "Changed" marking disappears on mode toggle (1 test in editing.spec.ts)
   - Visual teal highlight removed when switching edit/view mode
   - Data is preserved but visual indicator lost
4. Validation status becomes hidden after shape switch (1 test in validation.spec.ts)
   - Switching between different SHACL shape sources

**High Priority (User Experience Issues - 17 tests):**
5. Array operations not working correctly (4 tests in array-operations.spec.ts)
   - Display array values correctly
   - Add values to array
   - Remove values from array
   - Validate array operations preserve data integrity
6. Export doesn't preserve user changes (3 tests in export.spec.ts)
   - Export modified data with all changes
   - Export with new namespaces
   - Handle export with validation errors present
7. Filter combination bugs (3 tests in filter-combination-bugs.spec.ts)
   - Maintain filter functionality after multiple validation status changes
   - Maintain filters after adding custom properties
   - Verify combined filters work correctly
8. Namespace validation not working (3 tests in namespace-management.spec.ts)
   - Validate duplicate prefix rejection
   - Validate invalid prefix format
   - Toggle namespace section visibility
9. Custom property UI issues (6 tests in custom-property-ui.spec.ts)
   - Show inline add component for all nodes
   - Show namespace selector in add component
   - Allow custom property name input
   - Add button triggers property addition
   - Clear input after successful add
   - Show error for invalid property names

**Medium Priority (Test Infrastructure & Edge Cases - 33 tests):**
10. Document creation tests need selector refinement (8 tests in document-creation.spec.ts)
    - Feature exists but automated tests have timing/selector issues
    - Add Root Node dropdown, buttons not being found
11. Dataverse save workflow tests (4 tests in save-to-dataverse.spec.ts)
    - Save modal structure different than expected
    - Feature works manually, needs selector updates
12. Dataverse load workflow tests (3 tests in load-from-dataverse.spec.ts)
    - Load from Dataverse button selectors
    - API token input handling
    - Multiple URL format parsing
13. Integrated mode tests (2 tests in integrated-mode.spec.ts)
    - Pre-fill filename in save modal
    - Handle missing fileId parameter
14. Error handling tests (2 tests in error-handling.spec.ts)
    - Handle invalid JSON-LD file (missing test fixture)
    - Handle network error when loading shapes
15. Cross-browser compatibility tests (3 tests in compatibility.spec.ts)
    - Edit mode change tracking timing
    - Export download handling
    - Collapse/expand class application
16. Responsive design tests (4 tests in responsive.spec.ts)
    - Mobile view layout (375px)
    - Tablet view controls (768px)
    - Desktop view layout (1920px)
    - Touch interactions

**Total: 61 failing tests out of 137 (76 passing, 55% pass rate)**

**Action Plan:**
- Address Critical tests first (11 tests) - core functionality blockers
- Then High Priority tests (17 tests) - user experience issues
- Medium Priority tests last (33 tests) - mostly test infrastructure refinement
- Regression testing after each fix
- Performance optimization if needed

### 3. Repository Polish (MEDIUM PRIORITY)

**Goal:** Professional presentation for release

- Add GitHub topics: `json-ld`, `rdf`, `shacl`, `dataverse`, `ddi-cdi`, `metadata`, `semantic-web`
- Update repository description
- Ensure all documentation is current (✅ In Progress)
- Clean up TODO comments
- Update screenshots/demos if needed

### 4. Release v1.0 (HIGH PRIORITY)

**Goal:** Official release with all features

- Create release notes
- Tag version 1.0
- Publish to GitHub Pages
- Announce in Dataverse community

### 5. Submit PR to dataverse-previewers (MEDIUM PRIORITY)

**Goal:** Share CDI Viewer with Dataverse community

- Submit PR to gdcc/dataverse-previewers with:
  - Clear description of features
  - Bundle integration
  - Testing evidence
  - Documentation
  - Link to cdi-viewer repository

### 6. Submit PR to rdf-ext/shacl-engine (MEDIUM PRIORITY)

**Goal:** Contribute SPARQL target support upstream

- Update shacl-engine README with SPARQL target documentation
- Submit PR with:
  - ~60 lines of SPARQL target implementation
  - Test cases
  - Documentation updates
  - Reference to cdi-viewer usage

## 🔮 Future Enhancements (Post-v1.0)

### Undo/Redo Functionality (Priority: High)

**Goal:** Allow users to undo/redo changes while editing

- Implement state history management
- Track all edit operations (add, delete, modify)
- Undo/Redo buttons in toolbar
- Keyboard shortcuts (Ctrl+Z, Ctrl+Y / Cmd+Z, Cmd+Shift+Z)
- Visual feedback for undo/redo actions
- Clear history on file load
- Limit history size (e.g., last 50 actions)

### Test Coverage (Priority: Medium)

**Goal:** Ensure code quality and prevent regressions

- Increase test coverage for core modules
- Add integration tests for new features
- Set up coverage reporting
- Add pre-commit hooks
- Target: >80% coverage

### Additional Feature Ideas (Lower Priority)

- Export to different formats (Turtle, N-Triples, RDF/XML)
- Import from SPARQL endpoint
- Batch editing capabilities
- Property value autocomplete from ontologies
- Visual graph view of references
- Collaborative editing features
- Version history and diff views

### Production Considerations (Long-term)

- Security review
- Performance optimization for large files
- Comprehensive error handling
- User acceptance testing
- Documentation for administrators
- Support plan
