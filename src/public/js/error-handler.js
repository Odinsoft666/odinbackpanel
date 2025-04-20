/**
 * Client-Side Global Error Handler
 * Catches and handles:
 * - Uncaught exceptions
 * - Unhandled promise rejections
 * - Fetch API errors
 */

// Configuration
const ERROR_REPORTING_ENABLED = true;
const ERROR_REPORTING_ENDPOINT = '/api/client-errors';

class ClientErrorHandler {
  constructor() {
    this.initialize();
  }

  initialize() {
    // Uncaught exceptions
    window.addEventListener('error', (event) => {
      this.handleError(event.error || event.message, 'UNCAUGHT_ERROR');
      return false; // Prevent default browser error handling
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, 'UNHANDLED_REJECTION');
    });

    // Fetch API error wrapper
    this.wrapFetch();
  }

  handleError(error, type = 'CLIENT_ERROR') {
    const errorData = {
      type,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // Display user-friendly message
    this.displayUserError(errorData.message);

    // Report to server if enabled
    if (ERROR_REPORTING_ENABLED) {
      this.reportError(errorData);
    }

    console.error(`[${type}]`, error);
  }

  displayUserError(message) {
    const toast = document.createElement('div');
    toast.className = 'toast error';
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <div class="toast-message">
        <strong>Something went wrong:</strong> ${this.sanitizeMessage(message)}
      </div>
      <button class="toast-close" aria-label="Close notification">&times;</button>
    `;
    
    document.getElementById('toastContainer')?.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  }

  sanitizeMessage(message) {
    // Basic sanitization for display
    return String(message)
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .substring(0, 200);
  }

  reportError(errorData) {
    if (!ERROR_REPORTING_ENDPOINT) return;

    fetch(ERROR_REPORTING_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content || ''
      },
      body: JSON.stringify(errorData)
    }).catch(e => console.error('Error reporting failed:', e));
  }

  wrapFetch() {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (!response.ok) {
          const error = new Error(`HTTP error! status: ${response.status}`);
          error.response = response;
          throw error;
        }
        return response;
      } catch (error) {
        this.handleError(error, 'FETCH_ERROR');
        throw error; // Re-throw for original caller
      }
    };
  }
}

// Initialize immediately
new ClientErrorHandler();

// Export for testing purposes
export default ClientErrorHandler;