# AI Context for JSON-LD Viewer Development

**Purpose:** This file provides essential context for AI assistants working on the cdi-viewer codebase. It prevents context drift and ensures consistent code quality.

**Project Vision:** A powerful, browser-based JSON-LD editor and SHACL validator that works with any RDF vocabulary. Originally developed for DDI-CDI, now positioned as a generic tool with DDI-CDI as the default use case.

**Last Updated:** 2025-11-20

---

## Project Status

### Current State

- **Architecture**: ES6 modules with centralized state management
- **Build System**: Rollup producing 1.2MB bundle
- **Code Quality**: 0 ESLint errors/warnings, Prettier formatted
- **Features**: Complete - editing, validation, array/reference support
- **Default Mode**: DDI-CDI shapes auto-load (use `?shacl=generic` for other vocabularies)
- **Deployment**: GitHub Pages live, ready for Dataverse integration

### What Works

✅ ES6 module migration complete (11 modules)
✅ SHACL validation with shacl-engine
✅ Array operations (convert, add/remove values/references)
✅ Complex object creation (nested nodes, references)
✅ Property suggestions and classification
✅ Export/import JSON-LD
✅ Enhanced discoverability (keywords, documentation)

### Next Focus

- End-to-end testing of all features
- Dataverse integration testing
- GitHub repository enhancements

---

## Critical Architectural Decisions

### 1. Generic JSON-LD Support with DDI-CDI Default

**Decision:** Support any JSON-LD vocabulary, but default to DDI-CDI to match tool name and primary use case.

**Why:**
- Uses standard JSON-LD processing (jsonld.js library)
- Works with any RDF vocabulary (DDI-CDI, schema.org, DCAT, BIBFRAME, custom ontologies)
- SHACL shapes loaded dynamically via URL
- No hardcoded vocabulary assumptions

**Auto-Detection (js/cdi-shacl-loader.js):**
```javascript
// DDI-CDI mode automatically enabled when loading SHACL shapes
// Detection: Version-agnostic, protocol-agnostic regex match
function detectAndConfigureDDICDIMode(shapesText) {
  const isDDICDI = /ddialliance\.org\/Specification\/DDI-CDI/i.test(shapesText);
  if (isDDICDI) {
    window.defaultTypeNamespace = "http://ddialliance.org/Specification/DDI-CDI/1.0/RDF/";
    // Also enables: legacy context handling, DDICDIModels normalization
  } else {
    window.defaultTypeNamespace = null; // Generic mode
  }
}
```

**Manual Override (Optional, js/core.js):**
```javascript
window.defaultTypeNamespace = "http://schema.org/"; // Schema.org mode
window.defaultTypeNamespace = "http://www.w3.org/ns/dcat#"; // DCAT mode
window.defaultTypeNamespace = null; // Generic mode (no assumptions)
```

**Legacy Context Mappings (js/cdi-json-ld-helpers.js):**
```javascript
// Optional: Map legacy context URLs to local copies
const LEGACY_CONTEXT_URLS = {
  "https://old-url.org/context.jsonld": "shapes/local-context.jsonld",
};
```

**DDI-CDI Specific Features (Optional):**
- `DDICDIModels` normalization: Only triggers if property exists in data
- Legacy context mapping: Configurable via LEGACY_CONTEXT_URLS

### 2. ES6 Module Architecture with Centralized State

**Decision:** Use ES6 modules with centralized state management via `state.js`.

**Architecture:**
- Single entry point: `src/index.js` imports all modules
- State module (`src/jsonld-editor/state.js`) exports getters/setters
- All modules use imports/exports (no global scope pollution)
- Rollup bundles into single IIFE for browser compatibility

**Implementation:**
```javascript
// state.js - Centralized state
export function getJsonData() { return state.jsonData; }
export function setJsonData(data) { state.jsonData = data; }

// Other modules import what they need
import { getJsonData, setJsonData } from './state.js';
import { validateData } from './validation.js';
import { renderData } from './render.js';
```

**Key State Variables:**
- `jsonData` - Current JSON-LD data (@graph format)
- `shaclShapesStore` - N3.Store with parsed SHACL triples
- `isEditMode` - Boolean: edit mode enabled?
- `expandedJsonLd` - Fully expanded JSON-LD for URI matching
- `validationReport` - Latest SHACL validation report
- `defaultTypeNamespace` - Default namespace for DDI-CDI mode

