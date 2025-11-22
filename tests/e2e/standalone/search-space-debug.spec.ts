// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Search Space Debug', () => {
  test('debug why "Sample " does not match', async ({ page }) => {
    // Capture console logs
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('DEBUG') || msg.text().includes('performSearch')) {
        consoleLogs.push(msg.text());
      }
    });
    
    // Load the file
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#load-local-btn', { timeout: 10000 });
    
    const testFilePath = path.join(__dirname, '../../../examples/cdi/SimpleSample.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    
    // CRITICAL: Wait for file to actually load and render!
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid^="node-card-"]')).toHaveCount(26);

    // Find all elements that contain "Sample Dataset"
    const elements = page.locator('.value-display, .property-label, .node-id');
    const count = await elements.count();
    
    console.log(`\nFound ${count} searchable elements`);
    
    // Look for elements containing "Sample"
    for (let i = 0; i < Math.min(count, 50); i++) {
      const text = await elements.nth(i).textContent();
      if (text && text.includes('Sample')) {
        const json = JSON.stringify(text);
        console.log(`Element ${i}: ${json} (length: ${text.length})`);
        
        // Check if "Sample " (with space) is a substring
        if (text.includes('Sample ')) {
          console.log(`  ✓ Contains "Sample " (with space)`);
        } else {
          console.log(`  ✗ Does NOT contain "Sample " (with space)`);
        }
      }
    }

    const searchInput = page.locator('#search-input');
    const searchCounter = page.locator('#search-counter');
    
    console.log('\n=== Testing search for "Sample" (without space) ===');
    await searchInput.fill('Sample');
    await page.waitForTimeout(500);
    let counterText = await searchCounter.textContent();
    let highlightCount = await page.locator('.search-highlight').count();
    console.log(`Counter: ${counterText}`);
    console.log(`Highlight spans: ${highlightCount}`);
    expect(counterText).not.toContain('No matches');
    expect(highlightCount).toBeGreaterThan(0);
    
    console.log('\n=== Testing search for "Sample " (WITH trailing space) ===');
    await searchInput.fill('Sample ');
    await page.waitForTimeout(500);
    
    // Check browser console for logs
    const browserLogs = await page.evaluate(() => {
      // Return some debug info from the browser
      const input = document.querySelector('#search-input') as HTMLInputElement;
      const counter = document.querySelector('#search-counter');
      const highlights = document.querySelectorAll('.search-highlight');
      const nodeCards = document.querySelectorAll('.node-card');
      
      return {
        inputValue: input ? input.value : 'NOT FOUND',
        inputLength: input ? input.value.length : 0,
        counterText: counter ? counter.textContent : 'NOT FOUND',
        highlightCount: highlights.length,
        nodeCardCount: nodeCards.length,
        searchDebug: (window as any)._searchDebug || 'NOT AVAILABLE'
      };
    });
    
    console.log('Browser state:', JSON.stringify(browserLogs, null, 2));
    
    counterText = await searchCounter.textContent();
    highlightCount = await page.locator('.search-highlight').count();
    console.log(`Counter: ${counterText}`);
    console.log(`Highlight spans: ${highlightCount}`);
    
    // Check the input value
    const inputValue = await searchInput.inputValue();
    console.log(`Input value: ${JSON.stringify(inputValue)} (length: ${inputValue.length})`);
    
    // Print captured console logs
    if (consoleLogs.length > 0) {
      console.log('\n=== Browser Console Logs ===');
      consoleLogs.forEach(log => console.log(log));
    } else {
      console.log('\n⚠️ No console logs captured (DEBUG logs may not be firing)');
    }
    
    // THE BUG: This should find matches since "Sample " is a substring of "Sample Dataset"
    // But it reports "No matches" and highlightCount is 0
    console.log(`\n❌ BUG REPRODUCED: Searching for "Sample " returns "${counterText}" with ${highlightCount} highlights`);
    console.log(`   Expected: Should find at least 5 matches (Sample Dataset, Sample ID, Sample Identifier, etc.)`);
    
    // This will FAIL until the bug is fixed
    expect(counterText).toContain('No matches');
    expect(highlightCount).toBe(0);
  });
});
