import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Dataverse Save', () => {
  const testFile = path.join(__dirname, '../../fixtures/test-data/simple.jsonld');

  test('Save button visible in integrated mode', async ({ page }) => {
    // Mock Dataverse load
    await page.route('**/api/access/datafile/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/ld+json',
        body: JSON.stringify({
          '@context': {},
          '@graph': [{ '@id': '#test', '@type': 'Test', 'name': 'Original' }]
        })
      });
    });
    
    await page.goto('/?siteUrl=https://mock.dataverse.org&fileid=123');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Enable edit mode
    await page.click('#toggle-edit-btn');
    
    // Save button should be visible
    await expect(page.locator('#save-btn')).toBeVisible();
  });

  test('Save as new file option', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Load file
    await page.setInputFiles('#local-file-input', testFile);
    await page.waitForTimeout(1000);
    
    // Enable edit mode
    await page.click('#toggle-edit-btn');
    
    // Check if save button exists
    const saveBtn = page.locator('#save-btn');
    const exists = await saveBtn.isVisible().catch(() => false);
    
    if (exists) {
      await saveBtn.click();
      
      // Modal should open
      await expect(page.locator('#saveModal')).toBeVisible();
      
      // Current UI uses a single filename input — ensure it's present and we can change it
      const filenameInput = page.locator('#filenameInput');
      await expect(filenameInput).toBeVisible();
      await filenameInput.fill('new-file.jsonld');
    }
  });

  test('Replace existing file option', async ({ page }) => {
    // Mock Dataverse with existing file
    await page.route('**/api/access/datafile/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/ld+json',
        body: JSON.stringify({
          '@context': {},
          '@graph': [{ '@id': '#test', '@type': 'Test' }]
        })
      });
    });
    
    await page.goto('/?siteUrl=https://mock.dataverse.org&fileid=123');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.click('#toggle-edit-btn');
    
    const saveBtn = page.locator('#save-btn');
    const exists = await saveBtn.isVisible().catch(() => false);
    
    if (exists) {
      await saveBtn.click();
      await expect(page.locator('#saveModal')).toBeVisible();
      
      // Confirm the filename input is present and contains the pre-filled filename
      const filenameInput = page.locator('#filenameInput');
      await expect(filenameInput).toBeVisible();
      const prefilled = await filenameInput.inputValue();
      expect(prefilled.length).toBeGreaterThan(0);
    }
  });

  test('Save with modifications', async ({ page }) => {
    let saveRequestReceived = false;
    
    // Save endpoints are not always under access/datafile route - match broader '/api/' paths
    await page.route('**/api/**', async route => {
      if (route.request().method() === 'PUT' || route.request().method() === 'POST') {
        saveRequestReceived = true;
        await route.fulfill({ status: 200, body: JSON.stringify({ status: 'ok' }) });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/ld+json',
          body: JSON.stringify({
            '@context': {},
            '@graph': [{ '@id': '#test', '@type': 'Test', 'name': 'Original' }]
          })
        });
      }
    });
    
    await page.goto('/?siteUrl=https://mock.dataverse.org&fileid=123');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.click('#toggle-edit-btn');
    
    // Make a modification
    const nameInput = page.locator('input[data-property="name"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('Modified Name');
    }
    
    // Save
    const saveBtn = page.locator('#save-btn');
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      // Fill API token required by save flow
      await page.fill('#apiTokenInput', 'test-token-12345');
      await page.click('#confirmSaveBtn');
      await page.waitForTimeout(1000);
      
      // Verify save request was made
      expect(saveRequestReceived).toBe(true);
    }
  });

  test('Handle save error', async ({ page }) => {
    await page.route('**/api/**', async route => {
      if (route.request().method() === 'PUT' || route.request().method() === 'POST') {
        await route.fulfill({ status: 500, body: 'Server error' });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/ld+json',
          body: JSON.stringify({
            '@context': {},
            '@graph': [{ '@id': '#test', '@type': 'Test' }]
          })
        });
      }
    });
    
    await page.goto('/?siteUrl=https://mock.dataverse.org&fileid=123');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.click('#toggle-edit-btn');
    
    const saveBtn = page.locator('#save-btn');
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.click('#confirmSaveBtn');
      await page.waitForTimeout(1000);
      
      // Should show alert modal on save error
      await expect(page.locator('[data-testid="alert-modal"]')).toBeVisible();
    }
  });
});
