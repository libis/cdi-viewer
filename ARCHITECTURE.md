# JSON-LD Viewer Architecture

## Overview

The JSON-LD Viewer is a browser-based application for viewing, editing, and validating **any JSON-LD metadata** with SHACL shapes. It works with any RDF vocabulary including DDI-CDI, schema.org, DCAT, BIBFRAME, and custom ontologies.

**Critical:** This document preserves architectural decisions to prevent AI context drift during development.

## Core Principles

1. **Generic JSON-LD Support**: Works with any vocabulary via standard jsonld.flatten()
2. **Dual Deployment**: Standalone (GitHub Pages) + Dataverse integration
3. **SHACL with SPARQL Support**: Core SHACL + SPARQL targets (vendored shacl-engine)
4. **Global State Pattern**: `window.*` properties for cross-file access
5. **Client-Side Only**: No backend required, all processing in browser
6. **Progressive Enhancement**: Works without JavaScript for static display
7. **Configurable Defaults**: Optional namespace and context mappings

## Application Flow

```
User Action
    ↓
Load JSON-LD File
    ↓
Normalize to @graph Format (jsonld.js)
    ↓
Load SHACL Shapes (N3.js)
    ↓
Classify Properties (SHACL-defined vs EXTRA)
    ↓
Render UI with Color-Coded Badges
    ↓
[EDIT MODE ENABLED]
    ↓
User Modifications
    ↓
Validate Against SHACL (shacl-engine)
    ↓
Export or Save to Dataverse
```

## Module Structure

### src/jsonld-editor/advanced-search.js

**Purpose:** Enhanced search functionality with multiple modes and navigation

**Global Variables (window.\*):**

- None (uses state.js getters/setters)

**Key Functions:**

- `performSearch()` - Main search with scope filter integration
- `navigateToMatch(direction)` - Previous/next navigation
- `matchesSearch(text, term)` - Case-sensitive and regex support
- `updateSearchCounter()` - Display match count ("X of Y")
- `clearSearch()` - Clear search with animations
- `toggleCaseSensitive()` - Toggle case-sensitive mode
- `toggleRegex()` - Toggle regex mode
- `setupAdvancedSearchHandlers()` - Wire up all search controls

**Integration:**

- Called from event-handlers.js
- Uses filter state from advanced-filter.js (getFilterState())
- Applies CSS class `.current-search-match` with pulse animation
- Keyboard shortcuts: F3, Shift+F3, Enter

### src/jsonld-editor/advanced-filter.js

**Purpose:** Comprehensive filtering system with multiple filter types

**Global Variables (window.\*):**

- None (uses state.js getters/setters)

**Key Functions:**

- `applyFilters()` - Apply all active filters
- `applyNodeTypeFilter()` - Filter by @type
- `applyValidationFilter()` - Filter by validation status
- `applyPropertyStatusFilter()` - Filter SHACL/extra properties
- `applyEmptyValueFilter()` - Hide properties with empty values
- `extractNodeTypes()` - Get unique @types from document
- `populateNodeTypeFilter()` - Fill dropdown with types
- `updateValidationFilterCounts()` - Update counts in dropdown
- `clearAllFilters()` - Reset all filters
- `saveFilterState()`, `loadFilterState()` - LocalStorage persistence
- `initializeFilters()` - Called when data loads
- `getFilterState()` - Expose filter state to other modules
- `setupAdvancedFilterHandlers()` - Wire up all filter controls

**Filter Types:**

1. Validation status (all/valid/invalid/modified/missing required)
2. Property status (all/SHACL only/extra only)
3. Hide empty properties (toggle)
4. Search scope (names/values/IDs/types checkboxes)

**Integration:**

- Called from event-handlers.js
- Called from validation.js (initializeFilters after validation)
- Uses CSS classes: `.hidden-by-type-filter`, `.hidden-by-validation-filter`, `.hidden-by-property-filter`, `.hidden-by-empty-filter`
- State persists to localStorage

