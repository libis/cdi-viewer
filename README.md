# JSON-LD Viewer & Editor with SHACL Validation

> **A powerful, browser-based JSON-LD editor and SHACL validator for any RDF vocabulary**

Interactive viewer and editor for JSON-LD metadata with real-time SHACL validation. Originally developed for DDI-CDI (Data Documentation Initiative - Cross Domain Integration) and CDIF (CDI Foundation), but **works with any JSON-LD vocabulary and SHACL shapes** including schema.org, DCAT, DataCube, SKOS, and custom ontologies.

Provides real-time validation, property classification, complex object editing, and array management directly in the browser. Perfect for researchers, data curators, and developers working with semantic web standards.

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://libis.github.io/cdi-viewer/)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![GitHub Topics](https://img.shields.io/badge/topics-json--ld%20%7C%20rdf%20%7C%20shacl-blue)](https://github.com/libis/cdi-viewer)

## 🎯 Why This Tool?

**The problem:** Most JSON-LD editors are either too simple (plain text editors) or too complex (enterprise RDF tooling). Validating against SHACL shapes often requires command-line tools or separate validation services.

**This solution:**

- ✨ **Visual editing** - See and edit your JSON-LD structure as nested, collapsible cards
- ✅ **Instant validation** - Real-time SHACL validation with color-coded feedback
- 🎨 **Smart UI** - Input fields adapt to SHACL constraints (dates, numbers, enumerations)
- 🔗 **Complex objects** - Create nested objects and references with modal helpers
- 📊 **Array support** - Convert between single/array values, manage reference lists
- 🚀 **No installation** - Runs entirely in the browser, no server needed
- 🔌 **Extensible** - Integrate with Dataverse or use as standalone tool

**Perfect for:**

- Data curators working with schema.org Dataset markup
- Researchers creating DDI-CDI metadata
- Developers testing SHACL validation rules
- Anyone editing complex JSON-LD with nested structures

## ✨ Features

### 🌐 Generic JSON-LD Support

- **Any JSON-LD vocabulary** - schema.org, DCAT, DataCube, SKOS, FOAF, Dublin Core, and more
- **Custom SHACL shapes** - Load validation shapes from any URL or local file
- **Standard JSON-LD processing** - Uses W3C JSON-LD algorithms (jsonld.js)
- **Vocabulary-agnostic editing** - Works with any RDF ontology
- **Namespace flexibility** - Handles prefixed and expanded forms

### ✏️ Advanced Editing Capabilities

- **Smart input types** based on SHACL datatype constraints (text, number, date, URI, etc.)
- **Complex object support** with nested node creation and inline editing
- **Reference management** - Link to existing nodes or create new blank nodes
- **Array operations**:
  - Convert single value ↔ array
  - Add/remove array items
  - Support for both value arrays and reference arrays
- **Property management** with searchable SHACL-based dropdowns
- **Cardinality enforcement** respecting SHACL min/maxCount
- **Delete protection** for required fields (SHACL sh:minCount > 0)
- **Custom properties** - Add properties not defined in SHACL shapes

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

**Quick workflow (DDI-CDI mode - default):**

1. Click **"Load Local File"** → select any JSON-LD file
2. DDI-CDI shapes are preloaded automatically
3. Click **"Enable Edit Mode"** to start editing
4. Add/edit/delete properties with visual feedback
5. Click **"Export JSON-LD"** to download your changes

**For other vocabularies:**

