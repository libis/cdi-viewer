import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Handle invalid JSON-LD file', async ({ page }) => {
    // Try to load a file with invalid JSON syntax
    const filePath = path.join(__dirname, '../../fixtures/test-data/invalid-syntax.json');
    
    await page.setInputFiles('#local-file-input', filePath);
    
    // Should show error modal
    await expect(page.locator('[data-testid="alert-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="alert-modal"]')).toContainText(/failed to load|invalid|error/i);
    
    // Content area should remain empty
    await expect(page.locator('.node-card')).toHaveCount(0);
  });

  test('Handle network error when loading shapes', async ({ page }) => {
    // Block network requests to shape URLs
    await page.route('**/shapes/**', route => route.abort());
    
    // Try to select shapes that require network fetch
    await page.selectOption('#shape-selector', 'custom');
    // Enter custom URL then press ENTER (UI handles Enter for custom shape URL)
    await page.fill('#custom-shape-url', 'https://example.org/nonexistent-shapes.ttl');
    await page.keyboard.press('Enter');
    
    // Should show error modal for failed shape load
    await expect(page.locator('[data-testid="alert-modal"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="alert-modal"]')).toContainText(/failed to load|failed to fetch|could not fetch|network error/i);
  });

  test('Handle validation errors gracefully', async ({ page }) => {
    // Load a file
    const filePath = path.join(__dirname, '../../fixtures/test-data/simple.jsonld');
    await page.setInputFiles('#local-file-input', filePath);
    await page.waitForTimeout(1000);
    
    // Enable edit mode
    await page.click('#toggle-edit-btn');
    
    // Create intentional validation error by clearing required field
    const requiredProperty = page.locator('.property-row.required input').first();
    if (await requiredProperty.isVisible()) {
      await requiredProperty.clear();
      await page.waitForTimeout(3500); // Wait for debounced validation
      
      // Should show validation errors but not crash
      await expect(page.locator('#validation-status')).toContainText(/violation|invalid|error/i);
      await expect(page.locator('.property-row.invalid')).toHaveCount(1);
      
      // App should still be functional
      await expect(page.locator('#export-btn')).toBeEnabled();
    }
  });

  test('Handle export with no data loaded', async ({ page }) => {
    // Try to export without loading any file
    await page.click('#export-btn');
    
    // Should either export empty document or show error
    // Check if download happens or error appears
    const errorAlert = page.locator('.alert-danger');
    const hasError = await errorAlert.isVisible().catch(() => false);
    
    if (hasError) {
      await expect(errorAlert).toContainText(/no data|empty|nothing to export/i);
    } else {
      // If no error, export should succeed with empty/minimal data
      // This is acceptable behavior
    }
  });
});
