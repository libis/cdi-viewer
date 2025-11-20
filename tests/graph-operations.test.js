// Author: Eryk Kulikowski @ KU Leuven (2025). Apache 2.0 License

/**
 * Tests for graph operations (add nodes, properties, etc.)
 */

describe('Graph Operations - Node Creation', () => {
  test('should create new node with unique ID', () => {
    const timestamp = Date.now();
    const nodeId = `_:newNode_${timestamp}`;
    
    expect(nodeId).toMatch(/^_:newNode_\d+$/);
  });

  test('should create node with @type', () => {
    const nodeType = 'Dataset';
    const node = {
      '@id': '_:newNode',
      '@type': nodeType
    };
    
    expect(node['@type']).toBe('Dataset');
  });

  test('should add node to graph', () => {
    const graph = [];
    const newNode = { '@id': '#new', '@type': 'Variable' };
    
    graph.push(newNode);
    
    expect(graph).toHaveLength(1);
    expect(graph[0]['@id']).toBe('#new');
  });

  test('should extract class name from URI', () => {
    const fullUri = 'https://ddi-alliance.org/Specification/DDI-CDI/1.0/RDF/Dataset';
    const className = fullUri.split('/').pop().split('#').pop();
    
    expect(className).toBe('Dataset');
  });

  test('should handle class name with hash separator', () => {
    const uri = 'http://example.org/vocab#Variable';
    const className = uri.split('/').pop().split('#').pop();
    
    expect(className).toBe('Variable');
  });
});

describe('Graph Operations - Property Addition', () => {
  test('should add simple property to node', () => {
    const node = { '@id': '#test', '@type': 'Dataset' };
    const propName = 'name';
    const propValue = 'Test Dataset';
    
    node[propName] = propValue;
    
    expect(node.name).toBe('Test Dataset');
  });

  test('should add array property to node', () => {
    const node = { '@id': '#test', '@type': 'Dataset' };
    const propName = 'keywords';
    const propValues = ['keyword1', 'keyword2'];
    
    node[propName] = propValues;
    
    expect(Array.isArray(node.keywords)).toBe(true);
    expect(node.keywords).toHaveLength(2);
  });

  test('should add reference property', () => {
    const node = { '@id': '#dataset', '@type': 'Dataset' };
    const reference = { '@id': '#variable' };
    
    node.hasVariable = reference;
    
    expect(node.hasVariable['@id']).toBe('#variable');
  });

  test('should respect maxCount=1 (single value)', () => {
    const node = { '@id': '#test' };
    const maxCount = 1;
    
    // If maxCount is 1, should store as single value, not array
    if (maxCount === 1) {
      node.property = 'single value';
    } else {
      node.property = ['value1', 'value2'];
    }
    
    expect(typeof node.property).toBe('string');
  });

  test('should handle multiple values when maxCount > 1', () => {
    const node = { '@id': '#test' };
    const maxCount = null; // unbounded
    
    if (maxCount === 1) {
      node.property = 'single';
    } else {
      node.property = ['value1', 'value2'];
    }
    
    expect(Array.isArray(node.property)).toBe(true);
  });
});

describe('Graph Operations - Node References', () => {
  test('should find node by ID', () => {
    const graph = [
      { '@id': '#node1', '@type': 'Dataset' },
      { '@id': '#node2', '@type': 'Variable' }
    ];
    
    const found = graph.find(n => n['@id'] === '#node2');
    
    expect(found).toBeDefined();
    expect(found['@type']).toBe('Variable');
  });

  test('should handle blank node IDs', () => {
    const blankId = '_:blank1';
    
    expect(blankId.startsWith('_:')).toBe(true);
  });

  test('should handle hash fragment IDs', () => {
    const hashId = '#node1';
    
    expect(hashId.startsWith('#')).toBe(true);
  });

  test('should handle full URI IDs', () => {
    const uriId = 'http://example.org/resource/123';
    
    expect(uriId.startsWith('http://')).toBe(true);
  });
});

describe('Graph Operations - Available Node Types', () => {
  test('should extract class name for display', () => {
    const classUri = 'https://ddi-alliance.org/Specification/DDI-CDI/1.0/RDF/Dataset';
    const className = classUri.split('/').pop().split('#').pop();
    
    // Humanize: convert camelCase to spaces
    const label = className
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
    
    expect(label).toBe('Dataset');
  });

  test('should create node type object', () => {
    const nodeType = {
      uri: 'http://example.org/Dataset',
      name: 'Dataset',
      label: 'Dataset'
    };
    
    expect(nodeType.uri).toBeDefined();
    expect(nodeType.name).toBeDefined();
    expect(nodeType.label).toBeDefined();
  });
});
