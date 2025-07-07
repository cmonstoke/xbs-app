/**
 * Telemetry manager for collecting and submitting usage data
 */
import { StoreKey } from '../../../../shared/store/store.enum';
import { Logger } from '../utils/logger';
import { NetworkManager } from './network-manager';
import { StorageManager } from './storage-manager';

export interface TelemetryData {
  installationId: string;
  version: string;
  platform: string;
  timestamp: string;
  events: TelemetryEvent[];
}

export interface TelemetryEvent {
  type: string;
  timestamp: string;
  data?: any;
}

export class TelemetryManager {
  private logger = new Logger();
  private events: TelemetryEvent[] = [];

  constructor(private storageManager: StorageManager, private networkManager: NetworkManager) {}

  async submitTelemetry(): Promise<void> {
    try {
      const telemetryEnabled = await this.storageManager.get<boolean>(StoreKey.TelemetryEnabled);

      if (!telemetryEnabled) {
        this.logger.info('Telemetry disabled, skipping submission');
        return;
      }

      if (this.events.length === 0) {
        this.logger.info('No telemetry events to submit');
        return;
      }

      const telemetryData = await this.prepareTelemetryData();

      // TODO: Submit to telemetry endpoint
      // For now, just log that telemetry would be submitted
      this.logger.info('Telemetry data prepared for submission:', {
        eventCount: telemetryData.events.length,
        version: telemetryData.version
      });

      // Clear submitted events
      this.events = [];
    } catch (error) {
      this.logger.error('Failed to submit telemetry:', error);
    }
  }

  async recordEvent(type: string, data?: any): Promise<void> {
    try {
      const telemetryEnabled = await this.storageManager.get<boolean>(StoreKey.TelemetryEnabled);

      if (!telemetryEnabled) {
        return;
      }

      const event: TelemetryEvent = {
        type,
        timestamp: new Date().toISOString(),
        data
      };

      this.events.push(event);

      // Keep only recent events (last 100)
      if (this.events.length > 100) {
        this.events = this.events.slice(-100);
      }

      this.logger.debug('Telemetry event recorded:', type);
    } catch (error) {
      this.logger.error('Failed to record telemetry event:', error);
    }
  }

  async enableTelemetry(): Promise<void> {
    try {
      await this.storageManager.set(StoreKey.TelemetryEnabled, true);
      await this.recordEvent('telemetry_enabled');
      this.logger.info('Telemetry enabled');
    } catch (error) {
      this.logger.error('Failed to enable telemetry:', error);
    }
  }

  async disableTelemetry(): Promise<void> {
    try {
      await this.recordEvent('telemetry_disabled');
      await this.submitTelemetry(); // Submit final batch
      await this.storageManager.set(StoreKey.TelemetryEnabled, false);
      this.events = []; // Clear all events
      this.logger.info('Telemetry disabled');
    } catch (error) {
      this.logger.error('Failed to disable telemetry:', error);
    }
  }

  async isTelemetryEnabled(): Promise<boolean> {
    try {
      return (await this.storageManager.get<boolean>(StoreKey.TelemetryEnabled)) || false;
    } catch (error) {
      this.logger.error('Failed to check telemetry status:', error);
      return false;
    }
  }

  private async prepareTelemetryData(): Promise<TelemetryData> {
    const [installationId, version] = await Promise.all([this.getOrCreateInstallationId(), this.getAppVersion()]);

    return {
      installationId,
      version,
      platform: this.getPlatform(),
      timestamp: new Date().toISOString(),
      events: [...this.events] // Copy events
    };
  }

  private async getOrCreateInstallationId(): Promise<string> {
    let installationId = await this.storageManager.get<string>(StoreKey.InstallationId);

    if (!installationId) {
      installationId = this.generateInstallationId();
      await this.storageManager.set(StoreKey.InstallationId, installationId);
    }

    return installationId;
  }

  private generateInstallationId(): string {
    return `xbs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getAppVersion(): Promise<string> {
    try {
      // Use the global browser object declared at module level
      /* eslint-disable-next-line no-restricted-globals */
      return (self as any).browser?.runtime?.getManifest()?.version || '1.6.0';
    } catch {
      return '1.6.0';
    }
  }

  private getPlatform(): string {
    // Detect platform from user agent or browser API
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes('chrome')) return 'chrome';
    if (userAgent.includes('firefox')) return 'firefox';
    if (userAgent.includes('safari')) return 'safari';
    if (userAgent.includes('edge')) return 'edge';

    return 'unknown';
  }

  // Common telemetry events
  async recordSyncEvent(type: 'start' | 'complete' | 'error', data?: any): Promise<void> {
    await this.recordEvent(`sync_${type}`, data);
  }

  async recordBookmarkEvent(type: 'create' | 'update' | 'delete', data?: any): Promise<void> {
    await this.recordEvent(`bookmark_${type}`, data);
  }

  async recordBackupEvent(type: 'create' | 'restore' | 'auto', data?: any): Promise<void> {
    await this.recordEvent(`backup_${type}`, data);
  }

  async recordExtensionEvent(type: 'install' | 'update' | 'startup', data?: any): Promise<void> {
    await this.recordEvent(`extension_${type}`, data);
  }
}
