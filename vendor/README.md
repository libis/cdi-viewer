# Vendored Dependencies

This directory contains modified third-party dependencies that are not yet available in their official npm packages.

## shacl-engine

**Modified version with SPARQL target support (plugin architecture)**

- **Upstream:** https://github.com/rdf-ext/shacl-engine
- **Original version:** 1.0.2
- **Modifications:** Added plugin-based support for `sh:SPARQLTarget` (SHACL Advanced Features)
- **Files modified:**
  - `Validator.js` - Added `targetResolverRegistry` and `sh:target` to shape detection
  - `sparql.js` - Added `targetResolvers` export with SPARQL target resolver
  - `lib/Shape.js` - Made `resolveTargets()` async, pass registry to TargetResolver
  - `lib/TargetResolver.js` - Accept registry, loop over resolvers for sh:target
  - `lib/TargetResolverRegistry.js` - NEW: Simple registry for target resolver plugins

**Why vendored:**
The SPARQL target feature is required for CDIF Discovery shapes but not yet available in the published npm package. This is a temporary solution until:
1. We submit a pull request to upstream
2. The PR is reviewed and merged
3. A new version is published to npm

**When to remove:**
Once shacl-engine publishes a version with SPARQL target support, update `package.json` to use the official npm package version and remove this vendored copy.

**Usage:**
```javascript
import Validator from 'shacl-engine/Validator.js'
import { validations, targetResolvers } from 'shacl-engine/sparql.js'

const validator = new Validator(shapesDataset, {
  factory: rdf,
  validations,      // Enable SPARQL constraints
  targetResolvers,  // Enable SPARQL targets
})
```

**Maintenance:**
- Do not modify these files directly in the vendor directory
- Make changes in the separate shacl-engine repository
- Copy updated files back here when needed
- Keep this README updated with any changes
