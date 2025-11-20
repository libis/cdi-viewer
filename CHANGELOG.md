# Changelog

All notable changes to the CDI Viewer project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Pending

- End-to-end testing of all features
- Dataverse integration testing
- GitHub repository enhancements (topics, description)

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
