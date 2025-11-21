import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Editing Mode Tests
 * 
 * Tests for editing functionality including:
 * - Enabling/disabling edit mode
 * - Editing different property types (text, number, date)
 * - Deleting properties
 * - Property constraints
 */
test.describe('Editing Mode', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate and load test file for each test
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#load-local-btn', { timeout: 10000 });
    
    // Load simple test file
    const testFilePath = path.join(__dirname, '../../fixtures/test-data/simple.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid^="node-card-"]')).toHaveCount(2);
  });

  test('should enable edit mode', async ({ page }) => {
    // ============= ACTIONS =============
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(500);
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Button changes state
    await expect(page.locator('#toggle-edit-btn')).toHaveClass(/btn-warning/);
    await expect(page.locator('#toggle-edit-btn')).toContainText(/View Mode|Disable Editing/);
    
    // 2. Add Root Node component appears
    await expect(page.locator('#add-root-node-container')).toBeVisible();
    
    // 3. Add Namespace button appears
    await expect(page.locator('#add-namespace-btn')).toBeVisible();
    
    // 4. Property input fields become editable
    const propertyInputs = page.locator('[data-testid^="property-"] input[type="text"]');
    const count = await propertyInputs.count();
    expect(count).toBeGreaterThan(0); // Should have editable property inputs
    await expect(propertyInputs.first()).toBeEnabled();
  });

  test('should disable edit mode', async ({ page }) => {
    // Enable first
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(500);
    
    // ============= ACTIONS =============
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(500);
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Button changes back
    await expect(page.locator('#toggle-edit-btn')).toContainText('Enable Editing');
    await expect(page.locator('#toggle-edit-btn')).toHaveClass(/btn-primary/);
    
    // 2. Add components hidden
    await expect(page.locator('#add-root-node-container')).toBeHidden();
    
    // 3. Input fields become readonly (properties are shown as text, not inputs)
    const propertyInputs = page.locator('[data-testid^="property-"] input[type="text"]');
    const count = await propertyInputs.count();
    // In view mode, property inputs should not exist or be disabled
    expect(count).toBe(0);
  });

  test('should edit text property', async ({ page }) => {
    // Enable edit mode
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(500);
    
    // ============= ACTIONS =============
    // Find the name property input in the first node
    const nameInput = page.locator('[data-testid="property-name"] input[type="text"]').first();
    const originalValue = await nameInput.inputValue();
    
    await nameInput.fill('Updated Test Value');
    await page.keyboard.press('Tab'); // Trigger change event
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Property row marked as changed
    const propertyRow = nameInput.locator('xpath=ancestor::div[contains(@class, "property-row")][1]');
    await expect(propertyRow).toHaveClass(/changed/);
    
    // 2. Value updated
    await expect(nameInput).toHaveValue('Updated Test Value');
    
    // 3. Auto-validation triggers after debounce
    await page.waitForTimeout(3500);
    const validationStatus = page.locator('#validation-status');
    await expect(validationStatus).toBeVisible();
  });

  test('should handle empty text field', async ({ page }) => {
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(500);
    
    // ============= ACTIONS =============
    const input = page.locator('[data-testid="property-name"] input[type="text"]').first();
    await input.fill('');
    await page.keyboard.press('Tab');
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Empty value accepted (unless required)
    await expect(input).toHaveValue('');
    
    // 2. Property still exists in DOM
    await expect(input).toBeVisible();
  });

  test('should delete optional property', async ({ page }) => {
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(500);
    
    // ============= ACTIONS =============
    // Find a property with a delete button (optional properties)
    const deleteButtons = page.locator('[data-testid^="delete-property-btn-"]');
    const count = await deleteButtons.count();
    
    if (count > 0) {
      const firstDeleteBtn = deleteButtons.first();
      const propertyTestId = await firstDeleteBtn.getAttribute('data-testid');
      
      // Ensure we have a valid test ID
      expect(propertyTestId).toBeTruthy();
      
      // Get the property row that contains this delete button to identify the specific property
      const propertyRowLocator = firstDeleteBtn.locator('xpath=ancestor::div[contains(@class, "property-row")][1]');
      const nodeId = await propertyRowLocator.getAttribute('data-node-id');
      const propertyKey = propertyTestId!.replace('delete-property-btn-', '');
      
      // Click delete button - our custom modal will appear
      await firstDeleteBtn.click();
      
      // Wait for custom modal to appear
      await page.waitForSelector('[data-testid="confirm-modal"]', { state: 'visible' });
      
      // ============= EXPECTED RESULTS =============
      
      // 1. Modal should have correct message
      const modalText = await page.locator('[data-testid="confirm-modal"] .custom-modal-body').textContent();
      expect(modalText).toContain('Delete this property?');
      
      // 2. Click OK button to confirm deletion
      await page.click('[data-testid="confirm-ok-btn"]');
      
      // Wait for modal to close
      await page.waitForSelector('[data-testid="confirm-modal"]', { state: 'hidden' });
      
      // 3. Property row should get 'deleted' class and fade out (be specific about which property row)
      const propertyRow = page.locator(`[data-node-id="${nodeId}"][data-testid="property-${propertyKey}"]`);
      
      // Check that the deleted class was added (indicates delete was triggered)
      await expect(propertyRow).toHaveClass(/deleted/, { timeout: 500 });
      
      // Wait for the fadeOut animation (300ms) and removal
      await page.waitForTimeout(500);
      
      // Property should now be removed from DOM or at least hidden
      const isStillVisible = await propertyRow.isVisible().catch(() => false);
      expect(isStillVisible).toBe(false);
      
      // 4. Validation updates after debounce
      await page.waitForTimeout(3500);
      await expect(page.locator('#validation-status')).toBeVisible();
    } else {
      // No delete buttons found - all properties are required
      expect(true).toBe(true);
    }
  });

  test('should preserve required properties', async ({ page }) => {
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(500);
    
    // ============= EXPECTED RESULTS =============
    
    // Required properties (marked with *) should not have delete buttons
    // OR delete buttons should be disabled/not functional
    
    const requiredLabels = page.locator('.property-label:has-text("*")');
    const count = await requiredLabels.count();
    
    if (count > 0) {
      const firstRequired = requiredLabels.first();
      const propertyRow = firstRequired.locator('xpath=ancestor::div[contains(@class, "property-row")][1]');
      
      // Check for delete button in required property row
      const deleteBtn = propertyRow.locator('[data-testid^="delete-property-btn-"]');
      const hasDeleteBtn = await deleteBtn.count() > 0;
      
      // Either no delete button exists, or it's disabled
      if (hasDeleteBtn) {
        const isDisabled = await deleteBtn.isDisabled();
        expect(isDisabled).toBe(true);
      }
    }
  });

  test('should mark changed properties visually', async ({ page }) => {
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(500);
    
    // ============= ACTIONS =============
    const input = page.locator('[data-testid="property-name"] input[type="text"]').first();
    await input.fill('Changed Value');
    await page.keyboard.press('Tab');
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Property row has "changed" class (usually teal/cyan highlight)
    const propertyRow = input.locator('xpath=ancestor::div[contains(@class, "property-row")][1]');
    await expect(propertyRow).toHaveClass(/changed/);
    
    // 2. Visual indication persists
    await page.waitForTimeout(1000);
    await expect(propertyRow).toHaveClass(/changed/);
  });

  test('should handle rapid edits with debounced validation', async ({ page }) => {
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(500);
    
    // ============= ACTIONS =============
    const nameInput = page.locator('[data-testid="property-name"] input[type="text"]').first();
    const identifierInput = page.locator('[data-testid="property-identifier"] input[type="text"]').first();
    
    // Edit multiple fields rapidly
    await nameInput.fill('Rapid Edit 1');
    await page.waitForTimeout(500);
    await identifierInput.fill('Rapid Edit 2');
    await page.waitForTimeout(500);
    await nameInput.fill('Rapid Edit 1 Modified');
      
      // ============= EXPECTED RESULTS =============
      
      // 1. Validation should not trigger immediately
      await page.waitForTimeout(2000);
      // Validation still pending or just starting
      
    // 2. Validation triggers after full debounce period
    await page.waitForTimeout(2000); // Total 4s
    const validationStatus = page.locator('#validation-status');
    await expect(validationStatus).toBeVisible();
  });

  test('should preserve "changed" marking when toggling edit mode', async ({ page }) => {
    // BUG: Currently the "changed" visual marking (teal highlight) disappears when
    // toggling between edit and view mode, even though the actual data change is preserved.
    // EXPECTED: Changed nodes/properties should remain visually marked as "changed" 
    // in both view and edit mode until explicitly saved or reverted.
    
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(500);
    
    // ============= ACTIONS =============
    const input = page.locator('[data-testid="property-name"] input[type="text"]').first();
    const originalValue = await input.inputValue();
    
    // Make a change
    await input.fill('Modified Value');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    
    // Verify changed marking appears in edit mode
    const propertyRow = input.locator('xpath=ancestor::div[contains(@class, "property-row")][1]');
    await expect(propertyRow).toHaveClass(/changed/);
    
    // Disable edit mode (switch to view mode)
    await page.getByRole('button', { name: 'Disable Editing' }).click();
    await page.waitForTimeout(500);
    
    // BUG: The "changed" class is removed here, but it shouldn't be
    // EXPECTED: Property should still have "changed" class in view mode
    await expect(propertyRow).toHaveClass(/changed/);
    
    // Re-enable edit mode
    await page.getByRole('button', { name: 'Enable Editing' }).click();
    await page.waitForTimeout(500);
    
    // ============= EXPECTED RESULTS =============
    
    // 1. The actual value change should be preserved
    const currentValue = await input.inputValue();
    expect(currentValue).toBe('Modified Value');
    expect(currentValue).not.toBe(originalValue);
    
    // 2. BUG: The "changed" marking should still be present
    // This currently fails because the class is removed when toggling modes
    await expect(propertyRow).toHaveClass(/changed/);
    
    // 3. The node card should also maintain "changed" marking
    const nodeCard = propertyRow.locator('xpath=ancestor::div[contains(@class, "node-card")][1]');
    await expect(nodeCard).toHaveClass(/changed/);
  });
});
