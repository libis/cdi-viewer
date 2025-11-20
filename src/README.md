# Source Code - ES6 Modules

This directory contains modern ES6 modules for the cdi-viewer application.

## Module Structure

```
src/
├── index.js                    # Entry point - imports all modules
└── jsonld-editor/
    ├── state.js                # Centralized state management
    ├── core.js                 # Initialization & configuration
    ├── validation.js           # SHACL validation (shacl-engine)
    ├── cdi-shacl-loader.js     # SHACL shape loading
    ├── cdi-shacl-helpers.js    # Property classification logic
    ├── cdi-json-ld-helpers.js  # JSON-LD normalization
    ├── cdi-graph-helpers.js    # Graph manipulation
    ├── render.js               # UI rendering
    ├── property-suggestions.js # Property suggestion UI
    ├── data-extraction.js      # Export pipeline
    └── event-handlers.js       # Event wiring
```

## Key Modules

### state.js
Central state management with getters/setters:
- `getJsonData()`, `setJsonData()` - Current JSON-LD data
- `getShaclShapesStore()`, `setShaclShapesStore()` - Loaded SHACL shapes
- `getIsEditMode()`, `setIsEditMode()` - Edit mode state
- Configuration constants (LOG_LEVEL, SHAPE_URLS)

### core.js
Application initialization:
- URL parameter parsing
- Default DDI-CDI mode or `?shacl=generic`
- Dataverse integration detection
- Shape auto-loading logic

### validation.js
SHACL validation using shacl-engine:
- Full SPARQL support
- Advanced constraint validation
- Violation reporting

### render.js
UI rendering:
- Node card rendering
- Property row rendering with classification
- Array and reference UI components

### cdi-graph-helpers.js
Graph manipulation:
- Add/delete nodes
- Add/edit properties
- Convert single↔array
- Create and reference nodes

## Building

```bash
# Build bundle
npm run build

# Output: dist/cdi-viewer.bundle.js (1.2MB)
```

## Development

All modules use ES6 imports/exports. No global variables except through Rollup's IIFE wrapper for browser compatibility.

Example module pattern:
```javascript
// Import dependencies
import { getJsonData, setJsonData } from './state.js';
import { renderData } from './render.js';

// Define functions
export function myFunction() {
  const data = getJsonData();
  // ... logic
  setJsonData(newData);
  renderData();
}
```

## Documentation

- **ARCHITECTURE.md** - Complete technical documentation
- **CONTRIBUTING.md** - Development workflow
- **.ai/context.md** - AI assistant context

## Structure

### ES6 Modules (src/)
- **`validation.js`** - SHACL validation module with proper ES6 imports
  - Uses direct imports: `import Validator from 'shacl-engine/Validator.js'`
  - Bundled to `dist/cdi-validation.bundle.js` with all dependencies
  - Similar structure to `shacl-engine/examples/simple.js`

### Legacy Scripts (js/)
All other modules still use window globals pattern:
- `core.js` - Initialization and config
- `cdi-json-ld-helpers.js` - JSON-LD normalization
- `cdi-shacl-loader.js` - Shape loading
- `cdi-shacl-helpers.js` - SHACL UI helpers
- `cdi-graph-helpers.js` - Graph traversal
- `property-suggestions.js` - Property suggestions
- `render.js` - UI rendering
- `data-extraction.js` - Data export
- `event-handlers.js` - Event handling

These are concatenated and bundled to `dist/cdi-app.bundle.js`.

## Building

```bash
# Build both bundles
npm run build

# Build and watch for changes
npm run build:watch

# Start dev server
npm run dev  # http://localhost:8000
```

## Why This Hybrid Approach?

### Phase 1: Validation Module (✅ Complete)
- **Converted to ES6** with proper imports
- **Bundled with Rollup** including all dependencies
- **Uses shacl-engine** with SPARQL support
- **Clean code** like the shacl-engine examples

### Phase 2: Incremental Migration (🔄 In Progress)
- **Legacy scripts work as-is** (no breaking changes)
- **Can be migrated one by one** to ES6 modules
- **Rollup handles both** - ES6 imports and legacy concatenation

### Benefits of ES6 Modules

- ✅ Clean, modern code (like Node.js)
- ✅ Proper dependency management
- ✅ Better IDE support and type checking
- ✅ Easier testing and debugging
- ✅ Tree shaking (remove unused code)
- ✅ Same pattern as libraries we use (shacl-engine, jsonld.js, n3.js)

### Before (old approach):
```javascript
// js/validation.js - Plain script file
const getValidator = () => {
  if (!window.CdiShacl) throw new Error(...);
  return window.CdiShacl;
};
```

### After (new approach):
```javascript
// src/validation.js - ES6 module
import Validator from 'shacl-engine/Validator.js';
import { validations as sparqlValidations } from 'shacl-engine/sparql.js';
```

## Migration Plan

### Completed
1. ✅ **validation.js** - Uses shacl-engine with proper imports

### Next Steps
Each module can be migrated incrementally:

2. **core.js** - Export config and state management
3. **cdi-json-ld-helpers.js** - Export JSON-LD utilities
4. **cdi-shacl-loader.js** - Import from core
5. **cdi-graph-helpers.js** - Import from jsonLdHelpers
6. **cdi-shacl-helpers.js** - Import from graph-helpers
7. **property-suggestions.js** - Import from shaclHelpers
8. **render.js** - Import from all helpers
9. **data-extraction.js** - Import from core
10. **event-handlers.js** - Import from everything

Eventually, create a single `src/index.js` that imports all modules:
```javascript
import * as core from './core.js';
import * as validation from './validation.js';
// ... etc

// Export everything
export { core, validation, /* ... */ };
```

## Development Workflow

1. **Write code** in `src/` with ES6 imports (like `validation.js`)
2. **Build bundle** with `npm run build`
3. **Test in browser** - single bundle loaded in HTML
4. **No need to touch HTML** when adding new modules - just rebuild

This is the same pattern as shacl-engine itself!
