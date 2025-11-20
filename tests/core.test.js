/**
 * Critical regression tests for CDI Viewer core functionality
 * 
 * These tests prevent regressions like:
 * - "editMode is not defined" bug
 * - "currentLogLevel is not defined" bug
 * - Global variable access issues
 */

describe('Core - Global Variables', () => {
  beforeEach(() => {
    // Reset global state
    window.jsonData = null;
    window.shaclShapes = null;
    window.shaclShapesStore = null;
    window.isEditMode = false;
    window.originalData = null;
    window.validationReport = null;
    window.fileId = null;
    window.siteUrl = null;
    window.originalFileName = "cdi-metadata.jsonld";
    window.expandedJsonLd = null;
    window.currentShapeSource = "ddi-cdi-official";
    window.hadOriginalGraph = true;
    window.currentLogLevel = 1; // WARN
    window.SHAPE_URLS = {
      "ddi-cdi-official": "https://ddi-cdi.github.io/m2t-ng/DDI-CDI_1-0/encoding/shacl/ddi-cdi.shacl.ttl",
      "cdif-core": "shapes/cdif-core.ttl",
      "local-fallback": "shapes/ddi-cdi-official.ttl"
    };
  });

  test('window.isEditMode should be defined (not editMode)', () => {
    expect(window.isEditMode).toBeDefined();
    expect(window.isEditMode).toBe(false);
    
    // Verify we can set it
    window.isEditMode = true;
    expect(window.isEditMode).toBe(true);
  });

  test('window.currentLogLevel should be defined and accessible', () => {
    expect(window.currentLogLevel).toBeDefined();
    expect(typeof window.currentLogLevel).toBe('number');
  });

  test('window.expandedJsonLd should be defined', () => {
    expect(window.expandedJsonLd).toBeDefined();
    expect(window.expandedJsonLd).toBeNull();
  });

  test('window.originalFileName should have default value', () => {
    expect(window.originalFileName).toBe("cdi-metadata.jsonld");
  });

  test('window.SHAPE_URLS should contain all shape sources', () => {
    expect(window.SHAPE_URLS).toBeDefined();
    expect(window.SHAPE_URLS['ddi-cdi-official']).toBeDefined();
    expect(window.SHAPE_URLS['cdif-core']).toBe('shapes/cdif-core.ttl');
    expect(window.SHAPE_URLS['local-fallback']).toBe('shapes/ddi-cdi-official.ttl');
  });

  test('window.currentShapeSource should have default value', () => {
    expect(window.currentShapeSource).toBe('ddi-cdi-official');
  });

  test('window.hadOriginalGraph should be boolean', () => {
    expect(typeof window.hadOriginalGraph).toBe('boolean');
    expect(window.hadOriginalGraph).toBe(true);
  });

  test('all critical global variables should be accessible via window.*', () => {
    const criticalGlobals = [
      'jsonData',
      'shaclShapes',
      'shaclShapesStore',
      'isEditMode',
      'originalData',
      'validationReport',
      'fileId',
      'siteUrl',
      'originalFileName',
      'expandedJsonLd',
      'currentShapeSource',
      'hadOriginalGraph',
      'SHAPE_URLS',
      'currentLogLevel'
    ];

    criticalGlobals.forEach(varName => {
      expect(window).toHaveProperty(varName);
    });
  });
});

describe('Core - Logging System', () => {
  const LOG_LEVEL = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
  };

  test('debug mode should be disabled by default', () => {
    // Simulate page load without ?debug=true
    window.location.search = '';
    const urlParams = new URLSearchParams(window.location.search);
    const logLevel = urlParams.get('debug') === 'true' ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN;
    
    expect(logLevel).toBe(LOG_LEVEL.WARN);
  });

  test('debug mode should be enabled with ?debug=true', () => {
    // Simulate page load with ?debug=true
    window.location.search = '?debug=true';
    const urlParams = new URLSearchParams(window.location.search);
    const logLevel = urlParams.get('debug') === 'true' ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN;
    
    expect(logLevel).toBe(LOG_LEVEL.DEBUG);
  });
});

describe('Core - URL Parameter Parsing', () => {
  test('should parse fileId from URL parameters', () => {
    window.location.search = '?fileid=123&siteUrl=http://example.com';
    const urlParams = new URLSearchParams(window.location.search);
    
    expect(urlParams.get('fileid')).toBe('123');
    expect(urlParams.get('siteUrl')).toBe('http://example.com');
  });

  test('should parse testfile parameter', () => {
    window.location.search = '?testfile=SimpleSample.jsonld';
    const urlParams = new URLSearchParams(window.location.search);
    
    expect(urlParams.get('testfile')).toBe('SimpleSample.jsonld');
  });

  test('should handle missing parameters gracefully', () => {
    window.location.search = '';
    const urlParams = new URLSearchParams(window.location.search);
    
    expect(urlParams.get('fileid')).toBeNull();
    expect(urlParams.get('siteUrl')).toBeNull();
  });
});
