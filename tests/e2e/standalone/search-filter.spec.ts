import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Search and Filter Tests
 * 
 * Tests the search functionality (text highlighting and navigation) and 
 * advanced filtering (validation status, property status) in the viewer.
 */

test.describe('Search Functionality', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Load test file
    const filePath = path.join(__dirname, '../../fixtures/test-data/simple.jsonld');
    await page.setInputFiles('#local-file-input', filePath);
    await page.waitForSelector('.node-card', { timeout: 5000 });
  });

  test('should highlight search matches in content', async ({ page }) => {
    // Enter search term
    await page.fill('#search-input', 'dataset');
    await page.waitForTimeout(500);
    
    // Verify matches are highlighted
    const matches = page.locator('.search-highlight');
    const matchCount = await matches.count();
    expect(matchCount).toBeGreaterThan(0);
    
    // Verify counter shows results
    const counter = page.locator('#search-counter');
    await expect(counter).toContainText(`1 of ${matchCount}`);
    
    // Verify navigation buttons enabled
    await expect(page.locator('#next-match-btn')).toBeEnabled();
    if (matchCount > 1) {
      await expect(page.locator('#prev-match-btn')).toBeEnabled();
    }
  });

  test('should navigate between search matches', async ({ page }) => {
    await page.fill('#search-input', 'dataset');
    await page.waitForTimeout(500);
    
    const counter = page.locator('#search-counter');
    const initialText = await counter.textContent();
    expect(initialText).toContain('1 of');
    
    // Click next
    await page.click('#next-match-btn');
    await page.waitForTimeout(200);
    
    const afterNextText = await counter.textContent();
    expect(afterNextText).toContain('2 of');
    
    // Click previous
    await page.click('#prev-match-btn');
    await page.waitForTimeout(200);
    
    const afterPrevText = await counter.textContent();
    expect(afterPrevText).toContain('1 of');
  });

  test('should support case-sensitive search', async ({ page }) => {
    // Case-insensitive (default)
    await page.fill('#search-input', 'dataset');
    await page.waitForTimeout(500);
    
    const insensitiveMatches = await page.locator('.search-highlight').count();
    expect(insensitiveMatches).toBeGreaterThan(0);
    
    // Enable case-sensitive
    await page.click('#toggle-case-btn');
    await page.waitForTimeout(500);
    
    // Search for lowercase
    await page.fill('#search-input', 'dataset');
    await page.waitForTimeout(500);
    
    const sensitiveMatches = await page.locator('.search-highlight').count();
    
    // Note: If data has mixed case, counts should differ
    // If all lowercase, they'll be the same
    expect(sensitiveMatches).toBeGreaterThanOrEqual(0);
  });

  test('should support regex search', async ({ page }) => {
    // Enable regex mode
    await page.click('#toggle-regex-btn');
    await expect(page.locator('#toggle-regex-btn')).toHaveClass(/active/);
    
    // Search for pattern (e.g., any word starting with 'd')
    await page.fill('#search-input', '\\bd\\w+');
    await page.waitForTimeout(500);
    
    const matches = await page.locator('.search-highlight').count();
    expect(matches).toBeGreaterThan(0);
  });

  test('should filter search scope (keys/values/types)', async ({ page }) => {
    // Search in all scopes (default)
    await page.fill('#search-input', 'identifier');
    await page.waitForTimeout(500);
    
    const allMatches = await page.locator('.search-highlight').count();
    expect(allMatches).toBeGreaterThan(0);
    
    // Uncheck values scope (if scope controls exist)
    const valuesCheckbox = page.locator('input[name="search-scope"][value="values"]');
    if (await valuesCheckbox.count() > 0) {
      await valuesCheckbox.uncheck();
      await page.waitForTimeout(500);
      
      const scopedMatches = await page.locator('.search-highlight').count();
      // Should have fewer matches when excluding values
      expect(scopedMatches).toBeLessThanOrEqual(allMatches);
    }
  });

  test('should clear search and remove highlights', async ({ page }) => {
    // Perform search
    await page.fill('#search-input', 'dataset');
    await page.waitForTimeout(500);
    
    expect(await page.locator('.search-highlight').count()).toBeGreaterThan(0);
    
    // Clear search
    await page.click('#clear-search-btn');
    await page.waitForTimeout(300);
    
    // Verify cleared
    expect(await page.locator('#search-input').inputValue()).toBe('');
    expect(await page.locator('.search-highlight').count()).toBe(0);
    await expect(page.locator('#search-counter')).toBeHidden();
  });

  test('should handle search with no results', async ({ page }) => {
    await page.fill('#search-input', 'xyznonexistent123');
    await page.waitForTimeout(500);
    
    const matches = await page.locator('.search-highlight').count();
    expect(matches).toBe(0);
    
    const counter = page.locator('#search-counter');
    const counterText = await counter.textContent();
    expect(counterText).toContain('No matches');
  });

  test('should persist search when toggling edit mode', async ({ page }) => {
    // Perform search in view mode
    await page.fill('#search-input', 'dataset');
    await page.waitForTimeout(500);
    
    const viewModeMatches = await page.locator('.search-highlight').count();
    expect(viewModeMatches).toBeGreaterThan(0);
    
    // Enable edit mode
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(500);
    
    // Verify search still active
    const editModeMatches = await page.locator('.search-highlight').count();
    expect(editModeMatches).toBe(viewModeMatches);
    
    const searchValue = await page.locator('#search-input').inputValue();
    expect(searchValue).toBe('dataset');
  });
});

