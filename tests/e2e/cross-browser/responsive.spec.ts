import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Responsive Design', () => {
  const testFile = path.join(__dirname, '../../fixtures/test-data/simple.jsonld');

  test('Mobile view (375px) - Layout adapts correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Load file
    await page.setInputFiles('#local-file-input', testFile);
    await page.waitForTimeout(1000);
    
    // Verify content is visible and not overflowing
    const content = page.locator('#content');
    await expect(content).toBeVisible();
    
    // Verify toolbar is accessible
    await expect(page.locator('#toolbar')).toBeVisible();
    
    // Verify no horizontal scrolling needed
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375);
  });

  test('Tablet view (768px) - All controls accessible', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.setInputFiles('#local-file-input', testFile);
    await page.waitForTimeout(1000);
    
    // Verify main controls are visible
    await expect(page.locator('#toggle-edit-btn')).toBeVisible();
    await expect(page.locator('#export-btn')).toBeVisible();
    await expect(page.locator('#search-input')).toBeVisible();
    
    // Verify nodes render correctly
    await expect(page.locator('.node-card')).toHaveCount(26);
  });

  test('Desktop view (1920px) - Full layout displayed', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.setInputFiles('#local-file-input', testFile);
    await page.waitForTimeout(1000);
    
    // Verify all UI elements are visible
    await expect(page.locator('#toolbar')).toBeVisible();
    await expect(page.locator('#content')).toBeVisible();
    await expect(page.locator('#namespace-section')).toBeVisible();
    
    // Verify layout is not cramped
    const contentWidth = await page.locator('#content').evaluate(el => el.clientWidth);
    expect(contentWidth).toBeGreaterThan(1000);
  });

  test('Touch interactions work on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.setInputFiles('#local-file-input', testFile);
    await page.waitForTimeout(1000);
    
    // Test tapping to collapse/expand
    const firstNodeHeader = page.locator('.node-header').first();
    await firstNodeHeader.tap();
    await page.waitForTimeout(300);
    
    // Verify collapse happened
    const firstNode = page.locator('.node-card').first();
    await expect(firstNode).toHaveClass(/collapsed/);
    
    // Tap again to expand
    await firstNodeHeader.tap();
    await page.waitForTimeout(300);
    await expect(firstNode).not.toHaveClass(/collapsed/);
  });
});
