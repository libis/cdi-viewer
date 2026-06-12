# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Croissant 1.0 SHACL shapes (`shapes/croissant-core.ttl`): structural core
  (Dataset, FileObject with checksum, RecordSet/Field, variableMeasured)
  plus the CDIF 1.1 Discovery dataset-level checks, with the full emitted
  vocabulary declared so recognized properties are not flagged EXTRA.
  Selectable as `?shacl=croissant` and from the shapes dropdown.
- Content-based shape auto-selection: when shapes were not chosen
  explicitly, the loaded document picks them (Croissant `conformsTo` →
  Croissant shapes; DDI-CDI context/types → official DDI-CDI shapes).
  `?shacl=` and the dropdown always take precedence.
- Severity-aware validation report: violations, warnings and hints are
  counted and labeled separately; only true violations mark a document
  invalid or paint property rows red.

### Fixed

- Single-node JSON-LD documents (e.g. Croissant) rendered empty:
  `jsonld.flatten` was called without a context and returned the expanded
  array instead of `{@context, @graph}`.
- Tool URLs that already carry a query string survive Dataverse's naive
  `toolUrl + "?" + params` concatenation (extra `?` normalized to `&`).
- Bare node types (e.g. Croissant's `PropertyValue`) resolve via the
  context's `@vocab` during shape matching.
- Validation result property names: shacl-engine path segments are read
  via their predicates, replacing the former `unknown:` labels.
- Validation results on blank nodes show a plain explanatory label instead
  of a dead jump button (blank-node labels are not stable across RDF
  serializations).
- DDI-CDI context fallback loads from its actual vendored path
  (`public/shapes/ddi-cdi.jsonld`); load failures are loud instead of
  silently validating with an empty context.
- The released DDI-CDI context on docs.ddialliance.org is preferred over
  the broken m2t-ng build artifact.
- Playwright E2E workflow runs on Node 20 (serialize-javascript 7 requires
  the global crypto object).

## [1.0.0] - 2025-11-25 — v1.0

Summary

- v1.0.0 is the first production-ready release of cdi-viewer. This release consolidates the project's core editing, validation, and integration features and stabilizes the end-to-end test suite for reliable CI.

Highlights

- ✅ Document creation: full support for creating JSON-LD documents (DDI-CDI, CDIF, DCAT-AP, DataCube, SKOS and generic modes). Add and edit root nodes and properties; export valid JSON-LD documents.
- ✅ Dataverse integration: both Load and Save flows revised and hardened. Added robust URL parsing, API token support and improved integrated mode behavior.
- ✅ Validation and SHACL: vendored and enhanced shacl-engine with SPARQL-target support for advanced property classification.
- ✅ Test & stability: major Playwright e2e stabilization work — dataverse and document-creation suites re-enabled and passing locally; full e2e suite currently green in local runs (115 passing in recent test run).
- ✅ Accessibility & UI polish: swapped native alert/confirm/prompt dialogs for accessible modal helpers; added aria / keyboard flow improvements and focused modal tests.
- ✅ Security hardening: audit and fixes for risky innerHTML usages; added escapeHtml helper coverage and safer DOM insertion patterns.
- ✅ UX improvements: unified add-component, consistent add/namespace UX, export improvements, scroll/toolbar polish, improved change-tracking and node deletion behavior.