**Benefits:**
- Type-safe access via getter/setter functions
- No global scope pollution
- Easy to test and maintain
- Standard ES6 practices

### 3. Core SHACL Only (No SPARQL)

**Decision:** Support only Core SHACL features, exclude SPARQL-based constraints.

**Why:**
- Keeps bundle size under 500KB (~400KB actual)
- Eliminates 1.9MB SPARQL engine dependency
- Sufficient for 95% of validation use cases
- Browser-compatible and fast

**What's Supported:**
- `sh:targetClass`, `sh:targetNode`
- `sh:property`, `sh:path`
- `sh:minCount`, `sh:maxCount`
- `sh:datatype`, `sh:nodeKind`
- `sh:in` (enumeration values)
- `sh:node`, `sh:class` (nested shapes)
- `sh:minLength`, `sh:maxLength`
- `sh:pattern` (regex validation)

**What's NOT Supported:**
- `sh:SPARQLTarget`
- `sh:SPARQLConstraint`
- `sh:ask` queries
- `sh:select` queries

### 3. Dual Deployment Architecture

**Decision:** Single codebase for both standalone (GitHub Pages) and Dataverse integration.

**Why:**
- Maintain one source of truth
- Easier testing and maintenance
- Consistent user experience

**Implementation:**
```javascript
// Detect environment from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const fileId = urlParams.get('fileid');
const siteUrl = urlParams.get('siteUrl');

if (fileId && siteUrl) {
  // Dataverse mode: Load from API
  loadFromDataverse(fileId, siteUrl);
} else {
  // Standalone mode: Load local file or testfile parameter
  const testfile = urlParams.get('testfile');
  if (testfile) {
    loadLocalFile(`examples/cdi/${testfile}`);
  }
}
```

### 4. Dual Deployment Architecture

**Decision:** Single ES6 codebase bundled for both standalone and Dataverse deployment.

**Standalone Mode (GitHub Pages):**
- URL: https://libis.github.io/cdi-viewer/
- Default: DDI-CDI shapes auto-load
- Generic: Add `?shacl=generic` parameter
- All dependencies bundled in single file

**Dataverse Integration Mode:**
- Bundle: `dist/cdi-viewer.bundle.js`
- URL params: `?fileid=X&siteUrl=Y`
- Works with Dataverse-provided jQuery/Bootstrap
- Save directly to Dataverse API

**Benefits:**
- Single source of truth
- Easier testing and maintenance
- Consistent user experience

---

## Critical Patterns to Follow

### Pattern 1: N3.js Term Objects (NOT Strings)

**CRITICAL:** N3.js requires term objects for queries, not URI strings.

```javascript
// ❌ WRONG: Using .value (string)
const pathQuads = store.getQuads(propertyShapeRef.value, sh('path'), null);

// ✅ CORRECT: Using term object
const pathQuads = store.getQuads(propertyShapeRef, sh('path'), null);

// ❌ WRONG: Creating string
const targetClass = 'http://schema.org/Dataset';

// ✅ CORRECT: Using NamedNode
const targetClass = N3.DataFactory.namedNode('http://schema.org/Dataset');
```

**Why This Matters:**
- Passing `.value` causes silent failures (queries return empty)
- This bug caused "all properties marked EXTRA" issue
- N3.js internal comparisons use term identity, not string equality

### Pattern 2: Array Context Handling

**CRITICAL:** JSON-LD `@context` can be string, object, OR array.

```javascript
// ❌ WRONG: Only handles object
function resolvePrefix(context, prefix) {
  return context[prefix];  // Fails for arrays!
}

// ✅ CORRECT: Handles all types
function resolvePrefix(context, prefix) {
  if (Array.isArray(context)) {
    for (const ctx of context) {
      const ns = resolvePrefix(ctx, prefix);  // Recursive
      if (ns) return ns;
    }
    return null;
  }
  
  if (typeof context === 'string') {
    // Handle external context URL
    return null;
  }
  
  if (typeof context === 'object') {
    return context[prefix] || null;
  }
  
  return null;
}
```

**Why This Matters:**
- External ontologies (dcterms, prov) often in array contexts
- Missing this causes property classification failures
- Must check ALL contexts in array before returning null

### Pattern 3: Event Handler Attachment

**CRITICAL:** Attach event handlers AFTER rendering, not during.

