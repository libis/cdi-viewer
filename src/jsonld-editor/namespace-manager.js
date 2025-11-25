// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

/**
 * Namespace/Prefix Management
 *
 * Manages JSON-LD @context namespace prefixes, allowing users to:
 * - View current namespace mappings
 * - Add custom namespace prefixes
 * - Remove custom namespaces
 * - Update @context when namespaces change
 */

import {
  getJsonData,
  setJsonData,
  logDebug,
  logWarn,
  logError,
} from "./state.js";
import { showAlert, showConfirm } from "./modal-dialogs.js";
import { createTestId, quickEl } from "./dom-utils.js";
import { iconSpan } from "./render-utils.js";

// Built-in namespaces that should not be deletable
const PROTECTED_NAMESPACES = new Set([
  "@vocab",
  "@base",
  "@language",
  "@version",
]);

/**
 * Extract namespace prefixes from @context
 * Handles both string contexts (URLs) and object contexts
 */
export function extractNamespaces() {
  const jsonData = getJsonData();
  if (!jsonData?.["@context"]) {
    return {};
  }

  const context = jsonData["@context"];
  const namespaces = {};

  // Helper to extract namespace from context entry
  const extractFromObject = (ctx) => {
    if (typeof ctx === "object" && ctx !== null) {
      Object.entries(ctx).forEach(([key, value]) => {
        if (typeof value === "string") {
          namespaces[key] = value;
        } else if (value?.["@id"]) {
          namespaces[key] = value["@id"];
        }
      });
    }
  };

  // Handle array of contexts
  if (Array.isArray(context)) {
    context.forEach(extractFromObject);
  } else {
    extractFromObject(context);
  }
  // Single string context (URL) - can't extract individual prefixes without fetching

  return namespaces;
}

/**
 * Add or update a namespace prefix in @context
 */
export function addNamespace(prefix, uri) {
  const jsonData = getJsonData();
  if (!jsonData) {
    logError("No JSON-LD data loaded");
    return false;
  }

  // Initialize @context if it doesn't exist
  if (!jsonData["@context"]) {
    jsonData["@context"] = {};
  }

  let context = jsonData["@context"];

  // If context is a string URL, convert to array with URL + object for new prefix
  if (typeof context === "string") {
    const contextUrl = context;
    context = jsonData["@context"] = [contextUrl, {}];
  }

  // If context is an array, add to the first object or create one
  if (Array.isArray(context)) {
    let objectContext = context.find(
      (c) => typeof c === "object" && c !== null
    );
    if (!objectContext) {
      objectContext = {};
      context.push(objectContext);
    }
    objectContext[prefix] = uri;
  } else if (typeof context === "object") {
    // Context is an object, add directly
    context[prefix] = uri;
  }

  setJsonData(jsonData);
  logDebug(`Added namespace: ${prefix} -> ${uri}`);
  return true;
}

/**
 * Remove a namespace prefix from @context
 */
export function removeNamespace(prefix) {
  const jsonData = getJsonData();
  if (!jsonData?.["@context"]) {
    return false;
  }

  // Don't allow removing protected namespaces
  if (PROTECTED_NAMESPACES.has(prefix)) {
    logWarn(`Cannot remove protected namespace: ${prefix}`);
    return false;
  }

  const context = jsonData["@context"];

  // Handle array of contexts
  if (Array.isArray(context)) {
    context.forEach((ctx) => {
      if (ctx?.[prefix]) {
        delete ctx[prefix];
      }
    });
  } else if (context?.[prefix]) {
    // Handle single object context
    delete context[prefix];
  }

  setJsonData(jsonData);
  logDebug(`Removed namespace: ${prefix}`);
  return true;
}

/**
 * Check if a prefix is protected (built-in, should not be deleted)
 */
export function isProtectedNamespace(prefix) {
  return PROTECTED_NAMESPACES.has(prefix);
}

/**
 * Render the namespace table in the UI
 */
