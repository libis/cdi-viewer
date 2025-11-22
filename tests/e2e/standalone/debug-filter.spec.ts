import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Debug Filter Issue', () => {
  test('log all node visibility and parent relationships', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const complexFilePath = path.join(__dirname, '../../../examples/cdi/SimpleSample.jsonld');
    await page.setInputFiles('#local-file-input', complexFilePath);
    await page.waitForSelector('.node-card', { timeout: 5000 });
    
    // Wait for graph structure to be built
    await page.waitForTimeout(1000);
    
    // Get the parent map from the page
    const parentMap = await page.evaluate(() => {
      // @ts-ignore
      return Object.fromEntries(window.CDIEditor?.graphStructure?.getParentMap?.() || new Map());
    });
    
    console.log('\n📊 PARENT MAP:');
    console.log(JSON.stringify(parentMap, null, 2));
    
    // Check which nodes are considered root nodes
    const rootNodes = await page.evaluate(() => {
      // @ts-ignore
      return window.CDIEditor?.graphStructure?.getRootNodeIds?.() || [];
    });
    
    console.log('\n🌳 ROOT NODES:');
    console.log(JSON.stringify(rootNodes, null, 2));
    
    // Now apply search
    console.log('\n🔍 APPLYING SEARCH: Sample_ID_Substantive_Value_Domain');
    await page.fill('#search-input', 'Sample_ID_Substantive_Value_Domain');
    await page.waitForTimeout(1000);
    
    // Get all node IDs and their visibility
    const nodeVisibility = await page.evaluate(() => {
      const results: Record<string, any> = {};
      document.querySelectorAll('.node-card').forEach(card => {
        const nodeId = card.getAttribute('data-node-id') || 'unknown';
        results[nodeId] = {
          hasHiddenClass: card.classList.contains('hidden-by-filter'),
          displayStyle: (card as HTMLElement).style.display,
          computedDisplay: window.getComputedStyle(card).display
        };
      });
      return results;
    });
    
    console.log('\n👁️  NODE VISIBILITY AFTER SEARCH:');
    Object.entries(nodeVisibility).forEach(([nodeId, info]) => {
      const visible = info.computedDisplay !== 'none';
      console.log(`${visible ? '✅' : '❌'} ${nodeId}: hidden-by-filter=${info.hasHiddenClass}, display=${info.computedDisplay}`);
    });
    
    // Get ancestors of the matching node
    const ancestors = await page.evaluate(() => {
      // @ts-ignore
      const getAncestors = window.CDIEditor?.graphStructure?.getAncestors;
      if (!getAncestors) return [];
      const ancestorSet = getAncestors('#Sample_ID_Substantive_Value_Domain');
      return Array.from(ancestorSet);
    });
    
    console.log('\n👪 ANCESTORS OF #Sample_ID_Substantive_Value_Domain:');
    console.log(JSON.stringify(ancestors, null, 2));
    
    // Fail the test to see the output
    expect(true).toBe(false);
  });
});
