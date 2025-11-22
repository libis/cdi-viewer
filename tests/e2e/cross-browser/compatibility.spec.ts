import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Cross-Browser Compatibility', () => {
  const testFile = path.join(__dirname, '../../fixtures/test-data/simple.jsonld');

  test('Load and display file correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Load test file
    await page.setInputFiles('#local-file-input', testFile);
    await page.waitForTimeout(1000);
    
    // Verify basic rendering works
    await expect(page.locator('.node-card')).toHaveCount(26);
    await expect(page.locator('.property-row')).toHaveCount(45, { timeout: 5000 });
  });

  test('Edit mode functions correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.setInputFiles('#local-file-input', testFile);
    await page.waitForTimeout(1000);
    
    // Enable edit mode
    await page.click('#toggle-edit-btn');
    await expect(page.locator('#toggle-edit-btn')).toHaveClass(/btn-warning/);
    
    // Edit a property
    const firstInput = page.locator('input[type="text"]').first();
    await firstInput.fill('Test Value');
    
    // Verify change is tracked
    const propertyRow = page.locator('.property-row.changed').first();
    await expect(propertyRow).toBeVisible();
  });

  test('Search functionality works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.setInputFiles('#local-file-input', testFile);
    await page.waitForTimeout(1000);
    
    // Perform search
    await page.fill('#search-input', 'dataset');
    await page.waitForTimeout(500);
    
    // Verify matches are highlighted
    const matches = page.locator('.search-match');
    await expect(matches.first()).toBeVisible();
    
    // Verify counter shows results
    await expect(page.locator('#search-counter')).toBeVisible();
  });

  test('Export functionality works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.setInputFiles('#local-file-input', testFile);
    await page.waitForTimeout(1000);
    
    // Export file
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#export-btn')
    ]);
    
    // Verify download occurred
    expect(download).toBeDefined();
    expect(download.suggestedFilename()).toMatch(/\.jsonld$/);
  });

  test('Collapse/expand nodes works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.setInputFiles('#local-file-input', testFile);
    await page.waitForTimeout(1000);
    
    // Collapse all
    await page.click('#collapse-all-btn');
    await page.waitForTimeout(500);
    
    // Verify all collapsed
    const collapsedNodes = await page.locator('.node-card.collapsed').count();
    expect(collapsedNodes).toBeGreaterThan(0);
    
    // Expand all
    await page.click('#expand-all-btn');
    await page.waitForTimeout(500);
    
    // Verify all expanded
    const expandedNodes = await page.locator('.node-card:not(.collapsed)').count();
    expect(expandedNodes).toBeGreaterThan(0);
  });
});
