import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Critical Test Case: File Loading and Basic Rendering
 * 
 * This test verifies the core functionality of loading a JSON-LD file
 * and rendering it correctly with SHACL validation.
 * 
 * Priority: P0 (Critical - Must Pass)
 */
test.describe('File Loading - Critical Path', () => {
  
  test('should load local JSON-LD file and render nodes with validation', async ({ page }) => {
    // ============= SETUP =============
    // Navigate to the viewer
    await page.goto('/');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('domcontentloaded');
    
    // Verify we're on the correct page
    await expect(page).toHaveTitle(/CDI Data Viewer/);
    
    // Wait for the app to initialize
    await page.waitForSelector('#shape-selector', { timeout: 10000 });
    
    // ============= ACTIONS =============
    // Prepare to load a test file
    const testFilePath = path.join(__dirname, '../../../examples/cdi/SimpleSample.jsonld');
    
    // Click "Load Local File" button
    await page.click('#load-local-btn');
    
    // Upload the file using file input
    await page.setInputFiles('#local-file-input', testFilePath);
    
    // Wait for file to be processed and rendered
    // Look for success message
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.alert-success')).toContainText('Loaded: SimpleSample.jsonld');
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Verify nodes are rendered
    const nodeCards = page.locator('[data-testid^="node-card-"]');
    await expect(nodeCards).toHaveCount(26, { timeout: 5000 }); // SimpleSample has 26 nodes
    
    // 2. Verify namespace section visibility (SimpleSample.jsonld uses an external string @context
    //    so namespace details may not be present locally and the section will be hidden)
    await expect(page.locator('#namespace-section')).toBeHidden();
    
    // 4. Verify validation runs automatically
    // Wait for validation status to appear (debounced, max 3 seconds + processing)
    const validationStatus = page.locator('#validation-status');
    await expect(validationStatus).toBeVisible({ timeout: 5000 });
    
    // 5. Validation should complete (either valid or invalid badge)
    await expect(validationStatus).toHaveText(/Valid|violation\(s\)/, { timeout: 5000 });

    // 6. Verify properties are rendered
    const propertyRows = page.locator('[data-testid^="property-"]');
    await expect(propertyRows.first()).toBeVisible();
    
    // 7. Verify buttons are in correct state
    // Edit mode should be disabled initially
    await expect(page.locator('#toggle-edit-btn')).toContainText('Enable Editing');
    
    // Export button should be visible
    await expect(page.locator('#export-btn')).toBeVisible();
    
    // 8. Verify node can be collapsed/expanded
    const firstNode = nodeCards.first();
    const firstNodeHeader = firstNode.locator('> .node-header');
    
    // Click to collapse
    await firstNodeHeader.click();
    await expect(firstNode).toHaveClass(/collapsed/);
    
    // Click to expand
    await firstNodeHeader.click();
    await expect(firstNode).not.toHaveClass(/collapsed/);
  });
  
  test('should handle edit mode toggle', async ({ page }) => {
    // ============= SETUP =============
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#load-local-btn', { timeout: 10000 });
    
    // Load test file
    const testFilePath = path.join(__dirname, '../../../examples/cdi/SimpleSample.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    
    // Wait for file to load
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid^="node-card-"]')).toHaveCount(26);
    
    // ============= ACTIONS =============
    // Click "Enable Editing" button
    await page.click('#toggle-edit-btn');
    
    // Wait a moment for edit mode to activate
    await page.waitForTimeout(1000);
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Button changes to "View Mode" with warning style
    await expect(page.locator('#toggle-edit-btn')).toContainText('View Mode');
    await expect(page.locator('#toggle-edit-btn')).toHaveClass(/btn-warning/);
    
    // 2. Add Root Node component appears at bottom
    await expect(page.locator('#add-root-node-container')).toBeVisible();
    
    // 3. Add Namespace button appears (only when namespace section is visible)
    if (await page.locator('#namespace-section').isVisible()) {
      await expect(page.locator('#add-namespace-btn')).toBeVisible();
    }
  });
  
  test('should handle search functionality', async ({ page }) => {
    // ============= SETUP =============
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#load-local-btn', { timeout: 10000 });
    
    // Load test file
    const testFilePath = path.join(__dirname, '../../../examples/cdi/SimpleSample.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    await expect(page.locator('[data-testid^="node-card-"]')).toHaveCount(26);
    
    // ============= ACTIONS =============
    // Type in search box
    const searchInput = page.locator('#search-input');
    await searchInput.fill('identifier');
    
    // Wait for search to execute
    await page.waitForTimeout(500);
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Counter should show results
    const searchCounter = page.locator('#search-counter');
    await expect(searchCounter).toBeVisible();
    await expect(searchCounter).toContainText(/\d+/);
    
    // 2. Clear button should appear
    const clearButton = page.locator('#clear-search-btn');
    await expect(clearButton).toBeVisible();
    
    // 3. Click clear button
    await clearButton.click();
    
    // Search box should be empty
    await expect(searchInput).toHaveValue('');
    
    // Counter should be empty
    await expect(searchCounter).toHaveText('');
  });

  test('should load complex nested structure', async ({ page }) => {
    // ============= SETUP =============
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#load-local-btn', { timeout: 10000 });
    
    // ============= ACTIONS =============
    const testFilePath = path.join(__dirname, '../../fixtures/test-data/complex-nested.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    
    // Wait for file to load
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });
    
    // ============= EXPECTED RESULTS =============
    
    // 1. All nodes render correctly (11 nodes in complex-nested)
    const nodeCards = page.locator('[data-testid^="node-card-"]');
    await expect(nodeCards).toHaveCount(11, { timeout: 5000 });
    
    // 2. Verify properties are rendered
    const propertyRows = page.locator('[data-testid^="property-"]');
    await expect(propertyRows.first()).toBeVisible();
    
    // 3. All nodes can be collapsed/expanded
    const firstNode = nodeCards.first();
    const firstHeader = firstNode.locator('> .node-header');
    await firstHeader.click();
    await expect(firstNode).toHaveClass(/collapsed/);
    await firstHeader.click();
    await expect(firstNode).not.toHaveClass(/collapsed/);
  });

  test('should load file without @context', async ({ page }) => {
    // ============= SETUP =============
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#load-local-btn', { timeout: 10000 });
    
    // ============= ACTIONS =============
    const testFilePath = path.join(__dirname, '../../fixtures/test-data/no-context.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    
    // Wait for file to load
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });
    
    // ============= EXPECTED RESULTS =============
    
    // 1. File loads successfully
    await expect(page.locator('[data-testid^="node-card-"]')).toHaveCount(1);
    
    // 2. Namespace section not displayed (no @context)
    await expect(page.locator('#namespace-section')).toBeHidden();
    
    // 3. Properties still render (using full URIs)
    const propertyRows = page.locator('[data-testid^="property-"]');
    await expect(propertyRows.first()).toBeVisible();
  });

  test('should handle invalid JSON-LD', async ({ page }) => {
    // ============= SETUP =============
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#load-local-btn', { timeout: 10000 });
    
    // ============= ACTIONS =============
    const testFilePath = path.join(__dirname, '../../fixtures/test-data/invalid-syntax.json');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Wait a moment for error handling
    await page.waitForTimeout(2000);
    
    // 2. Either error alert appears OR no nodes are rendered (graceful failure)
    const hasError = await page.locator('.alert-danger, .alert-error, .alert').isVisible().catch(() => false);
    const nodeCount = await page.locator('[data-testid^="node-card-"]').count();
    
    // 3. Should either show error or have no nodes rendered
    expect(hasError || nodeCount === 0).toBeTruthy();
  });

  test('should load Schema.org dataset in generic mode', async ({ page }) => {
    // ============= SETUP =============
    await page.goto('/?shacl=generic');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#shape-selector', { timeout: 10000 });
    
    // ============= ACTIONS =============
    const testFilePath = path.join(__dirname, '../../fixtures/test-data/schema-org-dataset.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });
    
    // ============= EXPECTED RESULTS =============
    
    // 1. File loads without DDI-CDI shapes (2 nodes: Dataset and Person)
    await expect(page.locator('[data-testid^="node-card-"]')).toHaveCount(2);
    
    // 2. Can select shape vocabularies
    await expect(page.locator('#shape-selector')).toBeVisible();
    
    // 3. Properties initially shown (may be classified as EXTRA without shapes)
    const propertyRows = page.locator('[data-testid^="property-"]');
    await expect(propertyRows.first()).toBeVisible();
    
    // 4. Content renders correctly
    await expect(page.locator('.node-card:has-text("Dataset")').first()).toBeVisible();
    await expect(page.locator('.node-card:has-text("Person")').first()).toBeVisible();
  });
});
