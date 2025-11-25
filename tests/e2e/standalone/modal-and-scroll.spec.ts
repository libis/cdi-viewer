import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Modal and scroll behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#load-local-btn', { timeout: 10000 });
  });

  test('should show alert modal when namespace add inputs are empty', async ({ page }) => {
    // Load a small test document and open namespace modal
    const testFilePath = path.join(__dirname, '../../fixtures/test-data/simple.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    await page.waitForSelector('#namespace-section', { timeout: 10000 });

    // Enable edit mode
    await page.click('#toggle-edit-btn');
    await page.waitForTimeout(200);

    // Open add namespace modal and click confirm with empty inputs
    await page.click('#add-namespace-btn');
    await page.waitForSelector('#namespaceModal', { state: 'visible' });
    await page.click('#confirmNamespaceBtn');

    // Expect an alert modal to appear
    await page.waitForSelector('[data-testid="alert-modal"]', { state: 'visible', timeout: 2000 });
    const modalText = await page.locator('[data-testid="alert-modal"] .custom-modal-body').textContent();
    expect(modalText).toContain('Please provide both prefix and namespace URI');

    // Close the alert and ensure it's gone
    await page.click('[data-testid="alert-ok-btn"]');
    await page.waitForSelector('[data-testid="alert-modal"]', { state: 'hidden' });
  });

  test('jump-to-node buttons scroll the target below the toolbar', async ({ page }) => {
    // Load a complex nested test document that contains multiple nodes and references
    const testFilePath = path.join(__dirname, '../../fixtures/test-data/complex-nested.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    await page.waitForSelector('.node-card', { timeout: 10000 });

    // Ensure toolbar exists and get its bottom position
    const toolbarBottom = await page.evaluate(() => {
      const el = document.querySelector('.toolbar');
      return el ? el.getBoundingClientRect().bottom : 0;
    });

    // Click a jump-to-node button that refers to a node further down the document
    // The fixture contains a #repr2 node; the button data-testid becomes jump-to-node-btn-_repr2
    const jumpBtn = page.locator('button[data-testid="jump-to-node-btn-_repr2"]');
    await expect(jumpBtn).toBeVisible({ timeout: 5000 });

    // Scroll page to top first for deterministic behavior
    await page.evaluate(() => window.scrollTo(0, 0));

    // Click the jump button
    await jumpBtn.click();

    // Allow smooth scroll to settle
    await page.waitForTimeout(600);

    // Get the target node top position
    const targetTop = await page.evaluate(() => {
      const target = document.querySelector('.node-card[data-node-id="#repr2"]');
      return target ? target.getBoundingClientRect().top : -9999;
    });

    // The top of the node should be below the toolbar bottom (plus 1px tolerance)
    expect(targetTop).toBeGreaterThan(toolbarBottom - 1);
  });
});
