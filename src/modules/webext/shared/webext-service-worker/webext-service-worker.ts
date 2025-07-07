/**
 * Manifest V3 Service Worker for xBrowserSync
 * This replaces the background.html page from Manifest V2
 */

// Import Angular and necessary modules
import './webext-service-worker-angular-setup';
import browser from 'webextension-polyfill';

// Global variables for service worker state
let isInitialized = false;
let syncQueue: any[] = [];

// Service worker event listeners
browser.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed/updated:', details);

  // Initialize the extension
  await initializeExtension();

  if (details.reason === 'install') {
    // Fresh install
    await handleFreshInstall();
  } else if (details.reason === 'update') {
    // Extension update
    await handleExtensionUpdate();
  }
});

browser.runtime.onStartup.addListener(async () => {
  console.log('Browser startup');
  await initializeExtension();
});

// Handle alarms (for scheduled syncs and backups)
browser.alarms.onAlarm.addListener(async (alarm) => {
  console.log('Alarm triggered:', alarm.name);

  switch (alarm.name) {
    case 'SyncUpdatesCheck':
      await handleSyncUpdatesCheck();
      break;
    case 'AutoBackUp':
      await handleAutoBackup();
      break;
    default:
      console.warn('Unknown alarm:', alarm.name);
  }
});

// Handle messages from popup and content scripts
browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log('Message received:', message);

  try {
    const result = await handleMessage(message);
    return result;
  } catch (error) {
    console.error('Error handling message:', error);
    throw error;
  }
});

// Handle bookmark events
browser.bookmarks.onCreated.addListener(async (id, bookmark) => {
  console.log('Bookmark created:', id, bookmark);
  await handleBookmarkChange('created', { id, bookmark });
});

browser.bookmarks.onRemoved.addListener(async (id, removeInfo) => {
  console.log('Bookmark removed:', id, removeInfo);
  await handleBookmarkChange('removed', { id, removeInfo });
});

browser.bookmarks.onChanged.addListener(async (id, changeInfo) => {
  console.log('Bookmark changed:', id, changeInfo);
  await handleBookmarkChange('changed', { id, changeInfo });
});

browser.bookmarks.onMoved.addListener(async (id, moveInfo) => {
  console.log('Bookmark moved:', id, moveInfo);
  await handleBookmarkChange('moved', { id, moveInfo });
});

// Notification event handlers
browser.notifications.onClicked.addListener(async (notificationId) => {
  console.log('Notification clicked:', notificationId);
  await handleNotificationClick(notificationId);
});

browser.notifications.onClosed.addListener(async (notificationId, byUser) => {
  console.log('Notification closed:', notificationId, 'by user:', byUser);
  await handleNotificationClosed(notificationId);
});

// Core functions
async function initializeExtension(): Promise<void> {
  if (isInitialized) {
    return;
  }

  console.log('Initializing xBrowserSync extension...');

  try {
    // Initialize storage
    await initializeStorage();

    // Check for sync status
    const isSyncEnabled = await checkSyncStatus();

    if (isSyncEnabled) {
      // Schedule periodic sync checks
      await schedulePeriodicSyncChecks();

      // Check for sync updates on startup
      setTimeout(() => handleSyncUpdatesCheck(), 3000);
    }

    // Update browser action icon
    await updateBrowserActionIcon(isSyncEnabled);

    isInitialized = true;
    console.log('Extension initialized successfully');
  } catch (error) {
    console.error('Failed to initialize extension:', error);
    throw error;
  }
}

async function handleFreshInstall(): Promise<void> {
  console.log('Handling fresh install...');

  try {
    // Set default settings
    await browser.storage.local.set({
      displayOtherSyncsWarning: true,
      displayPermissions: true,
      syncBookmarksToolbar: true
    });

    // Create install backup
    const bookmarks = await browser.bookmarks.getTree();
    const installBackup = {
      bookmarks,
      date: new Date().toISOString()
    };

    await browser.storage.local.set({
      installBackup: JSON.stringify(installBackup)
    });

    console.log('Fresh install setup completed');
  } catch (error) {
    console.error('Failed to handle fresh install:', error);
  }
}

async function handleExtensionUpdate(): Promise<void> {
  console.log('Handling extension update...');

  try {
    // Run any necessary migration/upgrade logic
    const currentVersion = browser.runtime.getManifest().version;
    console.log('Updated to version:', currentVersion);

    // Show update notification
    await browser.notifications.create('update-notification', {
      type: 'basic',
      iconUrl: 'assets/notification.svg',
      title: 'xBrowserSync Updated',
      message: `Extension updated to version ${currentVersion}`
    });
  } catch (error) {
    console.error('Failed to handle extension update:', error);
  }
}

async function handleMessage(message: any): Promise<any> {
  console.log('Processing message:', message.command);

  switch (message.command) {
    case 'SyncBookmarks':
      return handleSyncBookmarks(message);

    case 'GetCurrentSync':
      return getCurrentSync();

    case 'DisableSync':
      return disableSync();

    case 'EnableEventListeners':
      return enableBookmarkEventListeners();

    case 'DisableEventListeners':
      return disableBookmarkEventListeners();

    case 'DownloadFile':
      return downloadFile(message);

    default:
      throw new Error(`Unknown command: ${message.command}`);
  }
}

