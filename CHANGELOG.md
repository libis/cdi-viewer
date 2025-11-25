# Changelog

All notable changes to this project will be documented in this file.

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
