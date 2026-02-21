// Sync Service - Synchronizes data between extension and website
// Handles two-way data sync with conflict resolution

export interface SyncConfig {
  autoSync: boolean;
  syncInterval: number; // milliseconds
  conflictResolution: 'last-write-wins' | 'merge' | 'manual';
}

export interface SyncRecord<T = any> {
  id: string;
  data: T;
  timestamp: number;
  source: 'extension' | 'website';
  version: number;
}

export interface SyncConflict {
  id: string;
  extensionData: any;
  websiteData: any;
  extensionTimestamp: number;
  websiteTimestamp: number;
}

export type SyncCallback<T = any> = (record: SyncRecord<T>) => void;

class SyncService {
  private config: SyncConfig = {
    autoSync: true,
    syncInterval: 30000, // 30 seconds
    conflictResolution: 'last-write-wins',
  };

  private syncQueue: SyncRecord[] = [];
  private listeners: Map<string, SyncCallback[]> = new Map();
  private syncInProgress = false;
  private syncIntervalId: NodeJS.Timeout | null = null;
  private storageKey = 'sync_queue';

  // ─── Initialize Sync ──────────────────────────────────────
  async init(): Promise<void> {
    try {
      // Load persisted queue
      const data = await chrome.storage.local.get(this.storageKey);
      if (data[this.storageKey]) {
        this.syncQueue = data[this.storageKey];
        console.log('[v0] Loaded', this.syncQueue.length, 'items from sync queue');
      }

      // Start auto-sync if enabled
      if (this.config.autoSync) {
        this.startAutoSync();
      }

      // Listen for sync messages
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'sync') {
          this.handleSyncMessage(message).then(sendResponse);
          return true; // Keep channel open for async response
        }
      });

      console.log('[v0] Sync service initialized');
    } catch (error) {
      console.error('[v0] Error initializing sync service:', error);
    }
  }

  // ─── Add to Sync Queue ────────────────────────────────────
  async queueForSync<T = any>(
    id: string,
    data: T,
    source: 'extension' | 'website' = 'extension'
  ): Promise<void> {
    const record: SyncRecord<T> = {
      id,
      data,
      timestamp: Date.now(),
      source,
      version: 1,
    };

    this.syncQueue.push(record);
    await this.persistQueue();

    console.log('[v0] Added to sync queue:', id);

    // Trigger sync immediately if not already in progress
    if (!this.syncInProgress && this.config.autoSync) {
      await this.syncNow();
    }
  }

  // ─── Sync Now ──────────────────────────────────────────────
  async syncNow(): Promise<boolean> {
    if (this.syncInProgress) {
      console.log('[v0] Sync already in progress, queuing...');
      return false;
    }

    this.syncInProgress = true;

    try {
      console.log('[v0] Starting sync, queue size:', this.syncQueue.length);

      const results: string[] = [];
      for (const record of this.syncQueue) {
        try {
          const success = await this.syncRecord(record);
          if (success) {
            results.push(record.id);
          }
        } catch (error) {
          console.error('[v0] Error syncing record:', record.id, error);
        }
      }

      // Remove synced items from queue
      this.syncQueue = this.syncQueue.filter((r) => !results.includes(r.id));
      await this.persistQueue();

      console.log('[v0] Synced', results.length, 'items');
      return results.length > 0;
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncRecord(record: SyncRecord): Promise<boolean> {
    try {
      // For now, just mark as synced
      // In production, this would send to server/API
      console.log('[v0] Syncing record:', record.id);

      // Notify listeners
      this.notifyListeners(record.id, record);

      return true;
    } catch (error) {
      console.error('[v0] Error syncing record:', error);
      return false;
    }
  }

  // ─── Auto Sync ─────────────────────────────────────────────
  startAutoSync(): void {
    if (this.syncIntervalId) {
      return;
    }

    this.syncIntervalId = setInterval(() => {
      if (!this.syncInProgress && this.syncQueue.length > 0) {
        this.syncNow().catch((error) => {
          console.error('[v0] Auto sync error:', error);
        });
      }
    }, this.config.syncInterval);

    console.log('[v0] Auto sync started, interval:', this.config.syncInterval);
  }

  stopAutoSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
      console.log('[v0] Auto sync stopped');
    }
  }

  // ─── Listen for Changes ────────────────────────────────────
  onChange<T = any>(recordId: string, callback: SyncCallback<T>): () => void {
    if (!this.listeners.has(recordId)) {
      this.listeners.set(recordId, []);
    }

    this.listeners.get(recordId)!.push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(recordId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index >= 0) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  private notifyListeners(recordId: string, record: SyncRecord): void {
    const callbacks = this.listeners.get(recordId);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(record);
        } catch (error) {
          console.error('[v0] Listener error:', error);
        }
      });
    }
  }

  // ─── Conflict Resolution ───────────────────────────────────
  async detectConflicts(): Promise<SyncConflict[]> {
    const conflicts: SyncConflict[] = [];

    // In production, compare extension and website versions
    // For now, return empty
    return conflicts;
  }

  async resolveConflict(conflict: SyncConflict, resolution: any): Promise<void> {
    try {
      console.log('[v0] Resolving conflict:', conflict.id);

      const record: SyncRecord = {
        id: conflict.id,
        data: resolution,
        timestamp: Date.now(),
        source: 'extension',
        version: 2,
      };

      await this.queueForSync(record.id, record.data, record.source);
    } catch (error) {
      console.error('[v0] Error resolving conflict:', error);
    }
  }

  // ─── Handle Sync Messages ──────────────────────────────────
  private async handleSyncMessage(message: any): Promise<any> {
    switch (message.action) {
      case 'queue':
        await this.queueForSync(message.id, message.data, message.source);
        return { success: true };

      case 'syncNow':
        const result = await this.syncNow();
        return { success: result };

      case 'getQueue':
        return { queue: this.syncQueue };

      case 'clearQueue':
        this.syncQueue = [];
        await this.persistQueue();
        return { success: true };

      default:
        return { error: 'Unknown action' };
    }
  }

  // ─── Queue Persistence ────────────────────────────────────
  private async persistQueue(): Promise<void> {
    try {
      await chrome.storage.local.set({
        [this.storageKey]: this.syncQueue,
      });
    } catch (error) {
      console.error('[v0] Error persisting queue:', error);
    }
  }

  // ─── Configuration ────────────────────────────────────────
  setConfig(config: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[v0] Sync config updated:', this.config);
  }

  getConfig(): SyncConfig {
    return { ...this.config };
  }

  // ─── Queue Management ─────────────────────────────────────
  getQueueSize(): number {
    return this.syncQueue.length;
  }

  getQueue(): SyncRecord[] {
    return [...this.syncQueue];
  }

  async clearQueue(): Promise<void> {
    this.syncQueue = [];
    await this.persistQueue();
    console.log('[v0] Sync queue cleared');
  }

  // ─── Diagnostics ──────────────────────────────────────────
  getStatus(): {
    queueSize: number;
    syncInProgress: boolean;
    autoSyncEnabled: boolean;
    lastSyncTime?: number;
  } {
    return {
      queueSize: this.syncQueue.length,
      syncInProgress: this.syncInProgress,
      autoSyncEnabled: this.config.autoSync,
    };
  }
}

export const syncService = new SyncService();