async function handleSyncBookmarks(message: any): Promise<void> {
  console.log('Handling sync bookmarks request');

  // Add to sync queue
  syncQueue.push({
    ...message,
    timestamp: Date.now()
  });

  // Process queue
  await processSyncQueue();
}

async function processSyncQueue(): Promise<void> {
  if (syncQueue.length === 0) {
    return;
  }

  console.log(`Processing sync queue with ${syncQueue.length} items`);

  // Process one item at a time to avoid conflicts
  const syncItem = syncQueue.shift();

  try {
    // Implement actual sync logic here
    // This would integrate with your existing sync service
    console.log('Processing sync item:', syncItem);
  } catch (error) {
    console.error('Sync processing failed:', error);
  }

  // Process next item if queue not empty
  if (syncQueue.length > 0) {
    setTimeout(() => processSyncQueue(), 1000);
  }
}

async function handleBookmarkChange(type: string, data: any): Promise<void> {
  console.log(`Bookmark ${type}:`, data);

  const isSyncEnabled = await checkSyncStatus();
  if (!isSyncEnabled) {
    return;
  }

  // Queue sync for bookmark changes
  await handleSyncBookmarks({
    command: 'SyncBookmarks',
    type: 'auto',
    trigger: `bookmark_${type}`
  });
}

async function handleSyncUpdatesCheck(): Promise<void> {
  console.log('Checking for sync updates...');

  try {
    const isSyncEnabled = await checkSyncStatus();
    if (!isSyncEnabled) {
      return;
    }

    // Implement sync update check logic
    // This would check the server for updates to synced bookmarks
  } catch (error) {
    console.error('Sync update check failed:', error);
  }
}

async function handleAutoBackup(): Promise<void> {
  console.log('Running auto backup...');

  try {
    // Implement auto backup logic
    const bookmarks = await browser.bookmarks.getTree();
    const backup = {
      bookmarks,
      date: new Date().toISOString(),
      type: 'auto'
    };

    // Store backup (you might want to download or sync to server)
    await browser.storage.local.set({
      [`backup_${Date.now()}`]: JSON.stringify(backup)
    });

    console.log('Auto backup completed');
  } catch (error) {
    console.error('Auto backup failed:', error);
  }
}

async function handleNotificationClick(notificationId: string): Promise<void> {
  console.log('Notification clicked:', notificationId);

  // Clear the notification
  await browser.notifications.clear(notificationId);

  // Handle specific notification actions
  if (notificationId === 'update-notification') {
    // Open extension options page or popup
    await browser.tabs.create({
      url: browser.runtime.getURL('app.html')
    });
  }
}

async function handleNotificationClosed(notificationId: string): Promise<void> {
  console.log('Notification closed:', notificationId);
  // Cleanup notification handlers if needed
}

// Utility functions
async function initializeStorage(): Promise<void> {
  // Ensure storage is accessible
  const result = await browser.storage.local.get('initialized');
  if (!result.initialized) {
    await browser.storage.local.set({ initialized: true });
  }
}

async function checkSyncStatus(): Promise<boolean> {
  try {
    const result = await browser.storage.local.get('syncEnabled');
    return result.syncEnabled === true;
  } catch (error) {
    console.error('Failed to check sync status:', error);
    return false;
  }
}

async function schedulePeriodicSyncChecks(): Promise<void> {
  try {
    // Clear existing alarm
    await browser.alarms.clear('SyncUpdatesCheck');

    // Create new alarm for periodic sync checks (every 15 minutes)
    await browser.alarms.create('SyncUpdatesCheck', {
      periodInMinutes: 15
    });

    console.log('Scheduled periodic sync checks');
  } catch (error) {
    console.error('Failed to schedule sync checks:', error);
  }
}

async function updateBrowserActionIcon(syncEnabled: boolean): Promise<void> {
  try {
    const iconPath = syncEnabled ? 'assets/synced.png' : 'assets/notsynced.png';

    await browser.action.setIcon({
      path: {
        '32': iconPath
      }
    });

    console.log('Browser action icon updated:', syncEnabled ? 'synced' : 'not synced');
  } catch (error) {
    console.error('Failed to update browser action icon:', error);
  }
}

async function getCurrentSync(): Promise<any> {
  // Return current sync status/progress
  return {
    inProgress: syncQueue.length > 0,
    queueLength: syncQueue.length
  };
}

async function disableSync(): Promise<void> {
  console.log('Disabling sync...');

  await browser.storage.local.set({ syncEnabled: false });
  await browser.alarms.clear('SyncUpdatesCheck');
  await updateBrowserActionIcon(false);

  // Clear sync queue
  syncQueue = [];
}

async function enableBookmarkEventListeners(): Promise<void> {
  console.log('Bookmark event listeners enabled');
  // Event listeners are already set up globally
}

async function disableBookmarkEventListeners(): Promise<void> {
  console.log('Bookmark event listeners disabled');
  // Note: In service workers, we can't easily remove listeners
  // Instead, we check sync status before processing events
}

async function downloadFile(message: any): Promise<string> {
  const { filename, textContents, displaySaveDialog = true } = message;

  if (!filename || !textContents) {
    throw new Error('Missing filename or content for download');
  }

  try {
    // Create blob and download
    const blob = new Blob([textContents], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const downloadId = await browser.downloads.download({
      url,
      filename,
      saveAs: displaySaveDialog
    });

    // Clean up object URL after download starts
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    return `Download started with ID: ${downloadId}`;
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
}

console.log('xBrowserSync service worker loaded');
