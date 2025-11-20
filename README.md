# CDI Viewer

Interactive viewer and editor for DDI-CDI (Data Documentation Initiative - Cross Domain Integration) and CDIF (CDI Foundation) metadata with SHACL validation support. Works with JSON-LD format providing real-time validation, property classification, and complex object editing.

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://libis.github.io/cdi-viewer/)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

## ✨ Features

### 🔍 Data Display
- **Complete visibility** of all nodes and properties in JSON-LD `@graph`
- **Visual classification** with color-coded badges:
  - 🔵 Blue: SHACL-defined properties
  - 🟡 Yellow: Extra properties (not in shapes)
  - 🔴 Red: Missing required properties
  - 🔷 Teal: Modified properties

### ✏️ Editing Capabilities
- **Smart input types** based on SHACL datatype constraints
- **Complex object support** with nested node creation
- **Property management** with searchable dropdowns
- **Cardinality enforcement** respecting SHACL constraints
- **Delete protection** for required fields

### ✅ Validation
- **Real-time SHACL validation** using Core SHACL features
- **Visual indicators** showing validation status
- **Detailed reports** with actionable feedback
- **Property suggestions** for missing fields

### 💾 Data Management
- **Load local files** for standalone editing
- **Export JSON-LD** with all modifications
- **Dataverse integration** for direct API saves
- **Change tracking** with visual indicators

## 🚀 Quick Start

### Try It Now (No Installation)