- Visit [https://libis.github.io/cdi-viewer/?shacl=generic](https://libis.github.io/cdi-viewer/?shacl=generic)
- Select your vocabulary's SHACL shapes from the dropdown
- Or enter a custom SHACL URL

### Common Use Cases

| Vocabulary     | Use Case                                 | SHACL Shapes                  |
| -------------- | ---------------------------------------- | ----------------------------- |
| **schema.org** | Dataset markup for Google Dataset Search | Built-in or custom            |
| **DDI-CDI**    | Social science data documentation        | `ddi-cdi-official` (built-in) |
| **DCAT-AP**    | EU open data catalog metadata            | `dcat-ap-3.0` (built-in)      |
| **DataCube**   | Statistical data cubes                   | `w3c-datacube` (built-in)     |
| **SKOS**       | Thesauri and taxonomies                  | `skos` (built-in)             |
| **Custom**     | Your own ontology                        | Provide SHACL URL             |

### Example Workflow: Editing schema.org Dataset

```bash
# 1. Start with minimal JSON-LD
{
  "@context": "https://schema.org/",
  "@type": "Dataset",
  "@id": "http://example.org/dataset/1",
  "name": "My Dataset"
}

# 2. Load in the viewer
# 3. Add properties via the dropdown: description, keywords, creator
# 4. Create nested objects: creator → Person with name, affiliation
# 5. Validate against schema.org SHACL shapes
# 6. Export complete, validated JSON-LD
```

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
window.defaultTypeNamespace =
  "http://ddialliance.org/Specification/DDI-CDI/1.0/RDF/";

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
# Default: DDI-CDI mode (official shapes preloaded automatically)
http://localhost:8000/

# Generic mode (no shapes preloaded - for any JSON-LD vocabulary)
http://localhost:8000/?shacl=generic

# CDIF mode (CDIF Discovery shapes preloaded)
http://localhost:8000/?shacl=cdif-core

# DCAT-AP mode (EU DCAT Application Profile)
http://localhost:8000/?shacl=dcat-ap-3.0

# DataCube mode (W3C RDF Data Cube)
http://localhost:8000/?shacl=w3c-datacube

# SKOS mode (Simple Knowledge Organization System)
http://localhost:8000/?shacl=skos

# Local fallback (built-in DDI-CDI shapes for offline use)
http://localhost:8000/?shacl=local-fallback
```

**Note:** Since version 1.0, the viewer defaults to DDI-CDI mode (matching the `cdi-viewer` name). Use `?shacl=generic` for a clean start with any vocabulary.

### Testing the Production Bundle

The project includes a test page for the bundled version:

```
http://localhost:8000/test-bundle.html
```

This loads `dist/cdi-viewer.min.js` (44KB minified) instead of individual JS files.

## 📖 Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[GENERIC_USAGE.md](docs/GENERIC_USAGE.md)** - Complete guide for using with any JSON-LD vocabulary (schema.org, DCAT, etc.)
- **[CDI_PREVIEWER.md](docs/CDI_PREVIEWER.md)** - DDI-CDI specific features, usage instructions, and customization
- **[CDIF_DISCOVERY_SHAPES_FIX.md](docs/CDIF_DISCOVERY_SHAPES_FIX.md)** - SHACL shapes implementation and Core SHACL conversion patterns
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical architecture and design decisions
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Development workflow and contribution guidelines

## 🔧 Technical Stack

### Libraries

- **jQuery 3.7.1** - DOM manipulation
- **Bootstrap 3.3.7** - UI components
- **N3.js v1.16.x** (~150KB) - RDF/Turtle parsing
- **jsonld.js** (~130KB) - JSON-LD processing
- **shacl-engine** (~1.1MB) - Core SHACL + SPARQL validation

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

- **Core SHACL + SPARQL** - Full SHACL validation with SPARQL constraints (~1.1MB)
- **ES6 modules** - Modern code with proper imports (like shacl-engine examples)
- **Dual bundles** - Validation (1.1MB) + App logic (38KB)
- **Modular structure** - Separated concerns, incremental ES6 migration
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
├── dist/
│   ├── cdi-app.bundle.js           # App logic (38KB)
│   └── cdi-validation.bundle.js    # SHACL validation (1.1MB)
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
3. Make your changes in `src/` (ES6 modules) or `js/` (legacy scripts)
4. Build: `npm run build` (or `npm run build:watch` for development)
5. Run tests: `npm test`
6. Check linting: `npm run lint`
7. Test locally: `npm run dev` (starts server on http://localhost:8000)
8. Submit a pull request

### Development Structure

The project uses a **hybrid architecture** during migration to ES6 modules:

```
src/                    # Modern ES6 modules (new code)
├── validation.js       # ✅ SHACL validation (proper imports)
├── index.js           # Entry point (future: all modules)
└── README.md          # Module documentation

js/                     # Legacy plain scripts (being migrated)
├── core.js            # Initialization and config
├── render.js          # UI rendering
└── ...                # Other modules

dist/                   # Built bundles for browser
├── cdi-validation.bundle.js  # 1.1MB - SHACL with SPARQL
└── cdi-app.bundle.js        # 38KB - App logic
```

**Build Process:**

```bash
# Write code with ES6 imports (like validation.js)
import Validator from 'shacl-engine/Validator.js';

# Rollup bundles all dependencies into browser files
npm run build

# Two bundles created automatically:
# - dist/cdi-validation.bundle.js (ES6 module + dependencies)
# - dist/cdi-app.bundle.js (legacy scripts concatenated)
```

**Why ES6 Modules?**

- ✅ Write clean Node.js-style code with `import`/`export`
- ✅ Same pattern as shacl-engine, jsonld.js, n3.js
- ✅ Better IDE support, type checking, debugging
- ✅ Single minimized bundle for production
- ✅ Incremental migration (legacy + modern code coexist)

See `src/README.md` for details on the ES6 module structure and migration plan.

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
- **Documentation:** [Generic Usage Guide](docs/GENERIC_USAGE.md) | [DDI-CDI Guide](docs/CDI_PREVIEWER.md)
- **JSON-LD Specification:** https://json-ld.org/
- **SHACL Specification:** https://www.w3.org/TR/shacl/
- **Semantic Web Resources:** [JSON-LD Playground](https://json-ld.org/playground/) | [SHACL Playground](https://shacl.org/playground/)
- **DDI-CDI Specification:** https://ddi-cdi.github.io/
- **LIBIS:** https://www.libis.be/

---

**Made with ❤️ by LIBIS @ KU Leuven**

_Originally built for DDI-CDI metadata, evolved into a powerful general-purpose JSON-LD editor. Works with any RDF vocabulary!_
