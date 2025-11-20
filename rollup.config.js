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
  plugins: [
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
