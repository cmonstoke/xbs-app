/**
 * Message handler for processing extension messages
 */
import { MessageCommand } from '../../../../shared/global-shared.enum';
import { DownloadFileMessage, EnableAutoBackUpMessage, Message, SyncBookmarksMessage } from '../../../webext.interface';
import { Logger } from '../utils/logger';

// Forward declaration to avoid circular dependency
interface BackgroundCore {
  handleSyncBookmarks(message: SyncBookmarksMessage): Promise<void>;
  handleRestoreBookmarks(message: SyncBookmarksMessage): Promise<void>;
  handleGetCurrentSync(): Promise<any>;
  handleGetSyncQueueLength(): Promise<number>;
  handleDisableSync(): Promise<void>;
  handleDownloadFile(message: DownloadFileMessage): Promise<string | void>;
  handleEnableEventListeners(): Promise<void>;
  handleDisableEventListeners(): Promise<void>;
  handleEnableAutoBackUp(message: EnableAutoBackUpMessage): Promise<void>;
  handleDisableAutoBackUp(): Promise<void>;
}

export class MessageHandler {
  private logger = new Logger();

  constructor(private backgroundCore: BackgroundCore) {}

  async handleMessage(message: Message, sender: any): Promise<any> {
    // Use native Promise not Angular $q for compatibility with browser.runtime.sendMessage
    return new Promise<any>((resolve, reject) => {
      this.processMessage(message, sender)
        .then(resolve)
        .catch((error) => {
          // Set message to error class name so sender can rehydrate the error on receipt
          error.message = error.constructor.name;
          reject(error);
        });
    });
  }

  private async processMessage(message: Message, sender: any): Promise<any> {
    this.logger.info('Processing message:', message.command);

    try {
      switch (message.command) {
        case MessageCommand.SyncBookmarks:
          return await this.backgroundCore.handleSyncBookmarks(message as SyncBookmarksMessage);

        case MessageCommand.RestoreBookmarks:
          return await this.backgroundCore.handleRestoreBookmarks(message as SyncBookmarksMessage);

        case MessageCommand.GetCurrentSync:
          return await this.backgroundCore.handleGetCurrentSync();

        case MessageCommand.GetSyncQueueLength:
          return await this.backgroundCore.handleGetSyncQueueLength();

        case MessageCommand.DisableSync:
          return await this.backgroundCore.handleDisableSync();

        case MessageCommand.DownloadFile:
          return await this.backgroundCore.handleDownloadFile(message as DownloadFileMessage);

        case MessageCommand.EnableEventListeners:
          return await this.backgroundCore.handleEnableEventListeners();

        case MessageCommand.DisableEventListeners:
          return await this.backgroundCore.handleDisableEventListeners();

        case MessageCommand.EnableAutoBackUp:
          return await this.backgroundCore.handleEnableAutoBackUp(message as EnableAutoBackUpMessage);

        case MessageCommand.DisableAutoBackUp:
          return await this.backgroundCore.handleDisableAutoBackUp();

        default:
          throw new Error(`Unknown command: ${message.command}`);
      }
    } catch (error) {
      this.logger.error('Message processing failed:', error);
      throw error;
    }
  }
}
