// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

/**
 * Application State Management
 *
 * Centralized state store for all application data.
 * Replaces global variables with a proper module system.
 */

// Logging levels
export const LOG_LEVEL = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

// Dataverse appends its query parameters to the registered toolUrl with a
// bare "?". When the toolUrl itself already carries a query string (e.g.
// index.html?shacl=croissant), the browser receives
// "?shacl=croissant?fileid=...&siteUrl=..." — one mangled parameter.
// Normalize every "?" after the first to "&" so all parameters survive.
export function getNormalizedSearchParams() {
  const search = window.location.search;
  if (search.length <= 1) {
    return new URLSearchParams(search);
  }
  return new URLSearchParams("?" + search.slice(1).replace(/\?/g, "&"));
}

// Check URL parameter for debug mode
const urlParams = getNormalizedSearchParams();
export const currentLogLevel =
  urlParams.get("debug") === "true" ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN;

export function getCurrentLogLevel() {
  return currentLogLevel;
}

export function log(level, ...args) {
  if (level <= currentLogLevel) {
    switch (level) {
      case LOG_LEVEL.ERROR:
        console.error(...args);
        break;
      case LOG_LEVEL.WARN:
        console.warn(...args);
        break;
      case LOG_LEVEL.INFO:
        console.info(...args);
        break;
      case LOG_LEVEL.DEBUG:
        console.log(...args);
        break;
    }
  }
}

// Convenience logging functions
export function logError(...args) {
  log(LOG_LEVEL.ERROR, ...args);
}

export function logWarn(...args) {
  log(LOG_LEVEL.WARN, ...args);
}

export function logInfo(...args) {
  log(LOG_LEVEL.INFO, ...args);
}

export function logDebug(...args) {
  log(LOG_LEVEL.DEBUG, ...args);
}

/**
 * Application state
 *
 * Centralized state management for the JSON-LD editor application.
 * All state modifications should go through the getter/setter functions below.
 */
export const state = {
  /** @type {Object|null} The current JSON-LD document being edited (@context, @graph, etc.) */
  jsonData: null,

  /** @type {Object|null} Raw SHACL shapes data (Turtle format parsed) */
  shaclShapes: null,

  /** @type {Object|null} N3 Store containing SHACL shapes for validation and property suggestions */
  shaclShapesStore: null,

  /** @type {boolean} Whether edit mode is currently enabled (false = view mode) */
  isEditMode: false,

  /** @type {Object|null} Original JSON-LD data snapshot (for reset/comparison purposes) */
  originalData: null,

  /** @type {Object|null} Latest SHACL validation report (conforms, results, etc.) */
  validationReport: null,

  /** @type {string|null} Dataverse file ID (for integrated mode - when embedded in Dataverse) */
  fileId: null,

  /** @type {string|null} Dataverse site URL (for integrated mode - when embedded in Dataverse) */
  siteUrl: null,

  /** @type {string} Suggested filename for export/save operations */
  originalFileName: "cdi-metadata.jsonld",

  /** @type {boolean} Whether the app is running in embedded mode (true = Dataverse iframe, false = standalone) */
  isEmbeddedMode: false,

  /** @type {Object|null} Expanded JSON-LD format (all contexts resolved, used for validation) */
  expandedJsonLd: null,

  /** @type {string|null} Currently selected SHACL shape source ID (e.g., "ddi-cdi-official", "cdif-core") */
  currentShapeSource: null,

  /** @type {boolean} Shapes chosen explicitly (?shacl= parameter or dropdown) — content-based auto-selection then stays out of the way */
  shapesUserSelected: false,

  /** @type {boolean} Whether the loaded document originally had a @graph array (vs single object) */
  hadOriginalGraph: true,

  /** @type {string|null} Default namespace to use for custom types (e.g., "http://example.org/") */
  defaultTypeNamespace: null,
};

// Persistent change tracking - survives mode toggles and re-renders
const changedElements = new Set();

export function addChangedElement(compositeId) {
  changedElements.add(compositeId);
  // Update save button visibility when changes are tracked
  if (typeof window !== "undefined" && window.updateSaveButtonVisibility) {
    window.updateSaveButtonVisibility();
  }
}

