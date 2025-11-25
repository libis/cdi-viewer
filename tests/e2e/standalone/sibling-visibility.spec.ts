import { test, expect } from '@playwright/test';

test('test siblings visibility page works and is safe', async ({ page }) => {
  await page.goto('/test-siblings.html');
  await page.waitForLoadState('domcontentloaded');

  await page.click('#testBtn');
  await expect(page.locator('#result')).toContainText('TEST PASSED');

  await page.click('#clearBtn');
  await expect(page.locator('#result')).toContainText('Filters cleared');
});
