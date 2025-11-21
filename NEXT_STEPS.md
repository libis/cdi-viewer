# Next Steps

## ✅ Recently Completed (November 2025)

### SPARQL Target Support
- ✅ Implemented SPARQL target support in shacl-engine (~60 lines, 3 files)
- ✅ Added `sh:target` detection in UI for property classification
- ✅ Properties from SPARQL-targeted shapes now show as "SHACL-defined" (blue badges)
- ✅ Validated with CDIF Discovery shapes - working correctly in production

### Deployment & Build
- ✅ GitHub Actions workflow for automated builds and deployment
- ✅ Vendored shacl-engine with SPARQL support for independence
- ✅ N3 and jsonld exposed globally in bundle
- ✅ Live deployment at https://libis.github.io/cdi-viewer/
- ✅ KU Leuven favicon added

### Dataverse Integration
- ✅ Created single optimized bundle (1.2 MB) for dataverse-previewers
- ✅ Updated CdiPreview.html to use bundle
- ✅ Removed individual JS files (now bundled)
- ✅ Updated CDIF shapes with SPARQL target support
- ✅ Tested locally - working correctly

## 🎯 Next Steps (Priority Order)

### 1. Complete Dataverse Integration (HIGH PRIORITY)
**Goal:** Finish functionality before submitting PRs to ensure everything works

- ✅ Bundle created and tested locally
- Implement remaining Dataverse API features:
  - Save functionality via Dataverse API
  - Handle `?fileid=X&siteUrl=Y&key=Z` parameters
  - Verify MIME type handling (`application/ld+json`)
  - Test file updates in Dataverse
- Test with various JSON-LD vocabularies (not just DDI-CDI)
- Update documentation with bundle workflow

### 2. Test with Real Dataverse Workflow (HIGH PRIORITY)
**Goal:** Validate functionality before submitting PRs

- Test with `?fileid=X&siteUrl=Y` parameters in Dataverse instance
- Make edits and save via Dataverse API
- Verify file updates correctly in Dataverse
- Test error handling and edge cases
- Document any issues or limitations

### 3. Repository Polish (MEDIUM PRIORITY)
**Goal:** PR draws attention - make the repository clean and professional

- Add GitHub topics for discoverability:
  - `json-ld`, `rdf`, `shacl`, `dataverse`, `ddi-cdi`, `metadata`, `semantic-web`
- Update repository description (concise, clear value proposition)
- Consider adding Open Graph image for social media previews
- Ensure README badges are up-to-date
- Clean up any TODO comments or debug code

### 4. Submit PR to dataverse-previewers (MEDIUM PRIORITY)
**Goal:** Get the link to share with community

- Formalize PR to ErykKul/dataverse-previewers fork (if needed)
- Submit PR to gdcc/dataverse-previewers with:
  - Clear description of SPARQL target support
  - Bundle integration benefits
  - Testing evidence
  - Link to cdi-viewer documentation
- Reference PR in communications with Steve and others

### 5. Submit PR to rdf-ext/shacl-engine (MEDIUM PRIORITY)
**Goal:** Contribute SPARQL target support upstream

**Prerequisites:**
- Update shacl-engine README.md first:
  - Mention SPARQL target support
  - Reference cdi-viewer as example usage
  - Note Dataverse integration (PR pending to gdcc/dataverse-previewers)
- Ensure code quality (tests, documentation, examples)

**PR Contents:**
- ~60 lines of SPARQL target implementation (3 files)
- Test cases demonstrating functionality
- Documentation updates
- Reference to real-world usage in cdi-viewer

### 6. End-to-End Testing (MEDIUM PRIORITY)
**Goal:** Once everything works, ensure it stays that way

- **Test new default behavior**: Verify DDI-CDI shapes auto-load without URL parameters
- **Test generic mode**: Verify `?shacl=generic` works for non-DDI-CDI use cases
- **Test array operations**: Convert single↔array, add/remove values, add references
- **Test complex objects**: Create nested objects via modal, reference existing nodes
- **Test edit pipeline**: Load → enable edit → modify properties → export → verify valid JSON-LD
- **Test validation workflow**: Load file → validate → fix violations → re-validate
- **Test SPARQL targets**: Verify CDIF shapes validate only root datasets (not nested)

### 7. Test Coverage (HIGH PRIORITY for Long-term)
**Goal:** High coverage essential for AI-assisted development

- ✅ GitHub Actions workflow added
- Increase test coverage for SPARQL target code (currently minimal)
- Add integration tests for Dataverse workflow
- Add tests for UI interactions (property editing, validation, etc.)
- Set up coverage reporting (codecov.io or similar)
- Add pre-commit hooks (husky + lint-staged)
- Consider mutation testing with Stryker for critical paths
- Target: >80% coverage for core modules

**Why critical for AI:**
- AI-generated code needs automated validation
- Prevents regressions during rapid iteration
- Enables confident refactoring
- Documents expected behavior

### 8. Feature Enhancements (FUTURE)
**Goal:** Nice-to-haves after core functionality is stable

- Undo/Redo functionality
- Export to different formats (Turtle, N-Triples, RDF/XML)
- Import from SPARQL endpoint
- Batch editing capabilities
- Advanced search and filter options
- Property value autocomplete from ontologies
- Visual graph view of references

### 9. Production Deployment Strategy (LONG-TERM GOAL)
**Goal:** Show and tell, gather feedback before production claims

- **NOT immediate priority** - wait for user feedback
- Focus on demonstration and community engagement
- Document deployment requirements and considerations
- Collect feedback from early adopters
- Iterate based on real-world usage patterns
- Production readiness checklist:
  - Security review
  - Performance optimization
  - Comprehensive error handling
  - User acceptance testing
  - Documentation for administrators
  - Support plan
