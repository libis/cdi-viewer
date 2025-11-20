# JSON-LD Viewer & Editor with SHACL Validation

Interactive viewer and editor for JSON-LD metadata with SHACL validation support. Originally developed for DDI-CDI (Data Documentation Initiative - Cross Domain Integration) and CDIF (CDI Foundation), but **works with any JSON-LD vocabulary and SHACL shapes**.

Provides real-time validation, property classification, and complex object editing directly in the browser.

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://libis.github.io/cdi-viewer/)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

## ✨ Features

### 🌐 Generic JSON-LD Support
- **Any JSON-LD vocabulary** - Not limited to DDI-CDI
- **Custom SHACL shapes** - Load validation shapes from any URL
- **Standard JSON-LD processing** - Uses W3C JSON-LD algorithms
- **Vocabulary-agnostic editing** - Works with any ontology

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
2. Select any JSON-LD file (DDI-CDI, DCAT, DataCube, SKOS, etc.)
3. Select SHACL shapes from the dropdown (DDI-CDI, DCAT-AP, DataCube, SKOS, or custom URL)
4. Start viewing, editing, and validating

### Example Files

The demo includes DDI-CDI examples in the `examples/cdi/` directory:
- `SimpleSample.jsonld` - Minimal DDI-CDI example
- `se_na2so4-XDI-CDI-CDIF.jsonld` - X-ray spectroscopy data
- `ESS11-subset_DDICDI.jsonld` - Comprehensive example

## Configuration

### Automatic DDI-CDI Mode

The viewer **automatically detects** DDI-CDI shapes and enables DDI-CDI specific features:

- When you load SHACL shapes containing `ddialliance.org/Specification/DDI-CDI` namespace, DDI-CDI mode is enabled
- This activates legacy context handling, DDICDIModels normalization, and default namespace resolution
- For other vocabularies (schema.org, DCAT, etc.), the tool operates in generic JSON-LD mode

**Detection is version-agnostic and protocol-agnostic** - works with any DDI-CDI version (1.0, 2.0, etc.) over http or https.

### Manual Configuration (Optional)

You can manually override the default namespace in `js/core.js` if needed:

```javascript
// For DDI-CDI:
window.defaultTypeNamespace = "http://ddialliance.org/Specification/DDI-CDI/1.0/RDF/";

// For schema.org:
window.defaultTypeNamespace = "http://schema.org/";

// For DCAT:
window.defaultTypeNamespace = "http://www.w3.org/ns/dcat#";
```

This allows type names without prefixes to be resolved automatically.

### Adding Legacy Context Mappings

If you need to handle legacy context URLs (redirecting old URLs to local copies), edit `LEGACY_CONTEXT_URLS` in `js/cdi-json-ld-helpers.js`:

```javascript
const LEGACY_CONTEXT_URLS = {
  "https://old-url.org/context.jsonld": "shapes/local-context.jsonld",
  // Add more mappings as needed
};
```

## Development

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
# Generic mode (no shapes preloaded)
http://localhost:8000/

# DDI-CDI mode (official shapes preloaded)
http://localhost:8000/?shacl=ddi-cdi-official

# CDIF mode (CDIF Discovery shapes preloaded)
http://localhost:8000/?shacl=cdif-core

# Local fallback (built-in DDI-CDI shapes)
http://localhost:8000/?shacl=local-fallback
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

### Any JSON-LD Vocabulary
Perfect for:
- **Research data metadata** - DDI-CDI, DCAT, DataCite
- **Schema.org datasets** - Validate and edit Dataset markup
- **Library metadata** - BIBFRAME, Dublin Core
- **Domain-specific ontologies** - Any RDF vocabulary with SHACL shapes

### Standalone Mode
Perfect for:
- Exploring any JSON-LD metadata files offline
- Testing SHACL validation with custom shapes
- Educational purposes (learning JSON-LD, SHACL)
- Quick metadata inspection and editing

### Dataverse Integration
Ideal for:
- Direct editing within Dataverse installations
- API-based metadata updates for any vocabulary
- Production metadata management
- Institutional repositories

## 🔌 Dataverse Integration

The viewer can be registered as an external tool in Dataverse for any JSON-LD content type:

