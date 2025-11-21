# JSON-LD Viewer & Editor - Feature Documentation

## Overview

A comprehensive viewer and editor for JSON-LD metadata with SHACL validation. Works with any RDF vocabulary (DDI-CDI, schema.org, DCAT, DataCube, SKOS) and provides professional-grade features for viewing, editing, and validating complex metadata structures.

**Live Demo:** [https://libis.github.io/cdi-viewer/](https://libis.github.io/cdi-viewer/)

## Features

### Data Display
- **Complete Data Visibility**: Displays ALL nodes and properties in the JSON-LD `@graph`, regardless of SHACL shape definitions
- **Visual Classification**: Properties are color-coded with badges based on their SHACL status:
  - 🔵 Blue badge "SHACL-defined": Properties defined in loaded SHACL shapes
  - 🟡 Yellow badge "EXTRA": Properties not defined in SHACL shapes
  - Red text: Required properties that are missing
  - Teal border: Modified/changed properties

### Editing Capabilities
- **Smart Input Types**: Automatically selects appropriate input types based on SHACL datatype constraints:
  - `xsd:integer`, `xsd:decimal`, `xsd:float` → number inputs
  - `xsd:date` → date pickers
  - `xsd:dateTime` → datetime inputs
  - `xsd:anyURI` → URL inputs with monospace font
- **Complex Object Support**: Create nested objects directly from the interface:
  - Properties with `sh:node` or `sh:class` constraints show as `[object]` in dropdown
  - Creates new nodes in the `@graph` with proper `@id` and `@type`
  - Automatically links parent property to new node via JSON-LD references
- **Property Management**:
  - Searchable dropdown listing all SHACL-defined properties not yet in the data
  - "Add Custom Property" button for properties outside the SHACL shape
  - Delete buttons for optional properties and array values (required fields protected)
  - Cardinality enforcement: Properties with `sh:maxCount = 1` removed from dropdown after adding

### Validation
- **Real-time SHACL Validation**: 
  - Uses [shacl-engine](https://github.com/jeswr/shacl-engine) with SPARQL support
  - Visual indicators show validation status
  - Detailed validation reports available
  - Supports SPARQL-based constraints for advanced validation
- **Property Suggestions**: Shows missing SHACL-defined properties with descriptions
- **Constraint Enforcement**: Respects minCount, maxCount, datatype, and pattern constraints

### User Interface
- **Collapsible Nodes**: Click node headers to collapse/expand
- **Advanced Search & Filter**: 
  - Enhanced search with counter ("X of Y matches")
  - Case-sensitive and regex modes
  - Previous/Next navigation with keyboard shortcuts (F3, Shift+F3, Enter)
  - Current match highlighting with pulse animation
  - Filter by node type, validation status, property status
  - Hide empty properties option
  - Search scope selection (names/values/IDs/types)
  - Active filter badge showing count
  - State persistence across sessions
- **Bulk Operations**: Collapse All / Expand All buttons
- **Color-Coded Legend**: Visual guide explaining the classification system
- **Tooltips**: Hover help showing property descriptions from SHACL shapes
- **Professional Styling**: Bootstrap-based responsive design

### Namespace Management
- **View Namespaces**: See all namespace prefixes from @context
- **Add Namespaces**: Add custom namespace prefixes with validation
- **Remove Namespaces**: Remove custom namespaces (built-in protected)
- **Integration**: Works with property/node creation workflow
- **Modal UI**: Clean modal-based interface

### Document Creation
- **Create from Scratch**: Start with empty JSON-LD document
- **Shape-Specific Contexts**: Automatic context based on selected vocabulary
- **Default Filenames**: Appropriate filename suggestions
- **Support for Multiple Vocabularies**: DDI-CDI, CDIF, DCAT-AP, DataCube, SKOS, generic

### Data Management
- **Load Local Files**: Standalone mode allows loading JSON-LD files directly from your computer
- **Load from Dataverse**: URL parser supporting 6 Dataverse formats (JSF, SPA, API)
- **Save to Dataverse**: Direct API integration to save changes (replace file or add new)
- **Export JSON-LD**: Download modified data as JSON-LD file
- **Change Tracking**: Visual indicators for modified properties
- **View/Edit Modes**: Toggle between viewing and editing

## Technical Architecture

### ES6 Module System

**Modern Architecture:**
- ES6 modules with proper imports/exports
- Centralized state management (`src/jsonld-editor/state.js`)
- Single bundle via Rollup (`dist/cdi-viewer.bundle.js` - 1.2MB)
- No global scope pollution

### Libraries Used
- **jQuery 3.7.1**: DOM manipulation and AJAX
- **Bootstrap 3.3.7**: UI components and responsive design
- **N3.js v1.16.x**: RDF/Turtle parsing for loading SHACL shapes
- **jsonld.js**: JSON-LD normalization, expansion, and RDF conversion
- **shacl-engine**: SHACL validation with SPARQL support

### Code Quality
- **0 ESLint errors/warnings**
- **Prettier formatted code**
- **Modular architecture**: 11 ES6 modules with clear separation of concerns
- **Logging System**: Configurable log levels (ERROR, WARN, INFO, DEBUG)
- **Maintainable**: Clean module boundaries and comprehensive documentation

### Module Structure
```
src/jsonld-editor/
├── advanced-search.js    # Enhanced search functionality (~240 lines)
├── advanced-filter.js    # Comprehensive filtering (~340 lines)
├── unified-add-component.js # Unified add UI for properties/nodes
├── namespace-manager.js  # Namespace management
├── state.js              # Centralized state management
├── core.js               # Initialization & configuration
├── validation.js         # SHACL validation
├── cdi-shacl-loader.js   # Shape loading & N3 parsing
├── cdi-shacl-helpers.js  # Property classification
├── cdi-json-ld-helpers.js # JSON-LD normalization
├── cdi-graph-helpers.js  # Graph manipulation (add/edit nodes)
├── render.js             # UI rendering
├── property-suggestions.js # Property suggestions UI
├── data-extraction.js    # Export pipeline
└── event-handlers.js     # jQuery event wiring

dist/
└── cdi-viewer.bundle.js  # Single 1.2MB bundle
```

## Configuration

### Default Behavior

**DDI-CDI Mode (Default):**
- Open `https://libis.github.io/cdi-viewer/`
- DDI-CDI official shapes load automatically
- Best for DDI-CDI metadata files

**Generic Mode:**
- Add `?shacl=generic` parameter
- No shapes preloaded
- Load any SHACL shapes dynamically
- Best for non-DDI-CDI vocabularies

### SHACL Shapes

The viewer can load SHACL shapes from multiple sources (selectable via dropdown):

1. **DDI-CDI Official** - `https://ddi-cdi.github.io/m2t-ng/DDI-CDI_1-0/encoding/shacl/ddi-cdi.shacl.ttl`
2. **DCAT-AP 3.0** - W3C Data Catalog vocabulary application profile
3. **W3C DataCube** - RDF data cube vocabulary
4. **SKOS** - Simple Knowledge Organization System
5. **Custom URL** - User-provided SHACL shape URL (any Turtle .ttl file)

### Dataverse Integration
The previewer expects these URL parameters:
- `siteUrl`: Dataverse installation base URL
- `fileid`: File ID or path to the JSON-LD file
- `datasetid`: Dataset ID (for saving changes)
- `datasetversion`: Dataset version
- `key`: API key (for authenticated operations)
- `testfile`: (Testing only) Filename in examples/cdi/ directory

### Example URLs
```
# Default DDI-CDI mode
https://libis.github.io/cdi-viewer/

# Generic mode (no shapes preloaded)
https://libis.github.io/cdi-viewer/?shacl=generic

# Specific vocabulary
https://libis.github.io/cdi-viewer/?shacl=dcat-ap-3.0

# Local testing with example file
http://localhost:8000/?testfile=SimpleSample.jsonld

# Dataverse integration
https://libis.github.io/cdi-viewer/?siteUrl=https://dataverse.example.edu&fileid=123
```

## Usage Guide

### Standalone Mode
1. Open [https://libis.github.io/cdi-viewer/](https://libis.github.io/cdi-viewer/)
2. DDI-CDI shapes load automatically (or add `?shacl=generic` for clean start)
3. Click "Load Local File" to select a JSON-LD file
4. Edit, validate, and export your data

### Viewing Data
1. Load the previewer with a CDI JSON-LD file
2. All nodes from `@graph` are displayed as collapsible cards
3. Properties are color-coded by their SHACL classification
4. Use search box to filter properties
5. Click "Collapse All" / "Expand All" to manage view

### Editing Data
1. Click "Enable Editing" button
2. Modify property values directly in input fields
3. Add new properties:
   - Select from dropdown (SHACL-defined properties)
   - Or click "Add Custom Property" (for extras)
4. Create complex objects:
   - Properties marked `[object]` create new nodes
   - New node scrolls into view automatically
5. Delete optional properties/values using trash icons
6. Required fields cannot be deleted (protected)

### Validation
1. Click "Validate Against SHACL" button
2. View validation results in alert
3. Invalid properties highlighted in red
4. Fix errors and re-validate

### Saving Changes
1. Ensure all required fields are populated
2. Click "Save to Dataverse"
3. Provide API key when prompted
4. Changes saved via Dataverse file replacement API

### Exporting Data
1. Click "Export JSON-LD" button
2. File downloads as `cdi-data.jsonld`
3. Can be re-uploaded to Dataverse manually

## SHACL Shape Requirements

### Supported Target Types

The previewer supports standard Core SHACL targeting mechanisms:

#### sh:targetClass (Standard)
Matches nodes by RDF type:
```turtle
ex:NodeShape
    a sh:NodeShape ;
    sh:targetClass ex:Dataset ;
    sh:property ex:PropertyShape ;
    .
```

#### sh:targetSubjectsOf
Matches nodes that have a specific property:
```turtle
ex:NodeShape
    a sh:NodeShape ;
    sh:targetSubjectsOf schema:about ;
    sh:property ex:PropertyShape ;
    .
```

**Important Note**: SPARQL-based SHACL features (`sh:SPARQLTarget`, `sh:SPARQLConstraint`) are now fully supported via shacl-engine.

### Customization

**Module Structure:**
All functionality is in ES6 modules under `src/jsonld-editor/`. Key functions:
- `renderData()` in `render.js` - Main render loop
- `classifyProperty()` in `cdi-shacl-helpers.js` - Property classification
- `validateData()` in `validation.js` - SHACL validation
- `createAndReferenceNewNode()` in `cdi-graph-helpers.js` - Create nested objects

**Styling:**
Modify `css/cdi-preview.css` for visual customization.

## Testing

### Standalone Testing
1. Open the previewer directly in your browser:
   ```
   https://gdcc.github.io/dataverse-previewers/previewers/betatest/CdiPreview.html
   ```
2. Click "Load Local File" button
3. Select any CDI JSON-LD file from your computer
4. Test editing, validation, and export features

### Local Testing
1. Start a local web server:
   ```bash
   cd dataverse-previewers
   python3 -m http.server 8000
   ```

2. Open the previewer with a test file:
   ```
   http://localhost:8000/previewers/betatest/CdiPreview.html?testfile=SimpleSample.jsonld
   ```

3. Available test files:
   - SimpleSample.jsonld (minimal example)
   - SimpleSample2.jsonld
   - se_na2so4-XDI-CDI-CDIF.jsonld (X-ray spectroscopy, uses schema:Dataset)
   - FeXAS_Fe_c3d.001-NEXUS-HDF5-cdi-CDIF.jsonld (NEXUS HDF5, uses schema:Dataset)
   - ESS11-subset_DDICDI.jsonld (large/complete)

**Note**: The XAS examples (`se_na2so4` and `FeXAS`) use `schema:Dataset` as their root type and work with both DDI-CDI Official and CDIF Discovery Core shapes.

### Integration Testing
Test with actual Dataverse instance using curl registration:
```bash
curl -X POST -H 'Content-Type: application/json' \
  http://localhost:8080/api/admin/externalTools \
  -d @cdi-preview-tool.json
```

## Known Limitations

1. **Controlled Vocabularies**: `sh:in` constraints not yet implemented as dropdowns
2. **Undo/Reset**: No undo functionality (reload page to discard changes)
3. **Large Files**: Performance may degrade with 100+ nodes

## Debug Mode

Enable debug logging by setting log level in browser console:
```javascript
import { setCurrentLogLevel, LOG_LEVEL } from './state.js';
setCurrentLogLevel(LOG_LEVEL.DEBUG);
```

**Log Levels:**
- `ERROR`: Critical errors
- `WARN`: Warnings about potential issues
- `INFO`: Informational messages
- `DEBUG`: Detailed execution logs

---

## Future Enhancements

- [ ] Implement controlled vocabulary dropdowns for `sh:in`
- [ ] Add undo/reset functionality
- [ ] Pagination for large datasets (100+ nodes)
- [ ] Diff view showing changes before save
- [ ] Bulk import/export of property values
- [ ] Export to Turtle, N-Triples formats

## Troubleshooting

### Previewer shows blank/white screen
- Check browser console for JavaScript errors
- Verify SHACL shapes file is accessible
- Ensure JSON-LD file is valid

### Properties not showing as SHACL-defined (showing yellow instead of blue)
- Check that shape `sh:targetClass` or `sh:targetSubjectsOf` matches the node's `@type` or properties
- Verify property `sh:path` matches property name in data (check for namespace differences)
- Ensure SHACL file is properly loaded (check network tab)
- **Namespace issues**: Data and shapes must use same namespaces (e.g., both `http://schema.org/` not mixed http/https)
- Enable debug mode (`?debug=true`) to see classification details in console

### Validation fails with no details
- Check SHACL shapes syntax in Turtle validator
- Verify node types match shape target classes
- Look for console errors during validation

### Cannot save to Dataverse
- Verify API key is valid and not expired
- Check dataset ID and version are correct
- Ensure user has edit permissions on dataset
- Verify Dataverse API endpoint is accessible

## Support

For issues, questions, or contributions:
- **GitHub**: [libis/cdi-viewer](https://github.com/libis/cdi-viewer)
- **Documentation**: [README.md](../README.md), [GENERIC_USAGE.md](GENERIC_USAGE.md)
- **Architecture**: [ARCHITECTURE.md](../ARCHITECTURE.md)

## License

Apache License 2.0
