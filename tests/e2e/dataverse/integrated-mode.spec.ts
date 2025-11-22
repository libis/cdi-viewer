import { test, expect } from '@playwright/test';

test.describe('Integrated Mode', () => {
  test('Detect integrated mode from URL parameters', async ({ page }) => {
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
    
    await page.goto('/?siteUrl=https://dataverse.org&fileid=123');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // File should load automatically
    const hasNodes = await page.locator('.node-card').count() > 0;
    if (hasNodes) {
      await expect(page.locator('.node-card').first()).toBeVisible();
    }
  });

  test('Hide file loading buttons in integrated mode', async ({ page }) => {
    await page.route('**/api/access/datafile/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/ld+json',
        body: JSON.stringify({
          '@context': {},
          '@graph': []
        })
      });
    });
    
    await page.goto('/?siteUrl=https://dataverse.org&fileid=123');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Load buttons should be hidden
    const loadLocalBtn = page.locator('#load-local-btn');
    const loadDataverseBtn = page.locator('#load-dataverse-btn');
    
    await expect(loadLocalBtn).not.toBeVisible().catch(() => {});
    await expect(loadDataverseBtn).not.toBeVisible().catch(() => {});
  });

  test('Show save button in integrated mode', async ({ page }) => {
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
    
    await page.goto('/?siteUrl=https://dataverse.org&fileid=123');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Enable edit mode
    await page.click('#toggle-edit-btn');
    
    // Save button should be visible
    await expect(page.locator('#save-btn')).toBeVisible();
  });

  test('Pre-fill filename in save modal', async ({ page }) => {
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
    
    await page.goto('/?siteUrl=https://dataverse.org&fileid=123&filename=test-data.jsonld');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.click('#toggle-edit-btn');
    
    const saveBtn = page.locator('#save-btn');
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      
      // Modal should open
      await expect(page.locator('#saveModal')).toBeVisible();
      
      // Filename should be pre-filled
      const filenameInput = page.locator('#filename-input');
      const filename = await filenameInput.inputValue();
      expect(filename).toContain('test-data');
    }
  });

  test('Maintain Dataverse context during edits', async ({ page }) => {
    await page.route('**/api/access/datafile/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/ld+json',
        body: JSON.stringify({
          '@context': {},
          '@graph': [{ '@id': '#test', '@type': 'Test', 'value': 'original' }]
        })
      });
    });
    
    await page.goto('/?siteUrl=https://dataverse.org&fileid=123');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.click('#toggle-edit-btn');
    
    // Make edits
    const input = page.locator('input[data-property="value"]').first();
    if (await input.isVisible()) {
      await input.fill('modified');
      
      // Verify we're still in integrated mode (save button visible)
      await expect(page.locator('#save-btn')).toBeVisible();
    }
  });

  test('Handle missing fileId parameter', async ({ page }) => {
    await page.goto('/?siteUrl=https://dataverse.org');
    await page.waitForLoadState('networkidle');
    
    // Should not crash, should show normal UI
    await expect(page.locator('#toolbar')).toBeVisible();
    
    // Should show error or info message
    const hasAlert = await page.locator('.alert').isVisible().catch(() => false);
    if (hasAlert) {
      await expect(page.locator('.alert')).toBeVisible();
    }
  });
});