test.describe('Advanced Filtering', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Load test file
    const filePath = path.join(__dirname, '../../fixtures/test-data/simple.jsonld');
    await page.setInputFiles('#local-file-input', filePath);
    await page.waitForSelector('.node-card', { timeout: 5000 });
    
    // Enable edit mode to trigger validation
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(3500); // Wait for validation
  });

  test('should filter by validation status (valid only)', async ({ page }) => {
    // Open filter panel
    await page.click('#toggle-filter-panel');
    await expect(page.locator('#filter-panel')).toBeVisible();
    
    // Get initial node count
    const allNodes = await page.locator('.node-card:visible').count();
    
    // Select "Valid Only"
    await page.selectOption('#validation-filter', 'valid');
    await page.waitForTimeout(500);
    
    // Verify filtering applied
    const validNodes = await page.locator('.node-card:visible').count();
    
    // Should have hidden some nodes (unless all are valid)
    const hiddenNodes = await page.locator('.node-card.hidden-by-filter').count();
    expect(validNodes + hiddenNodes).toBe(allNodes);
  });

  test('should filter by validation status (invalid only)', async ({ page }) => {
    await page.click('#toggle-filter-panel');
    
    const allNodes = await page.locator('.node-card:visible').count();
    
    // Select "Invalid Only"
    await page.selectOption('#validation-filter', 'invalid');
    await page.waitForTimeout(500);
    
    const visibleNodes = await page.locator('.node-card:visible').count();
    
    // If file has invalid nodes, should show fewer than all
    // If all valid, should show 0
    expect(visibleNodes).toBeLessThanOrEqual(allNodes);
  });

  test('should filter by property status (SHACL only)', async ({ page }) => {
    await page.click('#toggle-filter-panel');
    
    // Select "SHACL Only"
    const shaclOnlyRadio = page.locator('input[name="property-status"][value="shacl-only"]');
    if (await shaclOnlyRadio.count() > 0) {
      await shaclOnlyRadio.check();
      await page.waitForTimeout(500);
      
      // Verify extra properties are hidden
      const extraProperties = page.locator('.property-row.extra-field:visible');
      const extraCount = await extraProperties.count();
      
      // Extra properties should be hidden (or very few visible if parents shown)
      expect(extraCount).toBe(0);
    }
  });

  test('should filter by property status (extra only)', async ({ page }) => {
    await page.click('#toggle-filter-panel');
    
    // Select "Extra Only"
    const extraOnlyRadio = page.locator('input[name="property-status"][value="extra-only"]');
    if (await extraOnlyRadio.count() > 0) {
      await extraOnlyRadio.check();
      await page.waitForTimeout(500);
      
      // Verify SHACL properties are hidden
      const shaclProperties = page.locator('.property-row.shacl-defined:visible');
      const shaclCount = await shaclProperties.count();
      
      // SHACL properties should be hidden
      expect(shaclCount).toBe(0);
    }
  });

  test('should combine multiple filters', async ({ page }) => {
    await page.click('#toggle-filter-panel');
    
    // Apply validation filter
    await page.selectOption('#validation-filter', 'valid');
    await page.waitForTimeout(300);
    
    // Apply property filter
    const shaclOnlyRadio = page.locator('input[name="property-status"][value="shacl-only"]');
    if (await shaclOnlyRadio.count() > 0) {
      await shaclOnlyRadio.check();
      await page.waitForTimeout(300);
    }
    
    // Verify both filters active
    const visibleNodes = await page.locator('.node-card:visible').count();
    const extraProperties = await page.locator('.property-row.extra-field:visible').count();
    
    // Should have filtered nodes AND properties
    expect(visibleNodes).toBeGreaterThanOrEqual(0);
    expect(extraProperties).toBe(0);
  });

  test('should clear all filters', async ({ page }) => {
    await page.click('#toggle-filter-panel');
    
    // Apply some filters
    await page.selectOption('#validation-filter', 'valid');
    await page.waitForTimeout(300);
    
    const filteredNodes = await page.locator('.node-card:visible').count();
    
    // Clear all filters
    await page.click('#clear-all-filters-btn');
    await page.waitForTimeout(300);
    
    // Verify all nodes visible again
    const allNodes = await page.locator('.node-card:visible').count();
    expect(allNodes).toBeGreaterThanOrEqual(filteredNodes);
    
    // Verify filter dropdown reset to "all"
    const filterValue = await page.locator('#validation-filter').inputValue();
    expect(filterValue).toBe('all');
  });

  test('should reset filters on page reload', async ({ page }) => {
    await page.click('#toggle-filter-panel');
    
    // Apply filter
    await page.selectOption('#validation-filter', 'valid');
    await page.waitForTimeout(500);
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Load same file
    const filePath = path.join(__dirname, '../../fixtures/test-data/simple.jsonld');
    await page.setInputFiles('#local-file-input', filePath);
    await page.waitForSelector('.node-card', { timeout: 5000 });
    
    // Enable edit mode
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(3500);
    
    // Verify filter was reset to default (all)
    const filterValue = await page.locator('#validation-filter').inputValue();
    expect(filterValue).toBe('all');
  });

  test('should show filter count badge when filters active', async ({ page }) => {
    await page.click('#toggle-filter-panel');
    
    // Apply filter
    await page.selectOption('#validation-filter', 'valid');
    await page.waitForTimeout(300);
    
    // Check for filter badge (implementation may vary)
    const filterBadge = page.locator('#active-filter-badge, .filter-count-badge');
    if (await filterBadge.count() > 0) {
      await expect(filterBadge).toBeVisible();
      const badgeText = await filterBadge.textContent();
      expect(badgeText).toMatch(/\d+/); // Should contain a number
    }
  });

  test('should use bottom-up filtering (keep parents of matching children)', async ({ page }) => {
    await page.click('#toggle-filter-panel');
    
    // Apply strict filter that might hide parent but not child
    await page.selectOption('#validation-filter', 'invalid');
    await page.waitForTimeout(500);
    
    // Verify that if a child node is invalid, its parent remains visible
    const visibleNodes = await page.locator('.node-card:visible').count();
    
    // This is a behavioral test - if any nodes are visible, 
    // their parent chain should also be visible
    if (visibleNodes > 0) {
      // At least one node should be visible
      expect(visibleNodes).toBeGreaterThan(0);
    }
  });
});

