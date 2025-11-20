# Vendored Dependencies

## Overview

This project vendors a modified version of `shacl-engine` with SPARQL target support. This is a temporary solution until the upstream package includes this feature.

## Setup

The vendored dependency is located in `vendor/shacl-engine/` and is installed via:

```json
"dependencies": {
  "shacl-engine": "file:./vendor/shacl-engine"
}
```

When you run `npm install`, it creates a symlink from `node_modules/shacl-engine` to `vendor/shacl-engine`, which Rollup then bundles into the production build.

## Why This Works on GitHub Actions

✅ **The entire `vendor/` directory is committed to git**
- GitHub Actions clones your repo with `vendor/shacl-engine/` included
- `npm install` creates the symlink to the vendored copy
- `npm run build` bundles from the vendored source
- Everything works without external dependencies

## Modifications Made

### shacl-engine v1.0.2 + SPARQL Target Support

**Files modified (3 files, ~60 lines):**

1. **Validator.js** - Added `sh:target` to shape detection
2. **lib/Shape.js** - Made `resolveTargets()` async  
3. **lib/TargetResolver.js** - Implemented SPARQL target execution

**Feature:** Supports `sh:SPARQLTarget` for advanced node selection via SPARQL queries

## Migration Path

**When to remove vendor copy:**

1. Submit PR to https://github.com/rdf-ext/shacl-engine
2. Wait for review and merge
3. Wait for new npm publish (e.g., v1.1.0)
4. Update `package.json`:
   ```json
   "shacl-engine": "^1.1.0"
   ```
5. Delete `vendor/shacl-engine/` directory
6. Run `npm install`
7. Test and commit

## Maintenance

If you need to update the vendored shacl-engine:

```bash
# Make changes in the separate shacl-engine repo
cd /path/to/shacl-engine
# ... make changes ...

# Copy to vendor
cd /path/to/cdi-viewer
rm -rf vendor/shacl-engine
cp -r ../shacl-engine vendor/shacl-engine

# Clean up
cd vendor/shacl-engine
rm -rf .git .github node_modules test .gitignore package-lock.json

# Reinstall and test
cd ../..
npm install
npm run build
```

## Files Included

The vendored copy includes only essential files:
- Source code (`lib/`, `*.js`)
- Package metadata (`package.json`, `README.md`, `LICENSE.md`)
- Examples (`examples/`)

Excluded:
- Tests (`test/`)
- Git data (`.git/`, `.github/`)
- Build artifacts (`node_modules/`, `dist/`)
- Lock files (`package-lock.json`)

## Size Impact

- **Vendored source:** ~50 KB (uncompressed)
- **Bundled size:** Included in main bundle, minimal overhead
- **Git repo size:** ~50 KB increase

This is acceptable for a temporary solution.
