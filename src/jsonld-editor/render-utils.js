import { quickEl } from "./dom-utils.js";

/**
 * Small rendering helpers used across render code to keep markup consistent.
 */

export function iconSpan(className) {
  return quickEl("span", { class: className });
}

export function iconTextNode(iconClass, text) {
  const $frag = document.createDocumentFragment();
  $frag.appendChild(iconSpan(iconClass)[0]);
  if (text) $frag.appendChild(document.createTextNode(" " + text));
  return $frag;
}

export function iconButton(iconClass, text, attrs = {}) {
  const $btn = quickEl("button", attrs);
  $btn.append(iconSpan(iconClass));
  if (text) $btn.append(document.createTextNode(" " + text));
  return $btn;
}

export function labelSpan(labelText, kind = "info") {
  const className = `label label-${kind}`;
  return quickEl("span", { class: className }, [String(labelText)]);
}
