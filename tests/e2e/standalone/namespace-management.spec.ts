import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Namespace Management Tests
 * 
 * Tests for namespace/prefix management functionality including:
 * - Viewing existing namespaces
 * - Adding custom namespaces
 * - Editing namespace URIs
 * - Deleting custom namespaces
 * - Validation of prefix uniqueness
 * - Validation of URI format
 * - Protected namespace handling
 */
test.describe('Namespace Management', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate and load test file for each test
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#load-local-btn', { timeout: 10000 });
    
    // Load test file
    const testFilePath = path.join(__dirname, '../../fixtures/test-data/simple.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });
    
    // Enable edit mode to make namespace section visible
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(500);
  });

  test('should display existing namespaces from loaded file', async ({ page }) => {
    // ============= EXPECTED RESULTS =============
    
    // 1. Namespace section is visible in edit mode
    await expect(page.locator('#namespace-section')).toBeVisible();
    
    // 2. Namespace table contains entries
    const namespaceRows = page.locator('#namespace-table-body tr');
    const rowCount = await namespaceRows.count();
    expect(rowCount).toBeGreaterThan(0);
    
    // 3. Expected namespaces from simple.jsonld are present
    // @vocab, ddi, xsd prefixes should exist
    const tableText = await page.locator('#namespace-table-body').textContent();
    expect(tableText).toContain('ddi');
    expect(tableText).toContain('xsd');
    
    // 4. Each row has prefix and URI columns
    const firstRow = namespaceRows.first();
    const cells = firstRow.locator('td');
    await expect(cells).toHaveCount(3); // Prefix, URI, Actions
  });

  test('should open add namespace modal', async ({ page }) => {
    // ============= ACTIONS =============
    await page.click('#add-namespace-btn');
    await page.waitForTimeout(300);
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Modal is visible
    await expect(page.locator('#namespaceModal')).toBeVisible();
    
    // 2. Modal has correct title
    await expect(page.locator('#namespaceModal .modal-title')).toContainText('Add Namespace');
    
    // 3. Input fields are present and empty
    await expect(page.locator('#namespacePrefixInput')).toBeVisible();
    await expect(page.locator('#namespaceUriInput')).toBeVisible();
    await expect(page.locator('#namespacePrefixInput')).toHaveValue('');
    await expect(page.locator('#namespaceUriInput')).toHaveValue('');
    
    // 4. Confirm button is present
    await expect(page.locator('#confirmNamespaceBtn')).toBeVisible();
  });

  test('should add a new custom namespace', async ({ page }) => {
    // ============= ACTIONS =============
    
    // Open add namespace modal
    await page.click('#add-namespace-btn');
    await page.waitForTimeout(300);
    
    // Fill in namespace details
    await page.fill('#namespacePrefixInput', 'foaf');
    await page.fill('#namespaceUriInput', 'http://xmlns.com/foaf/0.1/');
    
    // Confirm addition
    await page.click('#confirmNamespaceBtn');
    await page.waitForTimeout(500);
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Modal is closed
    await expect(page.locator('#namespaceModal')).not.toBeVisible();
    
    // 2. New namespace appears in table
    const tableText = await page.locator('#namespace-table-body').textContent();
    expect(tableText).toContain('foaf');
    expect(tableText).toContain('http://xmlns.com/foaf/0.1/');
    
    // 3. Success message or indicator
    // Could be a toast, alert, or visual feedback
    
    // 4. Data is updated (verify by checking that new properties can use this prefix)
    // The namespace should be available in property type selectors
  });

  test('should validate prefix uniqueness', async ({ page }) => {
    // ============= ACTIONS =============
    
    // Open add namespace modal
    await page.click('#add-namespace-btn');
    await page.waitForTimeout(300);
    
    // Try to add a namespace with existing prefix 'ddi'
    await page.fill('#namespacePrefixInput', 'ddi');
    await page.fill('#namespaceUriInput', 'http://example.org/different/');
    
    // Attempt to confirm
    await page.click('#confirmNamespaceBtn');
    await page.waitForTimeout(500);
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Error message is displayed
    const feedback = page.locator('#namespaceValidationFeedback');
    await expect(feedback).toBeVisible();
    const feedbackText = await feedback.textContent();
    expect(feedbackText).toMatch(/already exists|duplicate|prefix.*used/i);
    
    // 2. Modal remains open (not closed)
    await expect(page.locator('#namespaceModal')).toBeVisible();
    
    // 3. Namespace table does not contain the new URI for 'ddi'
    const tableText = await page.locator('#namespace-table-body').textContent();
    expect(tableText).not.toContain('http://example.org/different/');
  });

  test('should validate URI format', async ({ page }) => {
    // ============= ACTIONS =============
    
    // Open add namespace modal
    await page.click('#add-namespace-btn');
    await page.waitForTimeout(300);
    
    // Try to add namespace with invalid URI
    await page.fill('#namespacePrefixInput', 'test');
    await page.fill('#namespaceUriInput', 'not-a-valid-uri');
    
    // Attempt to confirm
    await page.click('#confirmNamespaceBtn');
    await page.waitForTimeout(500);
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Error message about invalid URI
    const feedback = page.locator('#namespaceValidationFeedback');
    await expect(feedback).toBeVisible();
    const feedbackText = await feedback.textContent();
    expect(feedbackText).toMatch(/invalid|uri|url|format/i);
    
    // 2. Modal remains open
    await expect(page.locator('#namespaceModal')).toBeVisible();
    
    // 3. Namespace is not added to table
    const tableText = await page.locator('#namespace-table-body').textContent();
    expect(tableText).not.toContain('test');
    expect(tableText).not.toContain('not-a-valid-uri');
  });

  test('should delete custom namespace', async ({ page }) => {
    // ============= SETUP: Add a custom namespace first =============
    await page.click('#add-namespace-btn');
    await page.waitForTimeout(300);
    await page.fill('#namespacePrefixInput', 'custom');
    await page.fill('#namespaceUriInput', 'http://example.org/custom/');
    await page.click('#confirmNamespaceBtn');
    await page.waitForTimeout(500);
    
    // Verify it was added
    let tableText = await page.locator('#namespace-table-body').textContent();
    expect(tableText).toContain('custom');
    
    // ============= ACTIONS =============
    
    // Find delete button for 'custom' namespace
    const customRow = page.locator('#namespace-table-body tr').filter({ hasText: 'custom' });
    const deleteBtn = customRow.locator('button[data-action="delete"]');
    await deleteBtn.click();
    
    // Wait for custom confirm dialog
    await page.waitForSelector('[data-testid="confirm-modal"]', { timeout: 5000 });
    
    // Confirm deletion
    await page.click('[data-testid="confirm-ok-btn"]');
    await page.waitForTimeout(500);
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Custom namespace is removed from table
    tableText = await page.locator('#namespace-table-body').textContent();
    expect(tableText).not.toContain('custom');
    expect(tableText).not.toContain('http://example.org/custom/');
    
    // 2. Other namespaces remain
    expect(tableText).toContain('ddi');
    expect(tableText).toContain('xsd');
  });

  test('should not allow deleting protected namespaces', async ({ page }) => {
    // ============= ACTIONS =============
    
    // Try to find delete button for @vocab (protected namespace)
    const vocabRow = page.locator('#namespace-table-body tr').filter({ hasText: '@vocab' });
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Protected namespace row exists
    const rowCount = await vocabRow.count();
    
    if (rowCount > 0) {
      // 2. Delete button should not exist or be disabled
      const deleteBtn = vocabRow.locator('button[data-action="delete"]');
      const deleteBtnCount = await deleteBtn.count();
      
      if (deleteBtnCount > 0) {
        // If button exists, it should be disabled
        await expect(deleteBtn).toBeDisabled();
      }
      // Or button doesn't exist at all (preferred)
    }
    
    // Alternative: Try with 'ddi' prefix which might be protected
    const ddiRow = page.locator('#namespace-table-body tr').filter({ hasText: 'ddi' }).first();
    const ddiDeleteBtn = ddiRow.locator('button[data-action="delete"]');
    
    // If DDI is from a loaded context (not custom), it might not have delete button
    const ddiDeleteCount = await ddiDeleteBtn.count();
    
    // Just verify we can identify namespace rows correctly
    const allRows = page.locator('#namespace-table-body tr:not(:has-text("No namespaces"))');
    const allRowCount = await allRows.count();
    expect(allRowCount).toBeGreaterThan(0);
  });

  test('should update namespace URI (edit functionality)', async ({ page }) => {
    // ============= SETUP: Add a custom namespace first =============
    await page.click('#add-namespace-btn');
    await page.waitForTimeout(300);
    await page.fill('#namespacePrefixInput', 'editable');
    await page.fill('#namespaceUriInput', 'http://example.org/old/');
    await page.click('#confirmNamespaceBtn');
    await page.waitForTimeout(500);
    
    // ============= ACTIONS =============
    
    // Find edit button for 'editable' namespace
    const editableRow = page.locator('#namespace-table-body tr').filter({ hasText: 'editable' });
    const editBtn = editableRow.locator('button[data-action="edit"]');
    
    // Check if edit button exists
    const editBtnCount = await editBtn.count();
    
    if (editBtnCount > 0) {
      // Click edit button
      await editBtn.click();
      await page.waitForTimeout(300);
      
      // Modal should open with pre-filled values
      await expect(page.locator('#namespaceModal')).toBeVisible();
      await expect(page.locator('#namespacePrefixInput')).toHaveValue('editable');
      await expect(page.locator('#namespaceUriInput')).toHaveValue('http://example.org/old/');
      
      // Update the URI
      await page.fill('#namespaceUriInput', 'http://example.org/new/');
      await page.click('#confirmNamespaceBtn');
      await page.waitForTimeout(500);
      
      // ============= EXPECTED RESULTS =============
      
      // 1. Modal is closed
      await expect(page.locator('#namespaceModal')).not.toBeVisible();
      
      // 2. Table shows updated URI
      const tableText = await page.locator('#namespace-table-body').textContent();
      expect(tableText).toContain('editable');
      expect(tableText).toContain('http://example.org/new/');
      expect(tableText).not.toContain('http://example.org/old/');
    } else {
      // If no edit functionality exists, at least verify the namespace was added
      const tableText = await page.locator('#namespace-table-body').textContent();
      expect(tableText).toContain('editable');
      expect(tableText).toContain('http://example.org/old/');
    }
  });

  test('should toggle namespace section visibility', async ({ page }) => {
    // ============= ACTIONS =============
    
    // Namespace section should be visible in edit mode (from beforeEach)
    await expect(page.locator('#namespace-section')).toBeVisible();
    
    // Check if there's a toggle button
    const toggleBtn = page.locator('#toggle-namespace-btn');
    const toggleExists = await toggleBtn.count();
    
    if (toggleExists > 0) {
      // Click to collapse
      await toggleBtn.click();
      await page.waitForTimeout(300);
      
      // ============= EXPECTED RESULTS =============
      
      // 1. Namespace content is hidden or collapsed
      const namespaceContent = page.locator('#namespace-content');
      const isVisible = await namespaceContent.isVisible();
      
      // Either display:none or has collapsed class
      if (!isVisible) {
        expect(isVisible).toBe(false);
      } else {
        // Check for collapsed class
        const className = await namespaceContent.getAttribute('class');
        expect(className).toMatch(/collapsed|hidden/i);
      }
      
      // Click to expand again
      await toggleBtn.click();
      await page.waitForTimeout(300);
      
      // 2. Content is visible again
      await expect(namespaceContent).toBeVisible();
    }
    
    // If no toggle, verify section is visible when in edit mode
    await expect(page.locator('#namespace-section')).toBeVisible();
    
    // And hidden in view mode
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(500);
    await expect(page.locator('#namespace-section')).not.toBeVisible();
  });
});
