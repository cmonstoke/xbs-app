# xBrowserSync Background Core - Standalone Implementation

This directory contains the refactored background logic for the xBrowserSync browser extension that works without Angular dependencies. This is a complete rewrite of the background functionality to support modern browser extension architecture (Manifest V3 service workers).

## Architecture Overview

The background core is built with a modular service-based architecture:

### Core Components

#### `BackgroundCore` (background-core.ts)
- Main orchestrator that initializes and coordinates all background services
- Handles extension lifecycle events (install, startup, update)
- Sets up event listeners for browser APIs
- Manages initialization sequence and dependency injection

#### Service Managers

1. **StorageManager** - Handles all browser storage operations
2. **SyncManager** - Manages bookmark synchronization with remote servers
3. **BookmarkManager** - Handles bookmark events and operations
4. **AlertManager** - Manages notifications and user alerts
5. **BackupManager** - Handles automatic and manual backups
6. **NetworkManager** - Manages network requests and connection checking
7. **TelemetryManager** - Collects and submits usage analytics
8. **UpgradeManager** - Handles extension upgrades and data migrations
9. **UtilityManager** - Provides common utility functions
10. **MessageHandler** - Processes messages from popup and content scripts

### Key Features

- **No Angular Dependencies**: Complete standalone implementation
- **Service Worker Compatible**: Works in Manifest V3 service worker context
- **Modular Design**: Each service has a single responsibility
- **Error Handling**: Comprehensive error handling and logging
- **Type Safety**: Full TypeScript implementation
- **Event-Driven**: Reactive to browser API events

### Usage

The background core is automatically initialized when the service worker starts:

```typescript
import { BackgroundCore } from './background-core/background-core';

// Initialize background core
const backgroundCore = new BackgroundCore();
```

### Service Communication

Services communicate through dependency injection and the main BackgroundCore instance:

```typescript
// Example: Getting sync status
const syncEnabled = await backgroundCore.utility.isSyncEnabled();

// Example: Triggering a backup
await backgroundCore.backup.runAutoBackUp();

// Example: Displaying an alert
await backgroundCore.alert.displayAlert({
  title: 'Sync Complete',
  message: 'Your bookmarks have been synchronized successfully.'
});
```

### Message Handling

The MessageHandler processes commands from the popup and content scripts:

```typescript
// From popup:
browser.runtime.sendMessage({
  command: 'SyncBookmarks',
  sync: { type: 'push' }
});

// Handled by:
backgroundCore.handleSyncBookmarks(message);
```

### Event Handling

Browser events are automatically handled:

- **Extension lifecycle**: install, startup, update
- **Bookmark events**: create, update, delete, move
- **Alarm events**: scheduled syncs and backups
- **Message events**: commands from popup/content scripts
- **Notification events**: user interactions

### Configuration

Services can be configured through the StorageManager using StoreKey enum values:

```typescript
// Enable sync
await storageManager.set(StoreKey.SyncEnabled, true);

// Set telemetry preference
await storageManager.set(StoreKey.TelemetryEnabled, false);
```

### Error Handling

All services use the Logger utility for consistent error reporting:

```typescript
try {
  await someOperation();
} catch (error) {
  this.logger.error('Operation failed:', error);
  throw error;
}
```

### Migration from Angular

This implementation replaces the Angular-based background system:

#### Before (Angular-based)
- `webext-background.service.ts` - Angular service with $q promises
- `webext-background.component.ts` - Angular component
- `webext-background.module.ts` - Angular module
- Heavy dependency on Angular DI and lifecycle

#### After (Standalone)
- `background-core.ts` - Main orchestrator
- Individual service managers for each concern
- Native Promises instead of Angular $q
- No DOM dependencies, works in service worker context

### Performance Benefits

- **Faster startup**: No Angular bootstrap overhead
- **Lower memory usage**: No Angular framework overhead
- **Better reliability**: No DOM dependencies in service worker
- **Easier testing**: Independent service modules

### Development Guidelines

1. **Keep services focused**: Each service should have a single responsibility
2. **Use dependency injection**: Pass dependencies through constructors
3. **Handle errors gracefully**: Always catch and log errors appropriately
4. **Use TypeScript types**: Maintain type safety throughout
5. **Test independently**: Each service should be testable in isolation

### Future Enhancements

- Add unit tests for each service
- Implement retry logic for network operations
- Add more sophisticated error recovery
- Optimize storage operations
- Add performance monitoring
