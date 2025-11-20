# Contributing to CDI Viewer

Thank you for your interest in contributing to the CDI Viewer! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- Git
- Python 3 (for local testing server)
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/libis/cdi-viewer.git
   cd cdi-viewer
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Run tests**

   ```bash
   npm test
   ```

4. **Start development server**

   ```bash
   npm run dev
   ```

   Then open http://localhost:8000 in your browser.

5. **Build for production**
   ```bash
   npm run build
   ```
   Output: `dist/cdi-viewer.min.js`

## Project Structure

```
cdi-viewer/
├── index.html              # Main HTML (loads individual JS files for dev)
├── js/
│   ├── core.js             # Global config, initialization
│   ├── render.js           # UI rendering
│   ├── validation.js       # SHACL validation
│   ├── cdi-shacl-loader.js # Shape loading
│   ├── cdi-shacl-helpers.js# Property classification
│   └── ...                 # Other modules
├── tests/
│   ├── setup.js            # Jest setup
│   ├── core.test.js        # Core functionality tests
│   └── ...                 # More test files
├── dist/
│   └── cdi-viewer.min.js   # Built bundle (gitignored)
├── examples/cdi/           # Sample JSON-LD files
├── shapes/                 # SHACL shape files
└── docs/                   # Documentation
```

## Development Workflow

### Making Changes

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Edit files in `js/` directory
   - Follow existing code style
   - Add/update tests in `tests/`

3. **Test your changes**

   ```bash
   npm test           # Run all tests
   npm run lint       # Check code style
   npm run build      # Ensure build works
   npm run dev        # Test in browser
   ```

4. **Commit your changes**

   ```bash
   git add .
   git commit -m "feat: description of your changes"
   ```

   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` new feature
   - `fix:` bug fix
   - `docs:` documentation changes
   - `test:` test additions/changes
   - `refactor:` code refactoring
   - `chore:` build/tooling changes

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a Pull Request on GitHub.

## Code Style

### JavaScript

- **ES5 syntax** (for now - no ES6 modules yet)
- **Global variables** via `window.*` properties
- **4-space indentation** (configured in Prettier)
- **Semicolons required**
- **Single quotes** for strings

### Naming Conventions

- **Functions**: `camelCase` (e.g., `renderData`, `classifyProperty`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `SHAPE_URLS`, `LOG_LEVEL`)
- **Variables**: `camelCase`
- **Private helpers**: Prefix with underscore if truly internal

### Comments

- **JSDoc** for all functions:

  ```javascript
  /**
   * Classify a property as SHACL-defined or EXTRA
   *
   * @param {Array<string>} nodeTypes - Node types to check
   * @param {string} propertyName - Property name to classify
   * @param {N3.Store} shaclShapesStore - SHACL shapes store
   * @param {Array} expandedJsonLd - Expanded JSON-LD
   * @returns {Object} Classification result
   */
  function classifyProperty(
    nodeTypes,
    propertyName,
    shaclShapesStore,
    expandedJsonLd
  ) {
    // ...
  }
  ```

- **Inline comments** for complex logic
- **TODO comments** with issue numbers: `// TODO(#123): Implement feature`

## Testing

### Writing Tests

Tests live in `tests/` directory. Use Jest with JSDOM.

**Example test:**

```javascript
describe("classifyProperty", () => {
  beforeEach(() => {
    // Set up test environment
    window.shaclShapesStore = new N3.Store();
    // ... load test shapes
  });

  test("should mark SHACL-defined properties correctly", () => {
    const result = classifyProperty(
      ["Dataset"],
      "name",
      window.shaclShapesStore,
      []
    );
    expect(result.isInShape).toBe(true);
  });

  test("should mark extra properties", () => {
    const result = classifyProperty(
      ["Dataset"],
      "customField",
      window.shaclShapesStore,
      []
    );
    expect(result.isInShape).toBe(false);
  });
});
```

### Running Tests

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode (re-run on file changes)
npm run test:coverage # Generate coverage report
```

### Test Coverage Requirements

- **Minimum 50%** coverage for all metrics
- **Critical paths** (classification, validation, data extraction) must have > 80%
- **Regression tests** required for all bug fixes

## Architecture Guidelines

### Critical Patterns

1. **Global Variables**

   ```javascript
   // ✅ CORRECT
   window.jsonData = { ... };

   // ❌ WRONG
   let jsonData = { ... };  // Not accessible across files
   ```

2. **N3.js Term Objects**

   ```javascript
   // ✅ CORRECT
   const quads = store.getQuads(termObject, ...);

   // ❌ WRONG
   const quads = store.getQuads(termObject.value, ...);  // String, not term
   ```

3. **Context Resolution**

   ```javascript
   // ✅ CORRECT
   const ns = resolvePrefix(context, prefix); // Handles arrays

   // ❌ WRONG
   const ns = context[prefix]; // Only works for objects
   ```

4. **Event Handlers**

   ```javascript
   // ✅ CORRECT
   function attachHandlers() {
     $(".btn").off("click").on("click", handler);
   }

   // ❌ WRONG (creates duplicate handlers on re-render)
   function renderButton() {
     return '<button onclick="handler()">Click</button>';
   }
   ```

### Common Pitfalls

See [ARCHITECTURE.md](ARCHITECTURE.md) section "Common Pitfalls & Solutions" for detailed explanations.

## Documentation

### What to Document

- **New features**: Update README.md and docs/CDI_PREVIEWER.md
- **API changes**: Update ARCHITECTURE.md
- **Breaking changes**: Clearly note in PR description
- **Bug fixes**: Reference issue number in commit message

### Documentation Files

- **README.md**: User-facing documentation
- **ARCHITECTURE.md**: Technical architecture for developers
- **docs/CDI_PREVIEWER.md**: Detailed feature guide
- **docs/CDIF_DISCOVERY_SHAPES_FIX.md**: SHACL shapes documentation

## Pull Request Process

1. **Before submitting**:
   - [ ] All tests pass (`npm test`)
   - [ ] Linting passes (`npm run lint`)
   - [ ] Build succeeds (`npm run build`)
   - [ ] Manually tested in browser
   - [ ] Documentation updated
   - [ ] CHANGELOG.md updated (if applicable)

2. **PR checklist**:
   - [ ] Clear title and description
   - [ ] Reference related issues
   - [ ] Screenshots/demo for UI changes
   - [ ] Breaking changes clearly noted

3. **Code review**:
   - PRs require at least one approval
   - Address reviewer feedback promptly
   - Keep PR scope focused (one feature/fix per PR)

4. **After approval**:
   - Squash commits if needed
   - Maintainers will merge

## Debugging

### Enable Debug Mode

Add `?debug=true` to URL:

```
http://localhost:8000/?debug=true
```

Shows detailed logs for:

- Shape loading
- Property classification
- Validation execution
- Data structure changes

### Browser Console

Useful commands:

```javascript
// View current data
console.log(window.jsonData);

// Check expanded JSON-LD
console.log(window.expandedJsonLd);

// Re-render UI
renderData();

// Test property classification
classifyProperty(
  ["Dataset"],
  "name",
  window.shaclShapesStore,
  window.expandedJsonLd
);
```

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/libis/cdi-viewer/issues)
- **Discussions**: Use GitHub Discussions for questions
- **Email**: Contact LIBIS @ KU Leuven

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help others learn

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.

---

**Thank you for contributing to CDI Viewer!** 🎉