### src/jsonld-editor/unified-add-component.js

**Purpose:** Consistent UI for adding properties and root nodes

**Key Functions:**

- `renderUnifiedAddComponent(context)` - Render unified add UI
- `handleUnifiedAdd()` - Process add action
- Context: "property" or "root-node"

**Features:**

- SHACL-defined items dropdown with descriptions
- Custom input with namespace selector
- "Add new namespace" option (opens modal)
- Enter key support

### src/jsonld-editor/namespace-manager.js

**Purpose:** Namespace management functionality

**Key Functions:**

- `renderNamespaceManager()` - Display current namespaces
- `addNamespace(prefix, uri)` - Add custom namespace
- `removeNamespace(prefix)` - Remove custom namespace
- `isBuiltInNamespace(prefix)` - Check if prefix is built-in (protected)

**Integration:**

- Modal-based UI (no scroll)
- Integrates with unified-add-component

### js/core.js

**Purpose:** Global configuration, initialization, Dataverse integration

**Global Variables (window.\*):**

```javascript
window.jsonData; // Current JSON-LD data (@graph format)
window.shaclShapes; // Raw SHACL shapes (Turtle string)
window.shaclShapesStore; // N3.Store with parsed SHACL triples
window.isEditMode; // Boolean: edit mode enabled?
window.originalData; // Original JSON-LD (for reset)
window.validationReport; // Latest SHACL validation report
window.fileId; // Dataverse file ID
window.siteUrl; // Dataverse instance URL
window.originalFileName; // File name for export
window.expandedJsonLd; // Fully expanded JSON-LD (for URI lookup)
window.currentShapeSource; // Currently loaded shape source
window.hadOriginalGraph; // Track if original data had @graph
window.SHAPE_URLS; // Map of shape source names to URLs
window.currentLogLevel; // Logging level (ERROR/WARN/INFO/DEBUG)
window.defaultTypeNamespace; // Default namespace for unprefixed types (configurable)
```

**Configuration Variables:**

```javascript
// Default namespace for types without prefixes
// Automatically configured via detectAndConfigureDDICDIMode() when SHACL shapes load
// Can be manually overridden:
window.defaultTypeNamespace =
  "http://ddialliance.org/Specification/DDI-CDI/1.0/RDF/"; // DDI-CDI
window.defaultTypeNamespace = "http://schema.org/"; // Schema.org
window.defaultTypeNamespace = "http://www.w3.org/ns/dcat#"; // DCAT
window.defaultTypeNamespace = null; // Generic mode (default before shapes load)
```

**Auto-Detection (js/cdi-shacl-loader.js):**

```javascript
// Automatically enable DDI-CDI mode when loading DDI-CDI shapes
// Detection is version-agnostic (1.0, 2.0, etc.) and protocol-agnostic (http/https)
function detectAndConfigureDDICDIMode(shapesText) {
  const isDDICDI = /ddialliance\.org\/Specification\/DDI-CDI/i.test(shapesText);
  if (isDDICDI) {
    window.defaultTypeNamespace =
      "http://ddialliance.org/Specification/DDI-CDI/1.0/RDF/";
    // Enables: legacy context handling, DDICDIModels normalization
  }
}
```

**Legacy Context Mappings (js/cdi-json-ld-helpers.js):**

```javascript
// Map legacy context URLs to local copies
const LEGACY_CONTEXT_URLS = {
  "https://old-url.org/context.jsonld": "shapes/local-context.jsonld",
  // Add more mappings as needed
};
```

**Why window.\*?**

- All JS files loaded via `<script>` tags (no ES6 modules yet)
- Variables must be truly global for cross-file access
- Alternative patterns (IIFE, namespaces) didn't work in iframe context
- Future: Will be refactored to ES6 modules with imports

**Initialization:**

