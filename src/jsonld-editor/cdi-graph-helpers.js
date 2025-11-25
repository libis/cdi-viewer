// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

// === CDI Previewer: Graph and Tree Helpers ===
//
// Utilities for node ID expansion, type extraction, and graph traversal.
//
// Related responsibilities now live in:
//  - cdi-shacl-loader.js          (SHACL shape loading helpers)
//  - cdi-json-ld-helpers.js       (JSON-LD normalization)
//  - core.js                      (Dataverse wiring and initialization)
//  - render.js                    (tree rendering)

import {
  getJsonData,
  getShaclShapesStore,
  setJsonData,
  setOriginalData,
  setOriginalFileName,
  addChangedElement,
} from "./state.js";
import { humanizeKey } from "./text-utils.js";
import { updateNamespaceSectionVisibility } from "./namespace-manager.js";
import { createUnifiedAddComponent } from "./unified-add-component.js";
import { getNodeById, getAllNodes } from "./graph-structure.js";

// Get all available node types from SHACL shapes.
export function getAvailableNodeTypes() {
  const shaclShapesStore = getShaclShapesStore();

  if (!shaclShapesStore) {
    return [];
  }

  const nodeTypes = new Set();

  try {
    // Find all NodeShapes with sh:targetClass
    // Try both default graph (null) and all graphs (undefined)
    let targetClassQuads = shaclShapesStore.getQuads(
      null,
      "http://www.w3.org/ns/shacl#targetClass",
      null,
      null
    );

    // If nothing in default graph, try all graphs
    if (targetClassQuads.length === 0) {
      targetClassQuads = shaclShapesStore.getQuads(
        null,
        "http://www.w3.org/ns/shacl#targetClass",
        null
      );
    }

    targetClassQuads.forEach((quad) => {
      const classUri = quad.object.value;
      // Extract the class name from the URI
      const className = classUri.split("/").pop().split("#").pop();
      nodeTypes.add({
        uri: classUri,
        name: className,
        label: humanizeKey(className),
      });
    });
  } catch (error) {
    console.error("Error getting node types:", error);
  }

  // Convert Set to Array and sort by label
  return Array.from(nodeTypes).sort((a, b) => a.label.localeCompare(b.label));
}

// Initialize a new empty JSON-LD document based on the selected SHACL shape
export function initializeNewDocument() {
  const selectedShape = $("#shape-selector").val();

  // Define contexts and filenames for each shape type
  const shapeConfigs = {
    "ddi-cdi-official": {
      context:
        "https://ddialliance.org/Specification/DDI-CDI/1.0/RDF/DDI-CDI_canonical.jsonld",
      filename: "new-cdi-document.jsonld",
    },
    "cdif-core": {
      context:
        "https://ddialliance.org/Specification/DDI-CDI/1.0/RDF/DDI-CDI_canonical.jsonld",
      filename: "new-cdif-document.jsonld",
    },
    "cdif-core-shacl": {
      context:
        "https://ddialliance.org/Specification/DDI-CDI/1.0/RDF/DDI-CDI_canonical.jsonld",
      filename: "new-cdif-document.jsonld",
    },
    "dcat-ap": {
      context: "https://www.w3.org/ns/dcat",
      filename: "new-dcat-catalog.jsonld",
    },
    datacube: {
      context: "https://www.w3.org/ns/qb#",
      filename: "new-datacube.jsonld",
    },
    skos: {
      context: "http://www.w3.org/2004/02/skos/core#",
      filename: "new-skos-scheme.jsonld",
    },
    "local-fallback": {
      context:
        "https://ddialliance.org/Specification/DDI-CDI/1.0/RDF/DDI-CDI_canonical.jsonld",
      filename: "new-cdi-document.jsonld",
    },
  };

  // Get configuration or use generic defaults
  const config = shapeConfigs[selectedShape] || {
    context: {},
    filename: "new-document.jsonld",
  };

  // Create new empty JSON-LD document
  const newDocument = {
    "@context": config.context,
    "@graph": [],
  };

  // Set the new document as the current data
  setJsonData(newDocument);
  setOriginalData(JSON.parse(JSON.stringify(newDocument)));
  setOriginalFileName(config.filename);

  console.log(
    `Initialized new ${selectedShape || "generic"} document:`,
    config.filename
  );

  return newDocument;
}

