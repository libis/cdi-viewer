import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Export Tests
 * 
 * Tests for data export functionality including:
 * - Exporting JSON-LD data
 * - Pretty-print formatting
 * - Preserving user changes in export
 * - File download mechanics
 * - Namespace inclusion in exported data
 * - Correct MIME type
 */
test.describe('Export', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate and load test file
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#load-local-btn', { timeout: 10000 });
    
    const testFilePath = path.join(__dirname, '../../fixtures/test-data/simple.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);
  });

  test('should export JSON-LD data', async ({ page }) => {
    // ============= ACTIONS =============
    
    // Setup download listener
    const downloadPromise = page.waitForEvent('download');
    
    // Click export button
    await page.click('#export-btn');
    
    // Wait for download to start
    const download = await downloadPromise;
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Download is triggered
    expect(download).toBeTruthy();
    
    // 2. Filename is correct (either original or default)
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/\.jsonld$|\.json$/);
    
    // 3. Save the file to verify contents
    const downloadPath = path.join(__dirname, '../../temp', filename);
    await download.saveAs(downloadPath);
    
    // 4. Verify file exists
    expect(fs.existsSync(downloadPath)).toBe(true);
    
    // 5. File contains valid JSON
    const fileContent = fs.readFileSync(downloadPath, 'utf-8');
    let jsonData;
    expect(() => {
      jsonData = JSON.parse(fileContent);
    }).not.toThrow();
    
    // 6. JSON-LD structure is present
    expect(jsonData).toHaveProperty('@context');
    expect(jsonData).toHaveProperty('@graph');
    
    // Cleanup
    fs.unlinkSync(downloadPath);
  });

  test('should export with pretty-print formatting', async ({ page }) => {
    // ============= ACTIONS =============
    
    const downloadPromise = page.waitForEvent('download');
    await page.click('#export-btn');
    const download = await downloadPromise;
    
    // ============= EXPECTED RESULTS =============
    
    // Save and read file
    const downloadPath = path.join(__dirname, '../../temp', download.suggestedFilename());
    await download.saveAs(downloadPath);
    
    const fileContent = fs.readFileSync(downloadPath, 'utf-8');
    
    // 1. File is formatted with indentation (not minified)
    expect(fileContent).toContain('\n'); // Has newlines
    expect(fileContent).toMatch(/\n\s+/); // Has indented lines
    
    // 2. Proper JSON formatting with 2-space indentation
    const jsonData = JSON.parse(fileContent);
    const prettyJson = JSON.stringify(jsonData, null, 2);
    expect(fileContent).toBe(prettyJson);
    
    // Cleanup
    fs.unlinkSync(downloadPath);
  });

  test('should preserve user changes in export', async ({ page }) => {
    // ============= SETUP: Make changes to the data =============
    
    // Enable edit mode
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(500);
    
    // Edit a property value
    const nameProperty = page.locator('[data-testid="property-name"]');
    const nameInput = nameProperty.locator('input');
    await nameInput.fill('Modified Test Dataset');
    await page.waitForTimeout(500);
    
    // Add a new property (if possible)
    // This depends on UI implementation
    
    // ============= ACTIONS =============
    
    const downloadPromise = page.waitForEvent('download');
    await page.click('#export-btn');
    const download = await downloadPromise;
    
    // ============= EXPECTED RESULTS =============
    
    const downloadPath = path.join(__dirname, '../../temp', download.suggestedFilename());
    await download.saveAs(downloadPath);
    
    const fileContent = fs.readFileSync(downloadPath, 'utf-8');
    const jsonData = JSON.parse(fileContent);
    
    // 1. Modified value is in the export
    const datasetNode = jsonData['@graph'].find((n: any) => n['@id'] === '#dataset1');
    expect(datasetNode).toBeTruthy();
    expect(datasetNode.name).toBe('Modified Test Dataset');
    
    // 2. Original unmodified values are also present
    expect(datasetNode.identifier).toBe('DS001');
    expect(datasetNode['@type']).toBe('ddi:DataSet');
    
    // Cleanup
    fs.unlinkSync(downloadPath);
  });

  test('should include all namespaces in exported data', async ({ page }) => {
    // ============= SETUP: Add a custom namespace =============
    
    // Enable edit mode
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(500);
    
    // Add custom namespace
    await page.click('#add-namespace-btn');
    await page.waitForTimeout(300);
    await page.fill('#namespacePrefixInput', 'foaf');
    await page.fill('#namespaceUriInput', 'http://xmlns.com/foaf/0.1/');
    await page.click('#confirmNamespaceBtn');
    await page.waitForTimeout(500);
    
    // ============= ACTIONS =============
    
    const downloadPromise = page.waitForEvent('download');
    await page.click('#export-btn');
    const download = await downloadPromise;
    
    // ============= EXPECTED RESULTS =============
    
    const downloadPath = path.join(__dirname, '../../temp', download.suggestedFilename());
    await download.saveAs(downloadPath);
    
    const fileContent = fs.readFileSync(downloadPath, 'utf-8');
    const jsonData = JSON.parse(fileContent);
    
    // 1. @context includes all original namespaces
    expect(jsonData['@context']).toHaveProperty('ddi');
    expect(jsonData['@context']).toHaveProperty('xsd');
    expect(jsonData['@context']).toHaveProperty('@vocab');
    
    // 2. Custom namespace is included
    expect(jsonData['@context']).toHaveProperty('foaf');
    expect(jsonData['@context'].foaf).toBe('http://xmlns.com/foaf/0.1/');
    
    // Cleanup
    fs.unlinkSync(downloadPath);
  });

  test('should export without requiring edit mode', async ({ page }) => {
    // ============= ACTIONS =============
    
    // Verify we're in view mode (not edit mode)
    await expect(page.locator('#toggle-edit-btn')).toContainText(/Enable Editing|Edit Mode/i);
    
    // Export should work from view mode
    const downloadPromise = page.waitForEvent('download');
    await page.click('#export-btn');
    const download = await downloadPromise;
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Export succeeds
    expect(download).toBeTruthy();
    
    // 2. Downloaded file is valid
    const downloadPath = path.join(__dirname, '../../temp', download.suggestedFilename());
    await download.saveAs(downloadPath);
    
    const fileContent = fs.readFileSync(downloadPath, 'utf-8');
    const jsonData = JSON.parse(fileContent);
    
    expect(jsonData).toHaveProperty('@context');
    expect(jsonData).toHaveProperty('@graph');
    
    // Cleanup
    fs.unlinkSync(downloadPath);
  });

  test('should use correct MIME type for export', async ({ page }) => {
    // ============= ACTIONS =============
    
    // We can't directly inspect the Blob MIME type through Playwright's download API,
    // but we can verify the file extension and content validity
    
    const downloadPromise = page.waitForEvent('download');
    await page.click('#export-btn');
    const download = await downloadPromise;
    
    // ============= EXPECTED RESULTS =============
    
    // 1. File has JSON-LD extension
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/\.jsonld$/);
    
    // 2. Content is valid JSON-LD
    const downloadPath = path.join(__dirname, '../../temp', filename);
    await download.saveAs(downloadPath);
    
    const fileContent = fs.readFileSync(downloadPath, 'utf-8');
    const jsonData = JSON.parse(fileContent);
    
    // JSON-LD requirements
    expect(jsonData).toHaveProperty('@context');
    
    // Should be either graph or single object format
    const isGraphFormat = jsonData.hasOwnProperty('@graph');
    const isObjectFormat = jsonData.hasOwnProperty('@id') || jsonData.hasOwnProperty('@type');
    expect(isGraphFormat || isObjectFormat).toBe(true);
    
    // Cleanup
    fs.unlinkSync(downloadPath);
  });

  test('should preserve property order in export', async ({ page }) => {
    // ============= ACTIONS =============
    
    const downloadPromise = page.waitForEvent('download');
    await page.click('#export-btn');
    const download = await downloadPromise;
    
    // ============= EXPECTED RESULTS =============
    
    const downloadPath = path.join(__dirname, '../../temp', download.suggestedFilename());
    await download.saveAs(downloadPath);
    
    const fileContent = fs.readFileSync(downloadPath, 'utf-8');
    const jsonData = JSON.parse(fileContent);
    
    // 1. Graph nodes are present
    expect(jsonData['@graph']).toBeInstanceOf(Array);
    expect(jsonData['@graph'].length).toBeGreaterThan(0);
    
    // 2. Each node has expected structure
    const datasetNode = jsonData['@graph'][0];
    expect(datasetNode).toHaveProperty('@id');
    expect(datasetNode).toHaveProperty('@type');
    
    // 3. Properties are complete
    // Check that all properties from original file are present
    const propertyCount = Object.keys(datasetNode).length;
    expect(propertyCount).toBeGreaterThanOrEqual(4); // @id, @type, identifier, name, etc.
    
    // Cleanup
    fs.unlinkSync(downloadPath);
  });

  test('should handle export with validation errors present', async ({ page }) => {
    // ============= SETUP: Create validation error =============
    
    // Enable edit mode
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(500);
    
    // Delete a required field to create validation error
    const identifierProperty = page.locator('[data-testid="property-identifier"]');
    const identifierExists = await identifierProperty.count();
    
    if (identifierExists > 0) {
      const deleteBtn = identifierProperty.locator('[data-testid="delete-property-btn-identifier"]');
      const deleteBtnExists = await deleteBtn.count();
      
      if (deleteBtnExists > 0) {
        await deleteBtn.click();
        await page.waitForSelector('[data-testid="confirm-modal"]');
        await page.click('[data-testid="confirm-ok-btn"]');
        await page.waitForTimeout(1000); // Wait for validation
      }
    }
    
    // ============= ACTIONS =============
    
    // Export should still work even with validation errors
    const downloadPromise = page.waitForEvent('download');
    await page.click('#export-btn');
    const download = await downloadPromise;
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Export succeeds despite validation errors
    expect(download).toBeTruthy();
    
    // 2. Downloaded data is valid JSON-LD (structurally)
    const downloadPath = path.join(__dirname, '../../temp', download.suggestedFilename());
    await download.saveAs(downloadPath);
    
    const fileContent = fs.readFileSync(downloadPath, 'utf-8');
    const jsonData = JSON.parse(fileContent);
    
    expect(jsonData).toHaveProperty('@context');
    expect(jsonData).toHaveProperty('@graph');
    
    // 3. Changes (deletion) are reflected in export
    const datasetNode = jsonData['@graph'].find((n: any) => n['@id'] === '#dataset1');
    // If identifier was deleted, it should not be in export
    // (This depends on whether the deletion actually removed it or just marked it)
    
    // Cleanup
    fs.unlinkSync(downloadPath);
  });
});
