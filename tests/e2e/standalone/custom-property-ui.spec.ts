// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

import { test, expect } from "@playwright/test";

/**
 * Tests for custom property addition UI
 * 
 * BUG DESCRIPTION:
 * Based on the screenshots, there are TWO different UIs for adding custom properties:
 * 
 * SCREENSHOT 1 (CORRECT - inline UI):
 * - Shows "Custom property:" label
 * - Has a namespace selector dropdown: "(no prefix)"
 * - Has an inline text input: "propertyName"
 * - Has a green "+ Add" button
 * - Everything is inline in the page, no popups
 * 
 * SCREENSHOT 2 (BROKEN - popup UI):
 * - Shows "Add Custom Property" button with pencil icon
 * - When clicked, opens a browser prompt() popup
 * - User reports: "does not work at all"
 * 
 * The bug is that some nodes get the old broken popup UI (screenshot 2)
 * instead of the new inline UI (screenshot 1). This may happen when:
 * - There are no SHACL suggestions for the node
 * - The node is a root node vs nested node
 * - The node has certain types or namespaces
 * 
 * The code in render.js has BOTH implementations:
 * - Lines 194-199: Old popup implementation using prompt()
 * - Lines 284-289: Another old popup implementation
 * - unified-add-component.js: New inline implementation
 * 
 * These old implementations should be removed or the logic that decides
 * which UI to show needs to be fixed.
 */