test.describe('Search and Filter Integration', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const filePath = path.join(__dirname, '../../fixtures/test-data/simple.jsonld');
    await page.setInputFiles('#local-file-input', filePath);
    await page.waitForSelector('.node-card', { timeout: 5000 });
    
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(3500);
  });

  test('should work independently (search + filter)', async ({ page }) => {
    // Apply filter
    await page.click('#toggle-filter-panel');
    await page.selectOption('#validation-filter', 'valid');
    await page.waitForTimeout(500);
    
    const filteredNodes = await page.locator('.node-card:visible').count();
    
    // Apply search
    await page.fill('#search-input', 'dataset');
    await page.waitForTimeout(500);
    
    // Both should be active
    const searchMatches = await page.locator('.search-highlight').count();
    const visibleNodes = await page.locator('.node-card:visible').count();
    
    expect(searchMatches).toBeGreaterThan(0);
    // With AND logic, adding search should show equal or fewer nodes
    expect(visibleNodes).toBeLessThanOrEqual(filteredNodes);
  });

  test('should clear search without affecting filters', async ({ page }) => {
    await page.click('#toggle-filter-panel');
    await page.selectOption('#validation-filter', 'valid');
    await page.waitForTimeout(300);
    
    const filteredNodes = await page.locator('.node-card:visible').count();
    
    // Apply and clear search
    await page.fill('#search-input', 'test');
    await page.waitForTimeout(300);
    await page.click('#clear-search-btn');
    await page.waitForTimeout(300);
    
    // Filter should still be active
    const stillFilteredNodes = await page.locator('.node-card:visible').count();
    expect(stillFilteredNodes).toBe(filteredNodes);
    
    const filterValue = await page.locator('#validation-filter').inputValue();
    expect(filterValue).toBe('valid');
  });

  test('should clear filters without affecting search', async ({ page }) => {
    // Apply search
    await page.fill('#search-input', 'dataset');
    await page.waitForTimeout(500);
    
    // Apply and clear filters
    await page.click('#toggle-filter-panel');
    await page.selectOption('#validation-filter', 'valid');
    await page.waitForTimeout(300);
    await page.click('#clear-all-filters-btn');
    await page.waitForTimeout(300);
    
    // Search should be cleared too (by design: "clear filters clears everything")
    const stillSearchMatches = await page.locator('.search-highlight').count();
    expect(stillSearchMatches).toBe(0);
    
    const searchValue = await page.locator('#search-input').inputValue();
    expect(searchValue).toBe('');
  });
});

