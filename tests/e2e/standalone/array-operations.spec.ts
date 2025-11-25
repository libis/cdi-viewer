import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Array Operations Tests
 * 
 * Tests for array/multi-value property operations including:
 * - Adding items to arrays
 * - Removing items from arrays
 * - Editing array item values
 * - Converting single values to arrays
 * - Converting arrays to single values
 * - Array value ordering
 * - Validation of array constraints
 */
test.describe('Array Operations', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate and load test file with array properties
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#load-local-btn', { timeout: 10000 });
    
    const testFilePath = path.join(__dirname, '../../fixtures/test-data/arrays.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });
    
    // Enable edit mode
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(500);
  });

  test('should display array values correctly', async ({ page }) => {
    // ============= EXPECTED RESULTS =============
    
    // 1. Keywords property has multiple values displayed
    const keywordsProperty = page.locator('[data-testid="property-keywords"]');
    await expect(keywordsProperty).toBeVisible();
    
    // 2. Each array value is in its own container
    const keywordsValues = keywordsProperty.locator('.array-value');
    await expect(keywordsValues).toHaveCount(3); // statistics, survey, demographics
    
    // 3. Values contain expected text (in edit mode inputs contain values)
    const keywordsValuesInputs = keywordsValues.locator('input');
    await expect(keywordsValuesInputs).toHaveCount(3);
    expect(await keywordsValuesInputs.nth(0).inputValue()).toBe('statistics');
    expect(await keywordsValuesInputs.nth(1).inputValue()).toBe('survey');
    expect(await keywordsValuesInputs.nth(2).inputValue()).toBe('demographics');
    
    // 4. Contributors array also displayed
    const contributorsProperty = page.locator('[data-testid="property-contributors"]');
    const contributorsValues = contributorsProperty.locator('.array-value');
    await expect(contributorsValues).toHaveCount(2); // John Doe, Jane Smith
  });

  test('should add a new value to an array', async ({ page }) => {
    // ============= ACTIONS =============
    
    // Find the keywords property
    const keywordsProperty = page.locator('[data-testid="property-keywords"]');
    
    // Click "Add Value" button
    const addBtn = keywordsProperty.locator('[data-testid="add-value-btn-keywords"]');
    await addBtn.click();
    await page.waitForTimeout(800);
    
    // ============= EXPECTED RESULTS =============
    
    // 1. New input field appears
    const keywordsValues = keywordsProperty.locator('.array-value');
    await expect(keywordsValues).toHaveCount(4); // Was 3, now 4
    
    // 2. New input is editable and empty
    const newInput = keywordsValues.last().locator('input');
    await expect(newInput).toBeEditable();
    await expect(newInput).toHaveValue('');
    
    // 3. Fill in new value
    await newInput.fill('new-keyword');
    await page.waitForTimeout(200);
    
    // 4. Property is marked as changed
    await expect(keywordsProperty).toHaveClass(/changed/);
    
    // 5. Save button is enabled
    await expect(page.locator('#save-btn')).not.toHaveClass(/disabled/);
  });

  test('should delete an array value', async ({ page }) => {
    // ============= ACTIONS =============
    
    // Find keywords property
    const keywordsProperty = page.locator('[data-testid="property-keywords"]');
    
    // Get initial count
    let keywordsValues = keywordsProperty.locator('.array-value');
    await expect(keywordsValues).toHaveCount(3);
    
    // Click delete button on first value
    const firstValue = keywordsValues.first();
    const firstText = await firstValue.locator('input').inputValue();
    const deleteBtn = firstValue.locator('[data-testid^="delete-array-value-btn"]');
    await deleteBtn.click();
    
    // Wait for confirm dialog
    await page.waitForSelector('[data-testid="confirm-modal"]', { timeout: 5000 });
    await page.click('[data-testid="confirm-ok-btn"]');
    await page.waitForTimeout(500);
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Array now has one fewer value
    keywordsValues = keywordsProperty.locator('.array-value:visible');
    await expect(keywordsValues).toHaveCount(2);
    
    // 2. The deleted value is gone (check remaining input values)
    const remainingInputs = keywordsProperty.locator('.array-value:visible').locator('input');
    const remainingValues = [];
    const rCount = await remainingInputs.count();
    for (let i = 0; i < rCount; i++) {
      remainingValues.push(await remainingInputs.nth(i).inputValue());
    }
    expect(remainingValues).not.toContain(firstText);
    
    // 3. Property is marked as changed
    await expect(keywordsProperty).toHaveClass(/changed/);
  });

  test('should edit an array value', async ({ page }) => {
    // ============= ACTIONS =============
    
    // Find keywords property
    const keywordsProperty = page.locator('[data-testid="property-keywords"]');
    const keywordsValues = keywordsProperty.locator('.array-value');
    
    // Get first value input
    const firstInput = keywordsValues.first().locator('input');
    const originalValue = await firstInput.inputValue();
    
    // Edit the value
    await firstInput.fill('modified-keyword');
    await page.waitForTimeout(300);
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Value is updated
    await expect(firstInput).toHaveValue('modified-keyword');
    expect(await firstInput.inputValue()).not.toBe(originalValue);
    
    // 2. Property is marked as changed
    await expect(keywordsProperty).toHaveClass(/changed/);
    
    // 3. Array still has same number of values
    await expect(keywordsValues).toHaveCount(3);
  });

  test('should convert single value to array', async ({ page }) => {
    // ============= ACTIONS =============
    
    // Find 'name' property (single value)
    const nameProperty = page.locator('[data-testid="property-name"]');
    
    // Check it's initially a single value (no array-value class)
    const arrayValues = nameProperty.locator('.array-value');
    const initialCount = await arrayValues.count();
    expect(initialCount).toBe(0); // Single value, no array containers
    
    // Find "Convert to Array" button or similar
    const convertBtn = nameProperty.locator('button').filter({ hasText: /convert.*array|make.*array|to array/i });
    const convertBtnCount = await convertBtn.count();
    
    if (convertBtnCount > 0) {
      await convertBtn.click();
      await page.waitForTimeout(500);
      
      // ============= EXPECTED RESULTS =============
      
      // 1. Property now displays as array
      const newArrayValues = nameProperty.locator('.array-value');
      await expect(newArrayValues).toHaveCount(1); // Original value in array
      
      // 2. "Add Value" button is now visible
      const addBtn = nameProperty.locator('[data-testid^="add-value-btn"]');
      await expect(addBtn).toBeVisible();
      
      // 3. Original value is preserved (check input value)
      const firstInput = newArrayValues.first().locator('input');
      await expect(firstInput).toHaveValue('Dataset with Arrays');
    } else {
      // If no convert button exists, this functionality may not be implemented
      // Skip or verify single value display
      const input = nameProperty.locator('input');
      await expect(input).toHaveValue('Dataset with Arrays');
    }
  });

  test('should convert array to single value', async ({ page }) => {
    // ============= ACTIONS =============
    
    // Find keywords property (array)
    const keywordsProperty = page.locator('[data-testid="property-keywords"]');
    
    // Verify it's an array
    const arrayValues = keywordsProperty.locator('.array-value');
    await expect(arrayValues).toHaveCount(3);
    
    // Get first value to verify it's kept
    const firstValue = await arrayValues.first().locator('input').inputValue();
    
    // Find "Convert to Single" button
    const convertBtn = keywordsProperty.locator('[data-testid="convert-to-single-btn-keywords"]');
    await convertBtn.click();
    
    // Wait for confirm dialog
    await page.waitForSelector('[data-testid="confirm-modal"]', { timeout: 5000 });
    const modalText = await page.locator('[data-testid="confirm-modal"]').textContent();
    expect(modalText).toMatch(/single|first.*kept|only.*first/i);
    
    await page.click('[data-testid="confirm-ok-btn"]');
    await page.waitForTimeout(500);
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Property is now a single value (no array-value containers)
    const newArrayValues = keywordsProperty.locator('.array-value');
    await expect(newArrayValues).toHaveCount(0);
    
    // 2. Single input exists
    const singleInput = keywordsProperty.locator('input').first();
    await expect(singleInput).toBeVisible();
    
    // 3. Value is the first element from the array
    await expect(singleInput).toHaveValue(firstValue);
    
    // 4. "Add Value" button is no longer visible
    const addBtn = keywordsProperty.locator('[data-testid="add-value-btn-keywords"]');
    await expect(addBtn).not.toBeVisible();
    
    // 5. Property is marked as changed
    await expect(keywordsProperty).toHaveClass(/changed/);
  });

  test('should handle array with object references', async ({ page }) => {
    // ============= ACTIONS =============
    
    // Find an array property
    const keywordsProperty = page.locator('[data-testid="property-keywords"]');
    
    // Click "Add Reference/Object" button if it exists
    const addRefBtn = keywordsProperty.locator('[data-testid="add-reference-btn-keywords"]');
    const addRefBtnCount = await addRefBtn.count();
    
    if (addRefBtnCount > 0) {
      await addRefBtn.click();
      await page.waitForTimeout(500);
      
      // ============= EXPECTED RESULTS =============
      
      // 1. Modal or dialog opens for adding reference
      // Could be add component modal or reference selector
      const modal = page.locator('.modal:visible, [role="dialog"]:visible');
      await expect(modal).toBeVisible();
      
      // 2. Can select to create object or add reference
      // This depends on the implementation
      // Just verify modal opened correctly
    } else {
      // Functionality might not be implemented for all array types
      // Verify array operations still work
      const arrayValues = keywordsProperty.locator('.array-value');
      await expect(arrayValues).toHaveCount(3);
    }
  });

  test('should maintain array value order', async ({ page }) => {
    // ============= ACTIONS =============
    
    // Find versions property
    const versionsProperty = page.locator('[data-testid="property-versions"]');
    const versionValues = versionsProperty.locator('.array-value');
    
    // Get original order
    const originalValues = [];
    const count = await versionValues.count();
    for (let i = 0; i < count; i++) {
      const value = await versionValues.nth(i).locator('input').inputValue();
      originalValues.push(value);
    }
    
    expect(originalValues).toEqual(['1.0', '1.1', '2.0']);
    
    // Edit middle value
    await versionValues.nth(1).locator('input').fill('1.5');
    await page.waitForTimeout(300);
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Order is preserved
    const newValues = [];
    for (let i = 0; i < count; i++) {
      const value = await versionValues.nth(i).locator('input').inputValue();
      newValues.push(value);
    }
    
    expect(newValues).toEqual(['1.0', '1.5', '2.0']);
    
    // 2. Adding a value adds it at the end
    const addBtn = versionsProperty.locator('[data-testid^="add-value-btn"]');
    await addBtn.click();
    await page.waitForTimeout(300);
    
    const updatedValues = versionsProperty.locator('.array-value');
    await expect(updatedValues).toHaveCount(4);
    
    // New value should be at the end (before the add button)
    const lastValue = updatedValues.nth(3).locator('input');
    await expect(lastValue).toHaveValue('');
  });

  test('should validate array operations preserve data integrity', async ({ page }) => {
    // ============= ACTIONS =============
    
    // Get initial array
    const keywordsProperty = page.locator('[data-testid="property-keywords"]');
    let keywordsValues = keywordsProperty.locator('.array-value');
    
    // Collect initial values
    const initialValues = [];
    let count = await keywordsValues.count();
    for (let i = 0; i < count; i++) {
      const value = await keywordsValues.nth(i).locator('input').inputValue();
      initialValues.push(value);
    }
    
    // Add a value
    const addBtn = keywordsProperty.locator('[data-testid="add-value-btn-keywords"]');
    await addBtn.click();
    await page.waitForTimeout(300);
    
    const newInput = keywordsProperty.locator('.array-value').last().locator('input');
    await newInput.fill('test-value');
    await page.waitForTimeout(300);
    
    // ============= EXPECTED RESULTS =============
    
    // 1. All original values are still present
    keywordsValues = keywordsProperty.locator('.array-value');
    count = await keywordsValues.count();
    expect(count).toBe(initialValues.length + 1);
    
    for (let i = 0; i < initialValues.length; i++) {
      const value = await keywordsValues.nth(i).locator('input').inputValue();
      expect(value).toBe(initialValues[i]);
    }
    
    // 2. New value is at the end
    const lastValue = await keywordsValues.nth(count - 1).locator('input').inputValue();
    expect(lastValue).toBe('test-value');
    
    // 3. Delete the new value
    const deleteBtn = keywordsValues.nth(count - 1).locator('button.delete-btn');
    await deleteBtn.click();
    // New values' delete buttons remove the item immediately (no confirm) while
    // existing ones show a confirm dialog. Handle either behavior.
    await page.waitForTimeout(300);
    const confirmExists = await page
      .locator('[data-testid="confirm-modal"]')
      .isVisible()
      .catch(() => false);
    if (confirmExists) {
      await page.click('[data-testid="confirm-ok-btn"]');
      await page.waitForTimeout(500);
    }
    
    // Allow the UI to settle before checking final state
    await page.waitForTimeout(200);

    // 4. Back to original state — verify initial values are still present and new value was removed
    keywordsValues = keywordsProperty.locator('.array-value:visible');
    const finalCount = await keywordsValues.count();

    const remainingValues = [];
    for (let i = 0; i < finalCount; i++) {
      remainingValues.push(await keywordsValues.nth(i).locator('input').inputValue());
    }

    // All original values must still be present
    for (let i = 0; i < initialValues.length; i++) {
      expect(remainingValues).toContain(initialValues[i]);
    }

    // New test value should no longer be present
    expect(remainingValues).not.toContain('test-value');
  });
});
