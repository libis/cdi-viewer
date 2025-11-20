# CDI Viewer - Next Steps (20 Nov 2025)

## ✅ COMPLETED: ES6 Module Migration

**Major Achievement:** Full migration from window globals to ES6 modules complete!

- ✅ 11 modules migrated with proper imports/exports
- ✅ Centralized state management (`state.js`)
- ✅ SHACL validation working with SPARQL support (`shacl-engine`)
- ✅ Single-bundle build (1.2MB) via Rollup
- ✅ 0 ESLint errors/warnings
- ✅ Clean code - all unused variables/parameters removed

**Validation Screenshot Confirmed:** SHACL validation with DDI-CDI shapes is working!

---

## 🔴 CRITICAL: Fix Property Suggestions (5 minutes)

**Problem:** `addPropertyToNode` function exists but not imported in `property-suggestions.js`

**Current State:**
```javascript
// property-suggestions.js has:
// TODO: Implement addPropertyToNode for simple properties
console.warn('addPropertyToNode not yet implemented in ES6 migration');
```

**But the function EXISTS in** `cdi-graph-helpers.js:274`:
```javascript
export function addPropertyToNode(nodeId, propertyKey, initialValue, bodyElement) {
```

**Fix:**
```javascript
// Add to property-suggestions.js imports (line ~7):
import { addPropertyToNode } from './cdi-graph-helpers.js';

// Then replace line 346-349 with:
if (suggestion.isComplex) {
  addComplexPropertyToNode(nodeId, suggestion);
} else {
  addPropertyToNode(nodeId, suggestion.path, "", bodyElement);
}

// And replace line 369-371 with:
if (propName) {
  addPropertyToNode(nodeId, propName, "", bodyElement);
}
```

**Impact:** This will enable adding simple properties and custom properties in edit mode.

---

## 🟡 HIGH PRIORITY: Test Edit Mode End-to-End (30 minutes)

**Gap:** Unknown if editing pipeline works after ES6 migration

**Test Checklist:**
1. ✅ Load file works (we saw validation working)
2. ❓ Enable edit mode
3. ❓ Edit simple property (e.g., change text)
4. ❓ Edit array (add/remove item)
5. ❓ Add property via suggestions (will work after import fix)
6. ❓ Export JSON-LD - verify valid output
7. ❓ Verify `collectChangesFromDOM()` captures edits
8. ❓ Verify unchanged file exports as equivalent

**Files to Check:**
- `src/jsonld-editor/data-extraction.js` - `collectChangesFromDOM()`, `exportData()`
- `src/jsonld-editor/event-handlers.js` - Edit mode toggle, save button
- `src/jsonld-editor/render.js` - Input field rendering

---

## 🟢 MEDIUM PRIORITY: Test Dataverse Integration (15 minutes)

**Gap:** Unknown if save to Dataverse works

**Test Checklist:**
1. ❓ Launch with `?fileid=X&siteUrl=Y` parameters
2. ❓ Make edits
3. ❓ Click "Save to Dataverse"
4. ❓ Verify API call made
5. ❓ Verify MIME type is `application/ld+json` or correct type
6. ❓ Verify file updated in Dataverse

**Files to Check:**
- `src/jsonld-editor/data-extraction.js:105` - `saveChanges()` function
- Check for `saveToDataverse()` - may need to be implemented

---

## 🔵 LOWER PRIORITY: CDIF Discovery Properties

**Issue:** Steve's schema.org properties show as EXTRA instead of OPTIONAL/REQUIRED

**Likely Causes:**
1. SHACL shape paths don't match JSON-LD property names
2. `classifyProperty()` logic needs adjustment
3. TTL file needs path corrections

**Next Steps:**
- Wait for Steve's feedback on validation results
- May need to adjust `CDIF-Discovery-Core-Shapes.ttl`
- May need to enhance `cdi-shacl-helpers.js` path matching

---

## 📋 Module Structure (for reference)

```
src/jsonld-editor/
├── state.js              - Centralized state with getters/setters
├── core.js               - Initialization & Dataverse wiring
├── validation.js         - SHACL validation with SPARQL (shacl-engine)
├── cdi-shacl-loader.js   - Shape loading & N3 parsing
├── cdi-shacl-helpers.js  - Property classification logic
├── cdi-json-ld-helpers.js - JSON-LD normalization (@graph format)
├── cdi-graph-helpers.js  - Graph manipulation (add/edit nodes)
├── render.js             - UI rendering (node cards, property rows)
├── property-suggestions.js - Add property UI (needs import fix!)
├── data-extraction.js    - Save/export pipeline
└── event-handlers.js     - jQuery event wiring

dist/
└── cdi-viewer.bundle.js  - Single 1.2MB bundle via Rollup
```

---

## 🎯 Immediate Action

**Start with:** Fix the `addPropertyToNode` import (5 min)
**Then:** Test edit mode manually (30 min)
**Document:** Test results and any issues found

**Success Criteria:** Can load → edit → save → export without errors
