// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

/**
 * Graph Structure Module
 *
 * Maintains logical parent-child relationships in the JSON-LD graph.
 * This is separate from DOM structure - it represents the actual data relationships.
 *
 * This module provides:
 * - Parent-child relationship tracking
 * - Ancestor chain traversal
 * - Descendant discovery
 * - Root node identification
 *
 * ## Architecture
 *
 * The graph structure is built during rendering when nodes reference other nodes
 * through properties. For example:
 *
 * ```json
 * {
 *   "@id": "#Sample_ID_Component",
 *   "isDefinedBy": "#Sample_ID"
 * }
 * ```
 *
 * This creates a parent-child relationship where #Sample_ID_Component is the parent
 * of #Sample_ID. The relationship is tracked in `nodeParentMap`.
 *
 * ## Usage in Filtering
 *
 * The filter module uses `getAncestors()` to find all ancestor nodes of a matching node,
 * ensuring only the match and its ancestors are shown (not siblings or children).
 *
 * ## Future Enhancements
 *
 * This module could be extended to support:
 * - Circular reference detection
 * - Graph cycle detection
 * - Shortest path between nodes
 * - Node depth calculation
 * - Sibling discovery
 */

import { getJsonData, logDebug } from "./state.js";

// Track logical parent-child relationships
// Maps child node ID -> parent node ID
const nodeParentMap = new Map();

// Track all nodes that have been rendered (to avoid duplicates)
const renderedNodes = new Set();

// Track which nodes are referenced by others (not root nodes)
const referencedNodeIds = new Set();

/**
 * Reset all graph structure tracking
 * Call this when loading new data or re-rendering
 */
export function resetGraphStructure() {
  nodeParentMap.clear();
  renderedNodes.clear();
  referencedNodeIds.clear();
}

/**
 * Build the graph structure from JSON-LD data
 * This analyzes all property references to determine relationships
 */
export function buildGraphStructure() {
  resetGraphStructure();

  const jsonData = getJsonData();
  if (!jsonData || !jsonData["@graph"]) {
    return;
  }

  logDebug("Building graph structure...");

  // First pass: identify all referenced nodes
  jsonData["@graph"].forEach((node) => {
    Object.keys(node).forEach((key) => {
      if (key !== "@id" && key !== "@type" && key !== "@context") {
        const value = node[key];
        const refs = extractNodeReferencesSimple(value);
        refs.forEach((ref) => referencedNodeIds.add(ref));
      }
    });
  });

  logDebug(`Found ${referencedNodeIds.size} referenced nodes`);
}

/**
 * Extract node references from a value (string, array, or object)
 * Returns array of node IDs that are referenced
 * @private - Use this internally only, for external use import from render.js
 */
function extractNodeReferencesSimple(value) {
  const jsonData = getJsonData();
  const refs = [];

  const checkIfNodeRef = (str) => {
    if (typeof str !== "string") {
      return false;
    }
    return jsonData["@graph"].some((n) => n["@id"] === str);
  };

  if (typeof value === "string") {
    if (checkIfNodeRef(value)) {
      refs.push(value);
    }
  } else if (Array.isArray(value)) {
    value.forEach((item) => {
      if (typeof item === "string" && checkIfNodeRef(item)) {
        refs.push(item);
      } else if (typeof item === "object" && item !== null && item["@id"]) {
        refs.push(item["@id"]);
      }
    });
  } else if (typeof value === "object" && value !== null && value["@id"]) {
    refs.push(value["@id"]);
  }

  return refs;
}

/**
 * Record a parent-child relationship
 * @param {string} childId - The child node ID
 * @param {string} parentId - The parent node ID
 */
export function setParentRelationship(childId, parentId) {
  if (childId && parentId && childId !== parentId) {
    nodeParentMap.set(childId, parentId);
  }
}

/**
 * Mark a node as rendered (to avoid duplicates)
 * @param {string} nodeId - The node ID
 */
export function markNodeRendered(nodeId) {
  renderedNodes.add(nodeId);
}

/**
 * Check if a node has been rendered
 * @param {string} nodeId - The node ID
 * @returns {boolean}
 */
export function isNodeRendered(nodeId) {
  return renderedNodes.has(nodeId);
}

/**
 * Get the parent node ID for a given node
 * @param {string} nodeId - The node ID
 * @returns {string|null} The parent node ID, or null if no parent
 */
export function getParent(nodeId) {
  return nodeParentMap.get(nodeId) || null;
}

/**
 * Get all ancestor node IDs for a given node (parent, grandparent, etc.)
 * @param {string} nodeId - The node ID
 * @returns {Set<string>} Set of ancestor node IDs
 */
export function getAncestors(nodeId) {
  const ancestors = new Set();
  let currentId = nodeId;

  // Walk up the parent chain
  while (nodeParentMap.has(currentId)) {
    const parentId = nodeParentMap.get(currentId);
    if (parentId && parentId !== currentId && !ancestors.has(parentId)) {
      ancestors.add(parentId);
      currentId = parentId;
    } else {
      break; // Prevent infinite loops
    }
  }

  return ancestors;
}

