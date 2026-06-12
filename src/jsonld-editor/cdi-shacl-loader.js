// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

// === SHACL Shape Loading (Core SHACL Only) ===

import {
  LOG_LEVEL,
  log,
  logInfo,
  logWarn,
  logError,
  SHAPE_URLS,
  setShaclShapes,
  setShaclShapesStore,
  setCurrentShapeSource,
  setDefaultTypeNamespace,
} from "./state.js";
import { showAlert } from "./modal-dialogs.js";

// Load SHACL shapes from a URL with fallback to local
export async function loadShapes(shapeSource, customUrl = null) {
  let shapeUrl;
  let fallbackUrl = SHAPE_URLS["local-fallback"];

  // Determine the URL based on the shape source
  if (shapeSource === "custom" && customUrl) {
    shapeUrl = customUrl;
  } else if (SHAPE_URLS[shapeSource]) {
    shapeUrl = SHAPE_URLS[shapeSource];
  } else {
    logError("Unknown shape source:", shapeSource);
    shapeUrl = SHAPE_URLS["local-fallback"];
    fallbackUrl = null; // Already using fallback
  }

  logInfo(`Loading SHACL shapes from: ${shapeUrl}`);

  try {
    // Try loading from the specified URL
    const response = await fetch(shapeUrl);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const shapesText = await response.text();

    // Parse into N3 store (Core SHACL only)
    await parseShapes(shapesText);

    log(LOG_LEVEL.INFO, `Successfully loaded SHACL shapes from ${shapeUrl}`);
    setCurrentShapeSource(shapeSource);

    return true;
  } catch (error) {
    logWarn(`Failed to load SHACL shapes from ${shapeUrl}:`, error);

    // Try fallback if not already using local
    if (fallbackUrl && shapeSource !== "local-fallback") {
      logInfo(`Falling back to local shapes: ${fallbackUrl}`);

      try {
        const fallbackResponse = await fetch(fallbackUrl);

        if (!fallbackResponse.ok) {
          throw new Error(`Fallback failed: HTTP ${fallbackResponse.status}`);
        }

        const fallbackShapesText = await fallbackResponse.text();
        await parseShapes(fallbackShapesText);

        logInfo(`Successfully loaded fallback SHACL shapes`);
        setCurrentShapeSource("local-fallback");

        // Update dropdown to reflect fallback
        $("#shape-selector").val("local-fallback");

        // Show user notification
        await showAlert(
          `Could not load shapes from:\n${shapeUrl}\n\nFalling back to local built-in DDI-CDI shapes.\n\nError: ${error.message}`
        );

        return true;
      } catch (fallbackError) {
        logError("Fallback also failed:", fallbackError);
        throw new Error(
          `Failed to load both primary and fallback shapes: ${error.message}`
        );
      }
    } else {
      throw error;
    }
  }
}

// Parse SHACL shapes text into N3 store
async function parseShapes(shapesText) {
  setShaclShapes(shapesText);
  setShaclShapesStore(new N3.Store());

  const parser = new N3.Parser();
  const store = new N3.Store();

  return new Promise((resolve, reject) => {
    parser.parse(shapesText, (error, quad) => {
      if (error) {
        reject(error);
      } else if (quad) {
        store.addQuad(quad);
      } else {
        // Parsing complete - set the store after all quads added
        setShaclShapesStore(store);
        log(LOG_LEVEL.DEBUG, "SHACL shapes parsed successfully");

        // Auto-detect DDI-CDI mode based on namespace in SHACL shapes
        detectAndConfigureDDICDIMode(shapesText);

        resolve();
      }
    });
  });
}

// Detect if SHACL shapes are DDI-CDI related and enable DDI-CDI mode
function detectAndConfigureDDICDIMode(shapesText) {
  // Check for DDI-CDI namespace (version-agnostic, protocol-agnostic)
  const isDDICDI = /ddialliance\.org\/Specification\/DDI-CDI/i.test(shapesText);

  if (isDDICDI) {
    // Enable DDI-CDI mode
    setDefaultTypeNamespace(
      "http://ddialliance.org/Specification/DDI-CDI/1.0/RDF/"
    );
    log(LOG_LEVEL.INFO, "DDI-CDI shapes detected - enabling DDI-CDI mode");
  } else {
    // Disable DDI-CDI mode for other vocabularies
    setDefaultTypeNamespace(null);
    log(LOG_LEVEL.INFO, "Generic JSON-LD mode (no DDI-CDI namespace detected)");
  }
}

