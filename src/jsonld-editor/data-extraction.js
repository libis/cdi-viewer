// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

// === CDI Previewer: Data Extraction and Save Logic ===
//
// Handles collecting user edits from the DOM and exporting JSON-LD data.

import {
  getJsonData,
  getSiteUrl,
  getFileId,
  getOriginalFileName,
  getChangedElementsCount,
  getAllChangedElements,
  clearChangedElements,
} from "./state.js";
import { parseDataverseUrl } from "./dataverse-url-parser.js";
import { showAlert } from "./modal-dialogs.js";
import { getNodeById } from "./graph-structure.js";

export function collectChangesFromDOM() {
  // Check if there are any actual changes using the persistent Set
  const hasChanges = getChangedElementsCount() > 0;
  if (!hasChanges) {
    return; // No changes, keep original jsonData unchanged
  }

  // Get all changed composite IDs from the Set
  const changedIds = getAllChangedElements();

  // Parse composite IDs and group by nodeId
  const changesByNode = new Map();
  changedIds.forEach((compositeId) => {
    const dotIndex = compositeId.indexOf(".");
    if (dotIndex === -1) {
      return; // Invalid format
    }

    const nodeId = compositeId.substring(0, dotIndex);
    const propertyKey = compositeId.substring(dotIndex + 1);

    if (!changesByNode.has(nodeId)) {
      changesByNode.set(nodeId, new Set());
    }
    changesByNode.get(nodeId).add(propertyKey);
  });

  // Update only the changed properties in jsonData
  changesByNode.forEach((propertyKeys, nodeId) => {
    const node = getNodeById(nodeId);
    if (!node) {
      return;
    }

    // Find the card for this node
    const $card = $(`.node-card`).filter(function () {
      return $(this).find(".node-id").first().text() === nodeId;
    });

    if ($card.length === 0) {
      return;
    }

    // Update each changed property
    propertyKeys.forEach((key) => {
      // CRITICAL: Use children().find() to avoid selecting nested node properties
      // .find() alone would search ALL descendants including nested nodes
      const $propertyRow = $card
        .children(".node-body")
        .find(`.property-row[data-property="${key}"]`)
        .filter(function () {
          // Double-check this property row belongs to THIS node, not a nested one
          return $(this).attr("data-node-id") === nodeId;
        });

      if ($propertyRow.length === 0) {
        return;
      }

      // Determine if the original value was an array by checking the current node structure
      const originalValue = node[key];
      const wasArray = Array.isArray(originalValue);

      if (wasArray) {
        // Array of values - collect from .array-value divs, excluding nested inline nodes
        const values = [];
        const $arrayValues = $propertyRow
          .children(".property-value")
          .children(".array-value");
        
        $arrayValues.each(function () {
          const $arrayValue = $(this);
          
          // Check if this array value contains an inline node card (nested object)
          const $inlineCard = $arrayValue.children(".inline-node-card");
          if ($inlineCard.length > 0) {
            // This is a reference/object - keep original value structure
            const idx = $arrayValue.index();
            if (idx < originalValue.length) {
              values.push(originalValue[idx]);
            }
          } else {
            // This is a simple value - collect from input
            const $input = $arrayValue.find("input, textarea, select").first();
            if ($input.length > 0) {
              let val = $input.val();
              try {
                val = JSON.parse(val);
              } catch (e) {
                // Keep as string
              }
              values.push(val);
            }
          }
        });
        node[key] = values;
      } else {
        // Single value - use direct child input only, not from nested nodes
        const $input = $propertyRow
          .children(".property-value")
          .children("input, textarea, select")
          .first();
          
        if ($input.length > 0) {
          let val = $input.val();

          try {
            val = JSON.parse(val);
          } catch (e) {
            // Keep as string if not valid JSON
          }
          node[key] = val;
        }
      }
    });
  });

  // jsonData['@graph'] is already updated in place - no need to replace it
  // NOTE: We do NOT clear the changed tracking here - that only happens after save/export
}

export function saveChanges() {
  // Note: In view mode, there are no input fields to collect from.
  // Changes should already be in jsonData from when they were made in edit mode.
  // Only collect from DOM if we're currently in edit mode.
  const isEditMode = window.isEditMode;
  if (isEditMode) {
    collectChangesFromDOM();
  }

  // Detect if we're in integrated mode (has fileId and siteUrl)
  const fileId = getFileId();
  const siteUrl = getSiteUrl();
  const isIntegratedMode = !!(fileId && siteUrl);

  // Show/hide URL field based on mode
  if (isIntegratedMode) {
    $("#dataverseUrlGroup").hide();
    $("#dataverseUrlInput").val("");
  } else {
    $("#dataverseUrlGroup").show();
  }

  // Set filename suggestion
  const originalFileName = getOriginalFileName();
  $("#filenameInput").val(originalFileName || "metadata.jsonld");

  // Clear API token input
  $("#apiTokenInput").val("");

  // Reset validation feedback
  $("#urlValidationFeedback").html("");

  // Disable button initially in standalone mode
  if (!isIntegratedMode) {
    $("#confirmSaveBtn").prop("disabled", true);
  } else {
    $("#confirmSaveBtn").prop("disabled", false);
  }

  $("#saveModal").modal("show");
}

