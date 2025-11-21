// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

import { test, expect } from "@playwright/test";

/**
 * Tests for filter combination bugs
 * 
 * BUG DESCRIPTION:
 * When combining validation status filters (valid/invalid/extra/all dropdown)
 * with property status filters (shacl/extra/all radio buttons), the filters
 * break after multiple changes. Specifically:
 * 1. Choose "Valid Only" + "SHACL Only" - works
 * 2. Change to "Invalid Only" - works
 * 3. Change to "Extra Only" - works  
 * 4. Change to "All" (validation) + "All" (property) - should show everything
 * 5. Try changing back to "Valid Only" or "Invalid Only" - BROKEN: nodes stay displayed
 * 
 * The bug appears to be in advanced-filter.js applyFilters() function.
 * After multiple filter changes, the filter state becomes inconsistent and
 * stops properly hiding/showing nodes.
 */

test.describe("Filter Combination Bugs", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    
    // Wait for app to initialize
    await page.waitForSelector('#shape-selector', { timeout: 10000 });
    
    // Load a file with mix of valid and invalid nodes
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', "tests/fixtures/test-data/simple.jsonld");
    
    // Wait for file to load
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });
    await expect(page.locator(".node-card")).toHaveCount(2, { timeout: 5000 });
    
    // Enter edit mode to enable filtering
    await page.getByRole('button', { name: 'Enable Editing' }).click();
    await page.waitForTimeout(500);
    
    // Open filter panel
    await page.click("#toggle-filter-panel");
    await page.waitForTimeout(300);
  });

  test("should maintain filter functionality after multiple validation status changes", async ({ page }) => {
    // Get initial node count
    const initialCount = await page.locator(".node-card:visible").count();
    expect(initialCount).toBeGreaterThan(0);
    
    // Test sequence that causes the bug:
    
    // 1. Set to Valid Only
    await page.selectOption("#validation-filter", "valid");
    await page.waitForTimeout(300);
    const validCount = await page.locator(".node-card:visible").count();
    
    // 2. Change to Invalid Only
    await page.selectOption("#validation-filter", "invalid");
    await page.waitForTimeout(300);
    const invalidCount = await page.locator(".node-card:visible").count();
    
    // 3. Change back to All
    await page.selectOption("#validation-filter", "all");
    await page.waitForTimeout(300);
    const allCount = await page.locator(".node-card:visible").count();
    expect(allCount).toBe(initialCount); // Should show all nodes again
    
    // 4. Try Valid Only again - THIS IS WHERE IT BREAKS
    await page.selectOption("#validation-filter", "valid");
    await page.waitForTimeout(300);
    const validCount2 = await page.locator(".node-card:visible").count();
    
    // EXPECTED: Should filter to valid nodes (same as step 1)
    // ACTUAL BUG: All nodes stay displayed, filter doesn't work anymore
    expect(validCount2).toBe(validCount);
    expect(validCount2).toBeLessThan(allCount); // Should be filtered
  });

  test("should maintain filter functionality after combining validation and property filters", async ({ page }) => {
    const initialCount = await page.locator(".node-card:visible").count();
    
    // Sequence that causes filter combination bug:
    
    // 1. Valid Only + SHACL Only
    await page.selectOption("#validation-filter", "valid");
    await page.check("input[name='property-status'][value='shacl-only']");
    await page.waitForTimeout(300);
    const combo1Count = await page.locator(".node-card:visible").count();
    
    // 2. Invalid Only + SHACL Only
    await page.selectOption("#validation-filter", "invalid");
    await page.waitForTimeout(300);
    const combo2Count = await page.locator(".node-card:visible").count();
    
    // 3. Invalid Only + Extra Only
    await page.check("input[name='property-status'][value='extra-only']");
    await page.waitForTimeout(300);
    const combo3Count = await page.locator(".node-card:visible").count();
    
    // 4. All + All (reset everything)
    await page.selectOption("#validation-filter", "all");
    await page.check("input[name='property-status'][value='all']");
    await page.waitForTimeout(300);
    const allCount = await page.locator(".node-card:visible").count();
    expect(allCount).toBe(initialCount); // Should show everything
    
    // 5. Try Valid Only again - BUG: Should work but doesn't
    await page.selectOption("#validation-filter", "valid");
    await page.waitForTimeout(300);
    const validAgainCount = await page.locator(".node-card:visible").count();
    expect(validAgainCount).toBeLessThan(allCount); // Should be filtered
    
    // 6. Try Invalid Only again - BUG: Should work but doesn't
    await page.selectOption("#validation-filter", "invalid");
    await page.waitForTimeout(300);
    const invalidAgainCount = await page.locator(".node-card:visible").count();
    expect(invalidAgainCount).toBeLessThan(allCount); // Should be filtered
  });

  test("should correctly apply property status filter after multiple changes", async ({ page }) => {
    // This tests the property filter side of the combination
    
    // 1. SHACL Only
    await page.check("input[name='property-status'][value='shacl-only']");
    await page.waitForTimeout(300);
    const shaclOnlyProps = await page.locator(".property-row:visible").count();
    
    // 2. Extra Only
    await page.check("input[name='property-status'][value='extra-only']");
    await page.waitForTimeout(300);
    const extraOnlyProps = await page.locator(".property-row:visible").count();
    
    // 3. All
    await page.check("input[name='property-status'][value='all']");
    await page.waitForTimeout(300);
    const allProps = await page.locator(".property-row:visible").count();
    
    // 4. Try SHACL Only again - should work
    await page.check("input[name='property-status'][value='shacl-only']");
    await page.waitForTimeout(300);
    const shaclOnlyProps2 = await page.locator(".property-row:visible").count();
    
    // Property filter should work consistently
    expect(shaclOnlyProps2).toBe(shaclOnlyProps);
    expect(shaclOnlyProps2).toBeLessThanOrEqual(allProps);
  });

  test("should clear filters properly and restore all nodes", async ({ page }) => {
    const initialCount = await page.locator(".node-card:visible").count();
    
    // Apply various filters
    await page.selectOption("#validation-filter", "valid");
    await page.check("input[name='property-status'][value='shacl-only']");
    await page.waitForTimeout(300);
    
    // Verify filters are applied
    const filteredCount = await page.locator(".node-card:visible").count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
    
    // Clear all filters
    await page.click("#clear-all-filters-btn");
    await page.waitForTimeout(300);
    
    // All nodes should be visible again
    const afterClearCount = await page.locator(".node-card:visible").count();
    expect(afterClearCount).toBe(initialCount);
    
    // Verify filter controls are reset
    const validationFilter = await page.locator("#validation-filter").inputValue();
    expect(validationFilter).toBe("all");
    
    const allRadio = await page.locator("input[name='property-status'][value='all']");
    await expect(allRadio).toBeChecked();
  });

  test("should not have hidden-by-filter class inconsistencies", async ({ page }) => {
    // This test checks the actual DOM state to diagnose the bug
    
    // Initially all nodes should be visible (no hidden-by-filter class)
    const initialHidden = await page.locator(".node-card.hidden-by-filter").count();
    expect(initialHidden).toBe(0);
    
    // Apply Valid Only filter
    await page.selectOption("#validation-filter", "valid");
    await page.waitForTimeout(300);
    
    // Some nodes should have hidden-by-filter class
    const hiddenAfterFilter = await page.locator(".node-card.hidden-by-filter").count();
    expect(hiddenAfterFilter).toBeGreaterThan(0);
    
    // Reset to All
    await page.selectOption("#validation-filter", "all");
    await page.waitForTimeout(300);
    
    // NO nodes should have hidden-by-filter class
    const hiddenAfterReset = await page.locator(".node-card.hidden-by-filter").count();
    expect(hiddenAfterReset).toBe(0);
    
    // Apply filter again
    await page.selectOption("#validation-filter", "invalid");
    await page.waitForTimeout(300);
    
    // Some nodes should be hidden again
    const hiddenAfterSecondFilter = await page.locator(".node-card.hidden-by-filter").count();
    expect(hiddenAfterSecondFilter).toBeGreaterThan(0);
    
    // The bug: After multiple changes, hidden-by-filter class management breaks
    // This test should catch when the class is not properly added/removed
  });

  test("should handle rapid filter changes without breaking", async ({ page }) => {
    const initialCount = await page.locator(".node-card:visible").count();
    
    // Rapidly cycle through filters (simulates user clicking around)
    for (let i = 0; i < 3; i++) {
      await page.selectOption("#validation-filter", "valid");
      await page.waitForTimeout(100);
      await page.selectOption("#validation-filter", "invalid");
      await page.waitForTimeout(100);
      await page.selectOption("#validation-filter", "all");
      await page.waitForTimeout(100);
    }
    
    // After rapid changes, "All" should still show all nodes
    const finalCount = await page.locator(".node-card:visible").count();
    expect(finalCount).toBe(initialCount);
    
    // And filters should still work
    await page.selectOption("#validation-filter", "valid");
    await page.waitForTimeout(300);
    const filteredCount = await page.locator(".node-card:visible").count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test("should maintain consistent filter state in localStorage", async ({ page }) => {
    // Apply filters
    await page.selectOption("#validation-filter", "invalid");
    await page.check("input[name='property-status'][value='extra-only']");
    await page.waitForTimeout(300);
    
    // Check localStorage state
    const filterState = await page.evaluate(() => {
      const state = localStorage.getItem("cdi-viewer-filters");
      return state ? JSON.parse(state) : null;
    });
    
    expect(filterState).not.toBeNull();
    expect(filterState.validation).toBe("invalid");
    expect(filterState.propertyStatus).toBe("extra-only");
    
    // Change filters multiple times
    await page.selectOption("#validation-filter", "valid");
    await page.selectOption("#validation-filter", "all");
    await page.check("input[name='property-status'][value='all']");
    await page.waitForTimeout(300);
    
    // Check state is still consistent
    const newFilterState = await page.evaluate(() => {
      const state = localStorage.getItem("cdi-viewer-filters");
      return state ? JSON.parse(state) : null;
    });
    
    expect(newFilterState.validation).toBe("all");
    expect(newFilterState.propertyStatus).toBe("all");
  });
});
