# Changelog

All notable changes to the CDI Viewer project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Initial Repository Setup

- Moved CDI Previewer code from [dataverse-previewers](https://github.com/gdcc/dataverse-previewers) to standalone repository
- Set up professional development infrastructure
- Created comprehensive documentation

## [1.0.0] - TBD

### Added

- **Build System**: Rollup configuration with custom concatenation plugin
  - Single minified bundle: `dist/cdi-viewer.min.js` (44KB)
  - Source maps for debugging
  - External dependencies loaded from CDN (jQuery, Bootstrap, N3.js, jsonld.js, rdf-validate-shacl)

- **Testing Infrastructure**: Jest with JSDOM
  - 26 regression tests (all passing)
  - Tests for core functionality, property classification, SHACL shapes, context resolution
  - Code coverage reporting configured
  - Prevents regressions: editMode bug, undefined variables, URL parsing issues

- **Code Quality**: ESLint + Prettier
  - 0 linting errors
  - Consistent code style across all modules
  - Pre-commit hooks ready to configure

- **Documentation**:
  - `README.md` - Comprehensive user guide with badges, features, quick start
  - `ARCHITECTURE.md` - 6000+ word technical guide for developers
  - `CONTRIBUTING.md` - Development workflow, testing requirements, PR process
  - `plan.md` - 10-phase execution roadmap

- **Development Tools**:
  - `npm run dev` - Local development server (port 8000)
  - `npm run build` - Production bundle creation
  - `npm test` - Run all tests
  - `npm run lint` - Code quality checks
  - `test-bundle.html` - Bundle testing page

- **Deployment Modes**:
  - Standalone mode (GitHub Pages): `index.html` with individual JS files
  - Production mode: `test-bundle.html` with bundled `dist/cdi-viewer.min.js`
  - Dataverse integration ready: Bundle compatible with Dataverse-provided jQuery/Bootstrap

### Core Features (Migrated from dataverse-previewers)

- **Data Display**:
  - Complete visibility of all nodes and properties in JSON-LD `@graph`
  - Visual classification with color-coded badges (SHACL-defined, Extra, Missing, Modified)

- **Editing Capabilities**:
  - Smart input types based on SHACL datatype constraints
  - Complex object support with nested node creation
  - Property management with searchable dropdowns
  - Cardinality enforcement respecting SHACL constraints
  - Delete protection for required fields

- **SHACL Validation**:
  - Real-time validation using Core SHACL features
  - Visual indicators showing validation status
  - Detailed reports with actionable feedback
  - Property suggestions for missing fields

- **Data Management**:
  - Load local files for standalone editing
  - Export JSON-LD with all modifications
  - Dataverse integration for direct API saves
  - Change tracking with visual indicators

### Technical Stack

- jQuery 3.7.1
- Bootstrap 3.3.7
- N3.js 1.16.x (~150KB)
- jsonld.js (~130KB)
- rdf-validate-shacl (~120KB)
- Jest 29.7.0 (testing)
- Rollup 4.24.4 (bundling)
- ESLint 8.57.0 + Prettier 3.2.5 (code quality)

### Dependencies

- **Production**: All loaded from CDN (no bundled dependencies)
- **Development**: 496 npm packages installed
- **Total bundle size**: 44KB (app code only)
- **Total deployment size**: ~400KB including all CDN dependencies

### Quality Metrics

- **Tests**: 26/26 passing (0 failures)
- **Linting**: 0 errors, 22 warnings (expected - functions called from HTML)
- **Bundle size**: 44KB (minified), 153KB (source map)
- **Load time**: Fast - minimal bundle, CDN-cached dependencies

### Repository Structure

```
cdi-viewer/
├── index.html              # Main entry (standalone mode)
├── test-bundle.html        # Bundle test page
├── package.json            # Dependencies and scripts
├── rollup.config.js        # Build configuration
├── README.md               # User documentation
├── ARCHITECTURE.md         # Technical documentation
├── CONTRIBUTING.md         # Development guidelines
├── CHANGELOG.md            # This file
├── LICENSE                 # Apache 2.0
├── plan.md                 # Development roadmap
├── js/                     # Source code (10 modules)
├── css/                    # Styles
├── lib/                    # Bundled SHACL validator
├── shapes/                 # SHACL shape files
├── examples/cdi/           # Sample JSON-LD files
├── docs/                   # Additional documentation
├── tests/                  # Jest test files
└── dist/                   # Built bundle (gitignored)
```

### Credits

Developed by **LIBIS @ KU Leuven** (Katholieke Universiteit Leuven)

### License

Apache License 2.0

---

## Migration Notes

This project was extracted from the [dataverse-previewers](https://github.com/gdcc/dataverse-previewers) repository to provide:

1. **Better maintainability**: Standalone repository with proper build system
2. **Professional infrastructure**: Testing, linting, documentation
3. **Dual deployment**: Standalone (GitHub Pages) + Dataverse integration
4. **AI context preservation**: Comprehensive documentation to prevent context drift

The bundle (`dist/cdi-viewer.min.js`) will be integrated back into dataverse-previewers via PR, allowing both repositories to benefit from professional development practices while maintaining a single source of truth.

### Breaking Changes

None - This is the initial standalone release. Full backward compatibility with dataverse-previewers maintained.

### Migration Path for dataverse-previewers

1. Copy `dist/cdi-viewer.min.js` to `previewers/betatest/lib/`
2. Update `CdiPreview.html` to load bundle instead of individual JS files
3. Keep SHACL shapes and CSS files
4. Update documentation to reference standalone repository

[Unreleased]: https://github.com/libis/cdi-viewer/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/libis/cdi-viewer/releases/tag/v1.0.0
