// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Search Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#load-local-btn', { timeout: 10000 });
  });

  test('should handle search terms with trailing spaces', async ({ page }) => {
    // ============= SETUP =============
    const testFilePath = path.join(__dirname, '../../../examples/cdi/SimpleSample.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid^="node-card-"]')).toHaveCount(26);

    // ============= ACTIONS =============
    // Search for "Sample " (with trailing space) - should match "Sample " in "Sample Dataset"
    const searchInput = page.locator('#search-input');
    await searchInput.fill('Sample ');
    await page.waitForTimeout(500);

    // ============= EXPECTED RESULTS =============
    const searchCounter = page.locator('#search-counter');
    await expect(searchCounter).toBeVisible();
    
    // Should find matches because "Sample " is a substring of "Sample Dataset", "Sample ID", etc.
    const counterText = await searchCounter.textContent();
    console.log('Search counter text:', counterText);
    expect(counterText).not.toContain('No matches');
    
    // Check that highlights were created
    const highlights = page.locator('.search-highlight');
    const highlightCount = await highlights.count();
    console.log('Number of highlights:', highlightCount);
    expect(highlightCount).toBeGreaterThan(0);
  });

  test('should handle search terms with leading spaces', async ({ page }) => {
    // ============= SETUP =============
    const testFilePath = path.join(__dirname, '../../../examples/cdi/SimpleSample.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid^="node-card-"]')).toHaveCount(26);

    // ============= ACTIONS =============
    // Search for " Sample" (with leading space)
    const searchInput = page.locator('#search-input');
    await searchInput.fill(' Sample');
    await page.waitForTimeout(500);

    // ============= EXPECTED RESULTS =============
    const searchCounter = page.locator('#search-counter');
    await expect(searchCounter).toBeVisible();
    
    const counterText = await searchCounter.textContent();
    console.log('Search counter text:', counterText);
    // " Sample" won't match "Sample" at the start, so likely no matches
    // (unless there's a value like "X Sample" with space before)
  });

  test('should handle multi-word search terms', async ({ page }) => {
    // ============= SETUP =============
    const testFilePath = path.join(__dirname, '../../../examples/cdi/SimpleSample.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    await expect(page.locator('[data-testid^="node-card-"]')).toHaveCount(26);

    // ============= ACTIONS =============
    // Search for a phrase that should exist
    const searchInput = page.locator('#search-input');
    await searchInput.fill('Sample Dataset');
    await page.waitForTimeout(500);

    // ============= EXPECTED RESULTS =============
    const searchCounter = page.locator('#search-counter');
    await expect(searchCounter).toBeVisible();
    
    const counterText = await searchCounter.textContent();
    console.log('Search counter for "Sample Dataset":', counterText);
    
    // If the phrase "Sample Dataset" exists in the file, it should match
    // If only "Sample" and "Dataset" exist separately, it should not match
  });

  test('should handle search with regex special characters when regex is OFF', async ({ page }) => {
    // ============= SETUP =============
    const testFilePath = path.join(__dirname, '../../../examples/cdi/SimpleSample.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    await expect(page.locator('[data-testid^="node-card-"]')).toHaveCount(26);

    // ============= ACTIONS =============
    // Search for text that contains regex special characters
    // When regex is OFF, these should be treated as literal characters
    const searchInput = page.locator('#search-input');
    
    // Search for "#" (which appears in node IDs like "#Mass")
    await searchInput.fill('#');
    await page.waitForTimeout(500);

    // ============= EXPECTED RESULTS =============
    const searchCounter = page.locator('#search-counter');
    await expect(searchCounter).toBeVisible();
    
    const counterText = await searchCounter.textContent();
    console.log('Search counter for "#":', counterText);
    
    // Should find matches since # appears in node IDs
    await expect(searchCounter).not.toHaveText('No matches');
  });

  test('should handle search with dots when regex is OFF', async ({ page }) => {
    // ============= SETUP =============
    const testFilePath = path.join(__dirname, '../../../examples/cdi/SimpleSample.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    await expect(page.locator('[data-testid^="node-card-"]')).toHaveCount(26);

    // ============= ACTIONS =============
    const searchInput = page.locator('#search-input');
    
    // Search for "." - when regex OFF, should only match literal dot
    await searchInput.fill('.');
    await page.waitForTimeout(500);

    // ============= EXPECTED RESULTS =============
    const searchCounter = page.locator('#search-counter');
    await expect(searchCounter).toBeVisible();
    
    const counterText = await searchCounter.textContent();
    console.log('Search counter for ".":', counterText);
  });

  test('should handle empty search correctly', async ({ page }) => {
    // ============= SETUP =============
    const testFilePath = path.join(__dirname, '../../../examples/cdi/SimpleSample.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    await expect(page.locator('[data-testid^="node-card-"]')).toHaveCount(26);

    // ============= ACTIONS =============
    const searchInput = page.locator('#search-input');
    
    // First search for something
    await searchInput.fill('Sample');
    await page.waitForTimeout(500);
    
    // Then clear it
    await searchInput.fill('');
    await page.waitForTimeout(500);

    // ============= EXPECTED RESULTS =============
    const searchCounter = page.locator('#search-counter');
    
    // Counter should be hidden or empty
    const counterText = await searchCounter.textContent();
    expect(counterText).toBe('');
    
    // No highlights should remain
    const highlights = page.locator('.search-highlight');
    await expect(highlights).toHaveCount(0);
  });

  test('typing should not auto-jump to first result; Enter should navigate', async ({ page }) => {
    // ============= SETUP =============
    const testFilePath = path.join(__dirname, '../../../examples/cdi/SimpleSample.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    await expect(page.locator('[data-testid^="node-card-"]')).toHaveCount(26);

    // Focus somewhere lower on the page to simulate typing while working
    // Select a node near the end and ensure scroll is away from the first match
    const lastNode = page.locator('[data-testid^="node-card-"]').nth(24);
    await lastNode.scrollIntoViewIfNeeded();

    // ============= ACTIONS =============
    const searchInput = page.locator('#search-input');
    await searchInput.fill('Sample');
    await page.waitForTimeout(500);

    // ============= EXPECTED RESULTS =============
    // Typing should not automatically mark a current match (no jump)
    const currentMatch = page.locator('.current-search-match');
    await expect(currentMatch).toHaveCount(0);

    // Press Enter to navigate to the first match — this should create a current match
    await searchInput.press('Enter');
    await page.waitForTimeout(200);
    const currentCount = await page.locator('.current-search-match').count();
    expect(currentCount).toBeGreaterThan(0);
  });

  test('auto-jump toggle enables jump after pause', async ({ page }) => {
    const testFilePath = path.join(__dirname, '../../../examples/cdi/SimpleSample.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    await expect(page.locator('[data-testid^="node-card-"]')).toHaveCount(26);

    // Make sure the toggle exists and is OFF by default, then enable it
    const toggle = page.locator('#auto-jump-toggle');
    await expect(toggle).toBeVisible();
    await expect(toggle).not.toBeChecked();
    await toggle.check();

    // Scroll away from first match
    const lastNode = page.locator('[data-testid^="node-card-"]').nth(24);
    await lastNode.scrollIntoViewIfNeeded();

    // Type search and wait for auto-jump delay (700ms plus margin)
    const searchInput = page.locator('#search-input');
    await searchInput.fill('Sample');
    await page.waitForTimeout(900);

    // After pause, a current match should be active (auto-jump)
    const currentCount = await page.locator('.current-search-match').count();
    expect(currentCount).toBeGreaterThan(0);
  });

  test('auto-jump toggle triggers immediate jump on blur', async ({ page }) => {
    const testFilePath = path.join(__dirname, '../../../examples/cdi/SimpleSample.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    await expect(page.locator('[data-testid^="node-card-"]')).toHaveCount(26);

    const toggle = page.locator('#auto-jump-toggle');
    await expect(toggle).toBeVisible();
    if (!(await toggle.isChecked())) {
      await toggle.check();
    }

    // Ensure we're away from first match
    const lastNode = page.locator('[data-testid^="node-card-"]').nth(25);
    await lastNode.scrollIntoViewIfNeeded();

    const searchInput = page.locator('#search-input');
    await searchInput.fill('Dataset');

    // Blur the input - this should cause an immediate jump if auto-jump enabled
    await searchInput.evaluate((el: HTMLInputElement) => el.blur());
    await page.waitForTimeout(200);

    const currentCount = await page.locator('.current-search-match').count();
    expect(currentCount).toBeGreaterThan(0);
  });
});