test.describe("Custom Property Addition UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    
    // Wait for app to initialize
    await page.waitForSelector('#shape-selector', { timeout: 10000 });
    
    // Load a simple file
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', "tests/fixtures/test-data/simple.jsonld");
    
    // Wait for file to load
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });
    await expect(page.locator(".node-card")).toHaveCount(2, { timeout: 5000 });
    
    // Enter edit mode
    await page.getByRole('button', { name: 'Enable Editing' }).click();
    await page.waitForTimeout(500);
  });

  test("should use inline UI for adding custom properties, not popup", async ({ page }) => {
    // Check ALL nodes use the inline UI
    const nodes = page.locator(".node-card");
    const count = await nodes.count();
    
    for (let i = 0; i < count; i++) {
      const node = nodes.nth(i);
      
      // Should have inline custom property section
      const customSection = node.locator(".custom-item-section");
      await expect(customSection).toBeVisible();
      
      // Should have namespace selector
      await expect(customSection.locator(".namespace-selector")).toBeVisible();
      
      // Should have inline text input
      await expect(customSection.locator(".custom-name-input")).toBeVisible();
      
      // Should have Add button (not "Add Custom Property")
      await expect(customSection.locator("button").filter({ hasText: "Add" })).toBeVisible();
    }
  });

  test("should NOT have old-style popup button for adding custom properties", async ({ page }) => {
    // The OLD implementation had a button: "Add Custom Property" with glyphicon-edit
    // This button would call prompt() which doesn't work properly
    
    // Check NO nodes have the old button
    const nodes = page.locator(".node-card");
    const count = await nodes.count();
    
    for (let i = 0; i < count; i++) {
      const node = nodes.nth(i);
      
      // Look for old-style button (exact match from old code)
      const oldButton = node.locator("button").filter({ 
        hasText: "Add Custom Property" 
      }).filter({
        has: page.locator("span.glyphicon-edit")
      });
      
      // Should NOT exist
      await expect(oldButton).not.toBeVisible();
    }
  });

  test("nodes without SHACL suggestions should still have inline custom property UI", async ({ page }) => {
    // When a node has no SHACL property suggestions, the old code would
    // fall back to the popup UI. This is wrong - it should still use inline UI.
    
    // Find a node (if any don't have suggestions, they should still have inline UI)
    const nodes = page.locator(".node-card");
    const count = await nodes.count();
    
    for (let i = 0; i < count; i++) {
      const node = nodes.nth(i);
      
      // Whether or not there's a property dropdown, there should be
      // the inline custom property section
      const customSection = node.locator(".custom-item-section");
      await expect(customSection).toBeVisible();
      
      // Verify it's the NEW inline implementation
      await expect(customSection.locator(".custom-input-row")).toBeVisible();
    }
  });

  test("custom property inline UI should match screenshot 1", async ({ page }) => {
    const node = page.locator(".node-card").first();
    const customSection = node.locator(".custom-item-section");
    
    // Should have "Custom property:" label
    await expect(customSection.locator("label").filter({ hasText: "Custom property:" })).toBeVisible();
    
    // Should have namespace selector with "(no prefix)" option
    const namespaceSelect = customSection.locator(".namespace-selector");
    await expect(namespaceSelect).toBeVisible();
    const options = await namespaceSelect.locator("option").allTextContents();
    expect(options).toContain("(no prefix)");
    
    // Should have input with placeholder "propertyName"
    const input = customSection.locator(".custom-name-input");
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute("placeholder", "propertyName");
    
    // Should have green Add button with plus icon
    const addBtn = customSection.locator(".custom-input-row button").filter({ hasText: "Add" });
    await expect(addBtn).toBeVisible();
    await expect(addBtn).toHaveClass(/btn-success/); // Green button
    await expect(addBtn.locator(".glyphicon-plus")).toBeVisible(); // Plus icon
  });

  test("custom property UI should be in a bordered section below property list", async ({ page }) => {
    const node = page.locator(".node-card").first();
    
    // Custom section should have visual separation
    const customSection = node.locator(".custom-item-section");
    await expect(customSection).toBeVisible();
    
    // Should have border-top style (per unified-add-component.js)
    const borderTop = await customSection.evaluate((el) => {
      return window.getComputedStyle(el).borderTopWidth;
    });
    expect(borderTop).not.toBe("0px"); // Should have a border
  });

  test("adding custom property via inline UI should work", async ({ page }) => {
    const node = page.locator(".node-card").first();
    const initialPropCount = await node.locator(".property-row").count();
    
    // Use inline UI to add property
    const customSection = node.locator(".custom-item-section");
    await customSection.locator(".custom-name-input").fill("testProperty");
    await customSection.locator(".custom-input-row button").filter({ hasText: "Add" }).click();
    await page.waitForTimeout(500);
    
    // Property should be added
    const newPropCount = await node.locator(".property-row").count();
    expect(newPropCount).toBe(initialPropCount + 1);
    
    // Verify property is visible
    await expect(node.locator(".property-name").filter({ hasText: "testProperty" })).toBeVisible();
  });

  test("adding custom property with namespace via inline UI should work", async ({ page }) => {
    const node = page.locator(".node-card").first();
    const initialPropCount = await node.locator(".property-row").count();
    
    // Select a namespace prefix (e.g., "schema")
    const customSection = node.locator(".custom-item-section");
    await customSection.locator(".namespace-selector").selectOption("schema");
    await customSection.locator(".custom-name-input").fill("customField");
    await customSection.locator(".custom-input-row button").filter({ hasText: "Add" }).click();
    await page.waitForTimeout(500);
    
    // Property should be added with prefix
    const newPropCount = await node.locator(".property-row").count();
    expect(newPropCount).toBe(initialPropCount + 1);
    
    // Should show as "schema:customField"
    await expect(node.locator(".property-name").filter({ hasText: "schema:customField" })).toBeVisible();
  });

  test("inline UI should clear input after adding property", async ({ page }) => {
    const node = page.locator(".node-card").first();
    const customSection = node.locator(".custom-item-section");
    const input = customSection.locator(".custom-name-input");
    
    // Add a property
    await customSection.locator(".namespace-selector").selectOption("schema");
    await input.fill("testProp");
    await customSection.locator(".custom-input-row button").filter({ hasText: "Add" }).click();
    await page.waitForTimeout(300);
    
    // Input should be cleared
    await expect(input).toHaveValue("");
    
    // Namespace selector should be reset
    const selectedValue = await customSection.locator(".namespace-selector").inputValue();
    expect(selectedValue).toBe(""); // Reset to "(no prefix)"
  });

  test("inline UI should show validation message for empty property name", async ({ page }) => {
    const node = page.locator(".node-card").first();
    const customSection = node.locator(".custom-item-section");
    
    // Set up alert listener
    page.once("dialog", async (dialog) => {
      expect(dialog.type()).toBe("alert");
      expect(dialog.message()).toContain("property");
      expect(dialog.message()).toContain("name");
      await dialog.accept();
    });
    
    // Try to add without entering name
    await customSection.locator(".custom-input-row button").filter({ hasText: "Add" }).click();
    
    // Dialog should have appeared and been handled
    await page.waitForTimeout(300);
  });

  test("namespace selector should have 'Add new namespace' option", async ({ page }) => {
    const node = page.locator(".node-card").first();
    const customSection = node.locator(".custom-item-section");
    const namespaceSelect = customSection.locator(".namespace-selector");
    
    // Should have the "Add new namespace" option
    const options = await namespaceSelect.locator("option").allTextContents();
    expect(options.some(opt => opt.includes("Add new namespace"))).toBeTruthy();
    
    // Selecting it should open the namespace modal
    await namespaceSelect.selectOption("__ADD_NEW__");
    await page.waitForTimeout(300);
    
    // Namespace modal should be visible
    await expect(page.locator("#namespaceModal")).toBeVisible();
  });

  test("all nodes should consistently use the same add property UI", async ({ page }) => {
    // Verify EVERY node uses the inline UI, none use popup
    const nodes = page.locator(".node-card");
    const count = await nodes.count();
    
    expect(count).toBeGreaterThan(0);
    
    for (let i = 0; i < count; i++) {
      const node = nodes.nth(i);
      const nodeId = await node.getAttribute("data-node-id");
      
      // Each node should have unified-add-section
      const unifiedSection = node.locator(".unified-add-section");
      await expect(unifiedSection).toBeVisible({ timeout: 1000 });
      
      // Each should have the inline custom input
      const customSection = node.locator(".custom-item-section");
      await expect(customSection).toBeVisible({ timeout: 1000 });
      
      console.log(`Node ${nodeId}: ✓ Using inline UI`);
    }
  });

  test("inline UI should support keyboard navigation", async ({ page }) => {
    const node = page.locator(".node-card").first();
    const customSection = node.locator(".custom-item-section");
    const input = customSection.locator(".custom-name-input");
    
    // Tab through elements
    await customSection.locator(".namespace-selector").focus();
    await page.keyboard.press("Tab");
    
    // Should focus on input
    await expect(input).toBeFocused();
    
    // Type and press Enter
    await input.fill("keyboardProp");
    await input.press("Enter");
    await page.waitForTimeout(300);
    
    // Should add property (Enter key handler)
    await expect(node.locator(".property-name").filter({ hasText: "keyboardProp" })).toBeVisible();
  });

  test("should not call browser prompt() when adding custom property", async ({ page }) => {
    // Set up to catch any prompt() calls (which indicate the old broken UI)
    let promptCalled = false;
    
    page.on("dialog", async (dialog) => {
      if (dialog.type() === "prompt") {
        promptCalled = true;
        await dialog.dismiss();
      }
    });
    
    // Try to add a custom property through the UI
    const node = page.locator(".node-card").first();
    const customSection = node.locator(".custom-item-section");
    await customSection.locator(".custom-name-input").fill("testProp");
    await customSection.locator(".custom-input-row button").filter({ hasText: "Add" }).click();
    await page.waitForTimeout(500);
    
    // prompt() should NEVER have been called
    expect(promptCalled).toBe(false);
  });
});
