# Vendored Dependencies

## Status: No Vendored Dependencies

As of January 2025, this project no longer requires any vendored dependencies.

### History

Previously, this project vendored a modified version of `shacl-engine` with SPARQL target support (`sh:SPARQLTarget`). This feature was required for CDIF Discovery shapes but was not available in the published npm package.

**Resolution:** The SPARQL target feature was contributed upstream via PR and is now included in the official `shacl-engine` package starting with version 1.1.0.

### Current Setup

The project now uses the official npm packages:

```json
"dependencies": {
  "shacl-engine": "^1.1.0"
}
```

With SPARQL target support enabled via:

```javascript
import Validator from "shacl-engine/Validator.js";
import {
  validations as sparqlValidations,
  targetResolvers as sparqlTargetResolvers,
} from "shacl-engine/sparql.js";

const validator = new Validator(shapesDataset, {
  factory: rdf,
  validations: sparqlValidations,
  targetResolvers: sparqlTargetResolvers,
});
```

### References

- [shacl-engine npm package](https://www.npmjs.com/package/shacl-engine)
- [shacl-engine GitHub](https://github.com/rdf-ext/shacl-engine)
- [SHACL SPARQL-based Targets spec](https://www.w3.org/TR/shacl/#sparql-based-targets)
