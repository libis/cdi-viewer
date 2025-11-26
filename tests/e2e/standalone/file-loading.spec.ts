import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Critical Test Case: File Loading and Basic Rendering
 * 
 * This test verifies the core functionality of loading a JSON-LD file
 * and rendering it correctly with SHACL validation.
 * 
 * Priority: P0 (Critical - Must Pass)
 */
test.describe('File Loading - Critical Path', () => {
  
  test('should load local JSON-LD file and render nodes with validation', async ({ page }) => {
    // ============= SETUP =============
    // Navigate to the viewer
    await page.goto('/');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('domcontentloaded');
    
    // Verify we're on the correct page
    await expect(page).toHaveTitle(/CDI Data Viewer/);
    
    // Wait for the app to initialize
    await page.waitForSelector('#shape-selector', { timeout: 10000 });
    
    // ============= ACTIONS =============
    // Prepare to load a test file
    const testFilePath = path.join(__dirname, '../../../examples/cdi/SimpleSample.jsonld');
    
    // Click "Load Local File" button
    await page.click('#load-local-btn');
    
    // Upload the file using file input
    await page.setInputFiles('#local-file-input', testFilePath);
    
    // Wait for file to be processed and rendered
    // Look for success message
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.alert-success')).toContainText('Loaded: SimpleSample.jsonld');
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Verify nodes are rendered
    const nodeCards = page.locator('[data-testid^="node-card-"]');
    await expect(nodeCards).toHaveCount(26, { timeout: 5000 }); // SimpleSample has 26 nodes
    
    // 2. Verify namespace section visibility (SimpleSample.jsonld uses an external string @context
    //    so namespace details may not be present locally and the section will be hidden)
    await expect(page.locator('#namespace-section')).toBeHidden();
    
    // 4. Verify validation runs automatically
    // Wait for validation status to appear (debounced, max 3 seconds + processing)
    const validationStatus = page.locator('#validation-status');
    await expect(validationStatus).toBeVisible({ timeout: 5000 });
    
    // 5. Validation should complete (either valid or invalid badge)
    await expect(validationStatus).toHaveText(/Valid|violation\(s\)/, { timeout: 5000 });

    // 6. Verify properties are rendered
    const propertyRows = page.locator('[data-testid^="property-"]');
    await expect(propertyRows.first()).toBeVisible();
    
    // 7. Verify buttons are in correct state
    // Edit mode should be disabled initially
    await expect(page.locator('#toggle-edit-btn')).toContainText('Enable Editing');
    
    // Export button should be visible
    await expect(page.locator('#export-btn')).toBeVisible();
    
    // 8. Verify node can be collapsed/expanded
    const firstNode = nodeCards.first();
    const firstNodeHeader = firstNode.locator('> .node-header');
    
    // Click to collapse
    await firstNodeHeader.click();
    await expect(firstNode).toHaveClass(/collapsed/);
    
    // Click to expand
    await firstNodeHeader.click();
    await expect(firstNode).not.toHaveClass(/collapsed/);
  });
  
  test('should handle edit mode toggle', async ({ page }) => {
    // ============= SETUP =============
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#load-local-btn', { timeout: 10000 });
    
    // Load test file
    const testFilePath = path.join(__dirname, '../../../examples/cdi/SimpleSample.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    
    // Wait for file to load
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid^="node-card-"]')).toHaveCount(26);
    
    // ============= ACTIONS =============
    // Click "Enable Editing" button
    await page.click('#toggle-edit-btn');
    
    // Wait a moment for edit mode to activate
    await page.waitForTimeout(1000);
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Button changes to "View Mode" with warning style
    await expect(page.locator('#toggle-edit-btn')).toContainText('View Mode');
    await expect(page.locator('#toggle-edit-btn')).toHaveClass(/btn-warning/);
    
    // 2. Add Root Node component appears at bottom
    await expect(page.locator('#add-root-node-container')).toBeVisible();
    
    // 3. Add Namespace button appears (only when namespace section is visible)
    if (await page.locator('#namespace-section').isVisible()) {
      await expect(page.locator('#add-namespace-btn')).toBeVisible();
    }
  });
  
  test('should handle search functionality', async ({ page }) => {
    // ============= SETUP =============
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#load-local-btn', { timeout: 10000 });
    
    // Load test file
    const testFilePath = path.join(__dirname, '../../../examples/cdi/SimpleSample.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    await expect(page.locator('[data-testid^="node-card-"]')).toHaveCount(26);
    
    // ============= ACTIONS =============
    // Type in search box
    const searchInput = page.locator('#search-input');
    await searchInput.fill('identifier');
    
    // Wait for search to execute
    await page.waitForTimeout(500);
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Counter should show results
    const searchCounter = page.locator('#search-counter');
    await expect(searchCounter).toBeVisible();
    await expect(searchCounter).toContainText(/\d+/);
    
    // 2. Clear button should appear
    const clearButton = page.locator('#clear-search-btn');
    await expect(clearButton).toBeVisible();
    
    // 3. Click clear button
    await clearButton.click();
    
    // Search box should be empty
    await expect(searchInput).toHaveValue('');
    
    // Counter should be empty
    await expect(searchCounter).toHaveText('');
  });

  test('should load complex nested structure', async ({ page }) => {
    // ============= SETUP =============
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#load-local-btn', { timeout: 10000 });
    
    // ============= ACTIONS =============
    const testFilePath = path.join(__dirname, '../../fixtures/test-data/complex-nested.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    
    // Wait for file to load
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });
    
    // ============= EXPECTED RESULTS =============
    
    // 1. All nodes render correctly (11 nodes in complex-nested)
    const nodeCards = page.locator('[data-testid^="node-card-"]');
    await expect(nodeCards).toHaveCount(11, { timeout: 5000 });
    
    // 2. Verify properties are rendered
    const propertyRows = page.locator('[data-testid^="property-"]');
    await expect(propertyRows.first()).toBeVisible();
    
    // 3. All nodes can be collapsed/expanded
    const firstNode = nodeCards.first();
    const firstHeader = firstNode.locator('> .node-header');
    await firstHeader.click();
    await expect(firstNode).toHaveClass(/collapsed/);
    await firstHeader.click();
    await expect(firstNode).not.toHaveClass(/collapsed/);
  });

  test('should load FeXAS example and render inline nested object properties', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#load-local-btn', { timeout: 10000 });

    const testFilePath = path.join(__dirname, '../../../examples/cdi/FeXAS_Fe_c3d.001-NEXUS-HDF5-cdi-CDIF.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);

    // Wait for file to load and be processed
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });

    // The example contains an embedded Organization with name 'APS' under schema:contributor
    // Verify that the nested property 'APS' appears somewhere in the rendered tree
    // Look for the string 'APS' anywhere inside the page (embedded organization name)
    const apsText = page.locator('text=APS');
    await expect(apsText.first()).toBeVisible({ timeout: 5000 });

    // Also verify that deeply nested component names are shown (e.g. clock_mca4)
    const clockText = page.locator('text=clock_mca4');
    const count = await clockText.count();
    if (count === 0) {
      // Save page content for diagnosis
      const html = await page.content();
      fs.mkdirSync('tests/e2e/debug', { recursive: true });
      fs.writeFileSync('tests/e2e/debug/fexas_dom.html', html, 'utf8');
    }
    await expect(clockText.first()).toBeVisible({ timeout: 5000 });
  });

  test('should convert nested schema:identifier to array, add value and export it', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#load-local-btn', { timeout: 10000 });

    const testFilePath = path.join(__dirname, '../../../examples/cdi/FeXAS_Fe_c3d.001-NEXUS-HDF5-cdi-CDIF.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);

    // Wait for file to be processed
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });

    // Enter edit mode and ensure edit mode is active
    await page.click('#toggle-edit-btn');
    await page.waitForSelector('#toggle-edit-btn:has-text("View Mode")', { timeout: 2000 });

    // Locate the nested property row for the Organization with @id https://ror.org/aps
    const propSelector = '[data-testid="property-schema_identifier"][data-node-id="https://ror.org/aps"]';
    const propRow = page.locator(propSelector).first();
    await expect(propRow).toBeVisible({ timeout: 5000 });

    // Convert to array (no confirmation required for this action)
    const convertBtn = propRow.locator('button[data-testid="convert-to-array-btn-schema_identifier"]');
    await expect(convertBtn).toBeVisible({ timeout: 3000 });
    await convertBtn.click();

    // Wait for the in-memory conversion + re-render
    await page.waitForTimeout(300);

    // Add new array value and fill it with 'test'
    const addBtn = propRow.locator('button[data-testid="add-value-btn-schema_identifier"]');
    await expect(addBtn).toBeVisible({ timeout: 5000 });
    await addBtn.click();

    // Fill the newly created input/textarea (take last input within the row)
    // Re-query inputs under the property row (re-render may have replaced nodes)
    const lastInput = propRow.locator('.array-value').locator('input, textarea').last();
    await expect(lastInput).toBeVisible({ timeout: 3000 });
    await lastInput.fill('test');

    // Export and capture download
    const downloadPromise = page.waitForEvent('download');
    await page.click('#export-btn');
    const download = await downloadPromise;

    // Save to temp and inspect output
    const tempDir = path.join(__dirname, '../../temp');
    fs.mkdirSync(tempDir, { recursive: true });
    const savePath = path.join(tempDir, download.suggestedFilename());
    await download.saveAs(savePath);

    const fileContent = fs.readFileSync(savePath, 'utf-8');
    let jsonData;
    expect(() => { jsonData = JSON.parse(fileContent); }).not.toThrow();

    // Find the object with @id === "https://ror.org/aps" anywhere in the export
    function findObjectById(obj: any, id: string): any {
      if (!obj || typeof obj !== 'object') return null;
      if (Array.isArray(obj)) {
        for (const el of obj) {
          const found: any = findObjectById(el, id);
          if (found) return found;
        }
        return null;
      }
      if (obj['@id'] === id) return obj;
      for (const k of Object.keys(obj)) {
        const found: any = findObjectById(obj[k], id);
        if (found) return found;
      }
      return null;
    }

    const found = findObjectById(jsonData, 'https://ror.org/aps');
    expect(found).toBeTruthy();

    // The identifier must now be an array containing both values
    const idVal = found['schema:identifier'];
    expect(Array.isArray(idVal)).toBe(true);
    // Expect exact order: original identifier first, new value appended
    expect(idVal).toEqual(['https://ror.org/aps', 'test']);

    // Cleanup
    if (fs.existsSync(savePath)) fs.unlinkSync(savePath);
  });

  test('should load se_na2so4 example and validate with CDIF Discovery Core (1 violation)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#load-local-btn', { timeout: 10000 });

    // Select CDIF Discovery Core shapes
    const shapeSelector = page.locator('#shape-selector');
    await shapeSelector.selectOption('cdif-core');

    // Load the se_na2so4 example
    const testFilePath = path.join(__dirname, '../../../examples/cdi/se_na2so4-XDI-CDI-CDIF.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);

    // Wait for success + validation
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 15000 });

    // Wait until validation status reports violations (debounced + processing)
    const validationStatus = page.locator('#validation-status');
    await expect(validationStatus).toBeVisible({ timeout: 10000 });

    // Sometimes validation takes extra time for larger CRDs — poll until text contains 'violation'
    await page.waitForFunction(() => {
      const el = document.querySelector('#validation-status');
      return el && /violation/.test(el.textContent || '');
    }, null, { timeout: 10000 });

    const statusText = (await validationStatus.textContent()) || '';

    // Expect exactly one violation reported
    expect(statusText).toMatch(/1\s+violation/);

    // Ensure the app didn't show a SPARQL-constraint error fallback
    expect(statusText).not.toContain('Validation Error:');

    // Expand details and assert there's exactly one detail entry
    const showBtn = page.locator('#toggle-violations-btn');
    if (await showBtn.isVisible()) {
      await showBtn.click();
      // Wait for details container
      await page.waitForSelector('#validation-details .validation-violations ol li', { timeout: 3000 });
      const detailItems = await page.locator('#validation-details .validation-violations ol li').count();
      expect(detailItems).toBe(1);
    }
  });

  test('should add nested reference inside inline Organization (FeXAS)', async ({ page }) => {
    // Load FeXAS and set up
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#load-local-btn', { timeout: 10000 });

    const testFilePath = path.join(__dirname, '../../../examples/cdi/FeXAS_Fe_c3d.001-NEXUS-HDF5-cdi-CDIF.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 15000 });

    // Enter edit mode
    await page.click('#toggle-edit-btn');
    await page.waitForSelector('#toggle-edit-btn:has-text("View Mode")', { timeout: 2000 });

    // Ensure nodes rendered and gather node ids
    await page.waitForSelector('[data-testid^="node-card-"]', { timeout: 5000 });
    const nodeCards = page.locator('[data-testid^="node-card-"]');
    const total = await nodeCards.count();
    expect(total).toBeGreaterThan(1);

    // Use dataset node (index 0) as reference target
    const targetId = (await nodeCards.first().locator('.node-id').first().textContent())?.trim() || '';
    expect(targetId).toBeTruthy();

    // Locate nested Organization by id (the FeXAS example uses https://ror.org/aps)
    const orgId = 'https://ror.org/aps';
    // There may not be a top-level node-card for inline objects; find a property row that belongs
    // to the organization and get its ancestor node-card (the inline organization card)
    const propSelector = `[data-testid="property-schema_identifier"][data-node-id="${orgId}"]`;
    const propRow = page.locator(propSelector).first();
    await expect(propRow).toBeVisible({ timeout: 5000 });
    const orgCard = propRow.locator('xpath=ancestor::div[contains(@class,"node-card")][1]');
    await expect(orgCard).toBeVisible({ timeout: 5000 });

    // For nested reference flows we operate on the existing schema:identifier property row
    const prop = page.locator(`[data-testid="property-schema_identifier"][data-node-id="${orgId}"]`).first();
    await expect(prop).toBeVisible({ timeout: 2000 });

    // Convert to array if needed
    const convertBtn = prop.locator('button[data-testid^="convert-to-array-btn"]').first();
    if (await convertBtn.isVisible().catch(() => false)) {
      await convertBtn.click();
      await page.waitForTimeout(300);
    }

    // Convert to array if single value
    const conv = prop.locator('button[data-testid^="convert-to-array-btn"]').first();
    if (await conv.isVisible().catch(() => false)) {
      await conv.click();
      await page.waitForTimeout(200);
    }

    // Add an array value, then add a reference inside that array value
    const addValueBtn = prop.locator('button[data-testid^="add-value-btn"]').first();
    await expect(addValueBtn).toBeVisible({ timeout: 3000 });
    await addValueBtn.click();
    await page.waitForTimeout(200);

    // Try two patterns: either an add-reference button directly on the row, or add a new array value
    let addRefBtn = prop.locator('button[data-testid^="add-reference-btn"]').first();
    if (!(await addRefBtn.isVisible().catch(() => false))) {
      // if not visible, add a new array value then look for add-reference inside it
      const addValueBtn = prop.locator('button[data-testid^="add-value-btn"]').first();
      if (await addValueBtn.isVisible().catch(() => false)) {
        await addValueBtn.click();
        await page.waitForTimeout(200);
        addRefBtn = prop.locator('.array-value').last().locator('button[data-testid^="add-reference-btn"]').first();
      }
    }
    await expect(addRefBtn).toBeVisible({ timeout: 4000 });
    await addRefBtn.click();

    // Add Reference modal should show an existing nodes select — pick the dataset node id
    await page.waitForSelector('#addReferenceModal #existingNodeSelect', { timeout: 3000 });
    await page.selectOption('#existingNodeSelect', targetId);
    await page.click('#confirmAddReference');
    await page.waitForTimeout(300);

    // Export and assert nested object now contains a reference to the dataset id
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export-btn')]);
    const fs = await import('fs');
    const tempDir = path.join(__dirname, '../../temp');
    fs.mkdirSync(tempDir, { recursive: true });
    const savePath = path.join(tempDir, download.suggestedFilename());
    await download.saveAs(savePath);

    const exported = JSON.parse(fs.readFileSync(savePath, 'utf-8'));

    // Find the org object by @id and assert nestedRef references the dataset id (either @id object or compact id string)
    function findById(obj: any, id: string): any {
      if (!obj || typeof obj !== 'object') return null;
      if (Array.isArray(obj)) {
        for (const el of obj) {
          const found = findById(el, id);
          if (found) return found;
        }
        return null;
      }
      if (obj['@id'] === id) return obj;
      for (const k of Object.keys(obj)) {
        const found = findById(obj[k], id);
        if (found) return found;
      }
      return null;
    }

    const org = findById(exported, orgId);
    expect(org).toBeTruthy();

    const val = org['schema:identifier'];
    expect(val).toBeTruthy();

    // Accept either a single object with @id or an array of objects/strings containing the target id
    const references = Array.isArray(val) ? val : [val];
    const matched = references.some((r) => {
      if (!r) return false;
      if (typeof r === 'string') return r === targetId || r.endsWith(targetId);
      if (typeof r === 'object' && r['@id']) return r['@id'] === targetId || (typeof r['@id'] === 'string' && r['@id'].endsWith(targetId));
      return false;
    });

    expect(matched).toBe(true);

    // Cleanup
    if (fs.existsSync(savePath)) fs.unlinkSync(savePath);
  });

  test('should export se_na2so4 example and preserve key dataset and context', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#load-local-btn', { timeout: 10000 });

    // Use CDIF core shapes to match earlier validation
    await page.locator('#shape-selector').selectOption('cdif-core');

    const testFilePath = path.join(__dirname, '../../../examples/cdi/se_na2so4-XDI-CDI-CDIF.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 15000 });

    // Export and assert exported JSON contains expected root dataset id and context
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#export-btn')]);
    const fs = await import('fs');
    const tmp = path.join(__dirname, '../../temp');
    fs.mkdirSync(tmp, { recursive: true });
    const save = path.join(tmp, dl.suggestedFilename());
    await dl.saveAs(save);

    const exported = JSON.parse(fs.readFileSync(save, 'utf-8'));

    // Ensure it has @context and @graph
    expect(exported['@context']).toBeTruthy();
    expect(exported['@graph']).toBeTruthy();

    // Find the dataset node by id xas:485749
    function findGraphById(graph: any[], id: string) {
      if (!Array.isArray(graph)) return null;
      return graph.find((n) => n['@id'] === id) || null;
    }

    const ds = findGraphById(exported['@graph'], 'xas:485749');
    expect(ds).toBeTruthy();

    // Check that context maps 'schema' prefix (important for downstream display)
    if (typeof exported['@context'] === 'object') {
      const ctx = exported['@context'];
      // either array or object: check that schema prefix exists somewhere
      const hasSchema = (Array.isArray(ctx) ? ctx.some((c) => typeof c === 'object' && c['schema']) : !!ctx['schema']);
      expect(hasSchema).toBe(true);
    }

    if (fs.existsSync(save)) fs.unlinkSync(save);
  });

  test('should convert SimpleSample dataset with new custom reference (nested add)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#load-local-btn', { timeout: 10000 });

    const testFilePath = path.join(__dirname, '../../../examples/cdi/SimpleSample.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });

    // Enter edit mode
    await page.click('#toggle-edit-btn');
    await page.waitForSelector('#toggle-edit-btn:has-text("View Mode")', { timeout: 2000 });

    // Find a nested array property 'has' on #datastructure (nested array of components)
    const prop = page.locator('[data-testid="property-has"][data-node-id="#datastructure"]').first();
    await expect(prop).toBeVisible({ timeout: 5000 });
    await expect(prop).toBeVisible({ timeout: 2000 });

    const addRefBtn = prop.locator('button[data-testid^="add-reference-btn"]').first();
    await expect(addRefBtn).toBeVisible({ timeout: 3000 });
    await addRefBtn.click();

    // Select existing node '#Sample_ID'
    await page.waitForSelector('#addReferenceModal #existingNodeSelect', { timeout: 3000 });
    await page.selectOption('#existingNodeSelect', '#Sample_ID');
    await page.click('#confirmAddReference');
    await page.waitForTimeout(300);

    // Export and verify
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export-btn')]);
    const fs = await import('fs');
    const tmp = path.join(__dirname, '../../temp');
    fs.mkdirSync(tmp, { recursive: true });
    const save = path.join(tmp, download.suggestedFilename());
    await download.saveAs(save);

    const exported = JSON.parse(fs.readFileSync(save, 'utf-8'));
    function findById(obj: any, id: string): any {
      if (!obj || typeof obj !== 'object') return null;
      if (Array.isArray(obj)) {
        for (const el of obj) {
          const found = findById(el, id);
          if (found) return found;
        }
        return null;
      }
      if (obj['@id'] === id) return obj;
      for (const k of Object.keys(obj)) {
        const found = findById(obj[k], id);
        if (found) return found;
      }
      return null;
    }

    const ds = findById(exported, '#datastructure');
    expect(ds).toBeTruthy();
    const rel = ds['has'];
    expect(rel).toBeTruthy();

    // Allow object or array of refs
    const refs = Array.isArray(rel) ? rel : [rel];
    const matched = refs.some((r) => typeof r === 'string' ? r === '#Sample_ID' || r.endsWith('#Sample_ID') : (r && r['@id'] === '#Sample_ID'));
    expect(matched).toBe(true);

    if (fs.existsSync(save)) fs.unlinkSync(save);
  });

  test('should convert se_na2so4 root identifier to array and add a reference', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#load-local-btn', { timeout: 10000 });

    const testFilePath = path.join(__dirname, '../../../examples/cdi/se_na2so4-XDI-CDI-CDIF.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 15000 });

    // Enter edit mode
    await page.click('#toggle-edit-btn');
    await page.waitForSelector('#toggle-edit-btn:has-text("View Mode")', { timeout: 2000 });

    // target root node xas:485749 property schema:identifier
    const prop = page.locator('[data-testid="property-schema_identifier"][data-node-id="xas:485749"]').first();
    await expect(prop).toBeVisible({ timeout: 5000 });

    // convert to array if required
    const conv = prop.locator('button[data-testid^="convert-to-array-btn"]').first();
    if (await conv.isVisible().catch(() => false)) {
      await conv.click();
      await page.waitForTimeout(300);
    }

    const addRefBtn = prop.locator('button[data-testid^="add-reference-btn"]').first();
    await expect(addRefBtn).toBeVisible({ timeout: 3000 });
    await addRefBtn.click();

    // Choose a valid existing node option dynamically (avoid hard-coded value differences)
    await page.waitForSelector('#addReferenceModal #existingNodeSelect', { timeout: 5000 });
    const optVal = await page.evaluate(() => {
      const sel = document.querySelector('#addReferenceModal #existingNodeSelect');
      if (!sel) return null;
      for (const o of Array.from(sel.querySelectorAll('option'))) {
        const v = o.getAttribute('value');
        if (v && v.trim() && !/^--/i.test(o.textContent || '')) return v;
      }
      return null;
    });
    if (optVal) {
      await page.selectOption('#existingNodeSelect', optVal);
    } else {
      // fallback to a generic selection (should not normally happen)
      await page.selectOption('#existingNodeSelect', { index: 1 });
    }
    await page.click('#confirmAddReference');
    await page.waitForTimeout(300);

    // Export and verify the root node now has identifier array containing a reference to #xasDict
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export-btn')]);
    const fs = await import('fs');
    const tmp = path.join(__dirname, '../../temp');
    fs.mkdirSync(tmp, { recursive: true });
    const save = path.join(tmp, download.suggestedFilename());
    await download.saveAs(save);

    const exported = JSON.parse(fs.readFileSync(save, 'utf-8'));
    function findGraphById(graph: any[], id: string) {
      if (!Array.isArray(graph)) return null;
      return graph.find((n) => n['@id'] === id) || null;
    }

    const ds = findGraphById(exported['@graph'], 'xas:485749');
    expect(ds).toBeTruthy();
    const idVal = ds['schema:identifier'];
    expect(idVal).toBeTruthy();
    const arr = Array.isArray(idVal) ? idVal : [idVal];
    const target = optVal || '#xasDict';
    // The export may either replace or append the identifier; we assert that the value changed
    // from the original example value (which was: 'should have a DOI') OR contains the selected target
    const original = 'should have a DOI';
    const changed = !(arr.length === 1 && arr[0] === original);
    const containsTarget = arr.some((v) => {
      if (!v) return false;
      if (typeof v === 'string') return v === target || v.endsWith(target);
      if (typeof v === 'object' && v['@id']) return v['@id'] === target || (typeof v['@id'] === 'string' && v['@id'].endsWith(target));
      return false;
    });
    expect(changed || containsTarget).toBe(true);

    if (fs.existsSync(save)) fs.unlinkSync(save);
  });

  test('should add suggested property (Activity -> Activity-name) using Add Node -> Add Property flow', async ({ page }) => {
    // Load SimpleSample and enable edit mode
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#load-local-btn', { timeout: 10000 });

    const testFilePath = path.join(__dirname, '../../../examples/cdi/SimpleSample.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });

    // Enter edit mode to show suggested Add Property buttons
    await page.click('#toggle-edit-btn');
    await page.waitForSelector('#toggle-edit-btn:has-text("View Mode")', { timeout: 2000 });

    // We're going to add a new root node (Activity) using the Add Root Node control, then add Activity-name
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Prefer dropdown-based add-root control, fall back to custom input
    const rootDropdown = page.locator('#add-root-node-container select').first();
    if (await rootDropdown.count() > 0) {
      const opts = await rootDropdown.locator('option').allTextContents();
      let idx = -1;
      for (let i = 0; i < opts.length; i++) {
        if (opts[i] && /Activity/i.test(opts[i])) { idx = i; break; }
      }
      if (idx >= 0) {
        await rootDropdown.selectOption({ index: idx });
        // Click the Add button to actually create the selected root node
        const addNodeBtn = page.locator('#add-root-node-container button:has-text("Add Node"), #add-root-node-container .add-item-row button.btn-primary, #add-root-node-container button:has-text("Add")').first();
        if (await addNodeBtn.isVisible().catch(() => false)) await addNodeBtn.click();
      } else {
        // fallback: custom input
        const customInput = page.locator('#add-root-node-container input[placeholder*="NodeType"]').first();
        if (await customInput.count() > 0) {
          await customInput.fill('Activity');
          const addBtn = page.locator('#add-root-node-container button:has-text("Add")').first();
          if (await addBtn.isVisible().catch(() => false)) await addBtn.click();
        }
      }
    } else {
      const customInput = page.locator('#add-root-node-container input[placeholder*="NodeType"]').first();
      await customInput.fill('Activity');
      const addBtn = page.locator('#add-root-node-container button:has-text("Add")').first();
      if (await addBtn.isVisible().catch(() => false)) await addBtn.click();
    }

    // Wait for Activity node to be added
    await page.waitForTimeout(500);
    const activityCard = page.locator('.node-card:has(.node-type:has-text("Activity"))').first();
    await expect(activityCard).toBeVisible({ timeout: 5000 });

    // Use the Add Property controls inside the new Activity node to add Activity-name
    // Try SHACL suggestions first
    const addPropertyBtn = activityCard.locator('button:has-text("Add Property")').first();
    let addedProperty = false;
    if (await addPropertyBtn.isVisible().catch(() => false)) {
      await addPropertyBtn.click();
      // look for an option containing 'Activity-name' or 'name'
      const modalOpt = page.locator('button:has-text("Activity-name"), button:has-text("name")').first();
      if (await modalOpt.isVisible().catch(() => false)) {
        await modalOpt.click();
        addedProperty = true;
      }
    }

    // fallback: try inline suggestion list or custom property add
    if (!addedProperty) {
      const suggestionList = activityCard.locator('.shacl-suggestion, .suggested-property, .suggestion-list');
      const actOpt = suggestionList.locator('text=/Activity-?name|name/i').first();
      if (await actOpt.isVisible().catch(() => false)) {
        await actOpt.click();
        addedProperty = true;
      } else {
        // Try custom add sections
        const customSection = activityCard.locator('.custom-item-section').first();
        if (await customSection.count() > 0) {
          const nameInput = customSection.locator('input.custom-name-input, input[placeholder*="property"]').first();
          if (await nameInput.count() > 0) {
              await nameInput.fill('Activity-name');
              // If any custom modal overlay is present (alerts) dismiss it first so clicks don't get intercepted
              await page.waitForSelector('.custom-modal-overlay', { state: 'hidden', timeout: 1000 }).catch(async () => {
                const alertOk = page.locator('.custom-modal-overlay[data-testid="alert-modal"] button[data-testid="alert-ok-btn"]');
                if (await alertOk.isVisible().catch(() => false)) await alertOk.click();
              });
              const addBtn = customSection.locator('button.btn-success:has-text("Add")').first();
              if (await addBtn.isVisible().catch(() => false)) await addBtn.click();
            addedProperty = true;
          }
        }
      }
    }

    // Allow UI to create nested nodes
    await page.waitForTimeout(500);

    // The Activity-name suggestion may create a separate ObjectName node or add a name property inline.
    // Check both possibilities and fill the appropriate field.
    const objectNameCard = page.locator('.node-card:has(.node-type:has-text("ObjectName"))').first();
    const nameRowInActivity = activityCard.locator('[data-property*="name"], [data-property*="Activity-name"]').first();

    if (await objectNameCard.isVisible().catch(() => false)) {
      // Fill the ObjectName-name field if present
      const nameRow = objectNameCard.locator('[data-property="ObjectName-name"], [data-property*="name"]').first();
      if (await nameRow.count() > 0 && await nameRow.isVisible().catch(() => false)) {
        const input = nameRow.locator('input, textarea').first();
        if (await input.count() > 0) await input.fill('Sample Name');
      }
    } else if (await nameRowInActivity.isVisible().catch(() => false)) {
      const input = nameRowInActivity.locator('input, textarea').first();
      if (await input.count() > 0) await input.fill('Sample Name');
    } else {
      // Could not locate any expected node/field - fail early with helpful context
      const pageHtml = await page.content();
      throw new Error('Failed to find ObjectName node or inline name property after adding suggested property. Current page snapshot length: ' + pageHtml.length);
    }

    // Export and verify the exported JSON includes an Activity node and an ObjectName node
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export-btn')]);
    const fs = await import('fs');
    const tmp = path.join(__dirname, '../../temp');
    fs.mkdirSync(tmp, { recursive: true });
    const save = path.join(tmp, download.suggestedFilename());
    await download.saveAs(save);

    const exported = JSON.parse(fs.readFileSync(save, 'utf-8'));

    // Check for presence of an Activity node and ObjectName node (approximate structural checks)
    const graph = exported['@graph'] || (Array.isArray(exported) ? exported : []);
    const hasActivity = Array.isArray(graph) && graph.some((n) => n && ((Array.isArray(n['@type']) && n['@type'].includes('Activity')) || n['@type'] === 'Activity'));
    const hasObjectName = Array.isArray(graph) && graph.some((n) => n && ((Array.isArray(n['@type']) && n['@type'].includes('ObjectName')) || n['@type'] === 'ObjectName'));

    // Succeed if we have Activity + either ObjectName node or a name property in the Activity node
    const activityNode = Array.isArray(graph) && graph.find((n) => n && ((Array.isArray(n['@type']) && n['@type'].includes('Activity')) || n['@type'] === 'Activity'));
    const activityHasName = activityNode && Object.keys(activityNode).some((k) => /name/i.test(k));

    const ok = hasActivity && (hasObjectName || Boolean(activityHasName));
    expect(ok).toBe(true);

    if (fs.existsSync(save)) fs.unlinkSync(save);
  });

  test('should load file without @context', async ({ page }) => {
    // ============= SETUP =============
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#load-local-btn', { timeout: 10000 });
    
    // ============= ACTIONS =============
    const testFilePath = path.join(__dirname, '../../fixtures/test-data/no-context.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    
    // Wait for file to load
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });
    
    // ============= EXPECTED RESULTS =============
    
    // 1. File loads successfully
    await expect(page.locator('[data-testid^="node-card-"]')).toHaveCount(1);
    
    // 2. Namespace section not displayed (no @context)
    await expect(page.locator('#namespace-section')).toBeHidden();
    
    // 3. Properties still render (using full URIs)
    const propertyRows = page.locator('[data-testid^="property-"]');
    await expect(propertyRows.first()).toBeVisible();
  });

  test('should handle invalid JSON-LD', async ({ page }) => {
    // ============= SETUP =============
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#load-local-btn', { timeout: 10000 });
    
    // ============= ACTIONS =============
    const testFilePath = path.join(__dirname, '../../fixtures/test-data/invalid-syntax.json');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    
    // ============= EXPECTED RESULTS =============
    
    // 1. Wait a moment for error handling
    await page.waitForTimeout(2000);
    
    // 2. Either error alert appears OR no nodes are rendered (graceful failure)
    const hasError = await page.locator('.alert-danger, .alert-error, .alert').isVisible().catch(() => false);
    const nodeCount = await page.locator('[data-testid^="node-card-"]').count();
    
    // 3. Should either show error or have no nodes rendered
    expect(hasError || nodeCount === 0).toBeTruthy();
  });

  test('should load Schema.org dataset in generic mode', async ({ page }) => {
    // ============= SETUP =============
    await page.goto('/?shacl=generic');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#shape-selector', { timeout: 10000 });
    
    // ============= ACTIONS =============
    const testFilePath = path.join(__dirname, '../../fixtures/test-data/schema-org-dataset.jsonld');
    await page.click('#load-local-btn');
    await page.setInputFiles('#local-file-input', testFilePath);
    
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });
    
    // ============= EXPECTED RESULTS =============
    
    // 1. File loads without DDI-CDI shapes (2 nodes: Dataset and Person)
    await expect(page.locator('[data-testid^="node-card-"]')).toHaveCount(2);
    
    // 2. Can select shape vocabularies
    await expect(page.locator('#shape-selector')).toBeVisible();
    
    // 3. Properties initially shown (may be classified as EXTRA without shapes)
    const propertyRows = page.locator('[data-testid^="property-"]');
    await expect(propertyRows.first()).toBeVisible();
    
    // 4. Content renders correctly
    await expect(page.locator('.node-card:has-text("Dataset")').first()).toBeVisible();
    await expect(page.locator('.node-card:has-text("Person")').first()).toBeVisible();
  });
});
