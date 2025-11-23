// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

// === CDI Previewer: JSON-LD Context Normalization ===
//
// Handles legacy DDI-CDI context URLs and local context resolution.
// Used for internal viewer behavior (expansion, suggestions, SHACL classification).
// Does NOT modify the original data when exporting.

import { LOG_LEVEL, log, setHadOriginalGraph } from "./state.js";

// Legacy/external context URLs that we want to handle via local copies
// Add entries here if you have local cached versions of external contexts
const LEGACY_CONTEXT_URLS = {
  // DDI-CDI legacy context (optional - only if working with DDI-CDI data)
  "https://ddi-alliance.bitbucket.io/DDI-CDI/DDI-CDI_v1.0-rc1/encoding/json-ld/ddi-cdi.jsonld":
    "shapes/ddi-cdi.jsonld",
};

/**
 * Safely resolve a prefix to its namespace URI from a JSON-LD context.
 * Handles arrays, objects, and external URLs robustly.
 *
 * @param {*} context - The @context value (can be string, object, or array)
 * @param {string} prefix - The prefix to resolve (e.g., "schema", "cdi")
 * @returns {string|null} - The namespace URI or null if not found
 */
export function resolvePrefix(context, prefix) {
  if (!context || !prefix) {
    return null;
  }

  // Handle string context (URL) - we can't resolve from it directly
  if (typeof context === "string") {
    return null;
  }

  // Handle object context (simple case)
  if (typeof context === "object" && !Array.isArray(context)) {
    const namespace = context[prefix];
    return typeof namespace === "string" ? namespace : null;
  }

  // Handle array context (most complex case)
  if (Array.isArray(context)) {
    // Iterate through array elements (later entries override earlier ones)
    for (let i = context.length - 1; i >= 0; i--) {
      const entry = context[i];

      // Check object entries (skip string URLs)
      if (typeof entry === "object" && entry?.[prefix]) {
        const namespace = entry[prefix];
        if (typeof namespace === "string") {
          return namespace;
        }
      }
    }
  }

  return null;
}

/**
 * Expand a compact IRI (prefix:localPart) to a full URI using the context.
 *
 * @param {*} context - The @context value
 * @param {string} compactIri - The compact IRI (e.g., "schema:Dataset")
 * @returns {string|null} - The expanded URI or null if can't expand
 */
export function expandCompactIri(context, compactIri) {
  if (!compactIri || !compactIri.includes(":")) {
    return null;
  }

  // Already a full URI
  if (compactIri.startsWith("http://") || compactIri.startsWith("https://")) {
    return compactIri;
  }

  const [prefix, localPart] = compactIri.split(":", 2);
  const namespace = resolvePrefix(context, prefix);

  if (namespace) {
    return namespace + localPart;
  }

  return null;
}

// Map of legacy / external context URLs to local JSON-LD context documents
// NOTE: This is used **only** for internal viewer/editor behavior (expansion,
// suggestions, SHACL classification). We DO NOT rewrite the original data when
// exporting – the source JSON-LD stays as-is.
// Uses LEGACY_CONTEXT_URLS defined above (configurable)
const LOCAL_CONTEXT_MAP = LEGACY_CONTEXT_URLS;

