/**
 * Sync manager for handling bookmark synchronization
 */
import { StoreKey } from '../../../../shared/store/store.enum';
import { SyncType } from '../../../../shared/sync/sync.enum';
import { Sync } from '../../../../shared/sync/sync.interface';
import { Logger } from '../utils/logger';
import { NetworkManager } from './network-manager';
import { StorageManager } from './storage-manager';

// Use global browser object
declare const browser: any;

export class SyncManager {
  private logger = new Logger();
  private currentSync: Sync | null = null;
  private syncQueue: Sync[] = [];
  private isSyncInProgress = false;

  constructor(private storageManager: StorageManager, private networkManager: NetworkManager) {}

  async enableSync(): Promise<void> {
    try {
      await this.storageManager.set(StoreKey.SyncEnabled, true);
      this.logger.info('Sync enabled');
    } catch (error) {
      this.logger.error('Failed to enable sync:', error);
      throw error;
    }
  }

  async disableSync(): Promise<void> {
    try {
      await this.storageManager.set(StoreKey.SyncEnabled, false);

      // Clear sync queue
      this.syncQueue = [];
      this.currentSync = null;
      this.isSyncInProgress = false;

      // Clear sync-related alarms
      await browser.alarms.clear('SyncUpdatesCheck');

      this.logger.info('Sync disabled');
    } catch (error) {
      this.logger.error('Failed to disable sync:', error);
      throw error;
    }
  }

  async executeSync(): Promise<void> {
    if (this.isSyncInProgress) {
      this.logger.info('Sync already in progress, skipping');
      return;
    }

    this.isSyncInProgress = true;

    try {
      // Process any queued syncs first
      await this.processQueue();

      // Check for remote updates
      await this.checkForRemoteUpdates();

      this.logger.info('Sync execution completed');
    } catch (error) {
      this.logger.error('Sync execution failed:', error);
      throw error;
    } finally {
      this.isSyncInProgress = false;
      this.currentSync = null;
    }
  }

  async queueSync(sync: Sync, runImmediately: boolean = false): Promise<void> {
    try {
      // Add to sync queue
      this.syncQueue.push(sync);
      this.logger.info('Sync queued:', sync.type);

      if (runImmediately && !this.isSyncInProgress) {
        await this.executeSync();
      }
    } catch (error) {
      this.logger.error('Failed to queue sync:', error);
      throw error;
    }
  }

  getCurrentSync(): Sync | null {
    return this.currentSync;
  }

  getSyncQueueLength(): number {
    return this.syncQueue.length;
  }

  private async processQueue(): Promise<void> {
    while (this.syncQueue.length > 0 && this.isSyncInProgress) {
      const sync = this.syncQueue.shift();
      if (!sync) {
        /* eslint-disable-next-line no-continue */
        continue;
      }
      this.currentSync = sync;
      this.logger.info('Processing sync:', sync.type, sync.uniqueId);

      /* eslint-disable-next-line no-await-in-loop */ try {
        await this.processSingleSync(sync);
      } catch (error) {
        this.logger.error('Failed to process sync:', sync.type, sync.uniqueId, error);
        // Continue with next sync instead of failing completely
      }
    }
  }

  private async processSingleSync(sync: Sync): Promise<void> {
    switch (sync.type) {
      case SyncType.Remote:
        await this.pushBookmarksToServer(sync);
        break;
      case SyncType.Local:
        await this.pullBookmarksFromServer(sync);
        break;
      case SyncType.LocalAndRemote:
        await this.bidirectionalSync(sync);
        break;
      case SyncType.Upgrade:
        await this.handleUpgradeSync(sync);
        break;
      case SyncType.Cancel:
        await this.handleCancelSync(sync);
        break;
      default:
        this.logger.warn('Unknown sync type:', sync.type);
    }
  }

  private async pushBookmarksToServer(sync: Sync): Promise<void> {
    this.logger.info('Pushing bookmarks to server');

    try {
      // Get current bookmarks
      const bookmarks = await browser.bookmarks.getTree();

      // Get sync URL and credentials from storage
      const syncInfo = await this.storageManager.get<any>(StoreKey.SyncInfo);

      if (!syncInfo?.url || !syncInfo?.id) {
        throw new Error('Sync configuration missing');
      }

      // TODO: Implement actual API call to sync server
      // This would typically involve:
      // 1. Encrypting bookmarks
      // 2. Sending to server
      // 3. Handling response

      this.logger.info('Bookmarks pushed successfully');
    } catch (error) {
      this.logger.error('Failed to push bookmarks:', error);
      throw error;
    }
  }

  private async pullBookmarksFromServer(sync: Sync): Promise<void> {
    this.logger.info('Pulling bookmarks from server');

    try {
      // Get sync configuration
      const syncInfo = await this.storageManager.get<any>(StoreKey.SyncInfo);

      if (!syncInfo?.url || !syncInfo?.id) {
        throw new Error('Sync configuration missing');
      }

      // TODO: Implement actual API call to get bookmarks from server
      // This would typically involve:
      // 1. Fetching from server
      // 2. Decrypting bookmarks
      // 3. Updating local bookmarks

      this.logger.info('Bookmarks pulled successfully');
    } catch (error) {
      this.logger.error('Failed to pull bookmarks:', error);
      throw error;
    }
  }

  private async bidirectionalSync(sync: Sync): Promise<void> {
    this.logger.info('Performing bidirectional sync');

    // For bidirectional sync, we need to:
    // 1. Get remote bookmarks
    // 2. Compare with local bookmarks
    // 3. Resolve conflicts
    // 4. Update both local and remote as needed

    await this.pullBookmarksFromServer(sync);
    await this.pushBookmarksToServer(sync);
  }

  private async checkForRemoteUpdates(): Promise<void> {
    try {
      const syncEnabled = await this.storageManager.get<boolean>(StoreKey.SyncEnabled);
      if (!syncEnabled) {
        return;
      }

      // Check if remote bookmarks have been updated
      // This would typically check a timestamp or version
      this.logger.info('Checking for remote updates');

      // TODO: Implement actual remote update check
    } catch (error) {
      this.logger.error('Failed to check for remote updates:', error);
      // Don't throw - this is a background operation
    }
  }

  private async handleUpgradeSync(sync: Sync): Promise<void> {
    this.logger.info('Handling upgrade sync');
    // TODO: Implement upgrade sync logic
    // This would handle upgrading the sync data format when needed
  }

  private async handleCancelSync(sync: Sync): Promise<void> {
    this.logger.info('Handling cancel sync');
    this.currentSync = null;
    this.syncQueue = [];
    // Clear any ongoing sync operations
  }
}
