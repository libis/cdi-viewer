// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

/**
 * Advanced Filter Module
 *
 * Provides filtering capabilities:
 * - Filter by node type
 * - Filter by validation status
 * - Filter by property status (SHACL/extra)
 * - Hide empty properties
 * - Search scope selection
 */


// Filter state
const filterState = {
  searchScope: ["names", "values", "ids", "types"], // What to search in
};

/**
 * Get current filter state
 */
export function getFilterState() {
  return { ...filterState };
}
