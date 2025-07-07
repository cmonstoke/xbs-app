/**
 * Bookmark manager for handling bookmark events and operations
 */
import { SyncType } from '../../../../shared/sync/sync.enum';
import { Logger } from '../utils/logger';
import { SyncManager } from './sync-manager';

// Use global browser object
declare const browser: any;

export class BookmarkManager {
  private logger = new Logger();

  constructor(private syncManager: SyncManager) {}

  async handleBookmarkCreated(id: string, bookmark: any): Promise<void> {
    this.logger.info('Bookmark created:', id, bookmark.title);

    try {
      // Queue a simple sync operation
      await this.syncManager.queueSync({
        type: SyncType.Remote
      });
    } catch (error) {
      this.logger.error('Failed to handle bookmark creation:', error);
    }
  }

  async handleBookmarkRemoved(id: string, removeInfo: any): Promise<void> {
    this.logger.info('Bookmark removed:', id);

    try {
      // Queue a simple sync operation
      await this.syncManager.queueSync({
        type: SyncType.Remote
      });
    } catch (error) {
      this.logger.error('Failed to handle bookmark removal:', error);
    }
  }

  async handleBookmarkChanged(id: string, changeInfo: any): Promise<void> {
    this.logger.info('Bookmark changed:', id, changeInfo);

    try {
      // Queue a simple sync operation
      await this.syncManager.queueSync({
        type: SyncType.Remote
      });
    } catch (error) {
      this.logger.error('Failed to handle bookmark change:', error);
    }
  }

  async handleBookmarkMoved(id: string, moveInfo: any): Promise<void> {
    this.logger.info('Bookmark moved:', id, moveInfo);

    try {
      // Queue a simple sync operation
      await this.syncManager.queueSync({
        type: SyncType.Remote
      });
    } catch (error) {
      this.logger.error('Failed to handle bookmark move:', error);
    }
  }

  async getAllBookmarks(): Promise<any[]> {
    try {
      return browser.bookmarks.getTree();
    } catch (error) {
      this.logger.error('Failed to get all bookmarks:', error);
      throw error;
    }
  }

  async getBookmark(id: string): Promise<any[]> {
    try {
      return browser.bookmarks.get(id);
    } catch (error) {
      this.logger.error('Failed to get bookmark:', error);
      throw error;
    }
  }

  async createBookmark(bookmark: any): Promise<any> {
    try {
      return browser.bookmarks.create(bookmark);
    } catch (error) {
      this.logger.error('Failed to create bookmark:', error);
      throw error;
    }
  }

  async updateBookmark(id: string, changes: any): Promise<any> {
    try {
      return browser.bookmarks.update(id, changes);
    } catch (error) {
      this.logger.error('Failed to update bookmark:', error);
      throw error;
    }
  }

  async removeBookmark(id: string): Promise<void> {
    try {
      await browser.bookmarks.remove(id);
    } catch (error) {
      this.logger.error('Failed to remove bookmark:', error);
      throw error;
    }
  }

  async searchBookmarks(query: string): Promise<any[]> {
    try {
      return browser.bookmarks.search(query);
    } catch (error) {
      this.logger.error('Failed to search bookmarks:', error);
      throw error;
    }
  }

  async exportBookmarks(): Promise<string> {
    try {
      const bookmarks = await this.getAllBookmarks();
      return JSON.stringify(bookmarks, null, 2);
    } catch (error) {
      this.logger.error('Failed to export bookmarks:', error);
      throw error;
    }
  }

  async importBookmarks(bookmarksJson: string): Promise<void> {
    try {
      const bookmarks = JSON.parse(bookmarksJson);

      // This would need more sophisticated logic to handle the import
      // For now, just log that import was attempted
      this.logger.info('Importing bookmarks:', bookmarks.length);

      // TODO: Implement actual bookmark import logic
    } catch (error) {
      this.logger.error('Failed to import bookmarks:', error);
      throw error;
    }
  }
}
