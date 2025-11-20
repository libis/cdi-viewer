# AI Context for JSON-LD Viewer Development

**Purpose:** This file provides essential context for AI assistants (GitHub Copilot, Cursor, etc.) working on the JSON-LD Viewer codebase. It prevents context drift and ensures consistent code quality.

**Note:** This is a generic JSON-LD viewer that works with any RDF vocabulary (DDI-CDI, schema.org, DCAT, etc.), not just DDI-CDI.

**Last Updated:** 2025-11-20

---

## Critical Architectural Decisions

### 1. Generic JSON-LD Support

**Decision:** Support any JSON-LD vocabulary via standard jsonld.flatten() and custom SHACL shapes with automatic DDI-CDI mode detection.

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

### 2. Global State Pattern (window.*)

**Decision:** Use `window.*` for all shared state across modules.

**Why:**
- All JS files loaded via `<script>` tags (no ES6 modules currently)
- Must work in Dataverse iframe context
- Variables must be truly global for cross-file access
- IIFE and namespace patterns failed in iframe environment

**Implementation:**
```javascript
// ✅ CORRECT
window.jsonData = { ... };
window.isEditMode = false;
window.shaclShapesStore = null;
window.defaultTypeNamespace = null; // Configuration

// ❌ WRONG
let jsonData = { ... };        // Not accessible across files
var editMode = false;          // Missing window. prefix causes undefined errors
```

**Global Variables to Use:**
- `window.jsonData` - Current JSON-LD data (@graph format)
- `window.shaclShapesStore` - N3.Store with parsed SHACL triples
- `window.isEditMode` - Boolean: edit mode enabled?
- `window.expandedJsonLd` - Fully expanded JSON-LD for URI matching
- `window.currentLogLevel` - Logging level (ERROR/WARN/INFO/DEBUG)
- `window.originalData` - Original JSON-LD for reset
- `window.validationReport` - Latest SHACL validation report
- `window.defaultTypeNamespace` - Default namespace for unprefixed types (configurable)

**Future:** Will migrate to ES6 modules with proper imports/exports (Phase 11.1)

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

### 4. Browser-Only Architecture (Current)

**Decision:** All modules are browser-only, no Node.js compatibility yet.

**Why:**
- Rapid development focused on production use
- DOM dependencies throughout
- Dataverse integration is primary use case

**Implications:**
- No `module.exports` or `export` statements
- Tests cannot import actual modules (0% coverage tracking)
- Must use `eval()` or logic pattern replication for testing

**Future:** Phase 11.1 will add conditional exports for testability:
```javascript
// Add at end of each module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    functionName1,
    functionName2,
    // ...
  };
}
```

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

### Pitfall 1: Undefined Variable Errors

**Symptom:** `ReferenceError: editMode is not defined`

**Cause:** Variable not on window object

