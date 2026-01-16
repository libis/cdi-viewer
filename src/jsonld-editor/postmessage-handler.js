// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

/**
 * PostMessage Handler for Embedded Mode
 *
 * Enables parent windows to send JSON-LD data to the cdi-viewer via postMessage.
 * This allows embedding the viewer in an iframe and passing data programmatically.
 *
 * Supported messages:
 * - { type: 'loadJsonLd', data: {...}, filename?: string }
 * - { type: 'getJsonLd' } - responds with current data
 * - { type: 'getChanges' } - responds with whether there are unsaved changes
 */

import {
  logInfo,
  logWarn,
  logError,
  setJsonData,
  setOriginalData,
  setExpandedJsonLd,
  setOriginalFileName,
  setIsEmbeddedMode,
  getJsonData,
  getChangedElementsCount,
  getShaclShapesStore,
} from "./state.js";
import {
  normalizeToGraphFormat,
  migrateContextFormat,
} from "./cdi-json-ld-helpers.js";
import { loadShapes } from "./cdi-shacl-loader.js";
import { renderData } from "./render.js";
import { updateNamespaceSectionVisibility } from "./namespace-manager.js";
import { collectChangesFromDOM } from "./data-extraction.js";

// Track the parent origin for security
let trustedOrigin = null;

/**
 * Initialize the postMessage handler.
 * Should be called once during application setup.
 */
export function initPostMessageHandler() {
  window.addEventListener("message", handleMessage);
  logInfo("PostMessage handler initialized for embedded mode");

  // Notify parent that the viewer is ready
  if (window.parent !== window) {
    // Send ready message to parent
    // Don't require a trusted origin yet - parent will establish it
    window.parent.postMessage({ type: "cdiViewerReady" }, "*");
  }
}

/**
 * Handle incoming postMessage events
 */
async function handleMessage(event) {
  // Basic validation
  if (!event.data || typeof event.data !== "object") {
    return;
  }

  const { type, data, filename, requestId } = event.data;

  // Skip messages without a type (not meant for us)
  if (!type) {
    return;
  }

  // Handle handshake to establish trusted origin
  if (type === "cdiViewerHandshake") {
    trustedOrigin = event.origin;
    setIsEmbeddedMode(true);
    logInfo(`PostMessage handshake completed with origin: ${trustedOrigin}`);
    sendResponse(event, "handshakeComplete", { success: true }, requestId);
    return;
  }

  // For other messages, verify origin if handshake was completed
  if (trustedOrigin && event.origin !== trustedOrigin) {
    logWarn(`Ignoring message from untrusted origin: ${event.origin}`);
    return;
  }

  try {
    switch (type) {
      case "loadJsonLd":
        await handleLoadJsonLd(event, data, filename, requestId);
        break;

      case "getJsonLd":
        handleGetJsonLd(event, requestId);
        break;

      case "getChanges":
        handleGetChanges(event, requestId);
        break;

      case "setEditMode":
        handleSetEditMode(event, data, requestId);
        break;

      default:
        // Unknown message type, ignore
        break;
    }
  } catch (error) {
    logError("Error handling postMessage:", error);
    sendResponse(
      event,
      "error",
      { error: error.message, originalType: type },
      requestId
    );
  }
}

/**
 * Handle loadJsonLd message - load JSON-LD data into the viewer
 */
async function handleLoadJsonLd(event, data, filename, requestId) {
  if (!data) {
    throw new Error("No data provided in loadJsonLd message");
  }

  setIsEmbeddedMode(true);

  // Parse if string
  const parsedData = typeof data === "string" ? JSON.parse(data) : data;

  // Set filename if provided
  if (filename) {
    setOriginalFileName(filename);
  } else {
    setOriginalFileName("embedded-data.jsonld");
  }

  // Normalize to @graph format
  const normalizedData = await normalizeToGraphFormat(parsedData);
  setJsonData(normalizedData);

  // Migrate @context if needed
  let jsonData = migrateContextFormat(getJsonData());
  setJsonData(jsonData);

  jsonData = getJsonData();
  if (!jsonData["@graph"]) {
    throw new Error("Failed to normalize JSON-LD structure.");
  }

  setOriginalData(JSON.parse(JSON.stringify(jsonData)));

  // Expand JSON-LD
  try {
    const expanded = await window.jsonld.expand(jsonData);
    setExpandedJsonLd(expanded);
  } catch (expandError) {
    logWarn("Could not expand JSON-LD:", expandError);
    setExpandedJsonLd(null);
  }

  // Load SHACL shapes if not already loaded (default to ddi-cdi-official)
  if (!getShaclShapesStore()) {
    try {
      await loadShapes("ddi-cdi-official");
      logInfo("SHACL shapes loaded for embedded mode");
    } catch (shapeError) {
      logWarn("Failed to load SHACL shapes:", shapeError);
    }
  }

  // Render the data
  renderData();

  // Update namespace section visibility
  updateNamespaceSectionVisibility();

  // Update save button visibility
  if (typeof window.updateSaveButtonVisibility === "function") {
    window.updateSaveButtonVisibility();
  }

  // Validate if shapes are loaded
  if (getShaclShapesStore()) {
    import("./validation.js").then(({ validateData }) => {
      validateData();
    });
  }

  sendResponse(event, "jsonLdLoaded", { success: true }, requestId);
}

/**
 * Handle getJsonLd message - return current JSON-LD data
 */
function handleGetJsonLd(event, requestId) {
  // Collect any pending changes from the DOM
  collectChangesFromDOM();

  const jsonData = getJsonData();
  sendResponse(event, "jsonLdData", { data: jsonData }, requestId);
}

/**
 * Handle getChanges message - return whether there are unsaved changes
 */
function handleGetChanges(event, requestId) {
  const changesCount = getChangedElementsCount();
  sendResponse(
    event,
    "changesStatus",
    {
      hasChanges: changesCount > 0,
      changesCount: changesCount,
    },
    requestId
  );
}

/**
 * Handle setEditMode message - toggle edit mode
 */
function handleSetEditMode(event, enabled, requestId) {
  import("./event-handlers.js").then((module) => {
    const { getIsEditMode } = module;
    // Trigger the edit button click to properly toggle mode
    const currentMode = getIsEditMode();
    if (currentMode !== enabled) {
      $("#toggle-edit-btn").click();
    }
    sendResponse(event, "editModeSet", { isEditMode: enabled }, requestId);
  });
}

/**
 * Send a response back to the parent window
 */
function sendResponse(event, type, data, requestId) {
  const response = { type, ...data };
  if (requestId) {
    response.requestId = requestId;
  }

  // Use event.source if available, otherwise parent
  const target = event.source || window.parent;
  const origin = trustedOrigin || event.origin || "*";

  target.postMessage(response, origin);
}

// Auto-initialize when the module loads
if (typeof window !== "undefined") {
  // Defer initialization until DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPostMessageHandler);
  } else {
    initPostMessageHandler();
  }
}

export default { initPostMessageHandler };
