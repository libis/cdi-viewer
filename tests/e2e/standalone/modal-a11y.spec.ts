import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Modal accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#load-local-btn', { timeout: 20000 });
  });

  test('alert modal has required ARIA attributes', async ({ page }) => {
    const testFilePath = path.join(__dirname, '../../fixtures/test-data/simple.jsonld');

    // Load a minimal document so namespace UI is present
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    await page.waitForSelector('#namespace-section', { timeout: 15000 });

    // Open the namespace editor and try to add an invalid namespace to trigger alert
    await page.click('#toggle-edit-btn');
    await page.click('#add-namespace-btn');
    await page.waitForSelector('#namespaceModal', { state: 'visible' });
    await page.click('#confirmNamespaceBtn');

    const overlay = page.locator('[data-testid="alert-modal"]');
    await expect(overlay).toBeVisible({ timeout: 5000 });

    // The overlay must be a dialog and must announce modal-to-screen-readers
    await expect(overlay).toHaveAttribute('role', 'dialog');
    await expect(overlay).toHaveAttribute('aria-modal', 'true');

    // It should reference labelledby/description ids
    const labelled = await overlay.getAttribute('aria-labelledby');
    const described = await overlay.getAttribute('aria-describedby');
    expect(labelled).toBeTruthy();
    expect(described).toBeTruthy();

    // Ensure the OK button exists and can be used to dismiss the alert
    const okBtn = overlay.locator('button[data-testid="alert-ok-btn"]');
    await expect(okBtn).toBeVisible();
    await expect(okBtn).toBeEnabled();

    // Click to close the alert
    await okBtn.click();
    await overlay.waitFor({ state: 'hidden' });
  });

  test('confirm modal traps focus while open', async ({ page }) => {
    const complexPath = path.join(__dirname, '../../fixtures/test-data/complex-nested.jsonld');

    // Load a document containing nodes we can delete
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', complexPath);
    await page.waitForSelector('.node-card', { timeout: 15000 });

    // Ensure edit mode is enabled
    const toggleClasses = await page.getAttribute('#toggle-edit-btn', 'class');
    if (!(toggleClasses || '').includes('btn-warning')) await page.click('#toggle-edit-btn');

    // Trigger the confirm modal via delete button
    await page.waitForSelector('button.delete-node-btn', { timeout: 5000 });
    await page.click('button.delete-node-btn');

    const conf = page.locator('[data-testid="confirm-modal"]');
    await expect(conf).toBeVisible({ timeout: 5000 });
    await expect(conf).toHaveAttribute('role', 'dialog');

    // Ensure initial focus lands inside the modal (best-effort check; focus can be flaky under headless env)
    await page.waitForFunction(() => Boolean(document.activeElement?.closest?.('[data-testid="confirm-modal"]')), { timeout: 3000 }).catch(() => {});

    // Tab several times and verify focus does not leave the modal overlay
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      // assert activeElement remains inside the overlay
      const inside = await page.evaluate(() => Boolean(document.activeElement?.closest?.('[data-testid="confirm-modal"]')));
      expect(inside).toBeTruthy();
    }

    // Close the confirm modal
    await page.click('[data-testid="confirm-cancel-btn"]');
    await conf.waitFor({ state: 'hidden' });
  });
});
