// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

/**
 * CDI Viewer - Bundle Entry Point
 * 
 * This file imports all modules in the correct order for bundling.
 * The modules currently use global window.* variables for communication.
 * 
 * Load order is critical:
 * 1. Core (globals, config, initialization)
 * 2. Helpers (utilities used by other modules)
 * 3. Data processing (JSON-LD, SHACL)
 * 4. UI (rendering, events, validation)
 */

// Note: These files currently use script-tag globals pattern.
// They will be concatenated and minified together.
// Future: Refactor to ES6 modules with proper imports/exports.

// Load all modules by reading their content
// Since they're not modules yet, we just need them bundled together

import './core.js';
import './cdi-json-ld-helpers.js';
import './cdi-shacl-loader.js';
import './cdi-shacl-helpers.js';
import './cdi-graph-helpers.js';
import './property-suggestions.js';
import './render.js';
import './validation.js';
import './data-extraction.js';
import './event-handlers.js';

// All modules loaded - they attach to window.* and are ready
console.log('CDI Viewer bundle loaded');
