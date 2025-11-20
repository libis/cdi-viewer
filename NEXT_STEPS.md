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

## 🧪 Testing Priority

### End-to-End Testing

- **Test new default behavior**: Verify DDI-CDI shapes auto-load without URL parameters
- **Test generic mode**: Verify `?shacl=generic` works for non-DDI-CDI use cases
- **Test array operations**: Convert single↔array, add/remove values, add references
- **Test complex objects**: Create nested objects via modal, reference existing nodes
- **Test edit pipeline**: Load → enable edit → modify properties → export → verify valid JSON-LD
- **Test validation workflow**: Load file → validate → fix violations → re-validate
- **Test SPARQL targets**: Verify CDIF shapes validate only root datasets (not nested)

### Dataverse Integration Testing

- Test with `?fileid=X&siteUrl=Y` parameters in production Dataverse
- Make edits and save via Dataverse API
- Verify MIME type is `application/ld+json`
- Verify file updates correctly in Dataverse
- Test with various JSON-LD vocabularies (not just DDI-CDI)

## 📦 Deployment

### GitHub Repository
- ✅ GitHub Actions CI/CD configured
- ✅ Auto-build and deploy on push to main
- Add GitHub topics for better discoverability
- Update repository description
- Consider adding Open Graph image

### Dataverse Integration
- ✅ Bundle created and tested locally
- PR to dataverse-previewers repository (in progress)
- Deploy to production Dataverse instances
- Update documentation with bundle workflow

## 🚀 Future Enhancements

### SPARQL Target Support
- Submit PR to rdf-ext/shacl-engine with SPARQL target implementation
- Once merged and published, migrate from vendored to npm package
- Document SPARQL target usage patterns for other projects

### Code Quality
- ✅ GitHub Actions workflow added
- Add pre-commit hooks (husky + lint-staged)
- Consider mutation testing with Stryker
- Increase test coverage for new SPARQL target code

### Features
- Undo/Redo functionality
- Export to different formats (Turtle, N-Triples, RDF/XML)
- Import from SPARQL endpoint
- Batch editing capabilities
- Advanced search and filter options
- Property value autocomplete from ontologies
- Visual graph view of references
