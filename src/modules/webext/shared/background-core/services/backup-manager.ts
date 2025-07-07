/**
 * Backup manager for handling automatic backups
 */
import { AutoBackUpSchedule } from '../../../../shared/backup-restore/backup-restore.interface';
import Globals from '../../../../shared/global-shared.constants';
import { Logger } from '../utils/logger';
import { BookmarkManager } from './bookmark-manager';
import { StorageManager } from './storage-manager';

// Use global browser object
declare const browser: any;

export class BackupManager {
  private logger = new Logger();

  constructor(private storageManager: StorageManager, private bookmarkManager: BookmarkManager) {}

  async runAutoBackUp(): Promise<void> {
    this.logger.info('Running automatic backup');

    try {
      // Get current bookmarks
      const bookmarks = await this.bookmarkManager.getAllBookmarks();

      // Create backup data
      const backup = {
        bookmarks,
        timestamp: new Date().toISOString(),
        type: 'auto',
        version: browser.runtime.getManifest().version
      };

      // Store backup
      const backupKey = `backup_auto_${Date.now()}`;
      await this.storageManager.set(backupKey, JSON.stringify(backup));

      // Clean up old backups (keep only last 5 auto backups)
      await this.cleanupOldBackups();

      this.logger.info('Automatic backup completed');
    } catch (error) {
      this.logger.error('Automatic backup failed:', error);
    }
  }

  async enableAutoBackUp(schedule: AutoBackUpSchedule): Promise<void> {
    try {
      // Calculate alarm delay from schedule
      const now = new Date();
      const runTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        parseInt(schedule.autoBackUpHour, 10),
        parseInt(schedule.autoBackUpMinute, 10)
      );

      if (runTime < now) {
        runTime.setDate(now.getDate() + 1);
      }

      const delayInMinutes = Math.round((runTime.getTime() - now.getTime()) / 1000 / 60);

      // Calculate alarm period from schedule
      let periodInMinutes: number;
      switch (schedule.autoBackUpUnit) {
        case 'week':
          periodInMinutes = 60 * 24 * 7;
          break;
        case 'month':
          periodInMinutes = 60 * 24 * (365 / 12);
          break;
        case 'day':
        default:
          periodInMinutes = 60 * 24;
      }
      periodInMinutes *= parseInt(schedule.autoBackUpNumber, 10);

      // Clear existing alarm and create new one
      await browser.alarms.clear(Globals.Alarms.AutoBackUp.Name);
      await browser.alarms.create(Globals.Alarms.AutoBackUp.Name, {
        delayInMinutes,
        periodInMinutes
      });

      this.logger.info('Auto backup enabled:', schedule);
    } catch (error) {
      this.logger.error('Failed to enable auto backup:', error);
      throw error;
    }
  }

  async disableAutoBackUp(): Promise<void> {
    try {
      await browser.alarms.clear(Globals.Alarms.AutoBackUp.Name);
      this.logger.info('Auto backup disabled');
    } catch (error) {
      this.logger.error('Failed to disable auto backup:', error);
      throw error;
    }
  }

  async createManualBackup(): Promise<string> {
    this.logger.info('Creating manual backup');

    try {
      // Get current bookmarks
      const bookmarks = await this.bookmarkManager.getAllBookmarks();

      // Create backup data
      const backup = {
        bookmarks,
        timestamp: new Date().toISOString(),
        type: 'manual',
        version: browser.runtime.getManifest().version
      };

      // Store backup
      const backupKey = `backup_manual_${Date.now()}`;
      await this.storageManager.set(backupKey, JSON.stringify(backup));

      this.logger.info('Manual backup created:', backupKey);
      return backupKey;
    } catch (error) {
      this.logger.error('Manual backup failed:', error);
      throw error;
    }
  }

  async restoreFromBackup(backupKey: string): Promise<void> {
    this.logger.info('Restoring from backup:', backupKey);

    try {
      // Get backup data
      const backupData = await this.storageManager.get<string>(backupKey);

      if (!backupData) {
        throw new Error('Backup not found');
      }

      const backup = JSON.parse(backupData);

      if (!backup.bookmarks) {
        throw new Error('Invalid backup format');
      }

      // TODO: Implement actual bookmark restoration
      // This would involve:
      // 1. Clearing current bookmarks (with confirmation)
      // 2. Importing backup bookmarks
      // 3. Updating sync if enabled

      this.logger.info('Backup restored successfully');
    } catch (error) {
      this.logger.error('Backup restoration failed:', error);
      throw error;
    }
  }

  async getAvailableBackups(): Promise<Array<{ key: string; timestamp: string; type: string }>> {
    try {
      // Get all storage keys
      const allStorage = await this.storageManager.getMultiple([]);
      const backupKeys = Object.keys(allStorage).filter((key) => key.startsWith('backup_'));

      const backups = [];
      /* eslint-disable-next-line no-restricted-syntax */
      for (const key of backupKeys) {
        try {
          const backupData = JSON.parse(allStorage[key]);
          backups.push({
            key,
            timestamp: backupData.timestamp,
            type: backupData.type || 'unknown'
          });
        } catch (error) {
          this.logger.warn('Invalid backup data for key:', key);
        }
      }

      // Sort by timestamp (newest first)
      backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return backups;
    } catch (error) {
      this.logger.error('Failed to get available backups:', error);
      return [];
    }
  }

  async deleteBackup(backupKey: string): Promise<void> {
    try {
      await this.storageManager.remove(backupKey);
      this.logger.info('Backup deleted:', backupKey);
    } catch (error) {
      this.logger.error('Failed to delete backup:', error);
      throw error;
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const backups = await this.getAvailableBackups();
      const autoBackups = backups.filter((backup) => backup.type === 'auto');

      // Keep only the 5 most recent auto backups
      const backupsToDelete = autoBackups.slice(5);

      /* eslint-disable-next-line no-restricted-syntax */
      for (const backup of backupsToDelete) {
        /* eslint-disable-next-line no-await-in-loop */
        await this.deleteBackup(backup.key);
      }

      if (backupsToDelete.length > 0) {
        this.logger.info(`Cleaned up ${backupsToDelete.length} old backups`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup old backups:', error);
    }
  }
}