**Live demo:** [https://libis.github.io/cdi-viewer/](https://libis.github.io/cdi-viewer/)

1. Click the "Load Local File" button
2. Select any DDI-CDI or CDIF JSON-LD file
3. Start viewing, editing, and validating

### Example Files

Try these sample files from the `examples/cdi/` directory:
- `SimpleSample.jsonld` - Minimal DDI-CDI example
- `se_na2so4-XDI-CDI-CDIF.jsonld` - X-ray spectroscopy data
- `ESS11-subset_DDICDI.jsonld` - Comprehensive example

### Local Development

```bash
# Clone the repository
git clone https://github.com/libis/cdi-viewer.git
cd cdi-viewer

# Install dependencies
npm install

# Run tests
npm test

# Check code quality
npm run lint

# Build for production
npm run build

# Start development server
npm run dev
# Open http://localhost:8000
```

### Development with Example File

Load test files via URL parameter:
```
http://localhost:8000/?testfile=SimpleSample.jsonld
```

### Testing the Production Bundle

The project includes a test page for the bundled version:
```
http://localhost:8000/test-bundle.html
```

This loads `dist/cdi-viewer.min.js` (44KB minified) instead of individual JS files.

## 📖 Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[CDI_PREVIEWER.md](docs/CDI_PREVIEWER.md)** - Complete feature guide, usage instructions, customization
- **[CDIF_DISCOVERY_SHAPES_FIX.md](docs/CDIF_DISCOVERY_SHAPES_FIX.md)** - SHACL shapes implementation and Core SHACL conversion patterns

## 🔧 Technical Stack

### Libraries
- **jQuery 3.7.1** - DOM manipulation
- **Bootstrap 3.3.7** - UI components
- **N3.js v1.16.x** (~150KB) - RDF/Turtle parsing
- **jsonld.js** (~130KB) - JSON-LD processing
- **rdf-validate-shacl** (~120KB) - Core SHACL validation

### Development Tools
- **Jest** - Testing framework with JSDOM
- **Rollup** - Module bundler (44KB output)
- **ESLint + Prettier** - Code quality and formatting
- **npm scripts** - Build automation

### NPM Scripts
```bash
npm run dev           # Start development server (port 8000)
npm run build         # Build production bundle (dist/cdi-viewer.min.js)
npm test              # Run all tests (26 tests)
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate coverage report
npm run lint          # Check code quality (ESLint + Prettier)
```

### Architecture
- **Core SHACL only** - No SPARQL engine needed (~400KB total)
- **Lightweight bundle** - Fast loading for browser environments
- **Modular structure** - Separated HTML/CSS/JS files
- **Production ready** - Configurable logging, clean code
- **Dual deployment** - Standalone (GitHub Pages) + Dataverse integration
- **Test coverage** - 26 tests preventing regressions

## 📁 Project Structure

```
cdi-viewer/
├── index.html              # Main entry point (standalone mode)
├── css/
│   └── cdi-preview.css     # Styles
├── js/
│   ├── core.js             # Initialization and config
│   ├── render.js           # UI rendering
│   ├── validation.js       # SHACL validation
│   ├── cdi-shacl-loader.js # Shape loading
│   └── ...                 # Other modules
├── lib/
│   └── rdf-validate-shacl.bundle.min.js
├── shapes/
│   ├── ddi-cdi-official.ttl    # DDI-CDI 1.0 shapes
│   └── cdif-core.ttl           # CDIF Discovery shapes
├── examples/cdi/
│   └── *.jsonld                # Sample files
└── docs/
    ├── CDI_PREVIEWER.md
    └── CDIF_DISCOVERY_SHAPES_FIX.md
```

## 🎯 Use Cases

### Standalone Mode
Perfect for:
- Exploring DDI-CDI metadata files offline
- Testing SHACL validation locally
- Educational purposes
- Quick metadata inspection

### Dataverse Integration
Ideal for:
- Direct editing within Dataverse installations
- API-based metadata updates
- Production metadata management
- Institutional repositories

## 🔌 Dataverse Integration

The viewer can be registered as an external tool in Dataverse:

```bash
curl -X POST -H 'Content-Type: application/json' \
  http://localhost:8080/api/admin/externalTools \
  -d '{
    "displayName": "CDI Viewer",
    "description": "View and edit DDI-CDI metadata with SHACL validation",
    "toolName": "cdiViewer",
    "scope": "file",
    "type": "explore",
    "hasPreviewMode": true,
    "toolUrl": "https://libis.github.io/cdi-viewer/",
    "toolParameters": {
      "queryParameters": [
        {"fileid": "{fileId}"},
        {"siteUrl": "{siteUrl}"},
        {"key": "{apiToken}"},
        {"datasetid": "{datasetId}"},
        {"datasetversion": "{datasetVersion}"}
      ]
    },
    "contentType": "application/ld+json"
  }'
```

## 🛠️ Configuration

### SHACL Shapes

The viewer supports multiple shape sources:

1. **DDI-CDI 1.0 Official** (default) - Full DDI-CDI shapes from ddi-cdi.github.io
2. **CDIF Discovery Core** - Browser-compatible schema.org Dataset validation
3. **Local Fallback** - Built-in shapes for offline use
4. **Custom URL** - Load any Core SHACL shapes file

### Debug Mode

Enable detailed logging with `?debug=true`:
```
https://libis.github.io/cdi-viewer/?debug=true
```

## 🤝 Contributing

Contributions are welcome! This project is maintained by [LIBIS @ KU Leuven](https://www.libis.be/).

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our development process, testing requirements, and code style guidelines.

### Quick Contribution Guide

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Make your changes
4. Run tests: `npm test`
5. Check linting: `npm run lint`
6. Test locally: `npm run dev`
7. Build: `npm run build`
8. Submit a pull request

### Architecture Documentation

For detailed technical documentation, see:
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Comprehensive technical guide
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Development workflow and guidelines
- **[docs/CDI_PREVIEWER.md](docs/CDI_PREVIEWER.md)** - Feature documentation

## 📝 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🏛️ Credits

Developed by **LIBIS @ KU Leuven** (Katholieke Universiteit Leuven)

Part of the broader Dataverse ecosystem:
- [Dataverse Project](https://dataverse.org/)
- [GDCC Dataverse Previewers](https://github.com/gdcc/dataverse-previewers)

## 📧 Support

- **Issues:** [GitHub Issues](https://github.com/libis/cdi-viewer/issues)
- **Documentation:** See `docs/` directory
- **Dataverse Community:** [dataverse-dev@googlegroups.com](mailto:dataverse-dev@googlegroups.com)

## 🔗 Links

- **Live Demo:** https://libis.github.io/cdi-viewer/
- **DDI-CDI Specification:** https://ddi-cdi.github.io/
- **SHACL Specification:** https://www.w3.org/TR/shacl/
- **LIBIS:** https://www.libis.be/

---

**Made with ❤️ by LIBIS @ KU Leuven**
