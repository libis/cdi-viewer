/*
 * Embedding helpers for the CDI viewer — allow loading the canonical
 * application shell (the body HTML) and CSS directly from the JS bundle.
 *
 * This file is imported by the main entry so the exported functions are
 * available on the bundle (and we also attach them to window for existing
 * preview pages that call loadBody()).
 */

import previewCss from "../css/cdi-preview.css";
// Try to import the canonical index.html as a raw string if the build
// pipeline supports it (rollup/plugin-string). If available we will
// prefer the literal content between the <body>...</body> tags so the
// index.html can remain the single source of truth for the app shell.
let indexHtmlRaw = null;
try {
  // This will work only when rollup/plugin-string is configured to
  // treat .html files as raw strings. When not available it should
  // fail silently and we'll fallback to the built-in APP_BODY_HTML.
  // Use require so the import is conditional at runtime; during a
  // proper client-side build with the string plugin the require will
  // be replaced with the raw HTML string.
  indexHtmlRaw = require("../index.html");
} catch (e) {
  indexHtmlRaw = null;
}

// Normalise for cases where the inliner exports a module object with a
// default property (some bundlers / transform steps can produce that).
if (
  indexHtmlRaw &&
  typeof indexHtmlRaw === "object" &&
  typeof indexHtmlRaw.default === "string"
) {
  indexHtmlRaw = indexHtmlRaw.default;
}

// Safe id keys for injected elements
const STYLE_ID = "cdi-viewer-inline-css";
const APP_ROOT_ID = "cdi-viewer-root";

// The canonical application body content is taken from index.html at
// build time (when the bundler inlines the HTML). We remove the large
// built-in fallback so the bundle always expects index.html to be
// inlined. If the body is missing at runtime loadBody() will emit a
// clear console warning and do nothing.

/**
 * If indexHtmlRaw was imported through rollup's string plugin prefer the
 * literal content between the body tags. Otherwise fall back to
 * APP_BODY_HTML.
 */
function extractBodyContent(html) {
  if (!html) {
    return null;
  }

  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (m) {
    return m[1].trim();
  }

  return null;
}

const BODY_FROM_INDEX = indexHtmlRaw ? extractBodyContent(indexHtmlRaw) : null;
// Only use the inlined index.html body. If not present, EFFECTIVE_APP_BODY_HTML
// will be null and loadBody() will warn and no-op — forcing a build-time
// guarantee that index.html is inlined for embedding scenarios.
const EFFECTIVE_APP_BODY_HTML = BODY_FROM_INDEX || null;

/**
 * Inject CSS into the document head as an inline <style> element.
 * If the style was already injected this is a no-op.
 */
export function injectInlineCss() {
  if (typeof document === "undefined") {
    return;
  }
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = previewCss;
  document.head.appendChild(style);
}

/**
 * Load the application's body DOM into the current document. This is
 * intended for embedding the viewer from a host page that wants a
 * single-line include + script call (example: include bundle + call
 * loadBody()).
 *
 * Options
 *  - inlineCss: if true (default) injects CSS from the bundle into a
 *    <style> tag; if false, no inline styles are added (host page must
 *    supply CSS via <link> or other means).
 */
export function loadBody({ inlineCss = true } = {}) {
  if (typeof document === "undefined") {
    return;
  }

  // ensure head exists
  if (!document.head) {
    return;
  }

  if (inlineCss) {
    injectInlineCss();
  }

  // Only add the app root once
  if (document.getElementById(APP_ROOT_ID)) {
    return;
  }

  if (!EFFECTIVE_APP_BODY_HTML) {
    // No inlined index.html body available — build must inline index.html
    // for embedding to work. Avoid modifying the host document silently.
    /* eslint-disable no-console */
    console.warn(
      "CDI Viewer: loadBody() could not find the inlined index.html body. " +
        "Build with inlined HTML or provide the host body manually."
    );
    /* eslint-enable no-console */
    return;
  }

  const root = document.createElement("div");
  root.id = APP_ROOT_ID;
  // Prefer the body content literal from index.html when available
  root.innerHTML = EFFECTIVE_APP_BODY_HTML;

  // Replace body contents (preview pages typically have an empty body)
  document.body.innerHTML = "";
  document.body.appendChild(root);
}

// Expose on window for older preview pages that call loadBody() directly
if (typeof window !== "undefined") {
  window.loadBody = loadBody;
  window.injectCdiViewerCss = injectInlineCss;
}

export default { loadBody, injectInlineCss };
