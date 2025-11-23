// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

// === CDI Previewer: Property Suggestions ===
//
// Generates property suggestions based on SHACL shapes and node types.

import {
  getShaclShapesStore,
  getJsonData,
  getDefaultTypeNamespace,
  addChangedElement,
} from "./state.js";
import { expandCompactIri } from "./cdi-json-ld-helpers.js";
import { humanizeKey } from "./text-utils.js";
import {
  addPropertyToNode,
  createAndReferenceNewNode,
} from "./cdi-graph-helpers.js";
import { createUnifiedAddComponent } from "./unified-add-component.js";

export function getPropertySuggestions(node, types) {
  const shaclShapesStore = getShaclShapesStore();
  const jsonData = getJsonData();

  if (!shaclShapesStore || types.length === 0) {
    return [];
  }

  const suggestions = [];
  const existingProperties = Object.keys(node).filter(
    (k) => k !== "@id" && k !== "@type" && k !== "@context"
  );

  // Collect all applicable shape URIs
  const applicableShapes = new Set();

  // Check sh:targetClass (Core SHACL method)
  types.forEach((type) => {
    let typeUri;

    if (type.startsWith("http")) {
      // Already a full URI
      typeUri = type;
    } else if (type.includes(":")) {
      // Compact form like "schema:Dataset" - expand using context
      const context = jsonData && jsonData["@context"];
      if (context) {
        const expanded = expandCompactIri(context, type);
        if (expanded) {
          typeUri = expanded;
        } else {
          // Could not expand - skip this type
          return;
        }
      } else {
        // No context - skip
        return;
      }
    } else {
      // No prefix - check if default namespace is configured
      const defaultTypeNamespace = getDefaultTypeNamespace();
      if (defaultTypeNamespace) {
        typeUri = defaultTypeNamespace + type;
      } else {
        // No default namespace - skip this type
        return;
      }
    }

    // Look for NodeShapes with sh:targetClass matching this type
    const targetClassQuads = shaclShapesStore.getQuads(
      null,
      "http://www.w3.org/ns/shacl#targetClass",
      typeUri,
      null
    );

    targetClassQuads.forEach((quad) => {
      applicableShapes.add(quad.subject.value);
    });
  });

  // Also check for sh:target (SPARQL targets)
  // For UI purposes, we include shapes with SPARQL targets that might apply
  const targetQuads = shaclShapesStore.getQuads(
    null,
    "http://www.w3.org/ns/shacl#target",
    null,
    null
  );
  targetQuads.forEach((quad) => {
    applicableShapes.add(quad.subject.value);
  });

  // Now process all applicable shapes
  applicableShapes.forEach((shapeSubject) => {
    // Get all sh:property predicates for this shape
    const propertyQuads = shaclShapesStore.getQuads(
      shapeSubject,
      "http://www.w3.org/ns/shacl#property",
      null,
      null
    );

    propertyQuads.forEach((propQuad) => {
      // The object is the property shape node (may be blank node or named node)
      const propertyShapeRef = propQuad.object;

      // Get sh:path for this property
      let pathQuads = shaclShapesStore.getQuads(
        propertyShapeRef,
        "http://www.w3.org/ns/shacl#path",
        null,
        null
      );

      // If no path found and it's a named node reference (not blank node),
      // it might be referencing a named property shape definition
      if (pathQuads.length === 0 && propertyShapeRef.termType === "NamedNode") {
        // This is a reference like cdifd:nameProperty
        // The referenced shape should have the actual sh:path
        pathQuads = shaclShapesStore.getQuads(
          propertyShapeRef,
          "http://www.w3.org/ns/shacl#path",
          null,
          null
        );
      }

      pathQuads.forEach((pathQuad) => {
        const path = pathQuad.object.value;
        const pathName = path.split("/").pop().split("#").pop();

        // Check if this property already exists
        if (
          !existingProperties.includes(pathName) &&
          !existingProperties.includes(path)
        ) {
          // Get sh:name for human-readable label
          const nameQuads = shaclShapesStore.getQuads(
            propertyShapeRef,
            "http://www.w3.org/ns/shacl#name",
            null,
            null
          );

          const label =
            nameQuads.length > 0
              ? nameQuads[0].object.value
              : humanizeKey(pathName);

          // Get minCount
          const minCountQuads = shaclShapesStore.getQuads(
            propertyShapeRef,
            "http://www.w3.org/ns/shacl#minCount",
            null,
            null
          );
          const required =
            minCountQuads.length > 0 &&
            parseInt(minCountQuads[0].object.value) > 0;

          // Get maxCount
          const maxCountQuads = shaclShapesStore.getQuads(
            propertyShapeRef,
            "http://www.w3.org/ns/shacl#maxCount",
            null,
            null
          );
          const maxCount =
            maxCountQuads.length > 0
              ? parseInt(maxCountQuads[0].object.value)
              : null;

          // Check if it's a complex object (sh:node or sh:class)
          const nodeQuads = shaclShapesStore.getQuads(
            propertyShapeRef,
            "http://www.w3.org/ns/shacl#node",
            null,
            null
          );
          const classQuads = shaclShapesStore.getQuads(
            propertyShapeRef,
            "http://www.w3.org/ns/shacl#class",
            null,
            null
          );
          const isComplex = nodeQuads.length > 0 || classQuads.length > 0;

          // Get the class from sh:class or find it from sh:node's targetClass or sh:in
          let nodeClass = null;
          if (classQuads.length > 0) {
            nodeClass = classQuads[0].object.value;
          } else if (nodeQuads.length > 0) {
            // sh:node points to another NodeShape (might be a blank node)
            // Use the actual node object, not just the value
            const nodeShapeNode = nodeQuads[0].object;

            // Try to get targetClass (using the node object, not string)
            const targetClassQuads = shaclShapesStore.getQuads(
              nodeShapeNode,
              "http://www.w3.org/ns/shacl#targetClass",
              null,
              null
            );

            if (targetClassQuads.length > 0) {
              nodeClass = targetClassQuads[0].object.value;
            } else {
              // If no targetClass, look for sh:property -> sh:path rdf:type -> sh:in
              // This handles inline blank node shapes with sh:in constraints
              const propertyConstraints = shaclShapesStore.getQuads(
                nodeShapeNode,
                "http://www.w3.org/ns/shacl#property",
                null,
                null
              );

              for (const propQuad of propertyConstraints) {
                const propShape = propQuad.object;

                // Check if this is a type constraint (sh:path rdf:type)
                const pathQuads = shaclShapesStore.getQuads(
                  propShape,
                  "http://www.w3.org/ns/shacl#path",
                  "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                  null
                );

                if (pathQuads.length > 0) {
                  // Found rdf:type constraint, look for sh:in
                  const inQuads = shaclShapesStore.getQuads(
                    propShape,
                    "http://www.w3.org/ns/shacl#in",
                    null,
                    null
                  );

                  if (inQuads.length > 0) {
                    // sh:in points to an RDF list, get the first item
                    const listNode = inQuads[0].object; // Use object, not value!

                    const firstQuads = shaclShapesStore.getQuads(
                      listNode,
                      "http://www.w3.org/1999/02/22-rdf-syntax-ns#first",
                      null,
                      null
                    );

                    if (firstQuads.length > 0) {
                      nodeClass = firstQuads[0].object.value;
                      break;
                    }
                  }
                }
              }
            }
          }

          // Get description
          const descQuads = shaclShapesStore.getQuads(
            propertyShapeRef,
            "http://www.w3.org/ns/shacl#description",
            null,
            null
          );
          const description =
            descQuads.length > 0 ? descQuads[0].object.value : "";

          suggestions.push({
            path: pathName,
            fullPath: path,
            label: label,
            required: required,
            maxCount: maxCount,
            isComplex: isComplex,
            nodeClass: nodeClass,
            description: description,
          });
        }
      });
    });
  });

  // Remove duplicates
  const unique = [];
  const seen = new Set();
  suggestions.forEach((s) => {
    if (!seen.has(s.path)) {
      seen.add(s.path);
      unique.push(s);
    }
  });

  return unique;
}

