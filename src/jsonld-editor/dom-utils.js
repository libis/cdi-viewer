/**
 * Small DOM / test-id utilities used across the JSON-LD editor code.
 */

/**
 * Sanitize any string for use in data-testid or other id-like attributes.
 * Replaces non-alphanumeric characters with '_' to keep IDs stable and safe.
 */
export function sanitizeForTestId(value) {
  return String(value || "").replace(/[^a-zA-Z0-9]/g, "_");
}

/**
 * Build a test-id using a prefix and an arbitrary value.
 */
export function createTestId(prefix, value) {
  return `${prefix}-${sanitizeForTestId(value)}`;
}

/**
 * Small helper to create an element quickly with attributes and children.
 * Keeps code more readable than long jQuery chains for basic cases.
 */
export function quickEl(tag, attrs = {}, children = []) {
  const $el = $(`<${tag}>`);
  Object.entries(attrs).forEach(([k, v]) => {
    if (v === undefined || v === null) {
      return;
    }
    $el.attr(k, v);
  });
  (Array.isArray(children) ? children : [children]).forEach((c) => {
    if (c === null) {
      return;
    }
    if (typeof c === "string") {
      $el.append(document.createTextNode(c));
    } else {
      $el.append(c);
    }
  });
  return $el;
}