1. Parse URL parameters (fileId, siteUrl, testfile, debug)
2. Set logging level based on ?debug=true
3. Load JSON-LD file (from Dataverse API or local file)
4. Load default SHACL shapes
5. Pre-load local context for fallback
6. Attach event handlers
7. Render initial UI

### js/cdi-json-ld-helpers.js

**Purpose:** JSON-LD processing and context resolution

**Key Functions:**

- `normalizeToGraph(jsonLd)` - Convert any JSON-LD to @graph format
- `resolvePrefix(context, prefix)` - Resolve prefix to namespace URI
- `expandCompactIri(context, compactIri)` - Expand "schema:Dataset" to full URI
- `loadLocalContext()` - Load and cache local DDI-CDI context

**Critical Pattern:**

```javascript
// ✅ CORRECT: Handle array contexts
function resolvePrefix(context, prefix) {
  if (Array.isArray(context)) {
    for (const ctx of context) {
      const ns = resolvePrefix(ctx, prefix);
      if (ns) return ns;
    }
    return null;
  }
  // Handle string/object contexts...
}
```

**Common Pitfall:**

- JSON-LD `@context` can be string, object, or array
- Must check all contexts in array before returning null
- External ontologies (prov, dcterms) may not be in main context

### js/cdi-shacl-loader.js

**Purpose:** Load and parse SHACL shapes from various sources

**Shape Sources:**

1. **DDI-CDI Official** - ddi-cdi.github.io (300+ types, Core SHACL)
2. **CDIF Discovery Core** - Local shapes/cdif-core.ttl (20 properties)
3. **Local Fallback** - Built-in shapes/ddi-cdi-official.ttl
4. **Custom URL** - User-provided Turtle file

**Key Functions:**

- `loadShaclShapes(source)` - Load shapes from source
- `customDocumentLoader(url)` - Handle context loading with fallback

**Document Loader Pattern:**

```javascript
// Handle external contexts gracefully
async function customDocumentLoader(url) {
  try {
    // Try working URL first
    const response = await fetch(workingUrl, { timeout: 10000 });
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    // Fall back to local context
    return await loadLocalContext();
  }
}
```

**Critical:** Only Core SHACL supported (no `sh:SPARQLTarget`, `sh:SPARQLConstraint`)

### js/cdi-shacl-helpers.js

**Purpose:** Property classification and SHACL constraint extraction

**Key Functions:**

- `classifyProperty(nodeId, propertyName, shaclShapesStore, expandedJsonLd)` - Returns "SHACL-defined" or "EXTRA"
- `findNodeShape(nodeId, expandedJsonLd, shaclShapesStore)` - Find matching sh:NodeShape
- `findPropertyShape(nodeShapeId, propertyUri, shaclShapesStore)` - Get property constraints
- `getEnumValues(propertyShapeId, shaclShapesStore)` - Extract sh:in list values

**Classification Logic:**

1. Get node type(s) from expandedJsonLd (full URIs)
2. Find NodeShape(s) with matching `sh:targetClass`
3. For each property, check if `sh:path` matches property URI
4. Return "SHACL-defined" if found, "EXTRA" otherwise

**Critical Pattern - N3.js Term Objects:**

```javascript
// ❌ WRONG: Using string URIs
const pathQuads = store.getQuads(propertyShapeRef.value, ...)

// ✅ CORRECT: Using term objects
const pathQuads = store.getQuads(propertyShapeRef, ...)
```

**Why This Matters:**

- N3.js requires term objects (NamedNode, Literal), not strings
- Passing `propertyShapeRef.value` (string) causes lookups to fail silently
- This caused the "all properties marked EXTRA" bug

**Named Property Shapes:**

```turtle
# CDIF shapes use this pattern:
cdifd:DatasetShape
  sh:property cdifd:nameProperty .  # Reference to named shape

cdifd:nameProperty
  sh:path schema:name ;
  sh:minCount 1 .
```