export function createPropertySuggestionsSection(suggestions, nodeId) {
  return createUnifiedAddComponent({
    type: "property",
    suggestions: suggestions,
    onAdd: (_selectedPath, suggestion) => {
      if (suggestion.isComplex) {
        // Always create a separate node and reference it
        addComplexPropertyToNode(nodeId, suggestion);
      } else {
        // Add the property to the data and re-render
        addPropertyToNode(nodeId, suggestion.path, "");
        import("./render.js").then((module) => module.renderData());
      }
    },
    onAddCustom: (fullName) => {
      addPropertyToNode(nodeId, fullName, "");
      import("./render.js").then((module) => module.renderData());
    },
  });
}

export function addComplexPropertyToNode(nodeId, suggestion) {
  // Extract class name from full URI or use the short name
  let className = suggestion.nodeClass || "Object";
  if (className.includes("/") || className.includes("#")) {
    className = className.split("/").pop().split("#").pop();
  }

  // Use the shared function to create and reference the new node
  const asArray = suggestion.maxCount !== 1;
  const newNodeId = createAndReferenceNewNode(
    nodeId,
    suggestion.path,
    className,
    asArray
  );

  // Re-render to show the new node (use dynamic import to avoid circular dependency)
  import("./render.js").then((module) => module.renderData());

  // Highlight new node without scrolling (user is at Add Properties section)
  setTimeout(() => {
    const newCard = $(`.node-card[data-node-id="${newNodeId}"]`);
    if (newCard.length) {
      // Don't scroll - user is working in the Add Properties section
      newCard.addClass("changed");

      // Track all new properties as changed
      newCard.find(".property-row").each(function () {
        const propertyKey = $(this).attr("data-property");
        if (propertyKey && propertyKey !== "@id" && propertyKey !== "@type") {
          const compositeId = `${newNodeId}.${propertyKey}`;
          addChangedElement(compositeId);
        }
      });
    }
  }, 100);
}