```javascript
// ❌ WRONG: Handlers inside render functions
function renderNode(node) {
  html += `<button onclick="deleteNode('${node.id}')">Delete</button>`;
  return html;
}

// ✅ CORRECT: Separate rendering from event handling
function renderNode(node) {
  html += `<button class="delete-btn" data-id="${node.id}">Delete</button>`;
  return html;
}

function attachEventHandlers() {
  $('.delete-btn').off('click').on('click', function() {
    const nodeId = $(this).data('id');
    deleteNode(nodeId);
  });
}

// Call after rendering
renderData();
attachEventHandlers();
```

**Why This Matters:**
- Prevents duplicate event handlers on re-render
- Separates concerns (rendering vs behavior)
- Easier to test and debug

### Pattern 4: Preserve Original Data Structure

**CRITICAL:** When extracting data, preserve original @context and structure.

```javascript
// ✅ CORRECT: Preserve original structure
function extractDataFromDom() {
  // Clone original to preserve @context
  const result = JSON.parse(JSON.stringify(window.originalData));
  
  // Preserve @graph vs flat structure
  if (window.hadOriginalGraph) {
    result['@graph'] = extractNodesFromDom();
  } else {
    // Flatten back to single object
    Object.assign(result, extractNodesFromDom()[0]);
  }
  
  return result;
}
```

**Why This Matters:**
- Users expect exported data to match input format
- @context may have custom namespaces
- @graph vs flat affects compatibility with other tools

---

## Common Pitfalls to Avoid

### Pitfall 1: Not Using State Module

**Symptom:** Cannot access application state from module

**Cause:** Not importing from state module

**Fix:**
```javascript
// ❌ WRONG
if (window.isEditMode) { ... }  // Bypasses state module

// ✅ CORRECT
import { getIsEditMode } from './state.js';
if (getIsEditMode()) { ... }
```

### Pitfall 2: Properties Marked EXTRA Incorrectly

**Symptom:** Blue SHACL-defined properties showing as yellow EXTRA

