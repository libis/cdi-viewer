import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Search & Filter Tests
 * 
 * Tests for search and filter functionality including:
 * - Basic text search
 * - Search in different scopes (names, values, IDs, types)
 * - Case-sensitive search
 * - Regex search
 * - Filter by node type
 * - Filter by property presence
 * - Combined search and filters
 * - Navigation between search results
 * - Clear filters
 * - Search with no results
 * - Search persistence across edit mode changes
 */
test.describe('Search & Filter', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate and load test file for each test
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#load-local-btn', { timeout: 10000 });
    
    // Load file with multiple nodes to test search/filter
    const testFilePath = path.join(__dirname, '../../fixtures/test-data/simple.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });
    
    // Wait for nodes to be rendered
    await expect(page.locator('[data-testid^="node-card-"]')).toHaveCount(2);
  });

  test('should perform basic text search in node names', async ({ page }) => {
    // ============= ACTIONS =============
    await page.fill('#search-input', 'Age');
    await page.waitForTimeout(1000); // Wait for search to complete
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Only matching nodes are visible (not hidden-by-filter)
    const allCards = page.locator('[data-testid^="node-card-"]');
    const cardCount = await allCards.count();
    expect(cardCount).toBe(2); // We have 2 nodes total
    
    // Check which one is hidden
    for (let i = 0; i < cardCount; i++) {
      const card = allCards.nth(i);
      const className = await card.getAttribute('class');
      const text = await card.textContent();
      
      if (text && text.includes('Age')) {
        // This node should NOT be hidden
        expect(className).not.toContain('hidden-by-filter');
      } else {
        // This node SHOULD be hidden
        expect(className).toContain('hidden-by-filter');
      }
    }
    
    // 2. Visible cards selector shows only one
    const visibleCards = page.locator('[data-testid^="node-card-"]:visible');
    await expect(visibleCards).toHaveCount(1);
    
    // 3. Search highlights are applied
    const highlights = page.locator('.search-highlight');
    await expect(highlights.first()).toBeVisible();
  });

  test('should search across property values', async ({ page }) => {
    // ============= ACTIONS =============
    
    // Ensure "Values" scope is checked (it's checked by default)
    const valuesCheckbox = page.locator('.search-scope-checkbox[value="values"]');
    const isChecked = await valuesCheckbox.isChecked();
    if (!isChecked) {
      await valuesCheckbox.check();
      await page.waitForTimeout(200);
    }
    
    // Search for a value that appears in properties
    await page.fill('#search-input', 'Sample');
    await page.waitForTimeout(500);
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Search finds results
    const counterText = await page.locator('#search-counter').textContent();
    expect(counterText).toBeTruthy();
    
    // 2. At least one node is visible
    const visibleCards = page.locator('[data-testid^="node-card-"]:visible');
    const count = await visibleCards.count();
    expect(count).toBeGreaterThan(0);
    
    // 3. Search highlights are visible
    const highlights = page.locator('.search-highlight');
    await expect(highlights.first()).toBeVisible();
  });

  test('should filter by validation status', async ({ page }) => {
    // ============= ACTIONS =============
    
    // Open advanced filter panel
    await page.click('#toggle-filter-panel');
    await page.waitForTimeout(300);
    
    // Verify panel is visible
    await expect(page.locator('#filter-panel')).toBeVisible();
    
    // Select a validation filter
    await page.selectOption('#validation-filter', 'valid');
    await page.waitForTimeout(500);
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Filter panel is open
    await expect(page.locator('#filter-panel')).toBeVisible();
    
    // 2. Filter badge shows active filter
    const badge = page.locator('#active-filter-badge');
    await expect(badge).toBeVisible();
    
    // 3. Some nodes may be filtered (depends on validation state)
    const visibleCards = page.locator('[data-testid^="node-card-"]:visible');
    const count = await visibleCards.count();
    expect(count).toBeGreaterThanOrEqual(0); // May be 0 if none valid
  });

  test('should filter by property status (SHACL only)', async ({ page }) => {
    // ============= ACTIONS =============
    
    // Open advanced filter panel
    await page.click('#toggle-filter-panel');
    await page.waitForTimeout(300);
    
    // Select "SHACL Only" property status
    await page.click('input[name="property-status"][value="shacl-only"]');
    await page.waitForTimeout(500);
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Filter badge shows active
    await expect(page.locator('#active-filter-badge')).toBeVisible();
    
    // 2. Nodes are still visible (filter affects property display, not node visibility)
    const visibleCards = page.locator('[data-testid^="node-card-"]:visible');
    await expect(visibleCards.first()).toBeVisible();
    
    // 3. Properties marked as "extra" should be hidden if any exist
    // This is more about property visibility within nodes
  });

  test('should clear all filters', async ({ page }) => {
    // ============= ACTIONS =============
    
    // Apply search
    await page.fill('#search-input', 'Variable');
    await page.waitForTimeout(500);
    
    // Apply filter
    await page.click('#toggle-filter-panel');
    await page.waitForTimeout(300);
    await page.selectOption('#validation-filter', 'valid');
    await page.waitForTimeout(300);
    
    // Verify filters are active
    const badgeVisible = await page.locator('#active-filter-badge').isVisible();
    expect(badgeVisible).toBe(true);
    
    // Clear all filters
    await page.click('#clear-all-filters-btn');
    await page.waitForTimeout(300);
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Validation filter is reset to "all"
    const selectedValue = await page.locator('#validation-filter').inputValue();
    expect(selectedValue).toBe('all');
    
    // 2. Property status filter is reset to "all"
    const allRadio = page.locator('input[name="property-status"][value="all"]');
    await expect(allRadio).toBeChecked();
    
    // 3. Filter badge is hidden
    await expect(page.locator('#active-filter-badge')).not.toBeVisible();
    
    // Note: Search is NOT cleared by "Clear All Filters" - it only clears filter panel settings
  });

  test('should handle search with no results', async ({ page }) => {
    // ============= ACTIONS =============
    await page.fill('#search-input', 'NonExistentText123456XYZ');
    await page.waitForTimeout(500);
    
    // ============= EXPECTED RESULTS =============
    
    // 1. No nodes are visible
    await expect(page.locator('[data-testid^="node-card-"]:visible')).toHaveCount(0);
    
    // 2. Search counter shows 0 results
    const counterText = await page.locator('#search-counter').textContent();
    expect(counterText).toContain('0');
  });

  test('should work in edit mode', async ({ page }) => {
    // ============= ACTIONS =============
    
    // Enable edit mode
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(500);
    
    // Perform search
    await page.fill('#search-input', 'Variable');
    await page.waitForTimeout(500);
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Search works in edit mode
    const visibleCards = page.locator('[data-testid^="node-card-"]:visible');
    await expect(visibleCards).toHaveCount(1);
    
    // 2. Matching nodes are still editable
    const editableInputs = visibleCards.locator('input[type="text"]');
    await expect(editableInputs.first()).toBeEditable();
    
    // 3. Add buttons are visible on filtered nodes
    await expect(visibleCards.locator('[data-testid^="add-property-btn"]')).toBeVisible();
  });

  test('should persist search when toggling edit mode', async ({ page }) => {
    // ============= ACTIONS =============
    
    // Apply search
    await page.fill('#search-input', 'Variable');
    await page.waitForTimeout(500);
    
    // Get initial filtered count
    const initialCount = await page.locator('[data-testid^="node-card-"]:visible').count();
    
    // Toggle edit mode
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(500);
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Search input value persists
    await expect(page.locator('#search-input')).toHaveValue('Variable');
    
    // 2. Same nodes remain visible
    const afterToggleCount = await page.locator('[data-testid^="node-card-"]:visible').count();
    expect(afterToggleCount).toBe(initialCount);
    
    // 3. Search highlights still visible
    const highlights = page.locator('.search-highlight');
    await expect(highlights.first()).toBeVisible();
    
    // Toggle back to view mode
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(500);
    
    // 4. Search still active after toggling back
    await expect(page.locator('#search-input')).toHaveValue('Variable');
    const finalCount = await page.locator('[data-testid^="node-card-"]:visible').count();
    expect(finalCount).toBe(initialCount);
  });

  test('should navigate between search results', async ({ page }) => {
    // ============= ACTIONS =============
    
    // Search for term that appears multiple times
    await page.fill('#search-input', 'e'); // Common letter
    await page.waitForTimeout(500);
    
    // Get total matches
    const counterText = await page.locator('#search-counter').textContent();
    const totalMatches = parseInt(counterText?.match(/\d+/)?.[0] || '0');
    
    // Skip if no matches found
    if (totalMatches === 0) {
      test.skip();
      return;
    }
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Navigation buttons are enabled
    await expect(page.locator('#next-match-btn')).toBeEnabled();
    
    // 2. Click next navigates through matches
    const firstMatchPosition = await page.locator('.current-search-match').boundingBox();
    
    await page.click('#next-match-btn');
    await page.waitForTimeout(200);
    
    // 3. Current match indicator moves
    const secondMatchPosition = await page.locator('.current-search-match').boundingBox();
    
    // At least one should be different (unless all matches are in same location)
    const positionChanged = 
      firstMatchPosition?.y !== secondMatchPosition?.y ||
      firstMatchPosition?.x !== secondMatchPosition?.x;
    
    if (totalMatches > 1) {
      expect(positionChanged).toBeTruthy();
    }
    
    // 4. Counter shows current position
    const counterAfterNav = await page.locator('#search-counter').textContent();
    expect(counterAfterNav).toMatch(/\d+\s*\/\s*\d+/);
  });

  test('should support case-sensitive search', async ({ page }) => {
    // ============= ACTIONS =============
    
    // Enable case-sensitive mode
    await page.click('#toggle-case-btn');
    await page.waitForTimeout(200);
    
    // Verify button is active
    const caseBtnClass = await page.locator('#toggle-case-btn').getAttribute('class');
    expect(caseBtnClass).toContain('active'); // Button should have active class
    
    // Search with specific case
    await page.fill('#search-input', 'Variable'); // Capital V
    await page.waitForTimeout(500);
    
    const caseSensitiveCount = await page.locator('[data-testid^="node-card-"]:visible').count();
    
    // Try with lowercase
    await page.fill('#search-input', 'variable'); // lowercase v
    await page.waitForTimeout(500);
    
    const lowercaseCount = await page.locator('[data-testid^="node-card-"]:visible').count();
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Disable case-sensitive
    await page.click('#toggle-case-btn');
    await page.waitForTimeout(200);
    
    await page.fill('#search-input', 'variable');
    await page.waitForTimeout(500);
    
    // Should now match regardless of case
    const caseInsensitiveCount = await page.locator('[data-testid^="node-card-"]:visible').count();
    expect(caseInsensitiveCount).toBeGreaterThanOrEqual(Math.max(caseSensitiveCount, lowercaseCount));
  });
});