// Apply viewer-local context normalization/merging without mutating the
// original data structure. Returns a shallow-cloned object with a
// viewer-specific @context that can then be passed to jsonld.expand/flatten.
function buildViewerContext(data) {
  const originalContext = data["@context"];

  // No @context – nothing we can sensibly do here
  if (!originalContext) {
    return undefined;
  }

  // Helper: convert a single context entry (URL/string or object) into a
  // local, viewer-usable object. For URLs we may substitute a local JSON-LD
  // file if known; for inline objects we keep them as-is.
  function resolveContextEntry(entry) {
    // String: could be a URL or a term
    if (typeof entry === "string") {
      const mapped = LOCAL_CONTEXT_MAP[entry];
      if (mapped) {
        // Use a link to the local JSON-LD context document so that
        // jsonld.js can resolve it via XHR. We intentionally do NOT
        // inline/merge this file; it is large and we want to keep the
        // source file untouched for export.
        return mapped;
      }
      // Unknown string – keep as-is
      return entry;
    }

    // Plain object – use as-is
    if (typeof entry === "object") {
      return entry;
    }

    // Anything else (rare) – keep unchanged
    return entry;
  }

  // Case 1: @context is an array – we want to merge it for the viewer.
  if (Array.isArray(originalContext)) {
    const mergedObject = {};
    const keptUrls = [];

    for (const ctx of originalContext) {
      const resolved = resolveContextEntry(ctx);

      // Keep URLs / strings in a list so that remote/local contexts still
      // participate in expansion if needed.
      if (typeof resolved === "string") {
        keptUrls.push(resolved);
      } else if (resolved && typeof resolved === "object") {
        Object.assign(mergedObject, resolved);
      }
    }

    // If we have at least one object, build a merged array in which the
    // object comes last so that its term mappings are visible to the
    // viewer/UI. Any URL contexts are kept in front.
    if (Object.keys(mergedObject).length > 0) {
      if (keptUrls.length === 0) {
        return mergedObject;
      }
      return [...keptUrls, mergedObject];
    }

    // Fallback: no objects, just URLs – keep them as-is (after mapping).
    return keptUrls.length > 0 ? keptUrls : originalContext;
  }

  // Case 2: single string or object – just resolve once.
  return resolveContextEntry(originalContext);
}

// Normalize JSON-LD to @graph format
export async function normalizeToGraphFormat(data) {
  // Check if already has @graph
  if (data["@graph"]) {
    log(LOG_LEVEL.DEBUG, "Data already has @graph, no normalization needed");
    setHadOriginalGraph(true);
    $("#normalization-notice").hide();
    return data;
  }

  log(LOG_LEVEL.DEBUG, "Data does not have @graph, normalizing...");
  setHadOriginalGraph(false);

  // Special handling for legacy DDI-CDI format with DDICDIModels and @included
  // This is an optional convenience - if your JSON-LD uses standard @graph, this won't trigger
  if (data["DDICDIModels"] && Array.isArray(data["DDICDIModels"])) {
    log(
      LOG_LEVEL.DEBUG,
      "Detected legacy DDI-CDI format with DDICDIModels property"
    );

    // Combine DDICDIModels and @included into @graph
    let graphNodes = [...data["DDICDIModels"]];

    if (data["@included"] && Array.isArray(data["@included"])) {
      log(LOG_LEVEL.DEBUG, "Also merging @included nodes");
      graphNodes = graphNodes.concat(data["@included"]);
    }

    log(LOG_LEVEL.DEBUG, `Combined ${graphNodes.length} nodes into @graph`);

    // Show notice to user
    $("#normalization-notice").show();

    const viewerContext = buildViewerContext(data);

    return {
      // Prefer viewer-specific context if available, otherwise fall back
      // to the original context or an empty object.
      "@context":
        viewerContext !== undefined ? viewerContext : data["@context"] || {},
      "@graph": graphNodes,
    };
  }

  try {
    // Use jsonld.flatten() to convert to @graph format
    // This handles nested structures and extracts all nodes into a flat array
    // Build a viewer-specific copy that keeps the original data intact but
    // normalizes @context for expansion and suggestions.
    const dataForViewer = {
      ...data,
    };

    const viewerContext = buildViewerContext(dataForViewer);
    if (viewerContext !== undefined) {
      dataForViewer["@context"] = viewerContext;
    }

    const flattened = await jsonld.flatten(dataForViewer);

    log(
      LOG_LEVEL.DEBUG,
      "Successfully normalized to @graph format using jsonld.flatten()"
    );
    log(
      LOG_LEVEL.DEBUG,
      `Graph nodes: ${flattened["@graph"] ? flattened["@graph"].length : 0}`
    );

    // Show notice to user
    $("#normalization-notice").show();

    return flattened;
  } catch (error) {
    console.error("Failed to normalize JSON-LD:", error);

    // Fallback: manually wrap in @graph if it's a single object
    if (data["@id"] || data["@type"]) {
      log(LOG_LEVEL.DEBUG, "Fallback: wrapping single object in @graph");
      $("#normalization-notice").show();
      const viewerContext = buildViewerContext(data);

      return {
        "@context":
          viewerContext !== undefined ? viewerContext : data["@context"] || {},
        "@graph": [data],
      };
    }

    // If all else fails, throw error
    throw new Error(
      "Unable to normalize JSON-LD structure. Please ensure the file is valid JSON-LD."
    );
  }
}
