/**
 * Custom modal dialog system to replace browser's alert(), confirm(), and prompt()
 * These are more testable and provide better UX than native browser dialogs
 */

import $ from "jquery";
import { quickEl } from "./dom-utils.js";

/**
 * Show an alert modal (replacement for window.alert)
 * @param {string} message - The message to display
 * @returns {Promise<void>}
 */
export function showAlert(message) {
  return new Promise((resolve) => {
    const prevActive = document.activeElement;

    // Unique ids for aria
    const titleId = `modal-title-${Date.now()}`;
    const descId = `modal-desc-${Date.now()}`;

    const $overlay = quickEl("div", {
      class: "custom-modal-overlay",
      "data-testid": "alert-modal",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": titleId,
      "aria-describedby": descId,
    });
    const $modal = quickEl("div", { class: "custom-modal" });
    const $header = quickEl("div", { class: "custom-modal-header" }, [
      quickEl("h4", { id: titleId }, ["Alert"]),
    ]);
    const $body = quickEl("div", { class: "custom-modal-body" }, [
      quickEl("p", { id: descId }, [String(message)]),
    ]);
    const $footer = quickEl("div", { class: "custom-modal-footer" });
    const $ok = quickEl(
      "button",
      { class: "btn btn-primary", "data-testid": "alert-ok-btn" },
      ["OK"]
    );
    $footer.append($ok);

    $modal.append($header, $body, $footer);
    $overlay.append($modal);

    // Focus management & trap
    const focusableSelector =
      'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    function trapFocus(e) {
      if (e.key === "Tab") {
        const focusable = Array.from(
          $overlay[0].querySelectorAll(focusableSelector)
        );
        if (focusable.length === 0) {
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      } else if (e.key === "Escape") {
        // Close on Escape
        cleanup();
        resolve();
      }
    }

    function cleanup() {
      $(document).off("keydown", trapFocus);
      $overlay.remove();
      if (prevActive && typeof prevActive.focus === "function") {
        prevActive.focus();
      }
    }

    // Overlay click closes
    $overlay.on("click", (e) => {
      if (e.target === $overlay[0]) {
        cleanup();
        resolve();
      }
    });

    $ok.on("click", () => {
      cleanup();
      resolve();
    });

    $(document).on("keydown", trapFocus);

    $("body").append($overlay);

    // Focus first actionable control
    setTimeout(() => {
      const first = $overlay[0].querySelector(focusableSelector);
      if (first) {
        first.focus();
      }
    }, 0);
  });
}

/**
 * Show a confirmation modal (replacement for window.confirm)
 * @param {string} message - The message to display
 * @param {Object} options - Optional configuration
 * @param {string} options.title - Modal title (default: "Confirm")
 * @param {string} options.confirmText - Text for confirm button (default: "OK")
 * @param {string} options.cancelText - Text for cancel button (default: "Cancel")
 * @returns {Promise<boolean>} - True if confirmed, false if cancelled
 */
export function showConfirm(message, options = {}) {
  const {
    title = "Confirm",
    confirmText = "OK",
    cancelText = "Cancel",
  } = options;

  return new Promise((resolve) => {
    const prevActive = document.activeElement;
    const titleId = `modal-title-${Date.now()}`;
    const descId = `modal-desc-${Date.now()}`;

    const $overlay = quickEl("div", {
      class: "custom-modal-overlay",
      "data-testid": "confirm-modal",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": titleId,
      "aria-describedby": descId,
    });
    const $modal = quickEl("div", { class: "custom-modal" });
    const $header = quickEl("div", { class: "custom-modal-header" }, [
      quickEl("h4", { id: titleId }, [String(title)]),
    ]);
    const $body = quickEl("div", { class: "custom-modal-body" }, [
      quickEl("p", { id: descId }, [String(message)]),
    ]);
    const $footer = quickEl("div", { class: "custom-modal-footer" });
    const $cancel = quickEl(
      "button",
      { class: "btn btn-default", "data-testid": "confirm-cancel-btn" },
      [String(cancelText)]
    );
    const $ok = quickEl(
      "button",
      { class: "btn btn-danger", "data-testid": "confirm-ok-btn" },
      [String(confirmText)]
    );
    $footer.append($cancel, $ok);

    $modal.append($header, $body, $footer);
    $overlay.append($modal);

    const focusableSelector =
      'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function trapFocus(e) {
      if (e.key === "Tab") {
        const focusable = Array.from(
          $overlay[0].querySelectorAll(focusableSelector)
        );
        if (focusable.length === 0) {
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      } else if (e.key === "Escape") {
        cleanup();
        resolve(false);
      }
    }

    function cleanup() {
      $(document).off("keydown", trapFocus);
      $overlay.remove();
      if (prevActive && typeof prevActive.focus === "function") {
        prevActive.focus();
      }
    }

    $overlay.on("click", (e) => {
      if (e.target === $overlay[0]) {
        cleanup();
        resolve(false);
      }
    });

    $ok.on("click", () => {
      cleanup();
      resolve(true);
    });

    $cancel.on("click", () => {
      cleanup();
      resolve(false);
    });

    $(document).on("keydown", trapFocus);

    $("body").append($overlay);
    setTimeout(() => {
      const first = $overlay[0].querySelector(focusableSelector);
      if (first) {
        first.focus();
      }
    }, 0);
  });
}

