# Next Steps

## ✅ Recently Completed (November 2025)

### Advanced Search (November 21, 2025)

- ✅ **Enhanced Search:**
  - Search counter showing "X of Y matches"
  - Clear button with fade animations
  - Case-sensitive toggle (Aa button)
  - Regex search support (.\* button) with error handling
  - Previous/Next navigation buttons
  - Keyboard shortcuts: F3, Shift+F3, Enter
  - Current match highlighting with pulse animation
  - Modular architecture (advanced-search.js)

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
- Search → navigate matches → modify → save

**UI/UX Testing:**

- Advanced search (case/regex, navigation, keyboard shortcuts)
- All button visibility states
- Modal interactions
- Namespace management

### 2. Bug Fixes (HIGH PRIORITY)

**Goal:** Fix any issues discovered during testing

**Failing Tests by Priority:**

**Critical (Affects Core Functionality):**

1. "Changed" marking disappears on mode toggle (1 test in editing.spec.ts)
   - Visual teal highlight removed when switching edit/view mode
   - Data is preserved but visual indicator lost
2. Validation status becomes hidden after shape switch (1 test in validation.spec.ts)
   - Switching between different SHACL shape sources

**High Priority (User Experience Issues - 10 tests):**

3. Array operations not working correctly (4 tests in array-operations.spec.ts)

- Display array values correctly
- Add values to array
- Remove values from array
- Validate array operations preserve data integrity

4. Export doesn't preserve user changes (3 tests in export.spec.ts)
- Export modified data with all changes
- Export with new namespaces
- Handle export with validation errors present

5. Namespace validation not working (3 tests in namespace-management.spec.ts)
   - Validate duplicate prefix rejection
   - Validate invalid prefix format
   - Toggle namespace section visibility

6. Custom property UI issues (6 tests in custom-property-ui.spec.ts)
   - Show inline add component for all nodes
   - Show namespace selector in add component
   - Allow custom property name input
   - Add button triggers property addition
   - Clear input after successful add
   - Show error for invalid property names

**Medium Priority (Test Infrastructure & Edge Cases - 33 tests):**

7. Custom namespace property addition tests (7 tests in custom-namespace-properties.spec.ts)

- **NOTE**: Feature works correctly (manually verified) - tests use wrong CSS selectors
- **FIX NEEDED**: Update tests to use `[data-testid="property-path"]` instead of `.property-name`
- Add custom property to custom namespace node using inline UI
- Add custom property without prefix to custom namespace node
- Add multiple custom properties to same custom node
- Edit custom property value in custom namespace node
- Delete custom property from custom namespace node
- Add complex property (node reference) to custom namespace node
- Handle Enter key in custom property input

8. Document creation tests need selector refinement (8 tests in document-creation.spec.ts)
    - Feature exists but automated tests have timing/selector issues
    - Add Root Node dropdown, buttons not being found
9. Dataverse save workflow tests (4 tests in save-to-dataverse.spec.ts)
    - Save modal structure different than expected
    - Feature works manually, needs selector updates
10. Dataverse load workflow tests (3 tests in load-from-dataverse.spec.ts)
    - Load from Dataverse button selectors
    - API token input handling
    - Multiple URL format parsing
11. Integrated mode tests (2 tests in integrated-mode.spec.ts)
    - Pre-fill filename in save modal
    - Handle missing fileId parameter
12. Error handling tests (2 tests in error-handling.spec.ts)
    - Handle invalid JSON-LD file (missing test fixture)
    - Handle network error when loading shapes
13. Cross-browser compatibility tests (3 tests in compatibility.spec.ts)
    - Edit mode change tracking timing
    - Export download handling
    - Collapse/expand class application
14. Responsive design tests (4 tests in responsive.spec.ts)
    - Mobile view layout (375px)
    - Tablet view controls (768px)
    - Desktop view layout (1920px)
    - Touch interactions

**Total: 45 failing tests out of 124 (79 passing, 64% pass rate)**

**Action Plan:**

- Address Critical tests first (2 tests) - core functionality blockers
- Then High Priority tests (10 tests) - user experience issues
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
