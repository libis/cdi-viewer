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
});
