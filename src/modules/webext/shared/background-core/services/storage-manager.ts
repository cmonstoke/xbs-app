/**
 * Storage manager for browser extension
 * Handles all storage operations using browser storage API
 */
import { Logger } from '../utils/logger';

// Use global browser object
declare const browser: any;

export class StorageManager {
  private logger = new Logger();
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Test storage access
      const testKey = '__storage_test__';
      await browser.storage.local.set({ [testKey]: true });
      await browser.storage.local.remove(testKey);

      this.isInitialized = true;
      this.logger.info('Storage manager initialized');
    } catch (error) {
      this.logger.error('Failed to initialize storage manager:', error);
      throw error;
    }
  }

  async get<T = any>(key: string): Promise<T | undefined> {
    try {
      const result = await browser.storage.local.get(key);
      return result[key] as T;
    } catch (error) {
      this.logger.error(`Failed to get storage item ${key}:`, error);
      throw error;
    }
  }

  async set<T = any>(key: string, value: T): Promise<void> {
    try {
      await browser.storage.local.set({ [key]: value });
      this.logger.debug(`Storage item set: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to set storage item ${key}:`, error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await browser.storage.local.remove(key);
      this.logger.debug(`Storage item removed: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to remove storage item ${key}:`, error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      await browser.storage.local.clear();
      this.logger.debug('Storage cleared');
    } catch (error) {
      this.logger.error('Failed to clear storage:', error);
      throw error;
    }
  }

  async getMultiple(keys: string[]): Promise<{ [key: string]: any }> {
    try {
      return browser.storage.local.get(keys);
    } catch (error) {
      this.logger.error('Failed to get multiple storage items:', error);
      throw error;
    }
  }

  async setMultiple(items: { [key: string]: any }): Promise<void> {
    try {
      await browser.storage.local.set(items);
      this.logger.debug('Multiple storage items set:', Object.keys(items));
    } catch (error) {
      this.logger.error('Failed to set multiple storage items:', error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await browser.storage.local.get(key);
      return key in result;
    } catch (error) {
      this.logger.error(`Failed to check if storage item exists ${key}:`, error);
      return false;
    }
  }

  async getBytesInUse(keys?: string | string[]): Promise<number> {
    try {
      return browser.storage.local.getBytesInUse(keys);
    } catch (error) {
      this.logger.error('Failed to get storage bytes in use:', error);
      return 0;
    }
  }
}
