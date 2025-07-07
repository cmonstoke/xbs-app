/**
 * Core background service for browser extension
 * Standalone implementation without Angular dependencies
 */
import Globals from '../../../shared/global-shared.constants';
import { StoreKey } from '../../../shared/store/store.enum';
import { DownloadFileMessage, EnableAutoBackUpMessage, Message, SyncBookmarksMessage } from '../../webext.interface';
import { AlertManager } from './services/alert-manager';
import { BackupManager } from './services/backup-manager';
import { BookmarkManager } from './services/bookmark-manager';
import { MessageHandler } from './services/message-handler';
import { NetworkManager } from './services/network-manager';
import { StorageManager } from './services/storage-manager';
import { SyncManager } from './services/sync-manager';
import { TelemetryManager } from './services/telemetry-manager';
import { UpgradeManager } from './services/upgrade-manager';
import { UtilityManager } from './services/utility-manager';
import { Logger } from './utils/logger';

// Use global browser object
declare const browser: any;

export class BackgroundCore {
  private logger: Logger;
  private storageManager: StorageManager;
  private syncManager: SyncManager;
  private bookmarkManager: BookmarkManager;
  private alertManager: AlertManager;
  private backupManager: BackupManager;
  private networkManager: NetworkManager;
  private telemetryManager: TelemetryManager;
  private upgradeManager: UpgradeManager;
  private utilityManager: UtilityManager;
  private messageHandler: MessageHandler;
  private notificationClickHandlers: Array<{ id: string; eventHandler: () => void }> = [];
  private isInitialized = false;

  constructor() {
    this.logger = new Logger();
    this.storageManager = new StorageManager();
    this.networkManager = new NetworkManager();
    this.utilityManager = new UtilityManager(this.storageManager);
    this.syncManager = new SyncManager(this.storageManager, this.networkManager);
    this.bookmarkManager = new BookmarkManager(this.syncManager);
    this.alertManager = new AlertManager();
    this.backupManager = new BackupManager(this.storageManager, this.bookmarkManager);
    this.telemetryManager = new TelemetryManager(this.storageManager, this.networkManager);
    this.upgradeManager = new UpgradeManager(this.storageManager);
    this.messageHandler = new MessageHandler(this);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Extension lifecycle events
    browser.runtime.onInstalled.addListener(this.onInstalled.bind(this));
    browser.runtime.onStartup.addListener(this.onStartup.bind(this));

    // Alarm events
    browser.alarms.onAlarm.addListener(this.onAlarm.bind(this));

    // Message events
    browser.runtime.onMessage.addListener(this.onMessage.bind(this));

    // Notification events
    browser.notifications.onClicked.addListener(this.onNotificationClicked.bind(this));
    browser.notifications.onClosed.addListener(this.onNotificationClosed.bind(this));

    // Bookmark events (will be enabled/disabled based on sync status)
    browser.bookmarks.onCreated.addListener(this.onBookmarkCreated.bind(this));
    browser.bookmarks.onRemoved.addListener(this.onBookmarkRemoved.bind(this));
    browser.bookmarks.onChanged.addListener(this.onBookmarkChanged.bind(this));
    browser.bookmarks.onMoved.addListener(this.onBookmarkMoved.bind(this));
  }

  // Public getters for services
  getStorage(): StorageManager {
    return this.storageManager;
  }
  getSync(): SyncManager {
    return this.syncManager;
  }
  getBookmark(): BookmarkManager {
    return this.bookmarkManager;
  }
  getAlert(): AlertManager {
    return this.alertManager;
  }
  getBackup(): BackupManager {
    return this.backupManager;
  }
  getNetwork(): NetworkManager {
    return this.networkManager;
  }
  getTelemetry(): TelemetryManager {
    return this.telemetryManager;
  }
  getUpgrade(): UpgradeManager {
    return this.upgradeManager;
  }
  getUtility(): UtilityManager {
    return this.utilityManager;
  }

  // Extension lifecycle methods
  private async onInstalled(details: any): Promise<void> {
    this.logger.info('Extension installed/updated:', details);

    try {
      if (details.reason === 'install') {
        await this.handleFreshInstall();
      } else if (details.reason === 'update') {
        await this.handleExtensionUpdate();
      }

      await this.init();
    } catch (error) {
      this.logger.error('Failed to handle extension install/update:', error);
    }
  }

  private async onStartup(): Promise<void> {
    this.logger.info('Browser startup');
    await this.init();
  }

  // Core initialization
  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.logger.info('Starting up background core');