// Render the Add Root Node component inline
export function renderAddRootNodeComponent() {
  const availableTypes = getAvailableNodeTypes();

  // Convert to suggestions format for unified component
  const suggestions = availableTypes.map((type) => ({
    name: type.name,
    label: type.label,
    path: type.name,
    // No description needed - it's redundant for root nodes
  }));

  // Create unified component
  const unifiedComponent = createUnifiedAddComponent({
    type: "rootNode",
    suggestions: suggestions,
    onAdd: (selectedType) => {
      createAndAddRootNode(selectedType);
    },
    onAddCustom: (fullName) => {
      createAndAddRootNode(fullName);
    },
  });

  // Clear and populate the container
  const container = $("#add-root-node-container");
  container.empty().append(unifiedComponent);
}

// Create and add a root node with the specified type
export function createAndAddRootNode(nodeType) {
  let jsonData = getJsonData();

  // If no data loaded yet, initialize a new document
  if (!jsonData || !jsonData["@graph"]) {
    jsonData = initializeNewDocument();

    // Update namespace section visibility with new context
    updateNamespaceSectionVisibility();

    // Show success message
    $("#content").prepend(`
      <div class="alert alert-success" style="margin-bottom: 10px;">
        <strong>New document created!</strong> Starting with empty JSON-LD document.
      </div>
    `);

    // Auto-remove message after 3 seconds
    setTimeout(() => {
      $("#content .alert-success")
        .first()
        .fadeOut(500, function () {
          $(this).remove();
        });
    }, 3000);
  }

  // Generate unique ID
  const timestamp = Date.now();
  const newNodeId = `#NewNode_${nodeType}_${timestamp}`;

  // Create new node
  const newNode = {
    "@id": newNodeId,
    "@type": nodeType,
  };

  // Add to graph
  if (!jsonData["@graph"]) {
    jsonData["@graph"] = [];
  }
  jsonData["@graph"].push(newNode);

  // Collect any unsaved DOM changes before re-rendering
  import("./data-extraction.js").then((dataModule) => {
    dataModule.collectChangesFromDOM();
    // Re-render (use dynamic import to avoid circular dependency)
    import("./render.js").then((renderModule) => renderModule.renderData());
  });

  // Highlight new node without scrolling (user is at Add Node section)
  setTimeout(() => {
    const newCard = $(`.node-card[data-node-id="${newNodeId}"]`);
    if (newCard.length) {
      // Don't scroll - user is working in the Add Node section at bottom
      newCard.addClass("highlight");
      setTimeout(() => newCard.removeClass("highlight"), 2000);
    }
  }, 100);

  console.log("Added new root node:", newNode);
}

export function deleteNode(nodeId) {
  const jsonData = getJsonData();
  if (!jsonData || !jsonData["@graph"]) {
    return false;
  }

  // Find and remove the node from @graph
  const nodeIndex = jsonData["@graph"].findIndex((n) => n["@id"] === nodeId);
  if (nodeIndex === -1) {
    return false;
  }

  jsonData["@graph"].splice(nodeIndex, 1);

  // Clean up all references to this node in other nodes
  jsonData["@graph"].forEach((node) => {
    const parentNodeId = node["@id"];
    Object.keys(node).forEach((key) => {
      if (key === "@id" || key === "@type" || key === "@context") {
        return;
      }

      const value = node[key];
      let wasModified = false;

      if (Array.isArray(value)) {
        const originalLength = value.length;
        // Remove from array
        node[key] = value.filter((item) => {
          if (typeof item === "object" && item["@id"] === nodeId) {
            return false;
          }
          if (typeof item === "string" && item === nodeId) {
            return false;
          }
          return true;
        });
        wasModified = node[key].length !== originalLength;
        // If array is now empty, remove the property
        if (node[key].length === 0) {
          delete node[key];
        }
      } else if (
        typeof value === "object" &&
        value !== null &&
        value["@id"] === nodeId
      ) {
        // Remove property with single object reference
        delete node[key];
        wasModified = true;
      } else if (typeof value === "string" && value === nodeId) {
        // Remove property with single string reference
        delete node[key];
        wasModified = true;
      }

      // Track the modification
      if (wasModified && parentNodeId) {
        const compositeId = `${parentNodeId}.${key}`;
        addChangedElement(compositeId);
      }
    });
  });

  return true;
}

