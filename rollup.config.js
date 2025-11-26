/**
 * Rollup configuration for CDI Viewer
 * 
 * Single entry point that bundles:
 * - Validation module (ES6 with shacl-engine imports)
 * - All application code (legacy scripts)
 * 
 * Output: One comprehensive bundle for the browser
 */

import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
// Allow importing text files (CSS) as raw strings so we can bundle CSS into
// the JS output and inject it at runtime (useful for embedding in previews).
import fs from 'fs';
import path from 'path';

// Inline text plugin: a tiny, dependency-free way to import .css and .html
// files as raw strings. We use this instead of @rollup/plugin-string to
// avoid pulling in scoped plugins that may be unavailable in restricted
// environments.
function inlineTextPlugin(options = {}) {
  const includeExts = options.extensions || ['.css', '.html'];

  return {
    name: 'inline-text',
    transform(code, id) {
      // Only handle file extensions we care about
      const ext = path.extname(id).toLowerCase();
      if (!includeExts.includes(ext)) return null;

      // Read the literal file contents and export as a default string
      try {
        const contents = fs.readFileSync(id, 'utf8');
        const escaped = JSON.stringify(contents);
        return { code: `export default ${escaped};`, map: { mappings: '' } };
      } catch (e) {
        this.warn(`inline-text: failed to inline ${id}: ${e.message}`);
        return null;
      }
    }
  };
}

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/cdi-viewer.bundle.js',
    format: 'iife',
    name: 'CDIViewer',
    sourcemap: true,
    globals: {
      'jquery': '$',
      'bootstrap': 'bootstrap'
    }
  },
  external: ['jquery', 'bootstrap'],
  context: 'window',
  onwarn(warning, warn) {
    // Ignore circular dependency warnings from third-party packages
    // These are intentional in those libraries' designs
    if (warning.code === 'CIRCULAR_DEPENDENCY' && 
        warning.ids?.some(id => 
          id.includes('node_modules/readable-stream') ||
          id.includes('node_modules/@comunica')
        )) {
      return;
    }
    // Use default for everything else
    warn(warning);
  },
  plugins: [
    // inline .css and .html files as strings so the bundle can inject CSS
    // and use the literal index.html body as the single source of truth.
    inlineTextPlugin({ extensions: ['.css', '.html'] }),
    resolve({
      browser: true,
      preferBuiltins: false,
      exportConditions: ['browser', 'default', 'module', 'import']
    }),
    commonjs({
      transformMixedEsModules: true
    }),
    terser({
      compress: {
        drop_console: false,
        drop_debugger: true
      },
      mangle: {
        reserved: ['$', 'jQuery']
      }
    })
  ]
};
