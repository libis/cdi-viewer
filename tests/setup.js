/**
 * Jest setup file for CDI Viewer tests
 * 
 * Sets up global mocks and environment for browser-based code testing
 */

// Mock jQuery
global.$ = global.jQuery = require('jquery');

// Mock Bootstrap (basic structure - tests don't need full Bootstrap)
global.$.fn.modal = jest.fn();
global.$.fn.collapse = jest.fn();
global.$.fn.dropdown = jest.fn();

// Mock window.alert, confirm, prompt
global.alert = jest.fn();
global.confirm = jest.fn(() => true);
global.prompt = jest.fn();

// Mock console methods to reduce test noise (can be overridden in specific tests)
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set up URLSearchParams mock
if (typeof URLSearchParams === 'undefined') {
  global.URLSearchParams = class URLSearchParams {
    constructor(search = '') {
      this.params = new Map();
      if (search.startsWith('?')) {
        search = search.slice(1);
      }
      search.split('&').forEach(pair => {
        const [key, value] = pair.split('=');
        if (key) {
          this.params.set(key, decodeURIComponent(value || ''));
        }
      });
    }
    
    get(key) {
      return this.params.get(key) || null;
    }
    
    set(key, value) {
      this.params.set(key, value);
    }
    
    has(key) {
      return this.params.has(key);
    }
  };
}

// Mock fetch for testing
global.fetch = jest.fn();

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  
  // Reset window.location using jsdom's reconfigure API
  window.location.href = 'http://localhost/';
});
