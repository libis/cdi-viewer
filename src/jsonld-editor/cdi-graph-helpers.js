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
  getExpandedJsonLd,
  getShaclShapesStore,
  setJsonData,
  setOriginalData,
  setOriginalFileName,
} from "./state.js";
import { expandCompactIri } from "./cdi-json-ld-helpers.js";
import { humanizeKey } from "./render.js";
import { renderData } from "./render.js";
import { updateSaveButton } from "./data-extraction.js";
import { updateNamespaceSectionVisibility } from "./namespace-manager.js";
import { createUnifiedAddComponent } from "./unified-add-component.js";

// Expand a compact node ID (e.g., "xas:fe_c3d.001") to full URI (e.g., "http://www.cdi4exas.org/fe_c3d.001")
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
    const node = jsonData["@graph"].find((n) => n["@id"] === compactNodeId);
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

// Get the expanded URI for a property from the expanded JSON-LD
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

  // Re-render
  renderData();

  // Mark as changed
  updateSaveButton();

  // Scroll to new node and highlight it
  setTimeout(() => {
    const newCard = $(`.node-card[data-node-id="${newNodeId}"]`);
    if (newCard.length) {
      newCard[0].scrollIntoView({ behavior: "smooth", block: "center" });
      newCard.addClass("highlight");
      setTimeout(() => newCard.removeClass("highlight"), 2000);
    }
  }, 100);

  console.log("Added new root node:", newNode);
}

export function addPropertyToNode(nodeId, propertyKey, initialValue) {
  const jsonData = getJsonData();
  const node = jsonData["@graph"].find((n) => n["@id"] === nodeId);

  if (node) {
    node[propertyKey] = initialValue;
    return true;
  }
  return false;
}

export function convertPropertyToArray(nodeId, propertyKey) {
  const jsonData = getJsonData();
  const node = jsonData["@graph"].find((n) => n["@id"] === nodeId);

  if (node) {
    const currentValue = node[propertyKey];
    if (!Array.isArray(currentValue)) {
      node[propertyKey] = currentValue ? [currentValue] : [];
    }
    return true;
  }
  return false;
}

export function convertPropertyToSingle(nodeId, propertyKey) {
  const jsonData = getJsonData();
  const node = jsonData["@graph"].find((n) => n["@id"] === nodeId);

  if (node) {
    const currentValue = node[propertyKey];
    if (Array.isArray(currentValue)) {
      node[propertyKey] = currentValue.length > 0 ? currentValue[0] : "";
    }
    return true;
  }
  return false;
}

export function getAllNodesForReference() {
  const jsonData = getJsonData();

  if (!jsonData || !jsonData["@graph"]) {
    return [];
  }

  // Return all nodes with their ID and type for selection
  return jsonData["@graph"].map((node) => ({
    id: node["@id"],
    type: Array.isArray(node["@type"]) ? node["@type"][0] : node["@type"],
    types: Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]],
  }));
}

export function addReferenceToProperty(nodeId, propertyKey, referenceId) {
  const jsonData = getJsonData();
  const node = jsonData["@graph"].find((n) => n["@id"] === nodeId);

  if (node) {
    const reference = { "@id": referenceId };
    const currentValue = node[propertyKey];

    if (Array.isArray(currentValue)) {
      currentValue.push(reference);
    } else if (currentValue) {
      node[propertyKey] = [currentValue, reference];
    } else {
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
  asArray = false
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
  const parentNode = jsonData["@graph"].find((n) => n["@id"] === nodeId);
  if (parentNode) {
    const reference = { "@id": newNodeId };
    const currentValue = parentNode[propertyKey];

    if (asArray) {
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
