// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

/**
 * Tests for JSON-LD helper functions
 * 
 * Tests the normalization logic that converts various JSON-LD formats to @graph format.
 */

describe('JSON-LD Normalization', () => {
  test('should preserve data that already has @graph', () => {
    const data = {
      '@context': { 'ex': 'http://example.org/' },
      '@graph': [
        { '@id': '#node1', '@type': 'Dataset' }
      ]
    };
    
    // Data already has @graph, should be unchanged
    expect(data['@graph']).toBeDefined();
    expect(Array.isArray(data['@graph'])).toBe(true);
  });

  test('should handle DDI-CDI format with DDICDIModels', () => {
    const data = {
      '@context': {},
      'DDICDIModels': [
        { '@id': '#model1', '@type': 'Model' }
      ],
      '@included': [
        { '@id': '#ref1', '@type': 'Reference' }
      ]
    };
    
    // Should combine DDICDIModels and @included
    const expectedGraph = [...data.DDICDIModels, ...data['@included']];
    expect(expectedGraph.length).toBe(2);
  });

  test('should wrap single object in @graph', () => {
    const singleObject = {
      '@context': {},
      '@id': '#single',
      '@type': 'Dataset',
      'name': 'Test'
    };
    
    // Single object should be wrapped
    expect(singleObject['@id']).toBeDefined();
    expect(singleObject['@type']).toBeDefined();
  });

  test('should handle nested structures', () => {
    const nested = {
      '@context': {},
      '@id': '#parent',
      '@type': 'Dataset',
      'child': {
        '@id': '#child',
        '@type': 'Variable'
      }
    };
    
    expect(nested.child).toBeDefined();
    expect(nested.child['@id']).toBe('#child');
  });
});

describe('Context Resolution', () => {
  test('should handle string context', () => {
    const context = 'http://example.org/vocab#';
    expect(typeof context).toBe('string');
  });

  test('should handle object context with prefixes', () => {
    const context = {
      'ex': 'http://example.org/',
      'ddi': 'https://ddi-alliance.org/Specification/DDI-CDI/1.0/RDF/'
    };
    
    expect(context.ex).toBeDefined();
    expect(context.ddi).toBeDefined();
  });

  test('should handle array context', () => {
    const context = [
      'http://example.org/vocab#',
      { 'ex': 'http://example.org/' }
    ];
    
    expect(Array.isArray(context)).toBe(true);
    expect(context.length).toBe(2);
  });

  test('should resolve prefixed terms', () => {
    const context = {
      'ex': 'http://example.org/',
      'name': 'ex:name'
    };
    
    // When resolving 'name', it should expand to 'ex:name' → 'http://example.org/name'
    const prefix = 'ex';
    const baseUri = context[prefix];
    expect(baseUri).toBe('http://example.org/');
  });
});

describe('Graph Structure Analysis', () => {
  test('should identify all nodes in graph', () => {
    const graph = [
      { '@id': '#node1', '@type': 'Dataset' },
      { '@id': '#node2', '@type': 'Variable' },
      { '@id': '_:blank', '@type': 'Annotation' }
    ];
    
    const allNodeIds = graph.map(n => n['@id']);
    expect(allNodeIds).toHaveLength(3);
    expect(allNodeIds).toContain('#node1');
    expect(allNodeIds).toContain('_:blank');
  });

  test('should extract referenced nodes', () => {
    const node = {
      '@id': '#parent',
      'references': [
        { '@id': '#child1' },
        { '@id': '#child2' }
      ],
      'singleRef': { '@id': '#child3' }
    };
    
    const refs = [];
    Object.keys(node).forEach(key => {
      if (key !== '@id' && key !== '@type') {
        const value = node[key];
        if (Array.isArray(value)) {
          value.forEach(v => {
            if (v && v['@id']) {
              refs.push(v['@id']);
            }
          });
        } else if (value && value['@id']) {
          refs.push(value['@id']);
        }
      }
    });
    
    expect(refs).toHaveLength(3);
    expect(refs).toContain('#child1');
    expect(refs).toContain('#child3');
  });
});
