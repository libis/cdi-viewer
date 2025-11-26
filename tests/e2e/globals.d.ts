/*
 * Global Type Declarations used by Playwright tests
 *
 * The application exposes some test-only helpers on `window` (for example
 * `window.state` and window helpers like `renderData` / `initApp`) that the
 * test-suite uses to deterministically configure and exercise the UI.
 *
 * This file augments the global Window interface so TypeScript/VS Code stops
 * reporting errors when tests access these properties.
 */

declare global {
  interface Window {
    // JSON-LD application state (used by tests to seed the app)
    state?: any;

    // Optional helpers exposed by some builds to re-render the app or bootstrap
    renderData?: (() => void) | undefined;
    initApp?: (() => void) | undefined;

    // Any other test-only globals can be added here
  }
}

export {};
