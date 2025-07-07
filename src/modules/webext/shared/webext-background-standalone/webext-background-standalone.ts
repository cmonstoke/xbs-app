/**
 * Main service worker entry point for the browser extension
 * This replaces the Angular-based background page with a standalone implementation
 */
import { BackgroundCore } from '../background-core/background-core';

// Global instance
const backgroundCore: BackgroundCore = (() => {
  try {
    const core = new BackgroundCore();
    // eslint-disable-next-line no-console
    console.log('xBrowserSync background service worker initialized');
    return core;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize background service worker:', error);
    throw error;
  }
})();

// Export for debugging purposes (service worker global scope)
/* eslint-disable-next-line no-restricted-globals */
(self as any).backgroundCore = backgroundCore;

export { backgroundCore };