When resolving: pass term object, not URI string.

### js/render.js

**Purpose:** UI rendering and tree visualization

**Key Functions:**

- `renderData()` - Main render loop for all nodes
- `renderNode(node, nodeTypes, nodeId)` - Render single node card
- `renderProperty(nodeId, key, value, nodeTypes)` - Render property row with badge

**Rendering Pattern:**

```javascript
// 1. Clear content
$("#content").empty();

// 2. Render nodes
jsonData["@graph"].forEach((node) => {
  const html = renderNode(node, nodeTypes, nodeId);
  $("#content").append(html);
});

// 3. Attach event handlers (NOT inside render functions)
attachEventHandlers();
```

**Property Badges:**

- 🔵 Blue "SHACL-defined" - Property in SHACL shapes
- 🟡 Yellow "EXTRA" - Property not in shapes
- 🔴 Red text - Required but missing
- 🔷 Teal border - Modified value

**Add Root Node Button:**

- Only shown in edit mode
- Appears at top of content area (not toolbar)
- Prominent styling with dashed border box

### js/validation.js

**Purpose:** SHACL validation execution and UI updates

**Key Function:**

- `validateData()` - Run SHACL validation and show results

**Validation Flow:**

1. Convert JSON-LD to RDF (jsonld.toRDF)
2. Parse RDF with N3.js into dataset
3. Run shacl-engine validator (with SPARQL support)
4. Parse validation report
5. Update UI with violations/warnings
6. Highlight invalid properties in red

**SHACL Severity Levels:**

- `sh:Violation` (ERROR) - Missing required properties, datatype mismatches
- `sh:Warning` (WARNING) - Missing recommended properties
- `sh:Info` (INFO) - Suggestions

**Critical:** Only Core SHACL constraints validated (no SPARQL)

### js/property-suggestions.js

**Purpose:** Suggest missing SHACL-defined properties

**Key Function:**

- `suggestProperties(nodeId, nodeTypes)` - Return array of missing properties

**Logic:**

1. Find all property shapes for node's types
2. Filter out properties already in data
3. Return suggestions with descriptions

**Used By:**

- Property dropdown in edit mode
- "Add Custom Property" feature

### js/event-handlers.js

**Purpose:** All UI event handlers

**Attached Events:**

- Toggle Edit Mode button
- Save to Dataverse button
- Validate button
- Export JSON-LD button
- Collapse/Expand All buttons
- Search input
- Shape selector dropdown
- Load Local File button
- Property add/delete buttons
- Value edit inputs

**Critical Pattern:**

```javascript
// ✅ CORRECT: Attach handlers AFTER rendering
function attachEventHandlers() {
  $("#toggle-edit-btn")
    .off("click")
    .on("click", function () {
      window.isEditMode = !window.isEditMode;
      // ...
    });
}

// ❌ WRONG: Handlers inside render functions
// (causes duplicate handlers on re-render)
```

### js/data-extraction.js

**Purpose:** Extract modified data from DOM and prepare for export

**Key Function:**

- `extractDataFromDom()` - Read all input values from DOM back into JSON-LD

**Flow:**

1. Clone originalData
2. For each node in DOM
3. Read all input values
4. Update JSON-LD structure
5. Preserve @context and other metadata
6. Return modified JSON-LD

**Preserves:**

- Original @context
- @graph vs flat structure (via `hadOriginalGraph` flag)
- Blank nodes and references

### js/cdi-graph-helpers.js

**Purpose:** Graph manipulation and node management

**Key Functions:**

- `getAvailableNodeTypes(shaclShapesStore)` - List all sh:targetClass types
- `createNewNode(type)` - Create blank node with @id and @type
- `addNodeToGraph(node)` - Add node to window.jsonData['@graph']
- `deleteNode(nodeId)` - Remove node and clean up references

**Node ID Generation:**