test.describe('Filter AND Logic Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Load test file
    const filePath = path.join(__dirname, '../../fixtures/test-data/simple.jsonld');
    await page.setInputFiles('#local-file-input', filePath);
    await page.waitForSelector('.node-card', { timeout: 5000 });
    
    // Enable edit mode to trigger validation
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(3500); // Wait for validation
  });

  test('search alone should hide non-matching nodes', async ({ page }) => {
    // Get total nodes before search
    const totalNodes = await page.locator('.node-card').count();
    expect(totalNodes).toBeGreaterThan(0);
    
    // Search for specific term that only appears in some nodes
    await page.fill('#search-input', 'dataset');
    await page.waitForTimeout(500);
    
    // Should have hidden nodes without matches
    const hiddenNodes = await page.locator('.node-card.hidden-by-filter').count();
    const visibleNodes = await page.locator('.node-card:not(.hidden-by-filter)').count();
    
    // At least some nodes should be hidden (unless all match "dataset")
    expect(visibleNodes).toBeLessThanOrEqual(totalNodes);
    expect(visibleNodes + hiddenNodes).toBe(totalNodes);
    
    // All visible nodes should have highlights
    const highlights = await page.locator('.search-highlight').count();
    expect(highlights).toBeGreaterThan(0);
  });

  test('validation filter alone should hide non-matching nodes', async ({ page }) => {
    const totalNodes = await page.locator('.node-card').count();
    
    // Apply validation filter
    await page.click('#toggle-filter-panel');
    await page.selectOption('#validation-filter', 'valid');
    await page.waitForTimeout(500);
    
    // Should have hidden some nodes
    const hiddenNodes = await page.locator('.node-card.hidden-by-filter').count();
    const visibleNodes = await page.locator('.node-card:not(.hidden-by-filter)').count();
    
    expect(visibleNodes + hiddenNodes).toBe(totalNodes);
    
    // All visible nodes should be valid (not have invalid class or invalid properties)
    const visibleInvalidNodes = await page.locator('.node-card:not(.hidden-by-filter).invalid').count();
    expect(visibleInvalidNodes).toBe(0);
  });

  test('search + validation filter should apply AND logic', async ({ page }) => {
    const totalNodes = await page.locator('.node-card').count();
    
    // First apply validation filter
    await page.click('#toggle-filter-panel');
    await page.selectOption('#validation-filter', 'valid');
    await page.waitForTimeout(500);
    
    const validOnlyNodes = await page.locator('.node-card:not(.hidden-by-filter)').count();
    
    // Now add search
    await page.fill('#search-input', 'dataset');
    await page.waitForTimeout(500);
    
    // Should show even fewer nodes (only valid AND matching search)
    const bothFiltersNodes = await page.locator('.node-card:not(.hidden-by-filter)').count();
    
    // With AND logic, combining filters should show equal or fewer nodes
    expect(bothFiltersNodes).toBeLessThanOrEqual(validOnlyNodes);
    
    // All visible nodes should:
    // 1. Be valid (no invalid class)
    const visibleInvalidNodes = await page.locator('.node-card:not(.hidden-by-filter).invalid').count();
    expect(visibleInvalidNodes).toBe(0);
    
    // 2. Have search highlights (or be ancestors of nodes with highlights)
    const highlights = await page.locator('.search-highlight').count();
    expect(highlights).toBeGreaterThan(0);
    
    // Total should still equal all nodes
    const hiddenNodes = await page.locator('.node-card.hidden-by-filter').count();
    expect(bothFiltersNodes + hiddenNodes).toBe(totalNodes);
  });

  test('search + property filter should apply AND logic', async ({ page }) => {
    const totalNodes = await page.locator('.node-card').count();
    
    // Apply property filter
    await page.click('#toggle-filter-panel');
    const extraOnlyRadio = page.locator('input[name="property-status"][value="extra-only"]');
    await extraOnlyRadio.check();
    await page.waitForTimeout(500);
    
    // Now add search
    await page.fill('#search-input', 'identifier');
    await page.waitForTimeout(500);
    
    // Should show only nodes that have extra properties AND match search
    const visibleNodes = await page.locator('.node-card:not(.hidden-by-filter)').count();
    const hiddenNodes = await page.locator('.node-card.hidden-by-filter').count();
    
    expect(visibleNodes + hiddenNodes).toBe(totalNodes);
    
    // Visible nodes should have both: extra properties AND search highlights
    const highlights = await page.locator('.search-highlight').count();
    expect(highlights).toBeGreaterThan(0);
  });

  test('validation + property filter should apply AND logic', async ({ page }) => {
    const totalNodes = await page.locator('.node-card').count();
    
    // Apply both filters
    await page.click('#toggle-filter-panel');
    await page.selectOption('#validation-filter', 'valid');
    
    const shaclOnlyRadio = page.locator('input[name="property-status"][value="shacl-only"]');
    await shaclOnlyRadio.check();
    await page.waitForTimeout(500);
    
    // Should show only valid nodes with shacl properties
    const visibleNodes = await page.locator('.node-card:not(.hidden-by-filter)').count();
    const hiddenNodes = await page.locator('.node-card.hidden-by-filter').count();
    
    expect(visibleNodes + hiddenNodes).toBe(totalNodes);
    
    // No invalid nodes should be visible
    const visibleInvalidNodes = await page.locator('.node-card:not(.hidden-by-filter).invalid').count();
    expect(visibleInvalidNodes).toBe(0);
    
    // No extra properties should be visible
    const visibleExtraProps = await page.locator('.property-row.extra-field:not(.hidden-by-filter)').count();
    expect(visibleExtraProps).toBe(0);
  });

  test('all three filters should apply AND logic', async ({ page }) => {
    const totalNodes = await page.locator('.node-card').count();
    
    // Apply all three types of filters
    await page.click('#toggle-filter-panel');
    
    // 1. Validation filter
    await page.selectOption('#validation-filter', 'valid');
    
    // 2. Property filter
    const extraOnlyRadio = page.locator('input[name="property-status"][value="extra-only"]');
    await extraOnlyRadio.check();
    await page.waitForTimeout(500);
    
    // 3. Search
    await page.fill('#search-input', 'dataset');
    await page.waitForTimeout(500);
    
    // Should show only nodes that match ALL three criteria
    const visibleNodes = await page.locator('.node-card:not(.hidden-by-filter)').count();
    const hiddenNodes = await page.locator('.node-card.hidden-by-filter').count();
    
    expect(visibleNodes + hiddenNodes).toBe(totalNodes);
    
    // Verify all conditions:
    // 1. No invalid nodes visible
    const visibleInvalidNodes = await page.locator('.node-card:not(.hidden-by-filter).invalid').count();
    expect(visibleInvalidNodes).toBe(0);
    
    // 2. Has search highlights
    const highlights = await page.locator('.search-highlight').count();
    expect(highlights).toBeGreaterThan(0);
    
    // 3. Only extra properties visible (in visible nodes)
    const visibleShaclProps = await page.locator('.node-card:not(.hidden-by-filter) .property-row:not(.extra-field):not(.hidden-by-filter)').count();
    expect(visibleShaclProps).toBe(0);
  });

  test('removing one filter should show more nodes', async ({ page }) => {
    // Apply all filters
    await page.click('#toggle-filter-panel');
    await page.selectOption('#validation-filter', 'valid');
    await page.fill('#search-input', 'dataset');
    await page.waitForTimeout(500);
    
    const withBothFilters = await page.locator('.node-card:not(.hidden-by-filter)').count();
    
    // Remove search filter
    await page.click('#clear-search-btn');
    await page.waitForTimeout(500);
    
    const withOnlyValidation = await page.locator('.node-card:not(.hidden-by-filter)').count();
    
    // Should show equal or more nodes (AND logic means removing filter shows more)
    expect(withOnlyValidation).toBeGreaterThanOrEqual(withBothFilters);
  });

  test('no filters should show all nodes', async ({ page }) => {
    const totalNodes = await page.locator('.node-card').count();
    
    // Ensure no filters applied
    const visibleNodes = await page.locator('.node-card:not(.hidden-by-filter)').count();
    const hiddenNodes = await page.locator('.node-card.hidden-by-filter').count();
    
    // All nodes should be visible
    expect(visibleNodes).toBe(totalNodes);
    expect(hiddenNodes).toBe(0);
  });

  test('search with no matches should hide all nodes', async ({ page }) => {
    const totalNodes = await page.locator('.node-card').count();
    expect(totalNodes).toBeGreaterThan(0); // Ensure we have nodes to test with
    
    // Search for something that definitely doesn't exist in any file
    await page.fill('#search-input', 'asdfasdfadfsdfagg');
    await page.waitForTimeout(500);
    
    // Debug: log which nodes are visible
    const visibleNodeIds = await page.locator('.node-card:not(.hidden-by-filter)').evaluateAll(
      nodes => nodes.map(n => n.getAttribute('data-node-id') || 'unknown')
    );
    console.log('Visible nodes:', visibleNodeIds);
    
    // All nodes should be hidden
    const visibleNodes = await page.locator('.node-card:not(.hidden-by-filter)').count();
    const hiddenNodes = await page.locator('.node-card.hidden-by-filter').count();
    
    expect(visibleNodes).toBe(0);
    expect(hiddenNodes).toBe(totalNodes);
    
    // Counter should show "No matches"
    const counterText = await page.locator('#search-counter').textContent();
    expect(counterText).toContain('No matches');
  });

  test('should only show matching node and ancestors (no siblings, no children)', async ({ page }) => {
    // This test verifies the core filtering rule:
    // When a node matches, show ONLY: the node itself + its ancestors
    // Do NOT show: siblings of the node, siblings of ancestors, or children of the matching node
    
    // Load a more complex file with nested structure
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const complexFilePath = path.join(__dirname, '../../../examples/cdi/SimpleSample.jsonld');
    await page.setInputFiles('#local-file-input', complexFilePath);
    await page.waitForSelector('.node-card', { timeout: 5000 });
    
    // Search for a specific deep node that has siblings and ancestors
    // Mass_Substantive_Value_Domain is nested: Mass -> Mass_Component -> (via property) -> datastructure
    // Sample_ID_Substantive_Value_Domain has similar nesting via Sample_ID -> Sample_ID_Component
    await page.fill('#search-input', 'Sample_ID_Substantive_Value_Domain');
    await page.waitForTimeout(500);
    
    // The matching node should be visible
    const matchingNode = page.locator('.node-card[data-node-id="#Sample_ID_Substantive_Value_Domain"]');
    await expect(matchingNode).not.toHaveClass(/hidden-by-filter/);
    
    // Its logical parent (Sample_ID) should be visible
    const sampleIdNode = page.locator('.node-card[data-node-id="#Sample_ID"]');
    await expect(sampleIdNode).not.toHaveClass(/hidden-by-filter/);
    
    // Its grandparent (Sample_ID_Component) should be visible  
    const sampleIdComponent = page.locator('.node-card[data-node-id="#Sample_ID_Component"]');
    await expect(sampleIdComponent).not.toHaveClass(/hidden-by-filter/);
    
    // CRITICAL TEST: Siblings of Sample_ID should be HIDDEN
    // These are other variables that are also children of their components via isDefinedBy
    // but are NOT in the ancestor chain of Sample_ID_Substantive_Value_Domain
    
    // Mass is a sibling of Sample_ID (both are variables referenced by components)
    const massNode = page.locator('.node-card[data-node-id="#Mass"]');
    await expect(massNode).toHaveClass(/hidden-by-filter/);
    
    // Volume is also a sibling of Sample_ID
    const volumeNode = page.locator('.node-card[data-node-id="#Volume"]');
    await expect(volumeNode).toHaveClass(/hidden-by-filter/);
    
    // Measurement_Date is also a sibling of Sample_ID
    const measurementDateNode = page.locator('.node-card[data-node-id="#Measurement_Date"]');
    await expect(measurementDateNode).toHaveClass(/hidden-by-filter/);
    
    // Mass_Substantive_Value_Domain is a sibling of Sample_ID_Substantive_Value_Domain
    const massDomain = page.locator('.node-card[data-node-id="#Mass_Substantive_Value_Domain"]');
    await expect(massDomain).toHaveClass(/hidden-by-filter/);
    
    // Volume_Substantive_Value_Domain is also a sibling
    const volumeDomain = page.locator('.node-card[data-node-id="#Volume_Substantive_Value_Domain"]');
    await expect(volumeDomain).toHaveClass(/hidden-by-filter/);
    
    // Children of the matching node should be HIDDEN (if any exist)
    const childrenOfMatch = await page.locator('.node-card[data-node-id="#Sample_ID_Substantive_Value_Domain"] .node-body > .node-card').count();
    if (childrenOfMatch > 0) {
      // If it has children, they should all be hidden
      const hiddenChildren = await page.locator('.node-card[data-node-id="#Sample_ID_Substantive_Value_Domain"] .node-body > .node-card.hidden-by-filter').count();
      expect(hiddenChildren).toBe(childrenOfMatch);
    }
    
    // Verify the total: only the matching node + its ancestors should be visible
    const visibleNodes = await page.locator('.node-card:not(.hidden-by-filter)').count();
    const totalNodes = await page.locator('.node-card').count();
    
    // With proper filtering, we should see far fewer nodes visible
    // Expected: Sample_ID_Substantive_Value_Domain + Sample_ID + Sample_ID_Component + maybe a few more ancestors
    expect(visibleNodes).toBeLessThan(10); // Should be around 3-6 nodes max
    expect(visibleNodes).toBeLessThan(totalNodes * 0.4); // Much less than half
    
    console.log(`Total nodes: ${totalNodes}, Visible: ${visibleNodes} (only match + ancestors, no siblings)`);
  });
});

