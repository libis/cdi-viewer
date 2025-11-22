import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Document Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Add Root Node dropdown shows available node types', async ({ page }) => {
    // Enable edit mode to show Add Root Node section
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(1000);

    // Add Root Node container should be visible
    await expect(page.locator('#add-root-node-container')).toBeVisible();

    // Find the dropdown in the Add Root Node section
    const dropdown = page.locator('#add-root-node-container select.item-dropdown');
    await expect(dropdown).toBeVisible();

    // Count options (should have more than just the placeholder)
    const optionCount = await dropdown.locator('option').count();
    expect(optionCount).toBeGreaterThan(1); // More than just "-- Select a node type to add --"

    // Check that first option is placeholder
    const firstOption = dropdown.locator('option').first();
    await expect(firstOption).toHaveText(/Select a node type/i);

    // Check that we have real node type options
    const secondOption = dropdown.locator('option').nth(1);
    const secondOptionText = await secondOption.textContent();
    expect(secondOptionText).toBeTruthy();
    expect(secondOptionText).not.toMatch(/Select a node type/i);
  });

  test('Add Root Node dropdown updates when shape changes', async ({ page }) => {
    // Enable edit mode
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(1000);

    // Get initial dropdown options from DDI-CDI
    const dropdown = page.locator('#add-root-node-container select.item-dropdown');
    const initialOptionCount = await dropdown.locator('option').count();
    expect(initialOptionCount).toBeGreaterThan(1);

    // Change to CDIF Discovery Core shape
    await page.selectOption('#shape-selector', 'cdif-core');
    await page.waitForTimeout(2000); // Wait for shapes to load

    // Dropdown should still have options (may be different ones)
    const newOptionCount = await dropdown.locator('option').count();
    expect(newOptionCount).toBeGreaterThan(1);

    // Change to generic mode (no shapes)
    await page.selectOption('#shape-selector', '');
    await page.waitForTimeout(1000);

    // Dropdown should now only have placeholder (no SHACL shapes loaded)
    const genericOptionCount = await dropdown.locator('option').count();
    expect(genericOptionCount).toBe(1); // Only placeholder

    // Change back to DDI-CDI
    await page.selectOption('#shape-selector', 'ddi-cdi-official');
    await page.waitForTimeout(2000);

    // Dropdown should have options again
    const finalOptionCount = await dropdown.locator('option').count();
    expect(finalOptionCount).toBeGreaterThan(1);
  });

  test('Create new DDI-CDI document', async ({ page }) => {
    // Enable edit mode first (this creates empty JSON-LD document)
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(1000);
    
    // Should be in edit mode
    await expect(page.locator('#toggle-edit-btn')).toContainText(/View Mode|Disable Editing/i);
    
    // Wait for Add Root Node section to appear
    await page.waitForSelector('text=Add Root Node', { timeout: 5000 }).catch(() => {});
    
    // Scroll to bottom to find "Add Root Node" section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    
    // Find the dropdown in the Add Root Node section
    const dropdown = page.locator('select').filter({ hasText: /Select a node type/i });
    const dropdownVisible = await dropdown.isVisible().catch(() => false);
    
    if (dropdownVisible) {
      // Get all options
      const optionCount = await dropdown.locator('option').count();
      
      if (optionCount > 1) {
        // Select first real option (skip placeholder)
        await dropdown.selectOption({ index: 1 });
        
        // Click Add Node button
        const addButton = page.locator('button:has-text("Add Node")');
        await addButton.click();
        await page.waitForTimeout(1500);

        // Expected results - at least one node should be created
        const nodeCount = await page.locator('.node-card').count();
        expect(nodeCount).toBeGreaterThanOrEqual(1);
      }
    }
    
    // DDI-CDI context should be present
    await expect(page.locator('#namespace-section')).toBeVisible();
  });

  test('Create Schema.org document', async ({ page }) => {
    // Navigate to generic mode
    await page.goto('/?shacl=generic');
    await page.waitForLoadState('networkidle');

    // Enable edit mode first
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(500);

    // Add custom namespace for schema.org
    await page.click('#add-namespace-btn');
    await page.fill('#namespace-prefix-input', 'schema');
    await page.fill('#namespace-uri-input', 'http://schema.org/');
    await page.click('#confirm-namespace-btn');

    // Scroll to Add Root Node section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Use custom node type input to add schema:Dataset
    const customInput = page.locator('input[placeholder*="NodeType"], input[placeholder*="node type"]').first();
    await customInput.fill('schema:Dataset');
    const addButton = page.locator('button:has-text("Add")').last();
    await addButton.click();
    await page.waitForTimeout(1000);

    // Verify node created
    await expect(page.locator('.node-card')).toHaveCount(1);
    await expect(page.locator('.node-type')).toContainText('schema:Dataset');
    
    // schema.org namespace should be in context
    await page.click('#toggle-namespace-btn');
    await expect(page.locator('#namespace-table-body tr:has-text("schema")')).toBeVisible();
  });

  test('Add multiple root nodes', async ({ page }) => {
    // Enable edit mode first
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(500);

    // Scroll to Add Root Node section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Add first root node
    const dropdown = page.locator('select').first();
    await dropdown.selectOption({ index: 1 });
    const addButton = page.locator('button:has-text("Add Node")').first();
    await addButton.click();
    await page.waitForTimeout(1000);
    
    let nodeCount = await page.locator('.node-card').count();
    expect(nodeCount).toBeGreaterThanOrEqual(1);

    // Add properties to first node
    const firstNode = page.locator('.node-card').first();
    const nameInput = firstNode.locator('input[data-property="name"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill('First Dataset');
    }

    // Scroll back to bottom for second node
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Add second root node
    await dropdown.selectOption({ index: 2 });
    await addButton.click();
    await page.waitForTimeout(1000);

    // Verify both nodes exist
    nodeCount = await page.locator('.node-card').count();
    expect(nodeCount).toBeGreaterThanOrEqual(2);
    
    // Both should be at root level (not nested)
    const rootNodes = await page.locator('.node-card').count();
    expect(rootNodes).toBe(2);
  });

  test('Create document without shapes', async ({ page }) => {
    // Navigate to generic mode
    await page.goto('/?shacl=generic');
    await page.waitForLoadState('networkidle');

    // Enable edit mode first
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(500);

    // Scroll to Add Root Node section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Add root node with custom type using the custom node type input
    const customInput = page.locator('input[placeholder*="NodeType"], input[placeholder*="node type"]').first();
    await customInput.fill('CustomType');
    const addButton = page.locator('button:has-text("Add")').last();
    await addButton.click();
    await page.waitForTimeout(1000);

    // Verify node created
    await expect(page.locator('.node-card')).toHaveCount(1);
    await expect(page.locator('.node-type')).toContainText('CustomType');

    // Add custom property
    const addPropertySection = page.locator('.add-property-section').first();
    await expect(addPropertySection).toBeVisible();
    
    // Click to add custom property
    const customPropertyBtn = addPropertySection.locator('button:has-text("Add Custom Property")');
    if (await customPropertyBtn.isVisible()) {
      await customPropertyBtn.click();
      await page.fill('.custom-property-name-input', 'customField');
      await page.press('.custom-property-name-input', 'Enter');
    }

    // All properties should be marked as EXTRA (no shapes loaded)
    const extraBadges = page.locator('.property-badge.extra');
    await expect(extraBadges.first()).toBeVisible();
  });

  test('Create document with default properties', async ({ page }) => {
    // Enable edit mode first
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(500);

    // Scroll to Add Root Node section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Add DataSet root node
    const dropdown = page.locator('select').first();
    await dropdown.selectOption({ index: 1 });
    const addButton = page.locator('button:has-text("Add Node")').first();
    await addButton.click();
    await page.waitForTimeout(1000);

    // Verify required properties are automatically added or marked
    const nodeCard = page.locator('.node-card').first();
    const requiredBadges = nodeCard.locator('.property-badge.required');
    
    // Should have at least one required property visible
    const requiredCount = await requiredBadges.count();
    expect(requiredCount).toBeGreaterThan(0);
  });

  test('Auto-enable edit mode on document creation', async ({ page }) => {
    // Initially in view mode
    await expect(page.locator('#toggle-edit-btn')).toHaveText(/Enable Editing/i);

    // Enable edit mode - this creates empty document
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(500);

    // Should automatically enable edit mode
    await expect(page.locator('#toggle-edit-btn')).toHaveClass(/btn-warning/);
    await expect(page.locator('#toggle-edit-btn')).toHaveText(/View Mode|Disable Editing/i);
    
    // Edit controls should be visible
    await expect(page.locator('.add-property-section')).toBeVisible();
  });

  test('Preserve context when adding nodes', async ({ page }) => {
    // Enable edit mode first
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(500);

    // Add custom namespace first
    await page.click('#add-namespace-btn');
    await page.fill('#namespace-prefix-input', 'myorg');
    await page.fill('#namespace-uri-input', 'http://example.org/myorg#');
    await page.click('#confirm-namespace-btn');

    // Add root node
    await page.selectOption('#shape-selector', 'ddi-cdi');
    await page.waitForTimeout(1000);
    await page.selectOption('#add-root-node-type', 'DataSet');
    await page.click('#add-root-node-btn');

    // Verify custom namespace is still present
    await page.click('#toggle-namespace-btn');
    await expect(page.locator('#namespace-table-body tr:has-text("myorg")')).toBeVisible();

    // Export and verify context includes custom namespace
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#export-btn')
    ]);

    const downloadPath = await download.path();
    const fs = await import('fs');
    const content = fs.readFileSync(downloadPath, 'utf-8');
    const jsonData = JSON.parse(content);
    
    expect(jsonData['@context']).toBeDefined();
    expect(jsonData['@context']['myorg']).toBe('http://example.org/myorg#');
  });

  test('Generate default filename for new document', async ({ page }) => {
    // Create new document by enabling edit mode
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(500);

    // Scroll to Add Root Node section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    const dropdown = page.locator('select').first();
    await dropdown.selectOption({ index: 1 });
    await page.click('#add-root-node-btn');

    // Export to check filename
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#export-btn')
    ]);

    const filename = download.suggestedFilename();
    
    // Should have a default name like "new-document.jsonld" or "new-ddi-cdi-document.jsonld"
    expect(filename).toMatch(/new.*\.jsonld$/i);
  });
});
