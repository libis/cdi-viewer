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

// Check URL parameter for debug mode
const urlParams = new URLSearchParams(window.location.search);
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

// Application state
export const state = {
  jsonData: null,
  shaclShapes: null,
  shaclShapesStore: null,
  isEditMode: false,
  originalData: null,
  validationReport: null,
  fileId: null,
  siteUrl: null,
  originalFileName: "cdi-metadata.jsonld",
  expandedJsonLd: null,
  currentShapeSource: null,
  hadOriginalGraph: true,
  defaultTypeNamespace: null,
};

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

export function setCurrentShapeSource(source) {
  state.currentShapeSource = source;
}

export function getHadOriginalGraph() {
  return state.hadOriginalGraph;
}

export function setHadOriginalGraph(had) {
  state.hadOriginalGraph = had;
}

export function getDefaultTypeNamespace() {
  return state.defaultTypeNamespace;
}

export function setDefaultTypeNamespace(namespace) {
  state.defaultTypeNamespace = namespace;
}

// SHACL shape URLs
export const SHAPE_URLS = {
  "ddi-cdi-official":
    "https://ddi-cdi.github.io/m2t-ng/DDI-CDI_1-0/encoding/shacl/ddi-cdi.shacl.ttl",
  "cdif-core": "shapes/cdif-core.ttl",
  "cdif-core-shacl": "shapes/cdif-core.ttl",
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
