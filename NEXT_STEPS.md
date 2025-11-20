# CDI Viewer - Next Steps (20 Nov 2025)

## ✅ COMPLETED: ES6 Module Migration

**Major Achievement:** Full migration from window globals to ES6 modules complete!

- ✅ 11 modules migrated with proper imports/exports
- ✅ Centralized state management (`state.js`)
- ✅ SHACL validation working with SPARQL support (`shacl-engine`)
- ✅ Single-bundle build (1.2MB) via Rollup
- ✅ 0 ESLint errors/warnings
- ✅ Clean code - all unused variables/parameters removed
- ✅ Prettier formatting (`npm run fmt`) configured and applied
- ✅ Simple property addition working
- ✅ Custom property addition working

**Validation Screenshot Confirmed:** SHACL validation with DDI-CDI shapes is working!

---

## 🔴 CRITICAL: Fix Complex Property Rendering (15 minutes)

**Problem:** Complex properties are added to data correctly but render as reference buttons instead of editable inline nodes.

**Root Cause:** 
- Blank nodes created via `addComplexPropertyToNode` are sometimes rendered as root nodes first
- They get added to `renderedNodes` set
- When `renderPropertyTree` tries to render them inline, they're already marked as rendered
- Shows as reference button instead of nested node card

**Console Evidence:**
```javascript
Adding complex property: {nodeId: '#Volume_Substantive_Value_Domain', path: 'SubstantiveValueDomain_isDescribedBy_ValueAndConceptDescription', nodeClass: '...'}
Creating new node: {@id: '_:SubstantiveValueDomain_isDescribedBy_ValueAndConceptDescription_1763669645546', @type: 'ValueAndConceptDescription'}
Found parent node: #Volume_Substantive_Value_Domain
Updated parent node: {...} // ✅ Property added correctly
🎨 RENDER START // ❌ But renders as button, not editable node
```

**Fix Options:**
1. **Option A:** Change blank node detection logic in `renderData()` to never treat `_:` nodes as root nodes
2. **Option B:** Force inline rendering for newly created blank nodes (ignore `renderedNodes` check for `_:` nodes)
3. **Option C:** Use different ID pattern for newly created nodes so they're always treated as child nodes

**Recommended:** Option A - Blank nodes should never be root nodes

**Implementation:** Added check `!n["@id"].startsWith("_:")` to root node filter

---

## 🔴 CRITICAL: Array and Nested Property Support (60 minutes)

**User Requirements:**
1. ✅ Add simple properties (working)
2. ✅ Add complex properties inline (implemented - needs testing)
3. ✅ Convert single value ↔ array (implemented)
4. ✅ Add nested properties within custom properties (via modal)
5. ✅ Array of references (pointers to existing nodes OR create new)
6. ✅ Array of simple values (already working)

### ✅ Phase 1: Convert Single Value ↔ Array (IMPLEMENTED)

**Added:**
- ✅ "Convert to Array" button on single-value properties
- ✅ "Convert to Single Value" button on array properties
- ✅ Logic preserves value when converting single → array
- ✅ Logic keeps first value when converting array → single

**Functions added to `cdi-graph-helpers.js`:**
- `convertPropertyToArray(nodeId, propertyKey)` 
- `convertPropertyToSingle(nodeId, propertyKey)`

### ✅ Phase 2: Complex Property Support (IMPLEMENTED)

**Added:**
- ✅ "Add Reference/Object" button for both single values and arrays
- ✅ Modal with two options:
  - Reference existing node (dropdown selector)
  - Create new blank node (enter type)
- ✅ Works for both single properties and arrays

**Functions added to `cdi-graph-helpers.js`:**
- `getAllNodesForReference()` - Lists all available nodes
- `addReferenceToProperty(nodeId, propertyKey, referenceId)` - Adds reference
- `createAndReferenceNewNode(nodeId, propertyKey, nodeType, asArray)` - Creates and links new node

**UI added to `render.js`:**
- `showAddReferenceModal()` - Modal UI for selecting/creating references

### ✅ Phase 3: Array of References (IMPLEMENTED)

**Added:**
- ✅ "Add Reference/Object" button on array properties
- ✅ Dropdown to select from existing nodes
- ✅ Create new node option with type input
- ✅ Automatic blank node ID generation with property name

### 🧪 Phase 4: Testing & Polish (NEEDS TESTING)

**Test scenarios:**
- ✅ Add simple property → implemented
- ❌ Convert simple property to array → **TEST NEEDED**
- ❌ Add multiple values to array → **TEST NEEDED**
- ❌ Convert array back to single value → **TEST NEEDED**
- ❌ Add custom complex property via modal → **TEST NEEDED**
- ❌ Reference existing node → **TEST NEEDED**
- ❌ Create new blank node with type → **TEST NEEDED**
- ❌ Verify nested nodes render as expandable cards → **TEST NEEDED**

**Known Issues to Check:**
1. Does blank node fix (`!n["@id"].startsWith("_:")`) work correctly?
2. Do newly created blank nodes render inline and editable?
3. Does the modal work with Bootstrap 3.3.7?
4. Are all buttons styled consistently?

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