    try {
      // Initialize storage
      await this.storageManager.init();

      // Check for upgrade requirements
      const appVersion = await this.getAppVersion();
      const upgradeRequired = await this.upgradeManager.checkIfUpgradeRequired(appVersion);

      if (upgradeRequired) {
        await this.upgradeExtension();
      }

      // Get initial settings
      const [checkForAppUpdates, telemetryEnabled, syncEnabled] = await Promise.all([
        this.storageManager.get(StoreKey.CheckForAppUpdates) as Promise<boolean>,
        this.storageManager.get(StoreKey.TelemetryEnabled) as Promise<boolean>,
        this.utilityManager.isSyncEnabled()
      ]);

      // Update browser action icon
      await this.refreshNativeInterface(syncEnabled);

      // Schedule app update check
      if (checkForAppUpdates) {
        setTimeout(() => this.checkForNewVersion(), 5000);
      }

      // Initialize sync if enabled
      if (syncEnabled) {
        await this.syncManager.enableSync();
        setTimeout(() => this.checkForSyncUpdatesOnStartup(), 3000);

        // Submit telemetry if enabled
        if (telemetryEnabled) {
          setTimeout(() => this.telemetryManager.submitTelemetry(), 4000);
        }
      }

      this.isInitialized = true;
      this.logger.info('Background core initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize background core:', error);
      throw error;
    }
  }

  // Installation handlers
  private async handleFreshInstall(): Promise<void> {
    this.logger.info('Handling fresh install');

    try {
      // Set default settings
      await Promise.all([
        this.storageManager.set(StoreKey.DisplayOtherSyncsWarning, true),
        this.storageManager.set(StoreKey.DisplayPermissions, true),
        this.storageManager.set(StoreKey.SyncBookmarksToolbar, true)
      ]);

      // Create install backup
      const bookmarks = await browser.bookmarks.getTree();
      const installBackup = {
        bookmarks,
        date: new Date().toISOString()
      };

      await this.storageManager.set(StoreKey.InstallBackup, JSON.stringify(installBackup));

      // Set initial upgrade version
      const currentVersion = await this.getAppVersion();
      await this.upgradeManager.setLastUpgradeVersion(currentVersion);

      this.logger.info(`Installed ${currentVersion}`);
    } catch (error) {
      this.logger.error('Failed to handle fresh install:', error);
      throw error;
    }
  }

  private async handleExtensionUpdate(): Promise<void> {
    this.logger.info('Handling extension update');
    // Update handling is done in init() via upgrade manager
  }

  // Event handlers
  private async onAlarm(alarm: any): Promise<void> {
    this.logger.info('Alarm triggered:', alarm.name);

    switch (alarm?.name) {
      case Globals.Alarms.AutoBackUp.Name:
        await this.backupManager.runAutoBackUp();
        break;
      case Globals.Alarms.SyncUpdatesCheck.Name:
        await this.checkForSyncUpdates();
        break;
      default:
        this.logger.warn('Unknown alarm:', alarm.name);
    }
  }

  private async onMessage(message: Message, sender: any): Promise<any> {
    return this.messageHandler.handleMessage(message, sender);
  }

  private async onNotificationClicked(notificationId: string): Promise<void> {
    const handler = this.notificationClickHandlers.find((h) => h.id === notificationId);
    if (handler) {
      handler.eventHandler();
      await browser.notifications.clear(notificationId);
    }
  }

  private async onNotificationClosed(notificationId: string): Promise<void> {
    const index = this.notificationClickHandlers.findIndex((h) => h.id === notificationId);
    if (index >= 0) {
      this.notificationClickHandlers.splice(index, 1);
    }
  }

  // Bookmark event handlers
  private async onBookmarkCreated(id: string, bookmark: any): Promise<void> {
    if (await this.shouldHandleBookmarkEvent()) {
      await this.bookmarkManager.handleBookmarkCreated(id, bookmark);
    }
  }

  private async onBookmarkRemoved(id: string, removeInfo: any): Promise<void> {
    if (await this.shouldHandleBookmarkEvent()) {
      await this.bookmarkManager.handleBookmarkRemoved(id, removeInfo);
    }
  }

  private async onBookmarkChanged(id: string, changeInfo: any): Promise<void> {
    if (await this.shouldHandleBookmarkEvent()) {
      await this.bookmarkManager.handleBookmarkChanged(id, changeInfo);
    }
  }

  private async onBookmarkMoved(id: string, moveInfo: any): Promise<void> {
    if (await this.shouldHandleBookmarkEvent()) {
      await this.bookmarkManager.handleBookmarkMoved(id, moveInfo);
    }
  }

  private async shouldHandleBookmarkEvent(): Promise<boolean> {
    return this.utilityManager.isSyncEnabled();
  }

  // Core functionality methods
  async checkForNewVersion(): Promise<void> {
    try {
      const appVersion = await this.getAppVersion();
      const newVersion = await this.utilityManager.checkForNewVersion(appVersion);

      if (newVersion) {
        const alert = {
          title: 'App Update Available',
          message: `New version v${newVersion} is available`
        };

        await this.alertManager.displayAlert(alert, `${Globals.ReleaseNotesUrlStem}${newVersion}`);
      }
    } catch (error) {
      this.logger.error('Failed to check for new version:', error);
    }
  }

  async checkForSyncUpdates(): Promise<void> {
    if (this.syncManager.getCurrentSync()) {
      return; // Already syncing
    }

    try {
      await this.syncManager.executeSync();
    } catch (error) {
      if (!this.networkManager.isNetworkConnectionError(error)) {
        throw error;
      }
      this.logger.info('Could not check for updates, no connection');
    }
  }

  private async checkForSyncUpdatesOnStartup(): Promise<void> {
    const syncEnabled = await this.utilityManager.isSyncEnabled();
    if (!syncEnabled) {
      return;
    }

    try {
      await this.checkForSyncUpdates();
    } catch (error) {
      if (this.networkManager.isNetworkConnectionError(error)) {
        this.logger.info('Connection lost, retrying check for sync updates momentarily');
        setTimeout(async () => {
          const stillEnabled = await this.utilityManager.isSyncEnabled();
          if (stillEnabled) {
            await this.checkForSyncUpdates();
          }
        }, 5000);
      } else {
        throw error;
      }
    }
  }

  async upgradeExtension(): Promise<void> {
    try {
      const appVersion = await this.getAppVersion();
      await this.upgradeManager.upgrade(appVersion);

      const alert = {
        title: `App Updated v${appVersion}`,
        message: 'Extension has been successfully updated'
      };

      await this.alertManager.displayAlert(alert, `${Globals.ReleaseNotesUrlStem}${appVersion}`);
      await this.storageManager.set(StoreKey.DisplayUpdated, true);
    } catch (error) {
      this.logger.error('Failed to upgrade extension:', error);
      throw error;
    }
  }

  async refreshNativeInterface(syncEnabled: boolean): Promise<void> {
    try {
      const iconPath = syncEnabled ? 'assets/synced.png' : 'assets/notsynced.png';

      await browser.action.setIcon({
        path: {
          '32': iconPath
        }
      });

      this.logger.info('Browser action icon updated:', syncEnabled ? 'synced' : 'not synced');
    } catch (error) {
      this.logger.error('Failed to update browser action icon:', error);
    }
  }

  // Utility methods
  private async getAppVersion(): Promise<string> {
    return browser.runtime.getManifest().version;
  }

  // Public methods for message handler
  addNotificationClickHandler(id: string, handler: () => void): void {
    this.notificationClickHandlers.push({ id, eventHandler: handler });
  }

  // Message command handlers (called by MessageHandler)
  async handleSyncBookmarks(message: SyncBookmarksMessage): Promise<void> {
    const { sync, runSync } = message;

    if (sync === undefined) {
      return this.syncManager.executeSync();
    }

    return this.syncManager.queueSync(sync, runSync);
  }

  async handleRestoreBookmarks(message: SyncBookmarksMessage): Promise<void> {
    const { sync } = message;
    return this.syncManager.queueSync(sync);
  }

  async handleGetCurrentSync(): Promise<any> {
    return this.syncManager.getCurrentSync();
  }

  async handleGetSyncQueueLength(): Promise<number> {
    return this.syncManager.getSyncQueueLength();
  }

  async handleDisableSync(): Promise<void> {
    return this.syncManager.disableSync();
  }

  async handleDownloadFile(message: DownloadFileMessage): Promise<string | void> {
    const { filename, textContents, displaySaveDialog = true } = message;

    if (!filename || !textContents) {
      throw new Error('File name or contents parameter missing');
    }

    return new Promise((resolve, reject) => {
      const file = new Blob([textContents], { type: 'text/plain' });
      const url = URL.createObjectURL(file);

      browser.downloads
        .download({
          filename,
          saveAs: displaySaveDialog,
          url
        })
        .then((downloadId) => {
          const onChangedHandler = (delta: any) => {
            switch (delta.state?.current) {
              case 'complete':
                URL.revokeObjectURL(url);
                browser.downloads.onChanged.removeListener(onChangedHandler);
                browser.downloads.search({ id: downloadId }).then((results) => {
                  const [download] = results;
                  if (download) {
                    this.logger.info(`Downloaded file ${download.filename}`);
                    resolve(download.filename);
                  } else {
                    resolve();
                  }
                });
                break;
              case 'interrupted':
                URL.revokeObjectURL(url);
                browser.downloads.onChanged.removeListener(onChangedHandler);
                if (delta.error?.current === 'USER_CANCELED') {
                  resolve();
                } else {
                  reject(new Error('Failed to download file'));
                }
                break;
              default:
                // Ignore other download states (in_progress, paused, etc.)
                break;
            }
          };

          browser.downloads.onChanged.addListener(onChangedHandler);
        })
        .catch(reject);
    });
  }

  async handleEnableEventListeners(): Promise<void> {
    // Event listeners are always active, but we check sync status before processing
    this.logger.info('Bookmark event listeners enabled');
  }

  async handleDisableEventListeners(): Promise<void> {
    // In service workers, we can't easily remove listeners
    // Instead, we check sync status before processing events
    this.logger.info('Bookmark event listeners disabled (will check sync status)');
  }

  async handleEnableAutoBackUp(message: EnableAutoBackUpMessage): Promise<void> {
    const { schedule } = message;
    return this.backupManager.enableAutoBackUp(schedule);
  }

  async handleDisableAutoBackUp(): Promise<void> {
    return this.backupManager.disableAutoBackUp();
  }
}