export function renderNamespaceTable() {
  const namespaces = extractNamespaces();
  const tbody = $("#namespace-table-body");
  tbody.empty();

  // Filter out JSON-LD keywords (@ prefixed keys)
  const entries = Object.entries(namespaces).filter(
    ([prefix]) => !prefix.startsWith("@")
  );

  if (entries.length === 0) {
    // Hide the entire namespace section if no namespaces
    $("#namespace-section").hide();
    return;
  }

  // Show the section since we have namespaces
  $("#namespace-section").show();

  // Sort by prefix name
  entries.sort((a, b) => a[0].localeCompare(b[0]));

  entries.forEach(([prefix, uri]) => {
    const isProtected = isProtectedNamespace(prefix);
    const row = $("<tr>").attr(
      "data-testid",
      createTestId("namespace-row", prefix)
    );

    // Prefix column
    const prefixCell = $("<td>").text(prefix);
    if (isProtected) {
      prefixCell.append(' <span class="label label-default">built-in</span>');
    }
    row.append(prefixCell);

    // URI column (with truncation for long URIs)
    const uriCell = $("<td>").css("word-break", "break-all");
    const uriText = uri.length > 80 ? uri.substring(0, 77) + "..." : uri;
    uriCell.text(uriText).attr("title", uri);
    row.append(uriCell);

    // Actions column
    const actionsCell = $("<td>").css("text-align", "center");
    if (!isProtected) {
      const deleteBtn = $("<button>")
        .addClass("btn btn-xs btn-danger")
        .attr("data-testid", createTestId("delete-namespace-btn", prefix))
        .empty()
        .append(iconSpan("glyphicon glyphicon-trash"))
        .attr("title", "Delete namespace")
        .click(async function () {
          if (
            await showConfirm(`Remove namespace prefix "${prefix}"?`, {
              title: "Delete Namespace",
              confirmText: "Delete",
            })
          ) {
            removeNamespace(prefix);
            renderNamespaceTable();
            // Collect any unsaved DOM changes before re-rendering
            import("./data-extraction.js").then((dataModule) => {
              dataModule.collectChangesFromDOM();
              // Use dynamic import to avoid circular dependency
              import("./render.js").then((renderModule) =>
                renderModule.renderData()
              );
            });
            // Dispatch custom event for namespace selectors to update
            window.dispatchEvent(new CustomEvent("namespacesChanged"));
          }
        });
      actionsCell.append(deleteBtn);
    } else {
      actionsCell
        .empty()
        .append(quickEl("span", { style: "color: #999;" }, ["—"]));
    }
    row.append(actionsCell);

    tbody.append(row);
  });
}

/**
 * Show or hide the namespace section
 */
export function updateNamespaceSectionVisibility() {
  const jsonData = getJsonData();
  if (jsonData && jsonData["@context"]) {
    $("#namespace-section").show();
    renderNamespaceTable();

    // Keep content collapsed by default
    const content = $("#namespace-content");
    if (!content.data("manually-toggled")) {
      content.hide();
      const btn = $("#toggle-namespace-btn");
      btn
        .find(".glyphicon")
        .removeClass("glyphicon-chevron-up")
        .addClass("glyphicon-chevron-down");
      btn
        .empty()
        .append(iconSpan("glyphicon glyphicon-chevron-down"))
        .append(document.createTextNode(" Expand"));
    }
  } else {
    $("#namespace-section").hide();
  }
}

/**
 * Setup event handlers for namespace management
 */