async function replaceFile(serverUrl, fileId, apiToken, filename, blob) {
  const formData = new FormData();
  formData.append("file", blob, filename);
  formData.append(
    "jsonData",
    JSON.stringify({
      description: "Updated CDI metadata",
      categories: ["Data"],
      forceReplace: true,
    })
  );

  const response = await fetch(`${serverUrl}/api/files/${fileId}/replace`, {
    method: "POST",
    headers: {
      "X-Dataverse-key": apiToken,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

async function addFileToDataset(
  serverUrl,
  persistentIdOrDatasetId,
  apiToken,
  filename,
  blob
) {
  const formData = new FormData();
  formData.append("file", blob, filename);
  formData.append(
    "jsonData",
    JSON.stringify({
      description: "CDI metadata file",
      categories: ["Data"],
    })
  );

  // Construct the correct API endpoint
  let apiUrl;
  if (
    persistentIdOrDatasetId.includes("doi:") ||
    persistentIdOrDatasetId.includes("10.")
  ) {
    // It's a persistent ID
    apiUrl = `${serverUrl}/api/datasets/:persistentId/add?persistentId=${encodeURIComponent(persistentIdOrDatasetId)}`;
  } else {
    // It's a dataset ID
    apiUrl = `${serverUrl}/api/datasets/${persistentIdOrDatasetId}/add`;
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "X-Dataverse-key": apiToken,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

export async function saveToDataverse() {
  const jsonData = getJsonData();
  const apiToken = $("#apiTokenInput").val().trim();
  const filename = $("#filenameInput").val().trim();

  if (!apiToken) {
    await showAlert("Please enter your API token.");
    return;
  }

  if (!filename) {
    await showAlert("Please enter a filename.");
    return;
  }

  // Detect mode
  const integratedFileId = getFileId();
  const integratedSiteUrl = getSiteUrl();
  const isIntegratedMode = !!(integratedFileId && integratedSiteUrl);

  let serverUrl, fileId, persistentId, datasetId, operationType;

  if (isIntegratedMode) {
    // Integrated mode: always replace
    serverUrl = integratedSiteUrl;
    fileId = integratedFileId;
    operationType = "replace";
  } else {
    // Standalone mode: parse URL
    const dataverseUrl = $("#dataverseUrlInput").val().trim();
    if (!dataverseUrl) {
      await showAlert("Please enter a Dataverse URL.");
      return;
    }

    const parseResult = parseDataverseUrl(dataverseUrl);
    if (!parseResult.valid) {
      await showAlert("Invalid Dataverse URL: " + parseResult.error);
      return;
    }

    serverUrl = parseResult.serverUrl;
    operationType = parseResult.type;
    fileId = parseResult.fileId;
    persistentId = parseResult.persistentId;
    datasetId = parseResult.datasetId;
  }

  // Close the modal and show loading
  $("#saveModal").modal("hide");

  try {
    // Prepare the data as JSON-LD string
    const jsonldString = JSON.stringify(jsonData, null, 2);

    // Use the exact MIME type that matches the external tool registration
    const mimeType =
      'application/ld+json;profile="http://www.w3.org/ns/json-ld#flattened http://www.w3.org/ns/json-ld#compacted https://ddialliance.org/specification/ddi-cdi/1.0"';
    const blob = new Blob([jsonldString], { type: mimeType });

    // Show saving indicator
    $("#save-btn")
      .prop("disabled", true)
      .html(
        '<span class="glyphicon glyphicon-refresh spinning"></span> Saving...'
      );

    let result;
    if (operationType === "replace") {
      result = await replaceFile(serverUrl, fileId, apiToken, filename, blob);
    } else {
      // operationType === "add"
      const idToUse = persistentId || datasetId;
      result = await addFileToDataset(
        serverUrl,
        idToUse,
        apiToken,
        filename,
        blob
      );
    }

    if (result.status === "OK") {
      await showAlert(
        `File ${operationType === "replace" ? "replaced" : "added"} successfully!`
      );
      // Clear changed tracking after successful save
      $(".property-row.changed").removeClass("changed");
      clearChangedElements();
    } else {
      throw new Error("Unexpected response: " + JSON.stringify(result));
    }
  } catch (error) {
    console.error("Save error:", error);
    await showAlert(
      "Failed to save to Dataverse:\n\n" +
        error.message +
        "\n\nPlease check:\n• Your API token is valid\n• You have write access to this dataset\n• The Dataverse server is accessible"
    );
  } finally {
    // Reset button
    $("#save-btn")
      .prop("disabled", false)
      .html(
        '<span class="glyphicon glyphicon-floppy-disk"></span> Save to Dataverse'
      );
  }
}

export function exportData() {
  // Note: In view mode, there are no input fields to collect from.
  // Changes should already be in jsonData from when they were made in edit mode.
  // Only collect from DOM if we're currently in edit mode.
  const isEditMode = window.isEditMode;
  if (isEditMode) {
    collectChangesFromDOM();
  }

  const jsonData = getJsonData();

  // Clear changed tracking after export (export means data is saved)
  $(".property-row.changed").removeClass("changed");
  clearChangedElements();

  const dataStr = JSON.stringify(jsonData, null, 2);
  // Use the exact MIME type that matches the external tool registration
  // Note: Dataverse's replace API strips spaces from MIME type parameters
  const mimeType =
    'application/ld+json;profile="http://www.w3.org/ns/json-ld#flattened http://www.w3.org/ns/json-ld#compacted https://ddialliance.org/specification/ddi-cdi/1.0"';
  const blob = new Blob([dataStr], { type: mimeType });
  const url = URL.createObjectURL(blob);

  // Use original filename or default
  const originalFileName = getOriginalFileName();
  const filename = originalFileName || "cdi-data.jsonld";

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}
