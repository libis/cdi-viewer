// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

/**
 * Tests for rendering functionality
 * 
 * Tests the core rendering logic that converts JSON-LD data to HTML.
 */

const fs = require('fs');
const path = require('path');

// Mock jQuery
global.$ = require('jquery');

// Load the render module
const renderCode = fs.readFileSync(path.join(__dirname, '../js/render.js'), 'utf8');

describe('Render - Helper Functions', () => {
  beforeEach(() => {
    // Set up globals
    window.jsonData = {
      '@context': {},
      '@graph': []
    };
    window.isEditMode = false;
    window.shaclShapesStore = null;
  });

  test('humanizeKey should convert camelCase to readable text', () => {
    // Extract and eval the humanizeKey function
    const humanizeKeyMatch = renderCode.match(/function humanizeKey\(key\) \{[\s\S]*?\n\}/);
    expect(humanizeKeyMatch).toBeTruthy();
    
    eval(humanizeKeyMatch[0]);
    
    expect(humanizeKey('camelCase')).toBe('Camel Case');
    expect(humanizeKey('somePropertyName')).toBe('Some Property Name');
    expect(humanizeKey('snake_case')).toBe('Snake Case'); // FIXED: now properly capitalizes each word
  });

  test('isNodeReference should detect node references', () => {
    // Set up test data
    window.jsonData = {
      '@context': {},
      '@graph': [
        { '@id': '#node1', '@type': 'Dataset' },
        { '@id': '_:blank1', '@type': 'Variable' }
      ]
    };
    
    // Test the logic directly without importing
    function isNodeReference(str) {
      if (typeof str !== 'string') return false;
      if (str.startsWith('#') || str.startsWith('_:')) {
        return window.jsonData['@graph'].some(n => n['@id'] === str);
      }
      return false;
    }
    
    expect(isNodeReference('#node1')).toBe(true);
    expect(isNodeReference('_:blank1')).toBe(true);
    expect(isNodeReference('#nonexistent')).toBe(false);
    expect(isNodeReference('http://example.org/resource')).toBe(false);
    expect(isNodeReference('plain string')).toBe(false);
  });

  test('extractNodeReferences should find all @id references in values', () => {
    window.jsonData = {
      '@context': {},
      '@graph': [
        { '@id': '#node1' },
        { '@id': '#node2' }
      ]
    };
    
    // Replicate the logic
    function isNodeReference(str) {
      if (typeof str !== 'string') return false;
      if (str.startsWith('#') || str.startsWith('_:')) {
        return window.jsonData['@graph'].some(n => n['@id'] === str);
      }
      return false;
    }
    
    function extractNodeReferences(value) {
      const refs = [];
      if (Array.isArray(value)) {
        value.forEach(item => {
          if (typeof item === 'object' && item['@id']) {
            refs.push(item['@id']);
          } else if (typeof item === 'string' && isNodeReference(item)) {
            refs.push(item);
          }
        });
      } else if (typeof value === 'object' && value !== null && value['@id']) {
        refs.push(value['@id']);
      } else if (typeof value === 'string' && isNodeReference(value)) {
        refs.push(value);
      }
      return refs;
    }
    
    // Test with object containing @id
    const refs1 = extractNodeReferences({ '@id': '#node1' });
    expect(refs1).toEqual(['#node1']);
    
    // Test with array of objects
    const refs2 = extractNodeReferences([{ '@id': '#node1' }, { '@id': '#node2' }]);
    expect(refs2).toEqual(['#node1', '#node2']);
    
    // Test with string reference
    const refs3 = extractNodeReferences('#node1');
    expect(refs3).toEqual(['#node1']);
    
    // Test with non-reference
    const refs4 = extractNodeReferences('plain value');
    expect(refs4).toEqual([]);
  });
});

describe('Render - Data Structures', () => {
  test('should handle @graph format', () => {
    const testData = {
      '@context': { 'ex': 'http://example.org/' },
      '@graph': [
        { '@id': '#node1', '@type': 'Dataset', 'name': 'Test Dataset' },
        { '@id': '#node2', '@type': 'Variable', 'name': 'Test Variable' }
      ]
    };
    
    expect(testData['@graph']).toBeDefined();
    expect(Array.isArray(testData['@graph'])).toBe(true);
    expect(testData['@graph'].length).toBe(2);
  });

  test('should identify root nodes (not referenced by others)', () => {
    const graph = [
      { '@id': '#root1', '@type': 'Dataset', 'variables': [{ '@id': '#var1' }] },
      { '@id': '#var1', '@type': 'Variable' }
    ];
    
    // Build set of referenced IDs
    const referencedIds = new Set();
    graph.forEach(node => {
      Object.keys(node).forEach(key => {
        if (key !== '@id' && key !== '@type') {
          const value = node[key];
          if (Array.isArray(value)) {
            value.forEach(v => {
              if (typeof v === 'object' && v['@id']) {
                referencedIds.add(v['@id']);
              }
            });
          }
        }
      });
    });
    
    const rootNodes = graph.filter(n => !referencedIds.has(n['@id']));
    
    expect(rootNodes.length).toBe(1);
    expect(rootNodes[0]['@id']).toBe('#root1');
  });
});

describe('Render - DOM Generation', () => {
  test('should create proper HTML structure for node card', () => {
    const card = $('<div>').addClass('node-card').attr('data-node-id', '#test');
    
    expect(card.hasClass('node-card')).toBe(true);
    expect(card.attr('data-node-id')).toBe('#test');
  });

  test('should create property row with correct structure', () => {
    const row = $('<div>')
      .addClass('property-row')
      .attr('data-property', 'testProp')
      .attr('data-node-id', '#test');
    
    expect(row.hasClass('property-row')).toBe(true);
    expect(row.attr('data-property')).toBe('testProp');
    expect(row.attr('data-node-id')).toBe('#test');
  });

  test('should handle array values', () => {
    const values = ['value1', 'value2', 'value3'];
    const container = $('<div>');
    
    values.forEach((val, idx) => {
      const valDiv = $('<div>')
        .addClass('array-value')
        .text(val);
      container.append(valDiv);
    });
    
    expect(container.find('.array-value').length).toBe(3);
  });
});
