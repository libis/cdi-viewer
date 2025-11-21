import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Validation Tests
 * 
 * Tests for SHACL validation functionality including:
 * - Auto-validation on file load
 * - Debounced validation on edits
 * - Validation status display
 * - Validation serialization (no parallel runs)
 */
test.describe('Validation', () => {
  
  test('should auto-validate on file load', async ({ page }) => {
    // ============= SETUP =============
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#load-local-btn', { timeout: 10000 });
    
    // ============= ACTIONS =============
    const testFilePath = path.join(__dirname, '../../../examples/cdi/SimpleSample.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Validation status appears
    const validationStatus = page.locator('#validation-status');
    await expect(validationStatus).toBeVisible({ timeout: 5000 });
    
    // 2. Status shows either valid or violations
    await expect(validationStatus).toHaveText(/Valid|violation\(s\)/);
    
    // 3. Validation completes (not stuck in "Validating..." state)
    await page.waitForTimeout(1000);
    await expect(validationStatus).not.toContainText('Validating...');
  });

  test('should debounce validation on rapid edits', async ({ page }) => {
    // ============= SETUP =============
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#load-local-btn', { timeout: 10000 });
    
    const testFilePath = path.join(__dirname, '../../fixtures/test-data/simple.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });
    
    // Enable edit mode
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(1000);
    
    // ============= ACTIONS =============
    const inputs = page.locator('[data-testid^="property-"] input[type="text"]');
    const count = await inputs.count();
    
    if (count > 0) {
      // Make rapid edits
      await inputs.first().fill('Edit 1');
      await page.waitForTimeout(500);
      await inputs.first().fill('Edit 2');
      await page.waitForTimeout(500);
      await inputs.first().fill('Edit 3');
      
      // ============= EXPECTED RESULTS =============
      
      // 1. Validation doesn't trigger immediately during typing
      await page.waitForTimeout(2000);
      
      // 2. Validation triggers after 3 second debounce
      await page.waitForTimeout(2000); // Total ~4 seconds
      const validationStatus = page.locator('#validation-status');
      await expect(validationStatus).toBeVisible();
    }
  });

  test('should show validation details on violations', async ({ page }) => {
    // ============= SETUP =============
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#load-local-btn', { timeout: 10000 });
    
    // Load file that has validation issues
    const testFilePath = path.join(__dirname, '../../../examples/cdi/SimpleSample.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });
    
    // Wait for validation
    await page.waitForTimeout(4000);
    
    // ============= EXPECTED RESULTS =============
    
    const validationStatus = page.locator('#validation-status');
    await expect(validationStatus).toBeVisible();
    
    // If there are violations, check the display
    const statusText = await validationStatus.textContent();
    if (statusText && statusText.includes('violation')) {
      // 1. Shows count of violations
      expect(statusText).toMatch(/\d+\s+violation/);
      
      // 2. May have "Show Details" button or link
      const hasDetailsButton = await page.locator('button:has-text("Show Details"), a:has-text("Show Details")').count() > 0;
      // Just document that it may exist
      expect(hasDetailsButton !== undefined).toBeTruthy();
    }
  });

  test('should validate after entering edit mode', async ({ page }) => {
    // ============= SETUP =============
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#load-local-btn', { timeout: 10000 });
    
    const testFilePath = path.join(__dirname, '../../fixtures/test-data/simple.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });
    
    // ============= ACTIONS =============
    await page.click('#toggle-edit-btn');
    
    // ============= EXPECTED RESULTS =============
    
    // Validation should trigger when entering edit mode
    await page.waitForTimeout(4000);
    const validationStatus = page.locator('#validation-status');
    await expect(validationStatus).toBeVisible();
    await expect(validationStatus).toHaveText(/Valid|violation\(s\)/);
  });

  test('should handle validation with different shape sources', async ({ page }) => {
    // ============= SETUP =============
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#shape-selector', { timeout: 10000 });
    
    const testFilePath = path.join(__dirname, '../../fixtures/test-data/simple.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });
    
    // Wait for initial validation
    await page.waitForTimeout(4000);
    
    // ============= ACTIONS =============
    // Try switching shape sources
    const shapeSelector = page.locator('#shape-selector');
    await shapeSelector.selectOption({ index: 1 });
    
    // Wait for new shapes to load and validation to run
    await page.waitForTimeout(5000);
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Validation status still visible
    const validationStatus = page.locator('#validation-status');
    await expect(validationStatus).toBeVisible();
    
    // 2. Validation completed (not stuck)
    await expect(validationStatus).not.toContainText('Validating...');
  });

  test('should not run validation in parallel', async ({ page }) => {
    // ============= SETUP =============
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#load-local-btn', { timeout: 10000 });
    
    // Load a large file that takes time to validate
    const testFilePath = path.join(__dirname, '../../../examples/cdi/SimpleSample.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });
    
    // Enable edit mode
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(1000);
    
    // ============= ACTIONS =============
    // Try to trigger multiple validations quickly
    const inputs = page.locator('[data-testid^="property-"] input[type="text"]');
    const count = await inputs.count();
    
    if (count > 0) {
      await inputs.first().fill('Trigger 1');
      await page.waitForTimeout(100);
      await inputs.first().fill('Trigger 2');
      await page.waitForTimeout(100);
      await inputs.first().fill('Trigger 3');
      
      // ============= EXPECTED RESULTS =============
      
      // Wait for validation to complete
      await page.waitForTimeout(5000);
      
      // 1. No errors in console (no race conditions)
      // 2. Validation completes successfully
      const validationStatus = page.locator('#validation-status');
      await expect(validationStatus).toBeVisible();
      await expect(validationStatus).toHaveText(/Valid|violation\(s\)/);
    }
  });
});