**Fix:**
```javascript
// ❌ WRONG
let editMode = false;
if (editMode) { ... }

// ✅ CORRECT
window.isEditMode = false;
if (window.isEditMode) { ... }
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

### Test Coverage Goals

**Current Status:**
- 73/73 tests passing ✅
- Direct coverage: 11/33 functions (33%)
- Indirect coverage: ~15-18/33 functions (45-55%)

**Target:** 50% minimum (Jest configured)

### Testing Approach

**1. Logic Pattern Tests (Current)**
```javascript
// Test logic without importing actual module
test('humanizeKey capitalizes each word', () => {
  const humanizeKey = (key) => {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .trim()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };
  
  expect(humanizeKey('has_version')).toBe('Has Version');
});
```

**2. Eval-Based Tests (For Complex Modules)**
```javascript
// Load and execute actual module code
test('parseRdfList works correctly', () => {
  const fs = require('fs');
  const code = fs.readFileSync('js/cdi-shacl-helpers.js', 'utf8');
  
  // Mock dependencies
  window.$ = jest.fn();
  window.log = jest.fn();
  
  // Execute actual code
  eval(code);
  
  // Test real function
  const result = parseRdfList(mockListNode);
  expect(result).toEqual([...]);
});
```

**3. Future: Browser Integration Tests (Phase 11.2)**
```javascript
// Using Playwright/Puppeteer
test('edit workflow preserves data', async () => {
  await page.goto('http://localhost:8000');
  await page.click('#toggle-edit-btn');
  await page.fill('input[name="schema:name"]', 'New Value');
  await page.click('#toggle-edit-btn');
  
  const exported = await page.evaluate(() => {
    return window.jsonData;
  });
  
  expect(exported['@graph'][0]['schema:name']).toBe('New Value');
});
```

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

**Entry Point:** `js/core.js`

**Output:** `dist/cdi-viewer.min.js` (44KB minified)

**Bundled Libraries:**
- N3.js v1.16.x (~150KB)
- jsonld.js (~130KB)
- rdf-validate-shacl (~120KB)

**External (not bundled):**
- jQuery 3.7.1 (provided by Dataverse or CDN)
- Bootstrap 3.3.7 (provided by Dataverse or CDN)

**Total Size:** ~400KB including all dependencies

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
2. **Check plan.md** - See what phase you're in
3. **Read this file** - Understand critical patterns
4. **Run tests** - Ensure starting from clean state

```bash
npm test
npm run lint
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

### Issue 1: 0% Test Coverage Despite 73 Passing Tests

**Cause:** Browser-only architecture prevents module imports

**Workaround:** Tests replicate logic patterns or use eval()

**Future Fix:** Phase 11.1 will add conditional exports:
```javascript
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { /* functions */ };
}
```

### Issue 2: Duplicate Custom Properties (Latest Wins)

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

- **ARCHITECTURE.md** - Comprehensive technical guide (6000+ words)
- **plan.md** - Development roadmap with phase tracking
- **CONTRIBUTING.md** - Development workflow and guidelines
- **README.md** - User-facing documentation
- **docs/CDI_PREVIEWER.md** - Feature documentation
- **.ai/context.md** - This file (AI assistant context)

### Essential Commands

```bash
# Development
npm run dev              # Start server on :8000
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run lint             # Check code quality
npm run build            # Build production bundle

# URLs
http://localhost:8000                        # Standalone mode
http://localhost:8000/test-bundle.html      # Test production bundle
http://localhost:8000/?debug=true           # Enable debug logging
http://localhost:8000/?testfile=SimpleSample.jsonld  # Load example
```

### Essential Global Variables

```javascript
window.jsonData          // Current JSON-LD (@graph format)
window.isEditMode        // Boolean: edit mode active?
window.shaclShapesStore  // N3.Store with SHACL shapes
window.expandedJsonLd    // Expanded JSON-LD for URI matching
window.currentLogLevel   // Logging: ERROR/WARN/INFO/DEBUG
```

### Essential Functions

```javascript
// Rendering
renderData()             // Re-render entire UI
renderNode(node)         // Render single node card

// Property classification
classifyProperty(nodeId, propertyKey, shaclStore, expandedJsonLd)

// Validation
validateData()           // Run SHACL validation

// Data extraction
extractDataFromDom()     // Extract current state from DOM

// JSON-LD processing
resolvePrefix(context, prefix)
expandCompactIri(context, compactIri)
```

---

## AI Assistant Instructions

**When suggesting code changes:**

1. ✅ **DO** use `window.*` for all shared state
2. ✅ **DO** use N3.js term objects, not URI strings
3. ✅ **DO** handle array contexts in JSON-LD
4. ✅ **DO** attach event handlers after rendering
5. ✅ **DO** write tests for new functions
6. ✅ **DO** check ARCHITECTURE.md for design decisions

7. ❌ **DON'T** use `let`/`const` for shared state
8. ❌ **DON'T** use `.value` property on N3.js terms
9. ❌ **DON'T** assume context is always an object
10. ❌ **DON'T** add inline onclick handlers
11. ❌ **DON'T** skip tests for "simple" changes
12. ❌ **DON'T** invent new patterns without discussing

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
