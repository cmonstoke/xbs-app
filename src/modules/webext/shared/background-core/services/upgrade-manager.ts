/**
 * Upgrade manager for handling extension upgrades and migrations
 */
import { StoreKey } from '../../../../shared/store/store.enum';
import { Logger } from '../utils/logger';
import { StorageManager } from './storage-manager';

export class UpgradeManager {
  private logger = new Logger();

  constructor(private storageManager: StorageManager) {}

  async checkIfUpgradeRequired(currentVersion: string): Promise<boolean> {
    try {
      const lastUpgradeVersion = await this.storageManager.get<string>(StoreKey.LastUpgradeVersion);

      if (!lastUpgradeVersion) {
        // Fresh install
        return false;
      }

      return this.compareVersions(currentVersion, lastUpgradeVersion) > 0;
    } catch (error) {
      this.logger.error('Failed to check upgrade requirement:', error);
      return false;
    }
  }

  async upgrade(currentVersion: string): Promise<void> {
    this.logger.info('Starting upgrade process to version:', currentVersion);

    try {
      const lastUpgradeVersion = await this.storageManager.get<string>(StoreKey.LastUpgradeVersion);

      if (lastUpgradeVersion) {
        await this.runMigrations(lastUpgradeVersion, currentVersion);
      }

      // Update the last upgrade version
      await this.setLastUpgradeVersion(currentVersion);

      this.logger.info('Upgrade completed successfully');
    } catch (error) {
      this.logger.error('Upgrade failed:', error);
      throw error;
    }
  }

  async setLastUpgradeVersion(version: string): Promise<void> {
    try {
      await this.storageManager.set(StoreKey.LastUpgradeVersion, version);
      this.logger.info('Last upgrade version set to:', version);
    } catch (error) {
      this.logger.error('Failed to set last upgrade version:', error);
      throw error;
    }
  }

  private async runMigrations(fromVersion: string, toVersion: string): Promise<void> {
    this.logger.info('Running migrations from', fromVersion, 'to', toVersion);

    try {
      // Define migration steps
      const migrations = [
        { version: '1.6.0', migration: this.migrateTo160.bind(this) }
        // Add more migrations as needed
      ];

      /* eslint-disable-next-line no-restricted-syntax */
      for (const migration of migrations) {
        if (
          this.compareVersions(migration.version, fromVersion) > 0 &&
          this.compareVersions(migration.version, toVersion) <= 0
        ) {
          this.logger.info('Running migration to version:', migration.version);
          /* eslint-disable-next-line no-await-in-loop */
          await migration.migration();
        }
      }
    } catch (error) {
      this.logger.error('Migration failed:', error);
      throw error;
    }
  }

  private async migrateTo160(): Promise<void> {
    this.logger.info('Running migration to 1.6.0');

    try {
      // Example migration: Update storage format
      const oldData = await this.storageManager.get('oldFormatData');

      if (oldData) {
        // Convert old format to new format
        const newData = this.convertOldDataFormat(oldData);
        await this.storageManager.set('newFormatData', newData);
        await this.storageManager.remove('oldFormatData');
      }

      // Add any other 1.6.0 specific migrations here
    } catch (error) {
      this.logger.error('Failed to migrate to 1.6.0:', error);
      throw error;
    }
  }

  private convertOldDataFormat(oldData: any): any {
    // Example data format conversion
    // This would contain the actual logic to convert old data structures
    // to new ones
    return {
      ...oldData,
      version: '1.6.0',
      migrated: true
    };
  }

  private compareVersions(version1: string, version2: string): number {
    const parts1 = version1.split('.').map(Number);
    const parts2 = version2.split('.').map(Number);

    const maxLength = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < maxLength; i += 1) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;

      if (part1 < part2) return -1;
      if (part1 > part2) return 1;
    }

    return 0;
  }

  async getUpgradeHistory(): Promise<Array<{ version: string; timestamp: string }>> {
    try {
      const upgradeHistory =
        (await this.storageManager.get<Array<{ version: string; timestamp: string }>>('upgradeHistory')) || [];
      return upgradeHistory;
    } catch (error) {
      this.logger.error('Failed to get upgrade history:', error);
      return [];
    }
  }

  async recordUpgrade(version: string): Promise<void> {
    try {
      const upgradeHistory = await this.getUpgradeHistory();

      upgradeHistory.push({
        version,
        timestamp: new Date().toISOString()
      });

      // Keep only last 10 upgrade records
      const trimmedHistory = upgradeHistory.slice(-10);

      await this.storageManager.set('upgradeHistory', trimmedHistory);
    } catch (error) {
      this.logger.error('Failed to record upgrade:', error);
    }
  }
}
