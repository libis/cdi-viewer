# Next Steps

## ✅ Recently Completed (November 2025)

### Advanced Search & Filter (November 21, 2025)
- ✅ **Enhanced Search:**
  - Search counter showing "X of Y matches"
  - Clear button with fade animations
  - Case-sensitive toggle (Aa button)
  - Regex search support (.* button) with error handling
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

- Address bugs found in testing phase
- Regression testing after fixes
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
