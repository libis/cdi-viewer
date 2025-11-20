# Next Steps

## 🧪 Testing Priority

### End-to-End Testing

- **Test new default behavior**: Verify DDI-CDI shapes auto-load without URL parameters
- **Test generic mode**: Verify `?shacl=generic` works for non-DDI-CDI use cases
- **Test array operations**: Convert single↔array, add/remove values, add references
- **Test complex objects**: Create nested objects via modal, reference existing nodes
- **Test edit pipeline**: Load → enable edit → modify properties → export → verify valid JSON-LD
- **Test validation workflow**: Load file → validate → fix violations → re-validate

### Dataverse Integration Testing

- Launch with `?fileid=X&siteUrl=Y` parameters
- Make edits and save to Dataverse API
- Verify MIME type is `application/ld+json`
- Verify file updated in Dataverse

## 🔧 Known Issues

### CDIF Discovery Properties

Some schema.org properties show as EXTRA instead of OPTIONAL/REQUIRED.

**Possible causes:**
- SHACL shape paths don't match JSON-LD property names
- Namespace mismatch (http:// vs https://)
- Context resolution issues

**Next steps:**
- Wait for user feedback on validation results
- May need to adjust SHACL shapes or path matching logic

## 📦 Deployment

### GitHub Repository

- Add GitHub topics for better discoverability
- Update repository description
- Consider adding Open Graph image

### Dataverse Integration

- Create PR to dataverse-previewers with bundle
- Copy `dist/cdi-viewer.bundle.js` to `previewers/betatest/lib/`
- Update `CdiPreview.html` to use bundle
- Test in real Dataverse environment

## 🚀 Future Enhancements

### Code Quality

- Add GitHub Actions workflow for CI/CD
- Add pre-commit hooks (husky + lint-staged)
- Consider mutation testing with Stryker

### Features

- Undo/Redo functionality
- Export to different formats (Turtle, N-Triples)
- Import from SPARQL endpoint
- Batch editing capabilities
- Advanced search and filter options