```javascript
// Create unique blank node IDs
const nodeId = `_:node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
```

**Reference Handling:**

```javascript
// Properties with sh:node or sh:class create references
{
  "@id": "node1",
  "schema:about": { "@id": "node2" }  // Reference, not embed
}
```

## Data Model

### JSON-LD Structure

**Input (flexible):**

```json
{
  "@context": {...},
  "@id": "dataset1",
  "schema:name": "Example"
}
```

**Normalized to @graph:**

```json
{
  "@context": {...},
  "@graph": [
    {
      "@id": "dataset1",
      "@type": "schema:Dataset",
      "schema:name": "Example"
    }
  ]
}
```

**Why @graph format?**

- Allows multiple disconnected nodes
- Preserves references between nodes
- Standard format for RDF datasets

### Expanded JSON-LD

**Purpose:** Full URI resolution for property matching

**Example:**

```json
// Compact
{ "schema:name": "Example" }

// Expanded (window.expandedJsonLd)
{ "http://schema.org/name": [{ "@value": "Example" }] }
```

**Usage:**

- Property classification (match full URIs)
- Context-independent comparison
- SHACL shape path matching

## Dependencies

### Runtime (bundled)

1. **N3.js v1.16.4** (~150KB)
   - RDF/Turtle parsing
   - Triple store for SHACL shapes
   - Critical: Must use term objects, not strings

2. **jsonld.js v8.3.2** (~130KB)
   - JSON-LD normalization
   - Expansion/compaction
   - RDF conversion

3. **shacl-engine v1.0.2** (~1.1MB)
   - Core SHACL validation with SPARQL constraint support
   - 15-26x faster than rdf-validate-shacl
   - Bundled with all dependencies (including @comunica/query-sparql)
   - Core SHACL validation only
   - No SPARQL support
   - Browser-compatible bundle

**Total: ~400KB minified**

### External (provided by Dataverse)

1. **jQuery 3.6.0**
   - DOM manipulation
   - AJAX calls
   - Event handling

2. **Bootstrap 3.3.7**
   - UI components
   - Grid system
   - Modals

**Why external?**

- Dataverse already loads these
- Avoids duplication in iframe
- Keeps bundle small

## Common Pitfalls & Solutions

### 1. Undefined Variable Errors

**Problem:** `editMode is not defined`

**Root Cause:** Variable not on window object

**Solution:**

```javascript
// ❌ WRONG
let editMode = false;

// ✅ CORRECT
window.isEditMode = false;
```

### 2. Context Resolution Failures

**Problem:** Properties marked EXTRA when they should be SHACL-defined

**Root Cause:** Context is array but code only checks object

**Solution:**

```javascript
// ❌ WRONG
const ns = context[prefix];

// ✅ CORRECT
const ns = resolvePrefix(context, prefix); // Handles arrays
```

### 3. N3.js Term Objects

**Problem:** SHACL lookups fail silently

**Root Cause:** Passing string URI instead of term object

**Solution:**

```javascript
// ❌ WRONG
const quads = store.getQuads(uri.value, ...);

// ✅ CORRECT
const quads = store.getQuads(uri, ...);  // uri is NamedNode
```

### 4. Duplicate Event Handlers

**Problem:** Buttons trigger multiple times

**Root Cause:** Handlers attached inside render functions

**Solution:**

```javascript
// ❌ WRONG
function renderNode() {
  html += '<button onclick="..."></button>';  // Inline handlers
  return html;
}

// ✅ CORRECT
function renderNode() {
  html += '<button class="delete-btn" data-id="..."></button>';
  return html;
}

function attachHandlers() {
  $('.delete-btn').off('click').on('click', function() { ... });
}
```

### 5. Namespace Consistency

**Problem:** Properties don't match between data and shapes

**Root Cause:** Mixed http:// and https:// namespaces

**Solution:**

- Use `http://schema.org/` consistently (not https)
- schema.org canonical namespace is http://
- Check both data and shapes use same namespace

