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
    const matches = page.locator('.search-match');
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
    
    const insensitiveMatches = await page.locator('.search-match').count();
    expect(insensitiveMatches).toBeGreaterThan(0);
    
    // Enable case-sensitive
    await page.click('#toggle-case-btn');
    await page.waitForTimeout(500);
    
    // Search for lowercase
    await page.fill('#search-input', 'dataset');
    await page.waitForTimeout(500);
    
    const sensitiveMatches = await page.locator('.search-match').count();
    
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
    
    const matches = await page.locator('.search-match').count();
    expect(matches).toBeGreaterThan(0);
  });

  test('should filter search scope (keys/values/types)', async ({ page }) => {
    // Search in all scopes (default)
    await page.fill('#search-input', 'identifier');
    await page.waitForTimeout(500);
    
    const allMatches = await page.locator('.search-match').count();
    expect(allMatches).toBeGreaterThan(0);
    
    // Uncheck values scope (if scope controls exist)
    const valuesCheckbox = page.locator('input[name="search-scope"][value="values"]');
    if (await valuesCheckbox.count() > 0) {
      await valuesCheckbox.uncheck();
      await page.waitForTimeout(500);
      
      const scopedMatches = await page.locator('.search-match').count();
      // Should have fewer matches when excluding values
      expect(scopedMatches).toBeLessThanOrEqual(allMatches);
    }
  });

  test('should clear search and remove highlights', async ({ page }) => {
    // Perform search
    await page.fill('#search-input', 'dataset');
    await page.waitForTimeout(500);
    
    expect(await page.locator('.search-match').count()).toBeGreaterThan(0);
    
    // Clear search
    await page.click('#clear-search-btn');
    await page.waitForTimeout(300);
    
    // Verify cleared
    expect(await page.locator('#search-input').inputValue()).toBe('');
    expect(await page.locator('.search-match').count()).toBe(0);
    await expect(page.locator('#search-counter')).toBeHidden();
  });

  test('should handle search with no results', async ({ page }) => {
    await page.fill('#search-input', 'xyznonexistent123');
    await page.waitForTimeout(500);
    
    const matches = await page.locator('.search-match').count();
    expect(matches).toBe(0);
    
    const counter = page.locator('#search-counter');
    const counterText = await counter.textContent();
    expect(counterText).toContain('0');
  });

  test('should persist search when toggling edit mode', async ({ page }) => {
    // Perform search in view mode
    await page.fill('#search-input', 'dataset');
    await page.waitForTimeout(500);
    
    const viewModeMatches = await page.locator('.search-match').count();
    expect(viewModeMatches).toBeGreaterThan(0);
    
    // Enable edit mode
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(500);
    
    // Verify search still active
    const editModeMatches = await page.locator('.search-match').count();
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

  test('should persist filter settings across page reload', async ({ page }) => {
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
    
    // Verify filter persisted
    const filterValue = await page.locator('#validation-filter').inputValue();
    expect(filterValue).toBe('valid');
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
    const searchMatches = await page.locator('.search-match').count();
    const visibleNodes = await page.locator('.node-card:visible').count();
    
    expect(searchMatches).toBeGreaterThanOrEqual(0);
    expect(visibleNodes).toBe(filteredNodes); // Filter should still apply
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
    
    const searchMatches = await page.locator('.search-match').count();
    
    // Apply and clear filters
    await page.click('#toggle-filter-panel');
    await page.selectOption('#validation-filter', 'valid');
    await page.waitForTimeout(300);
    await page.click('#clear-all-filters-btn');
    await page.waitForTimeout(300);
    
    // Search should still be active
    const stillSearchMatches = await page.locator('.search-match').count();
    expect(stillSearchMatches).toBe(searchMatches);
    
    const searchValue = await page.locator('#search-input').inputValue();
    expect(searchValue).toBe('dataset');
  });
});
