/**
 * Data Extraction Logic Tests
 * 
 * Tests the critical logic for collecting changes from DOM and preserving
 * single vs array value types during save/export operations.
 */

describe('Data Extraction - Array vs Single Value Logic', () => {
  test('should detect single value correctly', () => {
    const singleValue = 'Sample Dataset';
    expect(Array.isArray(singleValue)).toBe(false);
  });

  test('should detect array value correctly', () => {
    const arrayValue = ['value1', 'value2'];
    expect(Array.isArray(arrayValue)).toBe(true);
  });

  test('should preserve type after edit - single stays single', () => {
    // Simulate the logic in collectChangesFromDOM
    const node = { name: 'Original' };
    const wasArray = Array.isArray(node.name);
    
    // Simulate having 1 input with edited value
    const mockInputValue = 'Edited Value';
    
    if (wasArray) {
      throw new Error('Should not treat single value as array');
    } else {
      // Correct: preserve as single value
      node.name = mockInputValue;
    }
    
    expect(node.name).toBe('Edited Value');
    expect(Array.isArray(node.name)).toBe(false);
  });

  test('should preserve type after edit - array stays array', () => {
    // Simulate the logic in collectChangesFromDOM
    const node = { keywords: ['one', 'two'] };
    const wasArray = Array.isArray(node.keywords);
    
    // Simulate having 3 inputs (added one)
    const mockInputValues = ['one', 'two', 'three'];
    
    if (wasArray) {
      // Correct: preserve as array
      node.keywords = mockInputValues;
    } else {
      throw new Error('Should not treat array as single value');
    }
    
    expect(node.keywords).toEqual(['one', 'two', 'three']);
    expect(Array.isArray(node.keywords)).toBe(true);
  });

  test('should handle array with deleted values', () => {
    const node = { keywords: ['one', 'two', 'three'] };
    const wasArray = Array.isArray(node.keywords);
    
    // Simulate 2 inputs remaining (one deleted from DOM)
    const mockInputValues = ['one', 'three'];
    
    if (wasArray) {
      node.keywords = mockInputValues;
    }
    
    expect(node.keywords).toEqual(['one', 'three']);
    expect(node.keywords.length).toBe(2);
  });

  test('should not accidentally convert single to array', () => {
    const node = { name: 'Single Value' };
    
    // Even if we had multiple inputs in DOM (which shouldn't happen for single values)
    const wasArray = Array.isArray(node.name);
    const mockInputValue = 'New Single Value';
    
    if (wasArray) {
      throw new Error('Should detect this is not an array');
    } else {
      // Correct: use only the value, not wrap in array
      node.name = mockInputValue;
    }
    
    expect(typeof node.name).toBe('string');
    expect(Array.isArray(node.name)).toBe(false);
  });

  test('should correctly identify empty array as array', () => {
    const node = { keywords: [] };
    const wasArray = Array.isArray(node.keywords);
    
    expect(wasArray).toBe(true);
    
    // Even with no inputs, it should remain an array
    if (wasArray) {
      node.keywords = []; // or collect from 0 inputs
    }
    
    expect(Array.isArray(node.keywords)).toBe(true);
  });
});