export function hasChangedElement(compositeId) {
  return changedElements.has(compositeId);
}

export function clearChangedElements() {
  changedElements.clear();
  // Update save button visibility when changes are cleared
  if (typeof window !== "undefined" && window.updateSaveButtonVisibility) {
    window.updateSaveButtonVisibility();
  }
}

export function getAllChangedElements() {
  return Array.from(changedElements);
}

export function getChangedElementsCount() {
  return changedElements.size;
}

// Getters and setters for state properties
export function getJsonData() {
  return state.jsonData;
}

export function setJsonData(data) {
  state.jsonData = data;
}

export function getShaclShapes() {
  return state.shaclShapes;
}

export function setShaclShapes(shapes) {
  state.shaclShapes = shapes;
}

export function getShaclShapesStore() {
  return state.shaclShapesStore;
}

export function setShaclShapesStore(store) {
  state.shaclShapesStore = store;
}

export function getIsEditMode() {
  return state.isEditMode;
}

export function setIsEditMode(mode) {
  state.isEditMode = mode;
}

export function getOriginalData() {
  return state.originalData;
}

export function setOriginalData(data) {
  state.originalData = data;
}

export function getValidationReport() {
  return state.validationReport;
}

export function setValidationReport(report) {
  state.validationReport = report;
}

export function getFileId() {
  return state.fileId;
}

export function setFileId(id) {
  state.fileId = id;
}

export function getSiteUrl() {
  return state.siteUrl;
}

export function setSiteUrl(url) {
  state.siteUrl = url;
}

export function getOriginalFileName() {
  return state.originalFileName;
}

export function setOriginalFileName(name) {
  state.originalFileName = name;
}

export function getExpandedJsonLd() {
  return state.expandedJsonLd;
}

export function setExpandedJsonLd(expanded) {
  state.expandedJsonLd = expanded;
}

export function getCurrentShapeSource() {
  return state.currentShapeSource;
}

export function getShapesUserSelected() {
  return state.shapesUserSelected;
}

export function setShapesUserSelected(value) {
  state.shapesUserSelected = value;
}

export function setCurrentShapeSource(source) {
  state.currentShapeSource = source;
}

export function getHadOriginalGraph() {
  return state.hadOriginalGraph;
}

export function setHadOriginalGraph(had) {
  state.hadOriginalGraph = had;
}

export function getIsEmbeddedMode() {
  return state.isEmbeddedMode;
}

export function setIsEmbeddedMode(embedded) {
  state.isEmbeddedMode = embedded;
}

export function getDefaultTypeNamespace() {
  return state.defaultTypeNamespace;
}

export function setDefaultTypeNamespace(namespace) {
  state.defaultTypeNamespace = namespace;
}

// Base URI used when converting JSON-LD documents to RDF (relative @ids
// resolve against it). Shared so validation results can be mapped back to
// the compact node ids used in the rendered document.
export const JSONLD_BASE_URI =
  "http://ddialliance.org/Specification/DDI-CDI/1.0/RDF/";

// SHACL shape URLs
export const SHAPE_URLS = {
  "ddi-cdi-official":
    "https://ddi-cdi.github.io/m2t-ng/DDI-CDI_1-0/encoding/shacl/ddi-cdi.shacl.ttl",
  "cdif-core": "shapes/cdif-core.ttl",
  "cdif-core-shacl": "shapes/cdif-core.ttl",
  croissant: "shapes/croissant-core.ttl",
  "dcat-ap":
    "https://semiceu.github.io/DCAT-AP/releases/3.0.0/html/shacl/shapes.ttl",
  datacube:
    "https://raw.githubusercontent.com/w3c/shacl/master/shapes/datacube.shapes.ttl",
  skos: "https://raw.githubusercontent.com/skohub-io/skohub-shapes/main/skos.shacl.ttl",
  "local-fallback": "shapes/ddi-cdi-official.ttl",
};

// Expose commonly used exports on window for convenience (browser console, tests, etc.)
if (typeof window !== "undefined") {
  window.LOG_LEVEL = LOG_LEVEL;
  window.log = log;
  window.SHAPE_URLS = SHAPE_URLS;
  window.state = state; // Expose state for debugging
}