export function setupNamespaceHandlers() {
  // Toggle collapse/expand
  $("#toggle-namespace-btn").click(function () {
    const content = $("#namespace-content");
    const icon = $(this).find(".glyphicon");

    // Mark as manually toggled
    content.data("manually-toggled", true);

    if (content.is(":visible")) {
      content.slideUp();
      icon
        .removeClass("glyphicon-chevron-up")
        .addClass("glyphicon-chevron-down");
      $(this)
        .empty()
        .append(iconSpan("glyphicon glyphicon-chevron-down"))
        .append(document.createTextNode(" Expand"));
    } else {
      content.slideDown();
      icon
        .removeClass("glyphicon-chevron-down")
        .addClass("glyphicon-chevron-up");
      $(this)
        .empty()
        .append(iconSpan("glyphicon glyphicon-chevron-up"))
        .append(document.createTextNode(" Collapse"));
    }
  });

  // Add namespace button
  $("#add-namespace-btn").click(function () {
    $("#namespacePrefixInput").val("");
    $("#namespaceUriInput").val("");
    $("#namespaceValidationFeedback").empty();
    $("#namespaceModal").modal("show");
  });

  // Validate inputs in real-time
  $("#namespacePrefixInput, #namespaceUriInput").on("input", function () {
    validateNamespaceInputs();
  });

  // Confirm add namespace
  $("#confirmNamespaceBtn").click(async function () {
    const prefix = $("#namespacePrefixInput").val().trim();
    const uri = $("#namespaceUriInput").val().trim();

    if (!prefix || !uri) {
      await showAlert("Please provide both prefix and namespace URI");
      return;
    }

    // Validate prefix format
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(prefix)) {
      await showAlert(
        "Invalid prefix format. Must start with a letter and contain only letters, numbers, hyphens, and underscores."
      );
      return;
    }

    // Validate URI format
    if (!uri.match(/^https?:\/\/.+/)) {
      await showAlert(
        "Invalid URI format. Must start with http:// or https://"
      );
      return;
    }

    // Initialize document if no data exists yet
    const jsonData = getJsonData();
    if (!jsonData) {
      // Create minimal empty document
      const emptyDoc = {
        "@context": {},
        "@graph": [],
      };
      setJsonData(emptyDoc);
    }

    // Check if prefix already exists
    const namespaces = extractNamespaces();
    if (namespaces[prefix]) {
      if (
        !(await showConfirm(`Prefix "${prefix}" already exists. Overwrite?`, {
          title: "Overwrite Prefix",
        }))
      ) {
        return;
      }
    }

    // Add the namespace
    if (addNamespace(prefix, uri)) {
      $("#namespaceModal").modal("hide");
      renderNamespaceTable();
      updateNamespaceSectionVisibility(); // Make sure namespace section is visible
      // Collect any unsaved DOM changes before re-rendering
      import("./data-extraction.js").then((dataModule) => {
        dataModule.collectChangesFromDOM();
        // Use dynamic import to avoid circular dependency
        import("./render.js").then((renderModule) => renderModule.renderData());
      });
      // Dispatch custom event for namespace selectors to update
      window.dispatchEvent(new CustomEvent("namespacesChanged"));

      // Show success message
      const message = $("<div>")
        .addClass("alert alert-success")
        .css("margin", "10px 0;");
      message.append($("<strong>").text("Success! "));
      message.append(document.createTextNode(" Added namespace: "));
      message.append($("<code>").text(prefix));
      message.append(document.createTextNode(" → "));
      message.append($("<code>").text(uri));
      $("#namespace-section").after(message);
      setTimeout(
        () =>
          message.fadeOut(500, function () {
            $(this).remove();
          }),
        3000
      );
    }
  });

  // Allow Enter key to confirm
  $("#namespacePrefixInput, #namespaceUriInput").keypress(function (e) {
    if (e.which === 13) {
      e.preventDefault();
      $("#confirmNamespaceBtn").click();
    }
  });
}

/**
 * Validate namespace inputs and show feedback
 */
function validateNamespaceInputs() {
  const prefix = $("#namespacePrefixInput").val().trim();
  const uri = $("#namespaceUriInput").val().trim();
  const feedback = $("#namespaceValidationFeedback");

  if (!prefix && !uri) {
    feedback.empty();
    return;
  }

  const errors = [];

  if (prefix && !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(prefix)) {
    errors.push(
      "Prefix must start with a letter and contain only letters, numbers, hyphens, and underscores"
    );
  }

  if (uri && !uri.match(/^https?:\/\/.+/)) {
    errors.push("URI must start with http:// or https://");
  }

  if (errors.length > 0) {
    const errDiv = $("<div>")
      .addClass("alert alert-danger")
      .css("margin-bottom", "0");
    errors.forEach((e) => {
      // use text() to avoid injecting HTML
      errDiv.append($("<div>").text(`• ${e}`));
    });
    feedback.empty().append(errDiv);
  } else if (prefix && uri) {
    const okDiv = $("<div>")
      .addClass("alert alert-success")
      .css("margin-bottom", "0");
    okDiv
      .append($("<span>").addClass("glyphicon glyphicon-ok"))
      .append(document.createTextNode(" Valid namespace definition"));
    feedback.empty().append(okDiv);
  } else {
    feedback.empty();
  }
}