**Causes:**
1. Context not handled correctly (see Pattern 2)
2. N3.js term objects not used (see Pattern 1)
3. Namespace mismatch (http:// vs https://)

**Debug:**
```javascript
// Enable debug mode
window.currentLogLevel = 'DEBUG';

// Check property classification
const result = classifyProperty(nodeId, 'schema:name', 
  window.shaclShapesStore, window.expandedJsonLd);
console.log('Classification:', result);

// Check shape loading
console.log('Shapes loaded:', window.shaclShapes ? 'Yes' : 'No');
console.log('Store size:', window.shaclShapesStore?.size || 0);
```

### Pitfall 3: Duplicate Event Handlers

**Symptom:** Button clicked once, function executes multiple times

**Cause:** Event handlers attached inside render functions

**Fix:** See Pattern 3 above, always use `.off('click').on('click', ...)` pattern

### Pitfall 4: Namespace Inconsistency

**Symptom:** Properties don't match between data and SHACL shapes

**Cause:** Mixed http:// and https:// for same namespace

**Fix:**
```javascript
// ✅ CORRECT: schema.org canonical is http://
const ns = 'http://schema.org/';

// ❌ WRONG: Using https://
const ns = 'https://schema.org/';  // Won't match shapes

// Check both data and shapes use same namespace
console.log('Data uses:', context['schema']);
console.log('Expected:', 'http://schema.org/');
```

### Pitfall 5: Lost Data on Export

**Symptom:** Exported JSON-LD missing properties or has wrong structure

**Cause:** Not preserving original structure (see Pattern 4)

**Prevention:**
- Always track `window.hadOriginalGraph`
- Clone `window.originalData` before modifying
- Test export with various input formats

---

## Testing Requirements

### Current Approach

**Focus:** Manual end-to-end testing of critical workflows

**Priority Test Scenarios:**
1. Load file → enable edit mode → modify properties → export → verify valid JSON-LD
2. Load DDI-CDI file → verify shapes auto-load → validate → check classification
3. Use `?shacl=generic` → load schema.org file → load custom shapes → validate
4. Convert single value ↔ array → add/remove items → export → verify structure
5. Add complex property → create nested object → reference existing node → export

### Testing Tools

**Available:**
- Jest for unit tests (73 tests currently disabled during migration)
- ESLint for code quality (0 errors)
- Manual testing in browser

**Future:**
- Re-enable Jest tests with ES6 module imports
- Add Playwright for browser automation
- Add mutation testing with Stryker

### Critical Tests to Maintain

**1. Regression Tests (Prevent Past Bugs)**
- `window.isEditMode` exists (not `editMode`)
- `window.currentLogLevel` accessible
- N3.js term objects used in queries
- Array contexts handled correctly

**2. Bug Prevention Tests**
- humanizeKey capitalizes each word
- Duplicate properties should create arrays
- Required properties cannot be deleted in edit mode
- Export preserves original @context

**3. Integration Tests**
- Load SimpleSample.jsonld successfully
- Classify properties correctly
- Validate against SHACL shapes
- Export matches input structure

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- core.test.js

# Run with coverage (currently 0% due to no imports)
npm run test:coverage

# Run in watch mode
npm run test:watch
```

---

## Build System Overview

### Build Process

**Entry Point:** `src/index.js`

**Output:** `dist/cdi-viewer.bundle.js` (1.2MB bundle)

**Bundled Libraries:**
- N3.js v1.16.x
- jsonld.js
- shacl-engine (includes SPARQL support)
- All application modules

**External (loaded from CDN):**
- jQuery 3.7.1
- Bootstrap 3.3.7

**Total Size:** 1.2MB (includes SPARQL engine for advanced SHACL validation)

### Build Commands

```bash
# Development build (with source maps)
npm run build

# Production build (same, already minified)
npm run build

# Start dev server (Python)
npm run dev
# Open http://localhost:8000

# Test production bundle
# Open http://localhost:8000/test-bundle.html
```

### Rollup Configuration

**Key Settings:**
```javascript
{
  input: 'js/core.js',
  output: {
    file: 'dist/cdi-viewer.min.js',
    format: 'iife',
    name: 'CDIViewer',
    sourcemap: true
  },
  plugins: [
    nodeResolve({ browser: true }),
    commonjs(),
    terser({
      compress: { drop_console: false },  // Keep console logs
      mangle: true
    })
  ]
}
```

### Deployment

**Standalone (GitHub Pages):**
- Source: `main` branch, root directory
- URL: https://libis.github.io/cdi-viewer/
- Loads: `dist/cdi-viewer.min.js` from CDN

**Dataverse Integration:**
- Bundle: `dist/cdi-viewer.min.js`
- Copy to: `dataverse-previewers/previewers/betatest/lib/`
- HTML: `CdiPreview.html` references bundle

---

## Code Quality Standards

### Linting

**Zero Errors Required:** All PRs must pass linting

```bash
# Run linting
npm run lint

# Auto-fix where possible
npm run lint -- --fix
```

**Expected Warnings (22):**
- Functions called from HTML (onclick handlers)
- These are acceptable and documented

### Code Style

**Follow Existing Patterns:**
- 2-space indentation
- Single quotes for strings
- Semicolons required
- camelCase for variables/functions
- PascalCase for classes

**Naming Conventions:**
```javascript
// ✅ CORRECT
function renderNodeTree(node, depth) { ... }
const isEditMode = window.isEditMode;
class ValidationReport { ... }

// ❌ WRONG
function render_node_tree(node, depth) { ... }  // snake_case
const is_edit_mode = window.isEditMode;         // inconsistent
class validationReport { ... }                   // wrong case
```

### Documentation

**JSDoc Comments Required for Public Functions:**
```javascript
/**
 * Classify a property as SHACL-defined or EXTRA
 * @param {string} nodeId - The node ID (e.g., "_:b0")
 * @param {string} propertyKey - The property key (e.g., "schema:name")
 * @param {N3.Store} shaclStore - Store containing SHACL shapes
 * @param {Object} expandedJsonLd - Fully expanded JSON-LD
 * @returns {Object} Classification result with type and constraints
 */
function classifyProperty(nodeId, propertyKey, shaclStore, expandedJsonLd) {
  // Implementation...
}
```

---

## Development Workflow

### Before Starting Work

1. **Read ARCHITECTURE.md** - Understand system design
2. **Check NEXT_STEPS.md** - See current priorities
3. **Read this file** - Understand critical patterns
4. **Check code quality** - Ensure starting from clean state

```bash
npm run lint
npm run build
```

### During Development

1. **Write tests first** (TDD when possible)
2. **Use debug mode** - Add `?debug=true` to URL
3. **Check browser console** - Watch for errors
4. **Test frequently** - Run `npm test` after each change

### Before Committing

1. **Run all tests** - `npm test`
2. **Run linting** - `npm run lint`
3. **Build bundle** - `npm run build`
4. **Test bundle** - Open `test-bundle.html`
5. **Update documentation** - If you changed architecture

### Common Development Tasks

**Add a new function:**
```javascript
// 1. Add to appropriate module (e.g., js/render.js)
function myNewFunction(param1, param2) {
  // Implementation
}

// 2. Make it globally accessible if needed
window.myNewFunction = myNewFunction;

// 3. Write test in tests/render.test.js
test('myNewFunction does X', () => {
  // Test logic pattern or use eval()
});

// 4. Run tests
// npm test -- render.test.js

// 5. Document in ARCHITECTURE.md if significant
```

**Fix a bug:**
```javascript
// 1. Write failing test that reproduces bug
test('bug: duplicate properties create array', () => {
  // Test that currently fails
});

// 2. Fix the code
// ...

// 3. Verify test passes
// npm test

// 4. Check for similar bugs in other modules
```

---

## Known Issues and Workarounds

### Issue 1: Duplicate Custom Properties (Latest Wins)

**Status:** Known bug, documented in Phase 11.5

**Current Behavior:**
- Add two custom properties with same name
- Exit edit mode
- Only latest value preserved

**Expected Behavior:**
- Should create array: `["value1", "value2"]`

**Fix Planned:** Phase 11.5.2 - Implement array handling

### Issue 3: No Undo/Redo

**Status:** Feature request, low priority

**Workaround:** Users can reload page to discard changes

**Future:** Phase 11.5 (long-term)

---

## Quick Reference

### Essential Files

- **ARCHITECTURE.md** - Comprehensive technical guide
- **NEXT_STEPS.md** - Current priorities and testing plan
- **CONTRIBUTING.md** - Development workflow and guidelines
- **README.md** - User-facing documentation
- **docs/GENERIC_USAGE.md** - Guide for using with any vocabulary
- **docs/CDI_PREVIEWER.md** - Feature documentation
- **.ai/context.md** - This file (AI assistant context)

### Essential Commands

```bash
# Development
npm run dev              # Start server on :8000
npm run lint             # Check code quality
npm run fmt              # Format code with Prettier
npm run build            # Build production bundle

# URLs
http://localhost:8000                        # DDI-CDI mode (default)
http://localhost:8000/?shacl=generic         # Generic mode
http://localhost:8000/?testfile=SimpleSample.jsonld  # Load example
https://libis.github.io/cdi-viewer/          # Live demo
```

### Key Modules

```javascript
// State management
import { getJsonData, setJsonData, getIsEditMode } from './state.js';

// Core functionality
import { initializeApp } from './core.js';
import { validateData } from './validation.js';
import { renderData } from './render.js';

// Graph operations
import { addNodeToGraph, deleteNode, addPropertyToNode } from './cdi-graph-helpers.js';
import { convertPropertyToArray, createAndReferenceNewNode } from './cdi-graph-helpers.js';

// SHACL helpers
import { classifyProperty, getEnumerationValues } from './cdi-shacl-helpers.js';
import { loadShapes } from './cdi-shacl-loader.js';

// Data extraction
import { collectChangesFromDOM, exportData } from './data-extraction.js';
```

---

## AI Assistant Instructions

**When suggesting code changes:**

1. ✅ **DO** use ES6 imports/exports
2. ✅ **DO** import from state.js for application state
3. ✅ **DO** use N3.js term objects, not URI strings
4. ✅ **DO** handle array contexts in JSON-LD
5. ✅ **DO** attach event handlers after rendering
6. ✅ **DO** check ARCHITECTURE.md for design decisions
7. ✅ **DO** run `npm run fmt` before committing

8. ❌ **DON'T** access global window variables directly
9. ❌ **DON'T** use `.value` property on N3.js terms
10. ❌ **DON'T** assume context is always an object
11. ❌ **DON'T** add inline onclick handlers
12. ❌ **DON'T** duplicate functionality across modules
13. ❌ **DON'T** skip code quality checks (lint, format)

**When fixing bugs:**

1. First, write a failing test that reproduces the bug
2. Check if similar bugs exist in other modules
3. Fix the code following existing patterns
4. Verify all tests pass
5. Update documentation if architecture changed

**When adding features:**

1. Check if feature aligns with current phase (see plan.md)
2. Discuss architectural impact before implementing
3. Write tests first (TDD approach)
4. Follow existing patterns and conventions
5. Update ARCHITECTURE.md and plan.md
6. Test in both standalone and Dataverse modes

---

**This context file ensures consistent, high-quality contributions to the CDI Viewer project.**