/**
 * Show a prompt modal (replacement for window.prompt)
 * @param {string} message - The message to display
 * @param {string} defaultValue - Default input value
 * @param {Object} options - Optional configuration
 * @param {string} options.title - Modal title (default: "Input Required")
 * @param {string} options.placeholder - Input placeholder
 * @returns {Promise<string|null>} - The entered value, or null if cancelled
 */
export function showPrompt(message, defaultValue = "", options = {}) {
  const { title = "Input Required", placeholder = "" } = options;

  return new Promise((resolve) => {
    const prevActive = document.activeElement;
    const titleId = `modal-title-${Date.now()}`;
    const descId = `modal-desc-${Date.now()}`;

    const $overlay = quickEl("div", {
      class: "custom-modal-overlay",
      "data-testid": "prompt-modal",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": titleId,
      "aria-describedby": descId,
    });
    const $modal = quickEl("div", { class: "custom-modal" });
    const $header = quickEl("div", { class: "custom-modal-header" }, [
      quickEl("h4", { id: titleId }, [String(title)]),
    ]);
    const $body = quickEl("div", { class: "custom-modal-body" }, [
      quickEl("p", { id: descId }, [String(message)]),
    ]);
    const $input = quickEl("input", {
      type: "text",
      class: "form-control",
      "data-testid": "prompt-input",
      value: String(defaultValue),
      placeholder: String(placeholder),
    });
    $body.append($input);
    const $footer = quickEl("div", { class: "custom-modal-footer" });
    const $cancel = quickEl(
      "button",
      { class: "btn btn-default", "data-testid": "prompt-cancel-btn" },
      ["Cancel"]
    );
    const $ok = quickEl(
      "button",
      { class: "btn btn-primary", "data-testid": "prompt-ok-btn" },
      ["OK"]
    );
    $footer.append($cancel, $ok);

    $modal.append($header, $body, $footer);
    $overlay.append($modal);

    const focusableSelector =
      'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function trapFocus(e) {
      if (e.key === "Tab") {
        const focusable = Array.from(
          $overlay[0].querySelectorAll(focusableSelector)
        );
        if (focusable.length === 0) {
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      } else if (e.key === "Escape") {
        cleanup();
        resolve(null);
      }
    }

    function cleanup() {
      $(document).off("keydown", trapFocus);
      $overlay.remove();
      if (prevActive && typeof prevActive.focus === "function") {
        prevActive.focus();
      }
    }

    $overlay.on("click", (e) => {
      if (e.target === $overlay[0]) {
        cleanup();
        resolve(null);
      }
    });

    $ok.on("click", () => {
      const value = $input.val().trim();
      cleanup();
      resolve(value || null);
    });

    $cancel.on("click", () => {
      cleanup();
      resolve(null);
    });

    $input.on("keydown", (e) => {
      if (e.key === "Enter") {
        const value = $input.val().trim();
        cleanup();
        resolve(value || null);
      }
    });

    $(document).on("keydown", trapFocus);

    $("body").append($overlay);
    setTimeout(() => {
      $input.focus();
      $input.select();
    }, 0);
  });
}

/**
 * Escape HTML to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} - Escaped string
 */
export function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
