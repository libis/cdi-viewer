# Changelog

All notable changes to the CDI Viewer project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added (November 21, 2025)

**Advanced Search & Filter System**

- Enhanced search functionality with multiple modes:
  - Search counter displaying "X of Y matches"
  - Clear button with smooth fade animations
  - Case-sensitive toggle (Aa button)
  - Regex search support (.* button) with error handling
  - Previous/Next navigation buttons
  - Keyboard shortcuts: F3, Shift+F3, Enter
  - Current match highlighting with pulse animation
- Advanced filter panel with comprehensive filtering:
  - Collapsible panel with chevron icon
  - Active filter badge showing count
  - Node type multi-select filter with item counts
  - Validation status filter (all/valid/invalid/modified/missing required)
  - Property status filter (all/SHACL only/extra only)
  - Hide empty properties toggle
  - Search scope selection (names/values/IDs/types)
  - Clear all filters button
- Integration and persistence:
  - LocalStorage state persistence across sessions
  - Auto-updates after validation runs
  - All filters work together seamlessly
  - Modular architecture: `advanced-search.js`, `advanced-filter.js`

**Namespace Management**

- View current namespace prefixes from @context
- Add custom namespace prefixes with validation
- Remove custom namespaces (built-in prefixes protected)
- Modal-based UI without scroll behavior
- Collapsible namespace section in main interface
- Full integration with property and node creation

**Document Creation from Scratch**

- Create new empty JSON-LD documents
- Shape-specific default contexts and filenames
- Support for DDI-CDI, CDIF, DCAT-AP, DataCube, SKOS, and generic vocabularies
- Automatic initialization when adding first root node

**Unified Add Component**

- Consistent UX for adding both properties and root nodes
- SHACL-defined items dropdown with descriptions
- Custom input section with namespace selector
- "Add new namespace" option opens modal directly
- No more popup prompts for custom items
- Enter key support for quick adding
- Add Root Node as inline component (not modal popup)

**UI Improvements**

- Export button changed to green (consistent with I/O actions)
- Add Root Node button repositioned to bottom of form as inline component
- Save button visibility logic refined:
  - Standalone mode: Always visible (view + edit)
  - Integrated mode: Only visible in edit mode

**SPARQL Target Support**

- Implemented SPARQL target support in vendored shacl-engine (~60 lines, 3 files modified)
- Added `sh:target` detection in UI property classification and suggestions
- Properties from SPARQL-targeted shapes now correctly identified as "SHACL-defined"
- Updated CDIF Discovery shapes to use SPARQL targets for root-only dataset validation
- Validation confirmed: 1 violation on root dataset, nested datasets correctly ignored

**Build & Deployment**

- GitHub Actions workflow for automated build and deployment
- N3 and jsonld libraries now exposed globally (`window.N3`, `window.jsonld`)
- KU Leuven favicon added
- Vendored shacl-engine for deployment independence
- Live deployment: https://libis.github.io/cdi-viewer/

**Dataverse Integration**

- Created optimized single bundle (1.2 MB) for dataverse-previewers
- Updated CdiPreview.html to use bundle instead of individual JS files
- Removed 10+ individual JS files (now bundled)
- Updated CSS and SHACL shapes
- Tested locally - validation working correctly with SPARQL targets
- Save to Dataverse functionality:
  - Replace existing file API integration
  - Add new file to dataset API integration
  - URL parser supporting 6 Dataverse URL formats (JSF, SPA, API)
  - Real-time URL validation with feedback
  - API token support for unpublished files
  - Filename suggestions from original file
- Load from Dataverse functionality:
  - Load button with URL input
  - Support for file URLs (all formats)
  - Optional API token for unpublished files
  - Automatic state transition to integrated mode

### Technical

- Modified shacl-engine files: `Validator.js`, `lib/Shape.js`, `lib/TargetResolver.js`
- Vendored copy: `vendor/shacl-engine/` (~50 KB)
- Bundle exposes: N3.js, jsonld.js, shacl-engine, all viewer modules
- GitHub Actions builds fresh on every push to main
- New modules:
  - `src/jsonld-editor/advanced-search.js` (~240 lines)
  - `src/jsonld-editor/advanced-filter.js` (~340 lines)
  - `src/jsonld-editor/unified-add-component.js`
  - `src/jsonld-editor/namespace-manager.js`
- CSS enhancements:
  - `.current-search-match` with pulse animation
  - `.active-filter-badge`, `.filter-panel` styles
  - All `hidden-by-*` classes for filtering

### Fixed

- Namespace add option no longer scrolls page
- Add Root Node now inline component for consistency
- Filter state persists across page reloads

### Documentation

- Created `ADVANCED_SEARCH_FILTER_PLAN.md` with implementation details
- Updated all major .md files with November 2025 features
- Ensured consistency across documentation

### Pending

- Comprehensive end-to-end testing of all features
- Submit PR to rdf-ext/shacl-engine with SPARQL target support

## [1.0.0] - TBD

### Added

**Modern ES6 Architecture**

- Modular codebase with proper imports/exports
- Centralized state management
- Rollup bundler producing single 1.2MB bundle with source maps
- SHACL validation with SPARQL support (shacl-engine)

**Generic JSON-LD Support**

- Works with any RDF vocabulary (DDI-CDI, schema.org, DCAT, DataCube, SKOS, custom)
- Dynamic SHACL shape loading from URL
- Standard JSON-LD processing (jsonld.js)
- Auto-detection of DDI-CDI mode
- Default mode: DDI-CDI shapes preload automatically
- Generic mode: `?shacl=generic` for vocabulary-agnostic editing

**Advanced Editing**

- Smart input types based on SHACL datatype constraints
- Complex object creation with nested nodes and references
- Array operations: convert single↔array, add/remove values
- Reference management: link existing nodes or create blank nodes
- Property suggestions with SHACL-based classification
- Cardinality enforcement and delete protection
- Custom property addition

**Enhanced Discoverability**

- 22 npm keywords for better search visibility
- Comprehensive README emphasizing generic capabilities
- Complete generic usage guide (8,500+ words)
- Use case examples for multiple vocabularies

**Deployment**

- GitHub Pages deployment (https://libis.github.io/cdi-viewer/)
- Dataverse integration ready
- Dual-mode operation (standalone + embedded)

### Technical Stack

- ES6 modules with Rollup bundler
- jQuery 3.7.1 + Bootstrap 3.3.7
- N3.js 1.16.x for RDF processing
- jsonld.js for JSON-LD normalization
- shacl-engine for SHACL validation with SPARQL
- ESLint 8.57.0 + Prettier 3.2.5 for code quality

### Quality

- 0 ESLint errors/warnings
- Prettier code formatting
- Clean modular architecture
- Comprehensive documentation

### Credits

Developed by **LIBIS @ KU Leuven**

### License

Apache License 2.0

[Unreleased]: https://github.com/libis/cdi-viewer/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/libis/cdi-viewer/releases/tag/v1.0.0
