/**
 * Rollup configuration for CDI Viewer
 * 
 * Since the source files don't use ES6 modules yet, we concatenate them
 * and wrap with the dependency bundles.
 */

import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import fs from 'fs';
import path from 'path';

// Custom plugin to concatenate our non-module JS files
function concatenateScripts() {
  return {
    name: 'concatenate-scripts',
    resolveId(source) {
      if (source === 'virtual:app-bundle') {
        return source;
      }
      return null;
    },
    load(id) {
      if (id === 'virtual:app-bundle') {
        // Read all JS files in order
        const files = [
          'js/core.js',
          'js/cdi-json-ld-helpers.js',
          'js/cdi-shacl-loader.js',
          'js/cdi-shacl-helpers.js',
          'js/cdi-graph-helpers.js',
          'js/property-suggestions.js',
          'js/render.js',
          'js/validation.js',
          'js/data-extraction.js',
          'js/event-handlers.js'
        ];
        
        const contents = files.map(file => {
          const fullPath = path.resolve(process.cwd(), file);
          return `\n// ========== ${file} ==========\n` + fs.readFileSync(fullPath, 'utf-8');
        }).join('\n');
        
        return `
// CDI Viewer Bundle
// All application code concatenated

${contents}

// Export a marker so Rollup knows this module is used
export default 'CDI Viewer loaded';
`;
      }
      return null;
    }
  };
}

export default {
  input: 'virtual:app-bundle',
  output: {
    file: 'dist/cdi-viewer.min.js',
    format: 'iife',
    name: 'CDIViewer',
    sourcemap: true,
    globals: {
      'jquery': '$',
      'bootstrap': 'bootstrap'
    }
  },
  external: ['jquery', 'bootstrap'],
  plugins: [
    concatenateScripts(),
    resolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs(),
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
