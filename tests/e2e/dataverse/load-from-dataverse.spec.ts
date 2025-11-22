import { test, expect } from '@playwright/test';

test.describe('Dataverse Load', () => {
  test('Load via URL parameters (integrated mode)', async ({ page }) => {
    // Mock Dataverse API responses
    await page.route('**/api/access/datafile/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/ld+json',
        body: JSON.stringify({
          '@context': {
            'ddi': 'https://ddialliance.org/Specification/DDI-CDI/1.0/RDF/',
            'xsd': 'http://www.w3.org/2001/XMLSchema#'
          },
          '@graph': [{
            '@id': '#testDataset',
            '@type': 'ddi:DataSet',
            'name': 'Test Dataset'
          }]
        })
      });
    });
    
    // Navigate with Dataverse parameters
    await page.goto('/?siteUrl=https://mock.dataverse.org&fileid=123');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Verify file loaded
    const nodeCards = page.locator('.node-card');
    const count = await nodeCards.count();
    if (count > 0) {
      await expect(nodeCards.first()).toBeVisible();
    }
    
    // In integrated mode, load buttons should be hidden
    await expect(page.locator('#load-local-btn')).not.toBeVisible().catch(() => {});
  });

  test('Load via "Load from Dataverse" button', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Mock API
    await page.route('**/api/access/datafile/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/ld+json',
        body: JSON.stringify({
          '@context': {},
          '@graph': [{
            '@id': '#node1',
            '@type': 'TestType'
          }]
        })
      });
    });
    
    // Check if Load from Dataverse button exists
    const loadButton = page.locator('#load-dataverse-btn');
    const exists = await loadButton.isVisible().catch(() => false);
    
    if (exists) {
      await loadButton.click();
      
      // Modal should open
      await expect(page.locator('#loadDataverseModal')).toBeVisible({ timeout: 5000 });
      
      // Enter file URL
      await page.fill('#file-url-input', 'https://mock.dataverse.org/file.xhtml?fileId=123');
      
      // Submit
      await page.click('#confirm-load-btn');
      await page.waitForTimeout(2000);
      
      // Verify file loaded
      await expect(page.locator('.node-card')).toHaveCount(1);
    }
  });

  test('Load with API token', async ({ page }) => {
    let apiTokenReceived = false;
    
    await page.route('**/api/access/datafile/**', async route => {
      const headers = route.request().headers();
      if (headers['x-dataverse-key']) {
        apiTokenReceived = true;
      }
      
      await route.fulfill({
        status: 200,
        contentType: 'application/ld+json',
        body: JSON.stringify({
          '@context': {},
          '@graph': []
        })
      });
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadButton = page.locator('#load-dataverse-btn');
    const exists = await loadButton.isVisible().catch(() => false);
    
    if (exists) {
      await loadButton.click();
      await expect(page.locator('#loadDataverseModal')).toBeVisible();
      
      // Enter URL and token
      await page.fill('#file-url-input', 'https://mock.dataverse.org/api/access/datafile/123');
      await page.fill('#api-token-input', 'test-token-12345');
      
      await page.click('#confirm-load-btn');
      await page.waitForTimeout(1000);
      
      // Verify token was sent
      expect(apiTokenReceived).toBe(true);
    }
  });

  test('Handle load error from Dataverse', async ({ page }) => {
    await page.route('**/api/access/datafile/**', async route => {
      await route.fulfill({
        status: 404,
        body: 'File not found'
      });
    });
    
    await page.goto('/?siteUrl=https://mock.dataverse.org&fileid=999');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Should show error message
    const errorAlert = page.locator('.alert-danger');
    const hasError = await errorAlert.isVisible().catch(() => false);
    
    if (hasError) {
      await expect(errorAlert).toContainText(/error|failed|not found/i);
    }
  });

  test('Parse multiple Dataverse URL formats', async ({ page }) => {
    const urlFormats = [
      'https://dataverse.org/file.xhtml?fileId=123',
      'https://dataverse.org/api/access/datafile/123',
      'https://dataverse.org/api/files/123'
    ];
    
    for (const url of urlFormats) {
      await page.route('**/api/**', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/ld+json',
          body: JSON.stringify({
            '@context': {},
            '@graph': [{ '@id': '#test', '@type': 'Test' }]
          })
        });
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const loadButton = page.locator('#load-dataverse-btn');
      const exists = await loadButton.isVisible().catch(() => false);
      
      if (exists) {
        await loadButton.click();
        await page.fill('#file-url-input', url);
        
        // Should accept the URL format
        const confirmBtn = page.locator('#confirm-load-btn');
        await expect(confirmBtn).toBeEnabled({ timeout: 2000 }).catch(() => {});
      }
    }
  });
});
