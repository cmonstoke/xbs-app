/**
 * Utility manager for common utility functions
 */
import { StoreKey } from '../../../../shared/store/store.enum';
import { Logger } from '../utils/logger';
import { StorageManager } from './storage-manager';

export class UtilityManager {
  private logger = new Logger();

  constructor(private storageManager: StorageManager) {}

  async isSyncEnabled(): Promise<boolean> {
    try {
      const syncEnabled = await this.storageManager.get<boolean>(StoreKey.SyncEnabled);
      return syncEnabled === true;
    } catch (error) {
      this.logger.error('Failed to check sync status:', error);
      return false;
    }
  }

  async checkForNewVersion(currentVersion: string): Promise<string | null> {
    try {
      // This would typically check against a remote API
      // For now, just return null (no update available)
      this.logger.info('Checking for new version...', currentVersion);
      return null;
    } catch (error) {
      this.logger.error('Failed to check for new version:', error);
      return null;
    }
  }

  getUniqueishId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  generateRandomString(length: number = 8): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i += 1) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  async getCurrentTimestamp(): Promise<string> {
    return new Date().toISOString();
  }

  isValidUrl(url: string): boolean {
    try {
      /* eslint-disable-next-line no-new */
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  sanitizeString(str: string): string {
    return str.replace(/[<>"'&]/g, (match) => {
      const escapeMap: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return escapeMap[match];
    });
  }

  async sleep(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
  }

  compareVersions(version1: string, version2: string): number {
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

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  truncateString(str: string, maxLength: number, suffix: string = '...'): string {
    if (str.length <= maxLength) {
      return str;
    }
    return str.substring(0, maxLength - suffix.length) + suffix;
  }

  async retry<T>(fn: () => Promise<T>, maxAttempts: number = 3, delay: number = 1000): Promise<T> {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        /* eslint-disable-next-line no-await-in-loop */
        return await fn();
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }

        this.logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`, error);
        /* eslint-disable-next-line no-await-in-loop */
        await this.sleep(delay);
      }
    }

    throw new Error('Max retry attempts reached');
  }
}
