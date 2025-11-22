// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

// === URI Utilities ===
//
// Functions for working with URIs, node IDs, and property expansion.
// Extracted to break circular dependencies.

import { getJsonData, getExpandedJsonLd } from "./state.js";
import { expandCompactIri } from "./cdi-json-ld-helpers.js";
import { getNodeById } from "./graph-structure.js";

/**
 * Expand a compact node ID (e.g., "xas:fe_c3d.001") to full URI
 * @param {string} compactNodeId - The compact node ID
 * @returns {string|null} The expanded URI or the original if can't expand
 */
export function getExpandedNodeId(compactNodeId) {
  if (!compactNodeId) {
    return null;
  }

  // If it's already a full URI, return as-is
  if (
    compactNodeId.startsWith("http://") ||
    compactNodeId.startsWith("https://")
  ) {
    return compactNodeId;
  }

  // Try to find the node in the @graph
  const jsonData = getJsonData();
  const expandedJsonLd = getExpandedJsonLd();

  if (jsonData && jsonData["@graph"]) {
    const node = getNodeById(compactNodeId);
    if (node && node["@id"]) {
      // Check if we have expanded JSON-LD
      if (expandedJsonLd && Array.isArray(expandedJsonLd)) {
        const expanded = expandedJsonLd.find((n) => {
          // The expanded @id should be the full URI
          return (
            n["@id"] &&
            (n["@id"] === compactNodeId ||
              n["@id"].endsWith("/" + compactNodeId.split(":").pop()) ||
              n["@id"].endsWith("#" + compactNodeId.split(":").pop()))
          );
        });
        if (expanded && expanded["@id"]) {
          return expanded["@id"];
        }
      }
    }
  }

  // Fallback: try to resolve using context
  if (jsonData && jsonData["@context"]) {
    const expanded = expandCompactIri(jsonData["@context"], compactNodeId);
    if (expanded) {
      return expanded;
    }
  }

  return compactNodeId; // Return as-is if we can't expand
}

/**
 * Get the expanded URI for a property from the expanded JSON-LD
 * @param {string} nodeId - The node ID
 * @param {string} propertyKey - The property key
 * @returns {string|null} The expanded property URI or null
 */
export function getExpandedPropertyUri(nodeId, propertyKey) {
  const expandedJsonLd = getExpandedJsonLd();

  if (!expandedJsonLd || !Array.isArray(expandedJsonLd)) {
    return null;
  }

  // Find the node in expanded JSON-LD
  const expandedNode = expandedJsonLd.find((n) => n["@id"] === nodeId);
  if (!expandedNode) {
    return null;
  }

  // Look through all properties to find one that might match
  for (const key in expandedNode) {
    if (key === "@id" || key === "@type") {
      continue;
    }

    // The expanded key is the full URI, extract the local part
    const localPart = key.split("/").pop().split("#").pop();

    // Check if this matches our property key
    if (localPart === propertyKey || key === propertyKey) {
      return key; // Return the full URI
    }
  }

  return null;
}

/**
 * Extract a readable label from a URI
 * @param {string} uri - The URI to extract label from
 * @returns {string} Human-readable label
 */
export function extractLabelFromUri(uri) {
  // Extract the local part after last / or #
  const parts = uri.split("/").pop().split("#").pop();
  // Convert camelCase to Title Case with spaces
  return parts
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}
