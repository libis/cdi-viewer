// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

// === CDI Previewer: Data Extraction and Save Logic ===
//
// Handles collecting user edits from the DOM and exporting JSON-LD data.

import {
  getJsonData,
  getSiteUrl,
  getFileId,
  getOriginalFileName,
} from "./state.js";
import { parseDataverseUrl } from "./dataverse-url-parser.js";
import { showAlert } from "./modal-dialogs.js";
import { getNodeById } from "./graph-structure.js";

export function collectChangesFromDOM() {
  // Check if there are any actual changes
  const hasChanges = $(".property-row.changed").length > 0;
  if (!hasChanges) {
    return; // No changes, keep original jsonData unchanged
  }

  // Update only the changed properties in jsonData, preserve everything else
  $(".node-card").each(function () {
    const $card = $(this);
    const nodeId = $card.find(".node-id").first().text();

    // Find the node in jsonData using graph utilities
    const node = getNodeById(nodeId);
    if (!node) {
      return; // Skip if not found
    }

    // Only update properties that have changed IN THIS NODE (not nested nodes)
    // Use children().find() to get only direct properties, not nested node properties
    $card
      .children(".node-body")
      .find(".property-row.changed")
      .each(function () {
        const key = $(this).attr("data-property");
        const inputs = $(this).find("input, textarea, select");

        if (inputs.length === 1) {
          // Single value
          const input = inputs.eq(0);
          let val = input.val();

          try {
            val = JSON.parse(val);
          } catch (e) {
            // Keep as string if not valid JSON
          }
          node[key] = val;
        } else if (inputs.length > 1) {
          // Array of values
          const values = [];
          inputs.each(function () {
            let val = $(this).val();
            try {
              val = JSON.parse(val);
            } catch (e) {
              // Keep as string
            }
            values.push(val);
          });
          node[key] = values;
        }
      });
  });

  // jsonData['@graph'] is already updated in place - no need to replace it

  // Clear the 'changed' class from all rows after collecting changes
  $(".property-row.changed").removeClass("changed");
}

export function saveChanges() {
  // First, collect any changes from the DOM
  collectChangesFromDOM();

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
      $(".property-row").removeClass("changed");
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
  const jsonData = getJsonData();

  // Collect any changes from DOM before exporting
  collectChangesFromDOM();

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
