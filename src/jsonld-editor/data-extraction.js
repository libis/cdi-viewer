// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

// === CDI Previewer: Data Extraction and Save Logic ===
//
// Handles collecting user edits from the DOM and exporting JSON-LD data.

import {
  getJsonData,
  getSiteUrl,
  getFileId,
  getOriginalFileName,
  clearChangedElements,
  getIsEditMode,
  logDebug,
  logError,
} from "./state.js";
import { parseDataverseUrl } from "./dataverse-url-parser.js";
import { showAlert } from "./modal-dialogs.js";
import { getNodeById } from "./graph-structure.js";
import { iconSpan } from "./render-utils.js";

export function collectChangesFromDOM() {
  logDebug("collectChangesFromDOM: Starting data collection from DOM");
  // Collect ALL properties from ALL visible nodes when in edit mode
  // This ensures we don't lose any data during re-renders
  const jsonData = getJsonData();
  if (!jsonData || !jsonData["@graph"]) {
    return;
  }

  // Process each node card in the DOM
  $(".node-card").each(function () {
    const $card = $(this);
    const nodeId = $card.find(".node-id").first().text();

    if (!nodeId) {
      return;
    }

    const node = getNodeById(nodeId);
    if (!node) {
      return;
    }

    // Process each property row for this node
    const $propertyRows = $card
      .children(".node-body")
      .find(".property-row")
      .filter(function () {
        // Only process properties that belong to THIS node (not nested inline nodes)
        return $(this).attr("data-node-id") === nodeId;
      });

    // Helper: collect value for a single property-row element. This handles
    // arrays, reference containers, inline-node-cards (nested objects), and
    // simple inputs. currentValue is the existing value in jsonData for this
    // property (may be used to preserve references).
    const collectValueFromPropertyRow = ($propertyRow, currentValue) => {
      // Check if this is an array property by looking at the DOM structure
      const $arrayValues = $propertyRow
        .children(".property-value")
        .children(".array-value");

      if ($arrayValues.length > 0) {
        const values = [];
        $arrayValues.each(function (arrayIndex) {
          const $arrayValue = $(this);

          // Inline nested object (rendered as a small inline node card)
          const $inlineCard = $arrayValue.children(".inline-node-card");
          if ($inlineCard.length > 0) {
            // Build an object from the nested property's rows
            const inlineObj = {};

            // Preserve @id if present in the inline header
            const idText = $inlineCard.find('.node-id').first().text();
            if (idText) {
              inlineObj['@id'] = idText;
            }

            // Read nested property rows which live inside this inline card
            $inlineCard.find('.node-body > .property-row').each(function () {
              const $nestedRow = $(this);
              const nestedKey = $nestedRow.attr('data-property');
              if (!nestedKey) { return; }

              // Recurse using current value if available
              const nestedCurrent = Array.isArray(currentValue) && currentValue[arrayIndex] && typeof currentValue[arrayIndex] === 'object' ? currentValue[arrayIndex][nestedKey] : undefined;
              inlineObj[nestedKey] = collectValueFromPropertyRow($nestedRow, nestedCurrent);
            });

            values.push(inlineObj);
            return; // next arrayIndex
          }

          // Reference-style (jump link) - preserve via original value if present
          const $refContainer = $arrayValue.children('.reference-container');
          if ($refContainer.length > 0) {
            if (Array.isArray(currentValue) && arrayIndex < currentValue.length) {
              values.push(currentValue[arrayIndex]);
            }
            return;
          }

          // Simple scalar input
          const $input = $arrayValue.find('input, textarea, select').first();
          if ($input.length > 0) {
            let val = $input.val();
            try {
              val = JSON.parse(val);
            } catch (e) {
              // keep as string
            }
            values.push(val);
            return;
          }

          // If nothing matched, try to read inner text as a fallback
          const txt = $arrayValue.text().trim();
          values.push(txt);
        });

        return values;
      }

      // Single value - first check for inline-node-card (nested object)
      const $inlineSingle = $propertyRow.children('.property-value').children('.inline-node-card').first();
      if ($inlineSingle.length > 0) {
        const inlineObj = {};
        const idText = $inlineSingle.find('.node-id').first().text();
        if (idText) { inlineObj['@id'] = idText; }

        $inlineSingle.find('.node-body > .property-row').each(function () {
          const $nestedRow = $(this);
              const nestedKey = $nestedRow.attr('data-property');
              if (!nestedKey) { return; }
          const nestedCurrent = currentValue && typeof currentValue === 'object' ? currentValue[nestedKey] : undefined;
          inlineObj[nestedKey] = collectValueFromPropertyRow($nestedRow, nestedCurrent);
        });

        return inlineObj;
      }

      // Reference container (single) - preserve current value
      const $refContainer = $propertyRow
        .children('.property-value')
        .children('.reference-container')
        .first();
      if ($refContainer.length > 0) {
        return currentValue; // preserve as-is
      }

      // Input field (single)
      const $input = $propertyRow
        .children('.property-value')
        .children('input, textarea, select')
        .first();

      if ($input.length > 0) {
        let val = $input.val();
        try {
          val = JSON.parse(val);
        } catch (e) {
          // keep as string
        }
        return val;
      }

      // Fallback - try to read textual content
      return $propertyRow.children('.property-value').text().trim();
    };

    $propertyRows.each(function () {
      const $propertyRow = $(this);
      const key = $propertyRow.attr("data-property");

      if (!key) {
        return;
      }

      // Collect the property value (handles array/single/inline/reference)
      const currentValue = node[key];
      const newValue = collectValueFromPropertyRow($propertyRow, currentValue);

      // Update node with collected value
      node[key] = newValue;
    });
  });

  // jsonData['@graph'] is already updated in place
  // NOTE: We do NOT clear the changed tracking here - that only happens after save/export
}

export function saveChanges() {
  // Note: In view mode, there are no input fields to collect from.
  // Changes should already be in jsonData from when they were made in edit mode.
  // Only collect from DOM if we're currently in edit mode.
  const isEditMode = getIsEditMode();
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
  $("#urlValidationFeedback").empty();

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
      .empty()
      .append(iconSpan("glyphicon glyphicon-refresh spinning"))
      .append(document.createTextNode(" Saving..."));

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
    logError("Save error:", error);
    await showAlert(
      "Failed to save to Dataverse:\n\n" +
        error.message +
        "\n\nPlease check:\n• Your API token is valid\n• You have write access to this dataset\n• The Dataverse server is accessible"
    );
  } finally {
    // Reset button
    $("#save-btn")
      .prop("disabled", false)
      .empty()
      .append(iconSpan("glyphicon glyphicon-floppy-disk"))
      .append(document.createTextNode(" Save to Dataverse"));
  }
}

export function exportData() {
  // Note: In view mode, there are no input fields to collect from.
  // Changes should already be in jsonData from when they were made in edit mode.
  // Only collect from DOM if we're currently in edit mode.
  const isEditMode = getIsEditMode();
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
