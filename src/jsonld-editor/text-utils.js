// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

// === Text Utilities ===
//
// Common text manipulation functions used across the application.
// Extracted to break circular dependencies.

/**
 * Convert camelCase or snake_case to human readable format
 * @param {string} key - The key to humanize
 * @returns {string} Humanized version of the key
 */
export function humanizeKey(key) {
  // Convert camelCase or snake_case to human readable
  return key
    .replace(/([A-Z])/g, " $1") // Add space before capital letters
    .replace(/_/g, " ") // Replace underscores with spaces
    .trim() // Remove leading/trailing spaces
    .split(" ") // Split into words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
    .join(" "); // Join back together
}
