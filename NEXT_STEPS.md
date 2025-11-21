# Next Steps

## ✅ Recently Completed (November 2025)

### SPARQL Target Support
- ✅ Implemented SPARQL target support in shacl-engine (~60 lines, 3 files)
- ✅ Added `sh:target` detection in UI for property classification
- ✅ Properties from SPARQL-targeted shapes now show as "SHACL-defined" (blue badges)
- ✅ Validated with CDIF Discovery shapes - working correctly in production

### Deployment & Build
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
- ✅ Collapsible UI section
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
- ✅ "Add new namespace" integration (scrolls to namespace section)
- ✅ No more popup prompts for custom items
- ✅ Enter key support for quick adding

### UI Improvements (November 2025)
- ✅ Export button changed to green (consistent with I/O actions)
- ✅ Add Root Node button moved to bottom of form (logical placement)

## 🎯 Current Sprint (In Progress)

### Undo/Redo Functionality (HIGH PRIORITY)
**Goal:** Allow users to undo/redo changes while editing

- Implement state history management
- Track all edit operations (add, delete, modify)
- Undo/Redo buttons in toolbar
- Keyboard shortcuts (Ctrl+Z, Ctrl+Y / Cmd+Z, Cmd+Shift+Z)
- Visual feedback for undo/redo actions
- Clear history on file load
- Limit history size (e.g., last 50 actions)

### Advanced Search and Filter (HIGH PRIORITY)
**Goal:** Help users find and navigate complex JSON-LD documents

- Enhanced search functionality:
  - Search in property names and values
  - Filter by node type
  - Filter by validation status (valid/invalid/modified)
  - Show/hide empty properties
  - Jump to search results
- Filter controls in toolbar
- Real-time filtering/highlighting
- Clear filters button
- Search result counter

## 🎯 Next Steps After Current Sprint

### 1. Comprehensive Testing (HIGH PRIORITY)
**Goal:** Validate all functionality before PR submissions

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

**End-to-End Workflows:**
- Load → enable edit → modify properties → save → verify
- Create new document → add nodes → add properties → export
- Load file → validate → fix violations → re-validate
- Add namespace → use in custom property → save → reload

**UI/UX Testing:**
- Undo/Redo operations
- Search and filter functionality
- All button visibility states
- Modal interactions
- Keyboard shortcuts

### 2. Repository Polish (MEDIUM PRIORITY)
**Goal:** Professional presentation for PR submissions

- Add GitHub topics: `json-ld`, `rdf`, `shacl`, `dataverse`, `ddi-cdi`, `metadata`, `semantic-web`
- Update repository description
- Ensure README is up-to-date with new features
- Clean up TODO comments
- Update screenshots/demos if needed

### 3. Submit PR to dataverse-previewers (MEDIUM PRIORITY)
**Goal:** Share CDI Viewer with Dataverse community

- Submit PR to gdcc/dataverse-previewers with:
  - Clear description of features
  - Bundle integration
  - Testing evidence
  - Documentation
  - Link to cdi-viewer repository

### 4. Submit PR to rdf-ext/shacl-engine (MEDIUM PRIORITY)
**Goal:** Contribute SPARQL target support upstream

- Update shacl-engine README with SPARQL target documentation
- Submit PR with:
  - ~60 lines of SPARQL target implementation
  - Test cases
  - Documentation updates
  - Reference to cdi-viewer usage

### 5. Test Coverage (LONG-TERM)
**Goal:** Ensure code quality and prevent regressions

- Increase test coverage for core modules
- Add integration tests
- Set up coverage reporting
- Add pre-commit hooks
- Target: >80% coverage

## 🔮 Future Enhancements (After PRs)

### Feature Ideas (Lower Priority)
- Export to different formats (Turtle, N-Triples, RDF/XML)
- Import from SPARQL endpoint
- Batch editing capabilities
- Property value autocomplete from ontologies
- Visual graph view of references
- Collaborative editing features
- Version history and diff views

### Production Considerations (Long-term)
- Security review
- Performance optimization
- Comprehensive error handling
- User acceptance testing
- Documentation for administrators
- Support plan
