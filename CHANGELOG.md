# Changelog

All notable changes to the CDI Viewer project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added (November 21, 2025)

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

### Technical

- Modified shacl-engine files: `Validator.js`, `lib/Shape.js`, `lib/TargetResolver.js`
- Vendored copy: `vendor/shacl-engine/` (~50 KB)
- Bundle exposes: N3.js, jsonld.js, shacl-engine, all viewer modules
- GitHub Actions builds fresh on every push to main

### Pending

- End-to-end testing of all features
- Dataverse integration testing in production
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
