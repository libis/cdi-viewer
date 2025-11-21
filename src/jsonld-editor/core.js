// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

// === CDI Previewer: Core Configuration and Initialization ===
//
// Main initialization logic for loading data from Dataverse or local files.

import {
  LOG_LEVEL,
  log,
  SHAPE_URLS,
  setJsonData,
  setOriginalData,
  setExpandedJsonLd,
  setFileId,
  setSiteUrl,
  setOriginalFileName,
  getFileId,
  getSiteUrl,
  getJsonData,
} from "./state.js";
import { normalizeToGraphFormat } from "./cdi-json-ld-helpers.js";
import { loadShapes } from "./cdi-shacl-loader.js";
import { renderData } from "./render.js";
import { setupEventHandlers } from "./event-handlers.js";
import { updateNamespaceSectionVisibility } from "./namespace-manager.js";

// Initialize
$(document).ready(async function () {
  try {
    // Get file URL from query parameters
    const urlParams = new URLSearchParams(window.location.search);
    let datasetMetadataUrl = null;

    // Check for shacl parameter
    const shaclParam = urlParams.get("shacl");

    if (shaclParam === "generic") {
      // Generic mode: No shapes preloaded, leave dropdown at default
      log(LOG_LEVEL.INFO, "Generic mode: No shapes preloaded");
    } else if (shaclParam && SHAPE_URLS[shaclParam]) {
      // Specific shape requested via URL parameter
      $("#shape-selector").val(shaclParam);
      try {
        await loadShapes(shaclParam);
        log(LOG_LEVEL.INFO, `Loaded shapes from URL parameter: ${shaclParam}`);
      } catch (error) {
        console.error("Failed to load shapes from URL parameter:", error);
      }
    } else if (!shaclParam) {
      // Default mode: Load ddi-cdi-official automatically
      $("#shape-selector").val("ddi-cdi-official");
      try {
        await loadShapes("ddi-cdi-official");
        log(
          LOG_LEVEL.INFO,
          "Default mode: Loaded DDI-CDI official shapes (use ?shacl=generic for no preloading)"
        );
      } catch (error) {
        console.error("Failed to load default DDI-CDI shapes:", error);
      }
    }

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
      setFileId(queryParams.fileid);
      setSiteUrl(queryParams.siteUrl);

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
      setFileId(urlParams.get("fileid"));
      setSiteUrl(urlParams.get("siteUrl"));
    }

    // Check required parameters
    const fileId = getFileId();
    const siteUrl = getSiteUrl();

    if (!fileId || !siteUrl) {
      // Show load local file button instead of error
      $("#load-local-btn").show();
      $("#load-dataverse-btn").show();
      // In standalone mode, always show save button
      $("#save-btn").removeClass("hidden");
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
            (f) => f.dataFile && f.dataFile.id === fileId
          );
          if (fileInfo && fileInfo.dataFile && fileInfo.dataFile.filename) {
            setOriginalFileName(fileInfo.dataFile.filename);
          }
        }
      } else {
        // Fallback: try direct file API
        const metadataResponse = await fetch(`${siteUrl}/api/files/${fileId}`);
        if (metadataResponse.ok) {
          const metadata = await metadataResponse.json();
          if (
            metadata.data &&
            metadata.data.dataFile &&
            metadata.data.dataFile.filename
          ) {
            setOriginalFileName(metadata.data.dataFile.filename);
          }
        }
      }
    } catch (e) {
      console.warn("Could not fetch filename, using default:", e);
    }

    // Load from Dataverse API
    const fileUrl = siteUrl + "/api/access/datafile/" + fileId;

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
      const parsedData = JSON.parse(jsonText);
      setJsonData(parsedData);
    } catch (parseError) {
      throw new Error(
        `Failed to parse JSON: ${parseError.message}. This file may not be valid JSON-LD.`
      );
    }

    // Normalize to @graph format if needed
    try {
      const normalized = await normalizeToGraphFormat(getJsonData());
      setJsonData(normalized);
    } catch (normalizeError) {
      throw new Error(
        `Failed to normalize JSON-LD structure: ${normalizeError.message}`
      );
    }

    // Verify we now have @graph (should always be true after normalization)
    const jsonData = getJsonData();
    if (!jsonData["@graph"]) {
      throw new Error(
        "Internal error: Normalization did not produce @graph structure."
      );
    }

    setOriginalData(JSON.parse(JSON.stringify(jsonData))); // Deep clone

    // Load local context cache for fallback (non-blocking)
    // Expand JSON-LD to get full property URIs
    try {
      const expanded = await jsonld.expand(jsonData);
      setExpandedJsonLd(expanded);
      console.log("Expanded JSON-LD for property URI mapping");
    } catch (expandError) {
      console.warn("Could not expand JSON-LD:", expandError);
      setExpandedJsonLd(null);
    }

    // Load SHACL shapes - use the selected shape from dropdown
    const selectedShape = $("#shape-selector").val();
    if (selectedShape) {
      try {
        await loadShapes(selectedShape);
        log(LOG_LEVEL.INFO, "SHACL shapes loaded for validation");
      } catch (shapeError) {
        console.error("Failed to load SHACL shapes:", shapeError);
        console.warn("Continuing without SHACL validation");
      }
    } else {
      log(
        LOG_LEVEL.INFO,
        "No SHACL shapes selected - rendering in generic JSON-LD mode"
      );
    }

    // Render the data (always, even without shapes)
    renderData();

    // Update namespace section visibility
    updateNamespaceSectionVisibility();

    // Setup event handlers
    setupEventHandlers();
  } catch (error) {
    console.error("Error loading data:", error);
    $("#load-local-btn").show();
    $("#load-dataverse-btn").show();
    // In standalone mode (error case), always show save button
    $("#save-btn").removeClass("hidden");
    $("#content").html(`
                    <div class="alert alert-danger">
                        <strong>Error:</strong> Failed to load CDI data. ${error.message}
                    </div>
                `);
    setupEventHandlers();
  }
});
