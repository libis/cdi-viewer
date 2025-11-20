// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

// === CDI Previewer: Core Configuration and Initialization ===
//
// Global variables, logging, shape URLs, and main initialization logic.

// Logging levels
const LOG_LEVEL = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

// Check URL parameter for debug mode
const urlParams = new URLSearchParams(window.location.search);
// Make currentLogLevel global so other files can access it
window.currentLogLevel =
  urlParams.get("debug") === "true" ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN;

function log(level, ...args) {
  if (level <= window.currentLogLevel) {
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

// Global variables - make them window properties so they're accessible across all script files
window.jsonData = null;
window.shaclShapes = null;
window.shaclShapesStore = null;
window.isEditMode = false;
window.originalData = null;
window.validationReport = null;
window.fileId = null;
window.siteUrl = null;
window.originalFileName = "cdi-metadata.jsonld"; // Default filename
window.expandedJsonLd = null; // Store expanded JSON-LD for property URI lookup
window.currentShapeSource = "ddi-cdi-official"; // Track currently loaded shape source
window.hadOriginalGraph = true; // Track if original data had @graph (for export preservation)

// SHACL shape URLs (Core SHACL only - no SPARQL support)
window.SHAPE_URLS = {
  "ddi-cdi-official":
    "https://ddi-cdi.github.io/m2t-ng/DDI-CDI_1-0/encoding/shacl/ddi-cdi.shacl.ttl",
  "cdif-core": "shapes/cdif-core.ttl",
  "local-fallback": "shapes/ddi-cdi-official.ttl",
};

// Initialize
$(document).ready(async function () {
  try {
    // Get file URL from query parameters
    const urlParams = new URLSearchParams(window.location.search);
    let fileUrl;
    let datasetMetadataUrl = null;

    // Check if we have a callback parameter (external tool invocation)
    const callbackParam = urlParams.get("callback");
    if (callbackParam) {
      // Decode the callback URL
      const callbackUrl = atob(callbackParam);

      // Fetch the tool parameters from the callback URL
      const paramsResponse = await fetch(callbackUrl);
      if (!paramsResponse.ok) {
        throw new Error(
          `Failed to fetch tool parameters: ${paramsResponse.status}`
        );
      }
      const paramsData = await paramsResponse.json();

      // Extract parameters from the response
      const queryParams = paramsData.data.queryParameters || {};
      window.fileId = queryParams.fileid;
      window.siteUrl = queryParams.siteUrl;

      // Get the dataset metadata signed URL if available
      const signedUrls = paramsData.data.signedUrls || [];
      const metadataUrlObj = signedUrls.find(
        (u) => u.name === "getDatasetVersionMetadata"
      );
      if (metadataUrlObj) {
        datasetMetadataUrl = metadataUrlObj.signedUrl;
      }
    } else {
      // Direct parameters (for testing)
      window.fileId = urlParams.get("fileid");
      window.siteUrl = urlParams.get("siteUrl");
    }

    // Check required parameters
    if (!window.fileId || !window.siteUrl) {
      // Show load local file button instead of error
      $("#load-local-btn").show();
      $("#content").html(`
                        <div class="alert alert-info">
                            <strong>No Dataverse parameters detected.</strong> Use the "Load Local File" button in the top left to select a CDI JSON-LD file from your computer.
                        </div>
                    `);
      setupEventHandlers();
      return;
    }

    // Try to get the original filename from dataset metadata
    try {
      if (datasetMetadataUrl) {
        // Use signed URL from callback
        const metadataResponse = await fetch(datasetMetadataUrl);
        if (metadataResponse.ok) {
          const metadata = await metadataResponse.json();
          // Find the file in the files array by matching fileId
          const files = metadata.data.files || [];
          const fileInfo = files.find(
            (f) => f.dataFile && f.dataFile.id === window.fileId
          );
          if (fileInfo && fileInfo.dataFile && fileInfo.dataFile.filename) {
            window.originalFileName = fileInfo.dataFile.filename;
          }
        }
      } else {
        // Fallback: try direct file API
        const metadataResponse = await fetch(`${window.siteUrl}/api/files/${window.fileId}`);
        if (metadataResponse.ok) {
          const metadata = await metadataResponse.json();
          if (
            metadata.data &&
            metadata.data.dataFile &&
            metadata.data.dataFile.filename
          ) {
            window.originalFileName = metadata.data.dataFile.filename;
          }
        }
      }
    } catch (e) {
      console.warn("Could not fetch filename, using default:", e);
    }

    // Load from Dataverse API
    fileUrl = window.siteUrl + "/api/access/datafile/" + window.fileId;

    // Load JSON-LD data
    const response = await fetch(fileUrl);

    // Check if response is OK
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Check content type
    const contentType = response.headers.get("content-type");
    if (contentType && !contentType.includes("json")) {
      throw new Error(
        `Invalid content type: ${contentType}. This previewer requires JSON-LD files (application/ld+json or application/json).`
      );
    }

    // Try to parse as JSON
    let jsonText;
    try {
      jsonText = await response.text();
      window.jsonData = JSON.parse(jsonText);
    } catch (parseError) {
      throw new Error(
        `Failed to parse JSON: ${parseError.message}. This file may not be valid JSON-LD.`
      );
    }

    // Normalize to @graph format if needed
    try {
      window.jsonData = await normalizeToGraphFormat(window.jsonData);
    } catch (normalizeError) {
      throw new Error(
        `Failed to normalize JSON-LD structure: ${normalizeError.message}`
      );
    }

    // Verify we now have @graph (should always be true after normalization)
    if (!window.jsonData["@graph"]) {
      throw new Error(
        "Internal error: Normalization did not produce @graph structure."
      );
    }

    window.originalData = JSON.parse(JSON.stringify(window.jsonData)); // Deep clone

    // Load local context cache for fallback (non-blocking)
    loadLocalContext().catch((e) =>
      console.warn("Could not pre-load local context:", e)
    );

    // Expand JSON-LD to get full property URIs
    try {
      window.expandedJsonLd = await jsonld.expand(window.jsonData);
      console.log("Expanded JSON-LD for property URI mapping");
    } catch (expandError) {
      console.warn("Could not expand JSON-LD:", expandError);
      window.expandedJsonLd = null;
    }

    // Load SHACL shapes - use the selected shape from dropdown
    try {
      const selectedShape = $("#shape-selector").val() || "ddi-cdi-official";
      await loadShapes(selectedShape);
    } catch (shapeError) {
      console.error("Failed to load SHACL shapes:", shapeError);
      throw new Error(
        `Failed to load validation shapes: ${shapeError.message}`
      );
    }

    // Render the data
    renderData();

    // Setup event handlers
    setupEventHandlers();
  } catch (error) {
    console.error("Error loading data:", error);
    $("#load-local-btn").show();
    $("#content").html(`
                    <div class="alert alert-danger">
                        <strong>Error:</strong> Failed to load CDI data. ${error.message}
                    </div>
                `);
    setupEventHandlers();
  }
});