```bash
curl -X POST -H 'Content-Type: application/json' \
  http://localhost:8080/api/admin/externalTools \
  -d '{
    "displayName": "JSON-LD Viewer",
    "description": "View and edit JSON-LD metadata with SHACL validation",
    "toolName": "jsonldViewer",
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

**Note:** Originally developed for DDI-CDI, but works with any JSON-LD vocabulary.

## 🛠️ Configuration

### SHACL Shapes

The viewer supports multiple shape sources via the "Select SHACL shapes" dropdown:

1. **DDI-CDI 1.0 Official** - Full DDI-CDI shapes from ddi-cdi.github.io
2. **CDIF Discovery Core** - Browser-compatible schema.org Dataset validation
3. **DCAT-AP 3.0** - EU DCAT Application Profile for open data catalogs
4. **W3C DataCube** - RDF Data Cube vocabulary for statistical data
5. **SKOS** - Simple Knowledge Organization System for thesauri and taxonomies
6. **Local Fallback** - Built-in DDI-CDI shapes for offline use
7. **Custom URL** - Load any Core SHACL shapes file (Turtle format) from a URL you provide

#### Using Custom SHACL Shapes

The **Custom URL** option allows you to load SHACL shapes for any vocabulary:

1. Select "Custom URL" from the dropdown
2. Enter the full URL to your Turtle (.ttl) file
3. Click "Load Custom Shapes"

**Popular standards with published SHACL shapes:**
- **DCAT-AP 3.0:** https://semiceu.github.io/DCAT-AP/releases/3.0.0/html/shacl/shapes.ttl (built-in)
- **DataCube:** https://raw.githubusercontent.com/w3c/shacl/master/shapes/datacube.shapes.ttl (built-in)
- **SKOS:** https://raw.githubusercontent.com/skohub-io/skohub-shapes/main/skos.shacl.ttl (built-in)
- **FOAF:** [SHACL-Catalog](https://github.com/sparna-git/SHACL-Catalog/blob/master/shacl-catalog.ttl) (browse for specific shapes)
- **GeoSPARQL:** [SHACL Play! Catalog](https://shacl-play.sparna.fr/play/) (browse for specific shapes)
- **RO-Crate:** [rocrate-validator profiles](https://github.com/ResearchObject/ro-crate-validator-py) (profile-specific shapes)

**Note:** Only Core SHACL features are supported (no SPARQL-based constraints).

### Creating Custom SHACL Shapes

If you need to create your own SHACL shapes for validation:

**Learn SHACL:**
- [W3C SHACL Specification](https://www.w3.org/TR/shacl/) - Official specification
- [SHACL Playground](https://shacl.org/playground/) - Interactive editor and validator
- [SHACL Tutorial](https://www.w3.org/2014/data-shapes/wiki/SHACL_Tutorial) - Step-by-step guide

**Generate SHACL from Ontologies:**
- [Astrea](https://astrea.linkeddata.es/) - Generate SHACL shapes from OWL ontologies
- [SHACL Shape Generator](https://github.com/semantifyit/shacl-shape-generator) - Automated shape generation

**Validate Your Shapes:**
- [SHACL Play!](https://shacl-play.sparna.fr/play/) - Online SHACL validator
- [pySHACL](https://github.com/RDFLib/pySHACL) - Python-based validator

**Publishing Your Shapes:**
- Host the `.ttl` file on GitHub Pages (free, static hosting)
- Use raw GitHub URLs: `https://raw.githubusercontent.com/username/repo/main/shapes.ttl`
- Ensure CORS is enabled for browser access
- Use permanent URLs when possible (DOI, w3id.org, etc.)

**Requirements:**
- Save as Turtle format (`.ttl`)
- Use only Core SHACL features (no SPARQL constraints)
- Test with pySHACL or SHACL Play! before publishing
- Include namespace declarations and shape definitions

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

Originally created for DDI-CDI metadata, but designed as a **generic JSON-LD viewer and editor** that works with any vocabulary and SHACL shapes.

Part of the broader Dataverse ecosystem:
- [Dataverse Project](https://dataverse.org/)
- [GDCC Dataverse Previewers](https://github.com/gdcc/dataverse-previewers)
- [DDI-CDI Specification](https://ddi-cdi.github.io/)

## 📧 Support

- **Issues:** [GitHub Issues](https://github.com/libis/cdi-viewer/issues)
- **Documentation:** See `docs/` directory
- **Dataverse Community:** [dataverse-dev@googlegroups.com](mailto:dataverse-dev@googlegroups.com)

## 🔗 Links

- **Live Demo:** https://libis.github.io/cdi-viewer/
- **GitHub Repository:** https://github.com/libis/cdi-viewer
- **JSON-LD Specification:** https://json-ld.org/
- **SHACL Specification:** https://www.w3.org/TR/shacl/
- **DDI-CDI Specification:** https://ddi-cdi.github.io/
- **LIBIS:** https://www.libis.be/

---

**Made with ❤️ by LIBIS @ KU Leuven**