/**
 * Get all descendant node IDs for a given node (children, grandchildren, etc.)
 * @param {string} nodeId - The node ID
 * @returns {Set<string>} Set of descendant node IDs
 */
export function getDescendants(nodeId) {
  const descendants = new Set();

  // Find all nodes where this node is the parent
  for (const [childId, parentId] of nodeParentMap.entries()) {
    if (parentId === nodeId) {
      descendants.add(childId);
      // Recursively get descendants of this child
      const childDescendants = getDescendants(childId);
      childDescendants.forEach((id) => descendants.add(id));
    }
  }

  return descendants;
}

/**
 * Get all root node IDs (nodes that are not referenced by others)
 * @returns {Array<string>} Array of root node IDs
 */
export function getRootNodeIds() {
  const jsonData = getJsonData();
  if (!jsonData || !jsonData["@graph"]) {
    return [];
  }

  // Root nodes are those not referenced by any other node
  // Blank nodes (_:xxx) should never be root nodes
  const rootNodes = jsonData["@graph"]
    .filter(
      (n) => !referencedNodeIds.has(n["@id"]) && !n["@id"].startsWith("_:")
    )
    .map((n) => n["@id"]);

  // If no root nodes exist, we likely have a cycle or all nodes are referenced
  // Pick the first non-blank node as an arbitrary starting point
  if (rootNodes.length === 0) {
    logDebug("No root nodes found - possible cycle detected. Using first non-blank node as root.");
    const firstNonBlank = jsonData["@graph"].find((n) => !n["@id"].startsWith("_:"));
    if (firstNonBlank) {
      return [firstNonBlank["@id"]];
    }
    return [];
  }

  return rootNodes;
}

/**
 * Check if a node is a root node
 * @param {string} nodeId - The node ID
 * @returns {boolean}
 */
export function isRootNode(nodeId) {
  return !referencedNodeIds.has(nodeId) && !nodeId.startsWith("_:");
}

/**
 * Get the parent map (for advanced use cases)
 * @returns {Map<string, string>}
 */
export function getParentMap() {
  return nodeParentMap;
}

/**
 * Get graph structure statistics (for debugging)
 * @returns {object}
 */
export function getGraphStats() {
  return {
    totalNodes: getJsonData()?.["@graph"]?.length || 0,
    renderedNodes: renderedNodes.size,
    referencedNodes: referencedNodeIds.size,
    rootNodes: getRootNodeIds().length,
    parentChildRelationships: nodeParentMap.size,
  };
}

/**
 * Find a node by ID in the graph
 * @param {string} nodeId - The node ID to find
 * @returns {object|null} The node object, or null if not found
 */
export function getNodeById(nodeId) {
  const jsonData = getJsonData();
  if (!jsonData || !jsonData["@graph"]) {
    return null;
  }
  return jsonData["@graph"].find((n) => n["@id"] === nodeId) || null;
}

/**
 * Check if a node exists in the graph
 * @param {string} nodeId - The node ID to check
 * @returns {boolean}
 */
export function nodeExists(nodeId) {
  return getNodeById(nodeId) !== null;
}

/**
 * Get all nodes in the graph
 * @returns {Array<object>} Array of all node objects
 */
export function getAllNodes() {
  const jsonData = getJsonData();
  if (!jsonData || !jsonData["@graph"]) {
    return [];
  }
  return jsonData["@graph"];
}

/**
 * Get node type(s) for a given node ID
 * @param {string} nodeId - The node ID
 * @returns {Array<string>} Array of type URIs (empty if not found)
 */
export function getNodeTypes(nodeId) {
  const node = getNodeById(nodeId);
  if (!node) {
    return [];
  }
  const types = node["@type"];
  return Array.isArray(types) ? types : [types];
}

/**
 * Get all nodes of a specific type
 * @param {string} type - The type URI to filter by
 * @returns {Array<object>} Array of nodes with that type
 */
export function getNodesByType(type) {
  return getAllNodes().filter((node) => {
    const types = node["@type"];
    if (Array.isArray(types)) {
      return types.includes(type);
    }
    return types === type;
  });
}

/**
 * Find nodes that reference a specific node
 * (i.e., nodes that have this node as a value in any property)
 * @param {string} targetNodeId - The node ID being referenced
 * @returns {Array<object>} Array of nodes that reference the target
 */
export function getNodesReferencingNode(targetNodeId) {
  const referencingNodes = [];

  getAllNodes().forEach((node) => {
    Object.keys(node).forEach((key) => {
      if (key === "@id" || key === "@type" || key === "@context") {
        return;
      }

      const value = node[key];
      let references = false;

      if (typeof value === "string" && value === targetNodeId) {
        references = true;
      } else if (Array.isArray(value)) {
        references = value.some((item) => {
          if (typeof item === "string") {
            return item === targetNodeId;
          }
          if (typeof item === "object" && item !== null) {
            return item["@id"] === targetNodeId;
          }
          return false;
        });
      } else if (typeof value === "object" && value !== null) {
        references = value["@id"] === targetNodeId;
      }

      if (references && !referencingNodes.includes(node)) {
        referencingNodes.push(node);
      }
    });
  });

  return referencingNodes;
}
