/**
 * Alert manager for displaying notifications and alerts
 */
import Globals from '../../../../shared/global-shared.constants';
import { Logger } from '../utils/logger';

// Use global browser object
declare const browser: any;

export interface Alert {
  title: string;
  message: string;
}

export class AlertManager {
  private logger = new Logger();
  private notificationClickHandlers: Array<{ id: string; eventHandler: () => void }> = [];

  constructor() {
    // Set up notification event listeners
    browser.notifications.onClicked.addListener(this.onNotificationClicked.bind(this));
    browser.notifications.onClosed.addListener(this.onNotificationClosed.bind(this));
  }

  async displayAlert(alert: Alert, url?: string): Promise<void> {
    try {
      // Strip HTML tags from message and extract URLs
      const urlRegex = new RegExp(Globals.URL.ValidUrlRegex, 'i');
      const urlInAlert = alert.message.match(urlRegex)?.find(Boolean);

      const messageToDisplay = urlInAlert
        ? new DOMParser().parseFromString(`<span>${alert.message}</span>`, 'text/xml').firstElementChild?.textContent ||
          alert.message
        : alert.message;

      const options: any = {
        iconUrl: `${Globals.PathToAssets}/notification.svg`,
        message: messageToDisplay,
        title: alert.title,
        type: 'basic'
      };

      // Create notification
      const notificationId = await browser.notifications.create(this.generateNotificationId(), options);

      // Add click handler if URL provided
      const urlToOpenOnClick = urlInAlert ?? url;
      if (urlToOpenOnClick && notificationId) {
        const openUrlInNewTab = () => {
          this.openUrl(urlToOpenOnClick);
        };

        this.notificationClickHandlers.push({
          id: notificationId,
          eventHandler: openUrlInNewTab
        });
      }

      this.logger.info('Alert displayed:', alert.title);
    } catch (error) {
      this.logger.error('Failed to display alert:', error);
    }
  }

  async displaySimpleNotification(title: string, message: string): Promise<void> {
    await this.displayAlert({ title, message });
  }

  async clearNotification(notificationId: string): Promise<void> {
    try {
      await browser.notifications.clear(notificationId);
      this.removeNotificationHandler(notificationId);
    } catch (error) {
      this.logger.error('Failed to clear notification:', error);
    }
  }

  private async onNotificationClicked(notificationId: string): Promise<void> {
    const handler = this.notificationClickHandlers.find((h) => h.id === notificationId);
    if (handler) {
      handler.eventHandler();
      await this.clearNotification(notificationId);
    }
  }

  private async onNotificationClosed(notificationId: string): Promise<void> {
    this.removeNotificationHandler(notificationId);
  }

  private removeNotificationHandler(notificationId: string): void {
    const index = this.notificationClickHandlers.findIndex((h) => h.id === notificationId);
    if (index >= 0) {
      this.notificationClickHandlers.splice(index, 1);
    }
  }

  private generateNotificationId(): string {
    return `xbs-notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async openUrl(url: string): Promise<void> {
    try {
      await browser.tabs.create({ url });
    } catch (error) {
      this.logger.error('Failed to open URL:', error);
    }
  }

  addNotificationClickHandler(id: string, handler: () => void): void {
    this.notificationClickHandlers.push({ id, eventHandler: handler });
  }

  removeNotificationClickHandler(id: string): void {
    this.removeNotificationHandler(id);
  }
}
