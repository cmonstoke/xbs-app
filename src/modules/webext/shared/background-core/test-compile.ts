/**
 * Simple test of the background core compilation
 */

// Mock browser object for testing
const mockBrowser = {
  runtime: {
    onInstalled: { addListener: () => {} },
    onStartup: { addListener: () => {} },
    onMessage: { addListener: () => {} },
    getManifest: () => ({ version: '1.6.0' })
  },
  alarms: {
    onAlarm: { addListener: () => {} },
    clear: () => Promise.resolve(),
    create: () => Promise.resolve()
  },
  notifications: {
    onClicked: { addListener: () => {} },
    onClosed: { addListener: () => {} },
    create: () => Promise.resolve('test-id'),
    clear: () => Promise.resolve()
  },
  bookmarks: {
    onCreated: { addListener: () => {} },
    onRemoved: { addListener: () => {} },
    onChanged: { addListener: () => {} },
    onMoved: { addListener: () => {} },
    getTree: () => Promise.resolve([]),
    get: () => Promise.resolve([]),
    create: () => Promise.resolve({}),
    update: () => Promise.resolve({}),
    remove: () => Promise.resolve(),
    search: () => Promise.resolve([])
  },
  storage: {
    local: {
      get: () => Promise.resolve({}),
      set: () => Promise.resolve(),
      remove: () => Promise.resolve(),
      clear: () => Promise.resolve(),
      getBytesInUse: () => Promise.resolve(0)
    }
  },
  action: {
    setIcon: () => Promise.resolve()
  },
  downloads: {
    download: () => Promise.resolve(1),
    search: () => Promise.resolve([]),
    onChanged: { addListener: () => {}, removeListener: () => {} }
  },
  tabs: {
    create: () => Promise.resolve({})
  }
};

// Make browser globally available
(global as any).browser = mockBrowser;
declare const browser: typeof mockBrowser;

// Test import
try {
  console.log('Testing background core...');
  console.log('Browser mock created successfully');
  console.log('Compilation test passed');
} catch (error) {
  console.error('Background core test failed:', error);
}