## Build System

### Rollup Configuration

**Input:** `js/core.js` (entry point)

**Output:** `dist/cdi-viewer.min.js` (single bundle)

**Bundled:**

- All application JS files
- N3.js, jsonld.js, shacl-engine

**External:**

- jQuery (provided by Dataverse)
- Bootstrap (provided by Dataverse)

**Minification:**

- Terser plugin
- Keep console logs (drop_console: false)
- Mangle names except jQuery references

### Deployment Modes

**Standalone (GitHub Pages):**

```html
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js"></script>
<script src="dist/cdi-viewer.min.js"></script>
```

**Dataverse Integration:**

```html
<!-- jQuery/Bootstrap already loaded by Dataverse -->
<script src="lib/cdi-viewer.min.js"></script>
```

## Testing Strategy

### Unit Tests

**Focus:** Individual functions in isolation

**Examples:**

- Property classification logic
- Context resolution
- Node ID generation
- Data extraction from DOM

### Integration Tests

**Focus:** Module interactions

**Examples:**

- Load JSON-LD → normalize → render
- Edit property → extract → validate
- Load shapes → classify properties → show badges

### Regression Tests

**Critical:** Prevent bugs from recurring

**Examples:**

- window.isEditMode defined (not editMode)
- window.currentLogLevel accessible
- N3.js term objects used correctly
- Context arrays handled properly

**Test Coverage Goal:** 50% minimum (Jest configured)

## Security Considerations

### XSS Prevention

**Input Sanitization:**

- All user input escaped before rendering
- jQuery `.text()` instead of `.html()` for untrusted content
- Property names validated against SHACL

### API Token Handling

**Dataverse Save:**

- API token in password input (not visible)
- Token not stored in localStorage
- HTTPS required for production

### External Content

**SHACL Shapes:**

- Loaded from trusted sources only
- Validate Turtle syntax before parsing
- Timeout on external requests (10s)

## Future Enhancements

### ES6 Modules (Priority: High)

**Current:** Script tags with window.\* globals

**Future:** ES6 modules with imports

```javascript
// core.js
export const config = { ... };
export let jsonData = null;

// render.js
import { config, jsonData } from './core.js';
```

**Benefits:**

- Proper dependency management
- Tree shaking (smaller bundles)
- Better IDE support
- Type checking with TypeScript

### TypeScript Migration (Priority: Medium)

**Add type definitions:**

- Function parameters
- Return types
- Global state interfaces

**Benefits:**

- Catch bugs at compile time
- Better IDE autocomplete
- Self-documenting code

### Controlled Vocabularies (Priority: Medium)

**sh:in constraints as dropdowns:**

```javascript
// Currently: text input
// Future: dropdown with sh:in values
<select>
  <option>open</option>
  <option>embargoed</option>
  <option>restricted</option>
</select>
```

### Undo/Redo (Priority: Low)

**State management:**

- Track edit history
- Undo button restores previous state
- Redo button replays changes

## Debugging

### Enable Debug Mode

Add `?debug=true` to URL:

```
https://libis.github.io/cdi-viewer/?debug=true
```

**Shows:**

- Shape loading details
- Property classification decisions
- Validation execution logs
- Data structure information

### Common Debug Checks

**1. Check global variables:**

```javascript
console.log("isEditMode:", window.isEditMode);
console.log("jsonData:", window.jsonData);
console.log("shaclShapesStore:", window.shaclShapesStore);
```

**2. Check shape loading:**

```javascript
console.log("Current shape source:", window.currentShapeSource);
console.log("Shape URLs:", window.SHAPE_URLS);
console.log("Shapes loaded:", window.shaclShapes ? "Yes" : "No");
```

**3. Check property classification:**

```javascript
const classification = classifyProperty(
  nodeId,
  propertyName,
  window.shaclShapesStore,
  window.expandedJsonLd
);
console.log(`Property ${propertyName}:`, classification);
```

