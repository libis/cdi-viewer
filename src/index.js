// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

/**
 * CDI Viewer - Main Application Entry Point
 *
 * This is the single entry point that loads all application modules.
 * All modules are bundled together into a single browser script.
 */

// Import and expose bundled libraries to window
import * as N3 from "n3";
import * as jsonld from "jsonld";

// Expose to global scope for compatibility with existing code
if (typeof window !== "undefined") {
  window.N3 = N3;
  window.jsonld = jsonld;
}

// Import state module first (provides centralized state management)
import "./jsonld-editor/state.js";

// Import validation module (ES6 with proper imports)
import { validateData } from "./jsonld-editor/validation.js";

// Load all application modules
// These are being migrated from window globals to proper ES6 modules

// Core configuration and initialization
import "./jsonld-editor/core.js";

// JSON-LD helpers
import "./jsonld-editor/cdi-json-ld-helpers.js";

// SHACL loader
import "./jsonld-editor/cdi-shacl-loader.js";

// Graph helpers
import "./jsonld-editor/cdi-graph-helpers.js";

// SHACL helpers
import "./jsonld-editor/cdi-shacl-helpers.js";

// Property suggestions
import "./jsonld-editor/property-suggestions.js";

// Rendering
import "./jsonld-editor/render.js";

// Data extraction
import "./jsonld-editor/data-extraction.js";

// Event handlers
import "./jsonld-editor/event-handlers.js";

// Export validation for window access
if (typeof window !== "undefined") {
  window.validateData = validateData;
}

console.log("CDI Viewer application loaded");

// Export for potential Node.js use
export { validateData };