export function addPropertyToNode(nodeId, propertyKey, initialValue) {
  const node = getNodeById(nodeId);

  if (node) {
    node[propertyKey] = initialValue;

    // Track this as a change with persistent Set
    const compositeId = `${nodeId}.${propertyKey}`;
    addChangedElement(compositeId);

    return true;
  }
  return false;
}

export function convertPropertyToArray(nodeId, propertyKey) {
  const node = getNodeById(nodeId);

  if (node) {
    const currentValue = node[propertyKey];
    if (!Array.isArray(currentValue)) {
      node[propertyKey] = currentValue ? [currentValue] : [];

      // Track this conversion as a change
      const compositeId = `${nodeId}.${propertyKey}`;
      addChangedElement(compositeId);
    }
    return true;
  }
  return false;
}

export function convertPropertyToSingle(nodeId, propertyKey) {
  const node = getNodeById(nodeId);

  if (node) {
    const currentValue = node[propertyKey];
    if (Array.isArray(currentValue)) {
      node[propertyKey] = currentValue.length > 0 ? currentValue[0] : "";

      // Track this conversion as a change
      const compositeId = `${nodeId}.${propertyKey}`;
      addChangedElement(compositeId);
    }
    return true;
  }
  return false;
}

export function getAllNodesForReference() {
  const nodes = getAllNodes();
  if (nodes.length === 0) {
    return [];
  }

  // Return all nodes with their ID and type for selection
  return nodes.map((node) => ({
    id: node["@id"],
    type: Array.isArray(node["@type"]) ? node["@type"][0] : node["@type"],
    types: Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]],
  }));
}

export function addReferenceToProperty(nodeId, propertyKey, referenceId, forArray = false, replaceMode = false) {
  const jsonData = getJsonData();
  const node = getNodeById(nodeId);

  if (node) {
    // Default to object-style reference: {"@id": referenceId}
    const reference = { "@id": referenceId };
    const currentValue = node[propertyKey];

    if (replaceMode) {
      // Replace mode: replace the current value with the new reference
      node[propertyKey] = reference;
    } else if (forArray || Array.isArray(currentValue)) {
      // Array mode: add to array
      if (Array.isArray(currentValue)) {
        currentValue.push(reference);
      } else if (currentValue) {
        node[propertyKey] = [currentValue, reference];
      } else {
        node[propertyKey] = [reference];
      }
    } else {
      // Single value mode: just set it
      node[propertyKey] = reference;
    }

    // Update state with modified data
    setJsonData(jsonData);
    return true;
  }

  return false;
}

export function createAndReferenceNewNode(
  nodeId,
  propertyKey,
  nodeType,
  asArray = false,
  replaceMode = false
) {
  const jsonData = getJsonData();

  // Create new blank node
  const newNodeId = `_:${propertyKey}_${Date.now()}`;
  const newNode = {
    "@id": newNodeId,
    "@type": nodeType || "Object",
  };

  // Add to graph
  if (!jsonData["@graph"]) {
    jsonData["@graph"] = [];
  }
  jsonData["@graph"].push(newNode);

  // Add reference to parent node
  const parentNode = getNodeById(nodeId);
  if (parentNode) {
    // Default to object-style reference: {"@id": newNodeId}
    const reference = { "@id": newNodeId };
    const currentValue = parentNode[propertyKey];

    if (replaceMode) {
      // Replace mode: replace the current value
      parentNode[propertyKey] = reference;
    } else if (asArray) {
      // Always create/append to array
      if (Array.isArray(currentValue)) {
        currentValue.push(reference);
      } else if (currentValue) {
        parentNode[propertyKey] = [currentValue, reference];
      } else {
        parentNode[propertyKey] = [reference];
      }
    } else {
      // Set as single reference
      parentNode[propertyKey] = reference;
    }
  }

  // Update state with modified data
  setJsonData(jsonData);

  return newNodeId;
}