// Convert JSON-LD to N3 Store for validation
export async function jsonLdToN3Store(jsonLdData) {
  const store = new N3.Store();

  try {
    // Custom document loader with robust fallback handling
    const customLoader = async (url) => {
      // Map of known DDI-CDI context URLs
      const DDI_CDI_URLS = [
        "http://ddialliance.org/Specification/DDI-CDI/1.0/RDF/",
        "https://ddi-alliance.bitbucket.io/DDI-CDI/DDI-CDI_v1.0-rc1/encoding/json-ld/ddi-cdi.jsonld",
        "https://docs.ddialliance.org/DDI-CDI/1.0/model/encoding/json-ld/ddi-cdi.jsonld",
        "https://ddi-cdi.github.io/m2t-ng/DDI-CDI_1-0/encoding/json-ld/ddi-cdi.jsonld",
      ];

      // Prefer the released encoding on the DDI Alliance documentation site.
      // The m2t-ng GitHub Pages copy is a build-tooling artifact and currently
      // serves invalid JSON (unresolved merge-conflict markers).
      const WORKING_URL =
        "https://docs.ddialliance.org/DDI-CDI/1.0/model/encoding/json-ld/ddi-cdi.jsonld";

      // Vendored copy of the DDI-CDI context (the hosted copies are not
      // always reachable or parseable). Lives in public/shapes/, which is
      // served as-is alongside the site.
      const LOCAL_FALLBACK = "public/shapes/ddi-cdi.jsonld";

      // If this is a DDI-CDI context URL, try working URL first, then local fallback
      if (DDI_CDI_URLS.includes(url)) {
        try {
          const response = await fetch(WORKING_URL);
          if (response.ok) {
            const doc = await response.json();
            log(LOG_LEVEL.DEBUG, `Loaded DDI-CDI context from: ${WORKING_URL}`);
            return {
              contextUrl: null,
              document: doc,
              documentUrl: url,
            };
          }
        } catch (error) {
          logWarn(
            `Failed to load from ${WORKING_URL}, trying local fallback:`,
            error
          );
        }

        // Fallback to local copy. A non-ok response must fail here too:
        // falling through would re-fetch the (broken) remote URL and end up
        // in the empty-context fallback below, which silently drops every
        // property and produces misleading SHACL violations.
        try {
          const response = await fetch(LOCAL_FALLBACK);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const doc = await response.json();
          log(LOG_LEVEL.INFO, `Using local DDI-CDI context: ${LOCAL_FALLBACK}`);
          return {
            contextUrl: null,
            document: doc,
            documentUrl: url,
          };
        } catch (error) {
          logError(`Failed to load local fallback ${LOCAL_FALLBACK}:`, error);
          throw new Error(
            `Could not load DDI-CDI context from network or local fallback`
          );
        }
      }

      // For other URLs, fetch normally with timeout
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(url, {
          headers: { Accept: "application/ld+json, application/json" },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const doc = await response.json();
        return {
          contextUrl: null,
          document: doc,
          documentUrl: url,
        };
      } catch (error) {
        // Proceeding with an empty context drops every term defined by the
        // unreachable context: affected properties disappear from the RDF
        // graph and SHACL reports missing-value violations that are NOT
        // present in the document. Log loudly so this is diagnosable.
        logError(
          `Failed to load context from ${url}; continuing with an empty ` +
            `context — validation results may be unreliable:`,
          error
        );
        return {
          contextUrl: null,
          document: { "@context": {} },
          documentUrl: url,
        };
      }
    };

    // Convert JSON-LD to N-Quads format
    // Use DDI-CDI base URI for resolving relative IDs (fragments like #Mass)
    const baseUri = "http://ddialliance.org/Specification/DDI-CDI/1.0/RDF/";

    const nquads = await jsonld.toRDF(jsonLdData, {
      format: "application/n-quads",
      base: baseUri,
      documentLoader: customLoader,
    });

    // Parse N-Quads into N3 store
    const parser = new N3.Parser({ format: "N-Quads" });

    return new Promise((resolve, reject) => {
      parser.parse(nquads, (error, quad) => {
        if (error) {
          reject(error);
        } else if (quad) {
          store.addQuad(quad);
        } else {
          // Parsing complete
          resolve(store);
        }
      });
    });
  } catch (error) {
    logError("Error converting JSON-LD to N3 Store:", error);
    throw error;
  }
}
