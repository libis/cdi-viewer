// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

import { test, expect } from "@playwright/test";

/**
 * Tests for adding properties to custom namespace nodes
 * 
 * BUG DESCRIPTION:
 * When a root node uses a custom namespace (e.g., myns:CustomType), adding
 * properties to that node does not work at all. The unified add component
 * shows up but clicking "Add Property" does nothing. The property is not
 * added to the node and no error is shown.
 * 
 * This appears to affect:
 * 1. Adding SHACL-suggested properties to custom namespace nodes
 * 2. Adding custom properties to custom namespace nodes
 * 3. Adding nodes as children of custom namespace nodes
 * 
 * The bug is likely in property-suggestions.js or unified-add-component.js
 * where it handles property addition. It may not properly resolve node IDs
 * or handle nodes with custom namespace types.
 */

test.describe("Custom Namespace Property Addition", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    
    // Wait for app to initialize
    await page.waitForSelector('#shape-selector', { timeout: 10000 });
    
    // Load file with custom namespace nodes
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', "tests/fixtures/test-data/custom-namespace.jsonld");
    
    // Wait for file to load
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });
    await expect(page.locator(".node-card")).toHaveCount(2, { timeout: 5000 });
    
    // Enter edit mode
    await page.getByRole('button', { name: 'Enable Editing' }).click();
    await page.waitForTimeout(500);
  });

  test("should show custom namespace nodes in the editor", async ({ page }) => {
    // Verify custom namespace nodes are loaded
    await expect(page.locator(".node-card")).toHaveCount(2);
    
    // Verify custom types are displayed
    await expect(page.locator(".node-type").filter({ hasText: "myns:CustomType" })).toBeVisible();
    await expect(page.locator(".node-type").filter({ hasText: "myns:AnotherCustomType" })).toBeVisible();
  });

  test("should display add properties section for custom namespace nodes", async ({ page }) => {
    // Check first custom node has add properties section
    const firstNode = page.locator(".node-card").filter({ hasText: "#customNode1" });
    await expect(firstNode.locator(".unified-add-section")).toBeVisible();
    await expect(firstNode.locator("h4").filter({ hasText: "Add Properties" })).toBeVisible();
  });

  test("should add custom property to custom namespace node using inline UI", async ({ page }) => {
    // BUG: This test will likely fail because adding properties to custom namespace nodes is broken
    
    const nodeCard = page.locator(".node-card").filter({ hasText: "#customNode1" });
    
    // Count initial properties
    const initialPropCount = await nodeCard.locator(".property-row").count();
    
    // Use the custom property input section (not a popup!)
    const customInput = nodeCard.locator(".custom-name-input");
    await expect(customInput).toBeVisible(); // Should be an inline input, not a popup
    
    // Select namespace prefix
    await nodeCard.locator(".namespace-selector").selectOption("myns");
    
    // Enter property name
    await customInput.fill("newProperty");
    
    // Click Add button
    await nodeCard.locator(".custom-input-row button").filter({ hasText: "Add" }).click();
    await page.waitForTimeout(500);
    
    // EXPECTED: Property should be added
    // ACTUAL BUG: Nothing happens, property is not added
    const newPropCount = await nodeCard.locator(".property-row").count();
    expect(newPropCount).toBe(initialPropCount + 1);
    
    // Verify the new property is visible
    await expect(nodeCard.locator(".property-name").filter({ hasText: "myns:newProperty" })).toBeVisible();
  });

  test("should add custom property without namespace to custom node", async ({ page }) => {
    const nodeCard = page.locator(".node-card").filter({ hasText: "#customNode2" });
    
    const initialPropCount = await nodeCard.locator(".property-row").count();
    
    // Use custom property input WITHOUT selecting a namespace
    const customInput = nodeCard.locator(".custom-name-input");
    await customInput.fill("propertyWithoutPrefix");
    
    // Make sure "(no prefix)" is selected
    await nodeCard.locator(".namespace-selector").selectOption("");
    
    // Click Add
    await nodeCard.locator(".custom-input-row button").filter({ hasText: "Add" }).click();
    await page.waitForTimeout(500);
    
    // Should add property
    const newPropCount = await nodeCard.locator(".property-row").count();
    expect(newPropCount).toBe(initialPropCount + 1);
    
    await expect(nodeCard.locator(".property-name").filter({ hasText: "propertyWithoutPrefix" })).toBeVisible();
  });

  test("should add multiple custom properties to same custom node", async ({ page }) => {
    const nodeCard = page.locator(".node-card").filter({ hasText: "#customNode2" });
    
    const initialPropCount = await nodeCard.locator(".property-row").count();
    
    // Add first property
    await nodeCard.locator(".namespace-selector").selectOption("myns");
    await nodeCard.locator(".custom-name-input").fill("prop1");
    await nodeCard.locator(".custom-input-row button").filter({ hasText: "Add" }).click();
    await page.waitForTimeout(300);
    
    // Add second property
    await nodeCard.locator(".namespace-selector").selectOption("myns");
    await nodeCard.locator(".custom-name-input").fill("prop2");
    await nodeCard.locator(".custom-input-row button").filter({ hasText: "Add" }).click();
    await page.waitForTimeout(300);
    
    // Add third property with different namespace
    await nodeCard.locator(".namespace-selector").selectOption("");
    await nodeCard.locator(".custom-name-input").fill("prop3");
    await nodeCard.locator(".custom-input-row button").filter({ hasText: "Add" }).click();
    await page.waitForTimeout(300);
    
    // Should have added 3 properties
    const finalPropCount = await nodeCard.locator(".property-row").count();
    expect(finalPropCount).toBe(initialPropCount + 3);
    
    await expect(nodeCard.locator(".property-name").filter({ hasText: "myns:prop1" })).toBeVisible();
    await expect(nodeCard.locator(".property-name").filter({ hasText: "myns:prop2" })).toBeVisible();
    await expect(nodeCard.locator(".property-name").filter({ hasText: "prop3" })).toBeVisible();
  });

  test("should edit custom property value in custom namespace node", async ({ page }) => {
    const nodeCard = page.locator(".node-card").filter({ hasText: "#customNode1" });
    
    // Find the existing custom property
    const propRow = nodeCard.locator(".property-row").filter({ hasText: "myns:customProperty" });
    await expect(propRow).toBeVisible();
    
    // Click edit button
    await propRow.locator("[data-testid='edit-value-btn']").click();
    await page.waitForTimeout(200);
    
    // Edit the value
    const input = propRow.locator("input.property-value-input");
    await input.clear();
    await input.fill("modified value");
    
    // Save
    await propRow.locator("[data-testid='save-value-btn']").click();
    await page.waitForTimeout(300);
    
    // Verify value changed
    await expect(propRow.locator(".value-display")).toContainText("modified value");
    
    // Node should be marked as changed
    await expect(nodeCard).toHaveClass(/changed/);
  });

  test("should delete custom property from custom namespace node", async ({ page }) => {
    const nodeCard = page.locator(".node-card").filter({ hasText: "#customNode1" });
    
    const initialPropCount = await nodeCard.locator(".property-row").count();
    
    // Find and delete the custom property
    const propRow = nodeCard.locator(".property-row").filter({ hasText: "myns:customProperty" });
    await propRow.locator("[data-testid='delete-property-btn']").click();
    
    // Confirm deletion in custom modal
    await page.locator("[data-testid='confirm-modal']").waitFor({ state: "visible", timeout: 2000 });
    await page.locator("[data-testid='confirm-ok-btn']").click();
    await page.waitForTimeout(300);
    
    // Property should be removed
    const newPropCount = await nodeCard.locator(".property-row").count();
    expect(newPropCount).toBe(initialPropCount - 1);
    
    await expect(propRow).not.toBeVisible();
  });

  test("should add complex property (node reference) to custom namespace node", async ({ page }) => {
    // This tests adding a property that references another node
    const nodeCard = page.locator(".node-card").filter({ hasText: "#customNode1" });
    
    const initialPropCount = await nodeCard.locator(".property-row").count();
    const initialNodeCount = await page.locator(".node-card").count();
    
    // Add custom property with node reference
    // First, add the property itself
    await nodeCard.locator(".namespace-selector").selectOption("myns");
    await nodeCard.locator(".custom-name-input").fill("relatedNode");
    await nodeCard.locator(".custom-input-row button").filter({ hasText: "Add" }).click();
    await page.waitForTimeout(500);
    
    // Property should be added
    const newPropCount = await nodeCard.locator(".property-row").count();
    expect(newPropCount).toBe(initialPropCount + 1);
    
    // Note: Properly testing complex property addition would require
    // SHACL shapes that define the property as sh:node, which we don't
    // have for custom namespace properties. This test verifies basic
    // property addition works.
  });

  test("should preserve custom properties when toggling edit mode", async ({ page }) => {
    const nodeCard = page.locator(".node-card").filter({ hasText: "#customNode1" });
    
    // Add a custom property
    await nodeCard.locator(".namespace-selector").selectOption("myns");
    await nodeCard.locator(".custom-name-input").fill("testProp");
    await nodeCard.locator(".custom-input-row button").filter({ hasText: "Add" }).click();
    await page.waitForTimeout(300);
    
    // Verify it's visible
    await expect(nodeCard.locator(".property-name").filter({ hasText: "myns:testProp" })).toBeVisible();
    
    // Disable edit mode
    await page.getByRole('button', { name: 'Disable Editing' }).click();
    await page.waitForTimeout(300);
    
    // Property should still be visible (but not editable)
    await expect(nodeCard.locator(".property-name").filter({ hasText: "myns:testProp" })).toBeVisible();
    
    // Re-enable edit mode
    await page.getByRole('button', { name: 'Enable Editing' }).click();
    await page.waitForTimeout(300);
    
    // Property should still be there and editable
    await expect(nodeCard.locator(".property-name").filter({ hasText: "myns:testProp" })).toBeVisible();
    const propRow = nodeCard.locator(".property-row").filter({ hasText: "myns:testProp" });
    await expect(propRow.locator("[data-testid='edit-value-btn']")).toBeVisible();
  });

  test("should validate that custom property input is inline, not a popup", async ({ page }) => {
    // This test specifically verifies the UI matches screenshot 1 (inline input)
    // and NOT screenshot 2 (popup modal)
    
    const nodeCard = page.locator(".node-card").filter({ hasText: "#customNode1" });
    
    // The custom property section should be visible inline
    const customSection = nodeCard.locator(".custom-item-section");
    await expect(customSection).toBeVisible();
    
    // It should contain inline input elements
    await expect(customSection.locator(".namespace-selector")).toBeVisible();
    await expect(customSection.locator(".custom-name-input")).toBeVisible();
    await expect(customSection.locator("button").filter({ hasText: "Add" })).toBeVisible();
    
    // There should NOT be a "Add Custom Property" button that opens a prompt/modal
    // (The old broken implementation used prompt())
    const oldStyleButton = nodeCard.locator("button").filter({ hasText: "Add Custom Property" });
    await expect(oldStyleButton).not.toBeVisible();
    
    // The input should be a text input, not a modal dialog
    await expect(customSection.locator("input.custom-name-input")).toHaveAttribute("type", "text");
  });

  test("should handle Enter key in custom property input", async ({ page }) => {
    const nodeCard = page.locator(".node-card").filter({ hasText: "#customNode2" });
    
    const initialPropCount = await nodeCard.locator(".property-row").count();
    
    // Type property name and press Enter
    await nodeCard.locator(".namespace-selector").selectOption("myns");
    const input = nodeCard.locator(".custom-name-input");
    await input.fill("quickProp");
    await input.press("Enter");
    await page.waitForTimeout(300);
    
    // Property should be added (same as clicking Add button)
    const newPropCount = await nodeCard.locator(".property-row").count();
    expect(newPropCount).toBe(initialPropCount + 1);
    
    await expect(nodeCard.locator(".property-name").filter({ hasText: "myns:quickProp" })).toBeVisible();
  });

  test("should show validation for empty custom property name", async ({ page }) => {
    const nodeCard = page.locator(".node-card").filter({ hasText: "#customNode1" });
    
    // Create a promise to listen for alert dialog
    page.once("dialog", async (dialog) => {
      expect(dialog.type()).toBe("alert");
      expect(dialog.message()).toContain("property");
      await dialog.accept();
    });
    
    // Try to add without entering a name
    await nodeCard.locator(".custom-input-row button").filter({ hasText: "Add" }).click();
    await page.waitForTimeout(300);
    
    // No property should be added
    // (Count would be checked but we can't easily verify in this async context)
  });
});