### Browser Console

**Useful commands:**

```javascript
// View all nodes
window.jsonData["@graph"];

// View expanded JSON-LD
window.expandedJsonLd;

// Re-render UI
renderData();

// Extract current data
const data = extractDataFromDom();
console.log(JSON.stringify(data, null, 2));
```

## Performance Considerations

### Bundle Size

**Target:** < 500KB minified

**Current:** ~1.14MB (App 38KB + Validation 1.1MB)

- Validation bundle includes shacl-engine with SPARQL support
- App bundle contains all application logic

**Optimization:**

- Core SHACL only (no SPARQL = saves 1.9MB)
- External jQuery/Bootstrap (saves ~100KB)
- Terser minification
- Gzip compression (server-side)

### Large Files

**Current Limit:** ~100 nodes perform well

**For larger files:**

- Consider pagination
- Virtual scrolling
- Lazy loading of nodes
- Search-based filtering

### Shape Loading

**Strategy:** Async + caching

```javascript
// Load shapes once, reuse
if (!window.shaclShapesStore) {
  await loadShaclShapes("ddi-cdi-official");
}
```

## Maintenance Guidelines

### Adding New Features

1. Write tests first (TDD)
2. Update ARCHITECTURE.md
3. Document in API.md
4. Update README.md
5. Add example to docs/

### Modifying Existing Code

1. Check existing tests
2. Run `npm test` before and after
3. Verify bundle size (`npm run build`)
4. Test in both standalone and Dataverse modes
5. Update documentation

### Code Review Checklist

- [ ] Tests added/updated?
- [ ] Documentation updated?
- [ ] Linting passes (`npm run lint`)?
- [ ] Bundle size acceptable?
- [ ] Works in standalone mode?
- [ ] Works in Dataverse iframe?
- [ ] No console errors?
- [ ] Accessible (ARIA labels)?

## Resources

### Standards

- **DDI-CDI:** https://ddi-cdi.github.io/
- **SHACL:** https://www.w3.org/TR/shacl/
- **JSON-LD:** https://json-ld.org/
- **RDF:** https://www.w3.org/RDF/

### Libraries

- **N3.js:** https://github.com/rdfjs/N3.js
- **jsonld.js:** https://github.com/digitalbazaar/jsonld.js
- **shacl-engine:** https://github.com/rdf-ext/shacl-engine (vendored with SPARQL target support)

### Vendored Dependencies

**shacl-engine v1.0.2 + SPARQL Targets**

Located in `vendor/shacl-engine/` - Modified version with SPARQL target support.

**Why Vendored:**

- Upstream doesn't yet support `sh:SPARQLTarget` (SHACL Advanced Features)
- Required for CDIF Discovery shapes that validate only root datasets
- Temporary until feature is merged upstream

**Modifications (3 files, ~60 lines):**

1. `Validator.js` - Added `sh:target` to shape detection
2. `lib/Shape.js` - Made `resolveTargets()` async
3. `lib/TargetResolver.js` - Implemented SPARQL target execution

**Integration:**

- `package.json`: `"shacl-engine": "file:./vendor/shacl-engine"`
- `npm install` creates symlink: `node_modules/shacl-engine -> vendor/shacl-engine`
- Rollup bundles from vendored source
- Works on GitHub Actions (vendor/ committed to git)

**Migration Path:**

- Submit PR to rdf-ext/shacl-engine
- Once merged and published, update to npm version
- Remove vendor/ directory

See `VENDORED_DEPENDENCIES.md` for details.

### Dataverse

- **API Guide:** https://guides.dataverse.org/en/latest/api/
- **External Tools:** https://guides.dataverse.org/en/latest/api/external-tools.html
- **GDCC Previewers:** https://github.com/gdcc/dataverse-previewers

---

**Last Updated:** 2025-11-21

**Maintained By:** LIBIS @ KU Leuven
