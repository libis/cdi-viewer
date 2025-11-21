/**
 * Custom modal dialog system to replace browser's alert(), confirm(), and prompt()
 * These are more testable and provide better UX than native browser dialogs
 */

import $ from 'jquery';

/**
 * Show an alert modal (replacement for window.alert)
 * @param {string} message - The message to display
 * @returns {Promise<void>}
 */
export function showAlert(message) {
  return new Promise((resolve) => {
    const modal = $(`
      <div class="custom-modal-overlay" data-testid="alert-modal">
        <div class="custom-modal">
          <div class="custom-modal-header">
            <h4>Alert</h4>
          </div>
          <div class="custom-modal-body">
            <p>${escapeHtml(message)}</p>
          </div>
          <div class="custom-modal-footer">
            <button class="btn btn-primary" data-testid="alert-ok-btn">OK</button>
          </div>
        </div>
      </div>
    `);

    modal.find('[data-testid="alert-ok-btn"]').on('click', () => {
      modal.remove();
      resolve();
    });

    // Close on overlay click
    modal.on('click', (e) => {
      if ($(e.target).hasClass('custom-modal-overlay')) {
        modal.remove();
        resolve();
      }
    });

    // Close on Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        $(document).off('keydown', handleEscape);
        resolve();
      }
    };
    $(document).on('keydown', handleEscape);

    $('body').append(modal);
    modal.find('[data-testid="alert-ok-btn"]').focus();
  });
}

/**
 * Show a confirmation modal (replacement for window.confirm)
 * @param {string} message - The message to display
 * @param {Object} options - Optional configuration
 * @param {string} options.title - Modal title (default: "Confirm")
 * @param {string} options.confirmText - Text for confirm button (default: "OK")
 * @param {string} options.cancelText - Text for cancel button (default: "Cancel")
 * @returns {Promise<boolean>} - True if confirmed, false if cancelled
 */
export function showConfirm(message, options = {}) {
  const {
    title = 'Confirm',
    confirmText = 'OK',
    cancelText = 'Cancel'
  } = options;

  return new Promise((resolve) => {
    const modal = $(`
      <div class="custom-modal-overlay" data-testid="confirm-modal">
        <div class="custom-modal">
          <div class="custom-modal-header">
            <h4>${escapeHtml(title)}</h4>
          </div>
          <div class="custom-modal-body">
            <p>${escapeHtml(message)}</p>
          </div>
          <div class="custom-modal-footer">
            <button class="btn btn-default" data-testid="confirm-cancel-btn">${escapeHtml(cancelText)}</button>
            <button class="btn btn-danger" data-testid="confirm-ok-btn">${escapeHtml(confirmText)}</button>
          </div>
        </div>
      </div>
    `);

    modal.find('[data-testid="confirm-ok-btn"]').on('click', () => {
      modal.remove();
      resolve(true);
    });

    modal.find('[data-testid="confirm-cancel-btn"]').on('click', () => {
      modal.remove();
      resolve(false);
    });

    // Close on overlay click (counts as cancel)
    modal.on('click', (e) => {
      if ($(e.target).hasClass('custom-modal-overlay')) {
        modal.remove();
        resolve(false);
      }
    });

    // Close on Escape key (counts as cancel)
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        $(document).off('keydown', handleEscape);
        resolve(false);
      }
    };
    $(document).on('keydown', handleEscape);

    $('body').append(modal);
    modal.find('[data-testid="confirm-ok-btn"]').focus();
  });
}

/**
 * Show a prompt modal (replacement for window.prompt)
 * @param {string} message - The message to display
 * @param {string} defaultValue - Default input value
 * @param {Object} options - Optional configuration
 * @param {string} options.title - Modal title (default: "Input Required")
 * @param {string} options.placeholder - Input placeholder
 * @returns {Promise<string|null>} - The entered value, or null if cancelled
 */
export function showPrompt(message, defaultValue = '', options = {}) {
  const {
    title = 'Input Required',
    placeholder = ''
  } = options;

  return new Promise((resolve) => {
    const modal = $(`
      <div class="custom-modal-overlay" data-testid="prompt-modal">
        <div class="custom-modal">
          <div class="custom-modal-header">
            <h4>${escapeHtml(title)}</h4>
          </div>
          <div class="custom-modal-body">
            <p>${escapeHtml(message)}</p>
            <input 
              type="text" 
              class="form-control" 
              data-testid="prompt-input"
              value="${escapeHtml(defaultValue)}"
              placeholder="${escapeHtml(placeholder)}"
            />
          </div>
          <div class="custom-modal-footer">
            <button class="btn btn-default" data-testid="prompt-cancel-btn">Cancel</button>
            <button class="btn btn-primary" data-testid="prompt-ok-btn">OK</button>
          </div>
        </div>
      </div>
    `);

    const input = modal.find('[data-testid="prompt-input"]');

    modal.find('[data-testid="prompt-ok-btn"]').on('click', () => {
      const value = input.val().trim();
      modal.remove();
      resolve(value || null);
    });

    modal.find('[data-testid="prompt-cancel-btn"]').on('click', () => {
      modal.remove();
      resolve(null);
    });

    // Submit on Enter key
    input.on('keydown', (e) => {
      if (e.key === 'Enter') {
        const value = input.val().trim();
        modal.remove();
        resolve(value || null);
      }
    });

    // Close on overlay click (counts as cancel)
    modal.on('click', (e) => {
      if ($(e.target).hasClass('custom-modal-overlay')) {
        modal.remove();
        resolve(null);
      }
    });

    // Close on Escape key (counts as cancel)
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        $(document).off('keydown', handleEscape);
        resolve(null);
      }
    };
    $(document).on('keydown', handleEscape);

    $('body').append(modal);
    input.focus();
    input.select();
  });
}

/**
 * Escape HTML to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} - Escaped string
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
