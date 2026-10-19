import type { OutboxItem, OutboxMutationType } from '../../types/domain.ts';
import type { ApiClient } from '../api/client.ts';

const DB_NAME = 'hvachome_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'outbox';

type OutboxListener = (count: number, items: OutboxItem[]) => void;

class OfflineOutbox {
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private memoryFallback: OutboxItem[] = [];
  private listeners: Set<OutboxListener> = new Set();
  private isSyncing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initDb();
      window.addEventListener('online', () => {
        this.notify();
      });
      window.addEventListener('offline', () => {
        this.notify();
      });
    }
  }

  private initDb(): Promise<IDBDatabase | null> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    if (typeof window === 'undefined' || !window.indexedDB) {
      this.dbPromise = Promise.resolve(null);
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e: IDBVersionChangeEvent) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('createdAt', 'createdAt', { unique: false });
            store.createIndex('status', 'status', { unique: false });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          console.warn('[OfflineOutbox] IndexedDB failed to open, using memory fallback');
          resolve(null);
        };
      } catch (err) {
        console.warn('[OfflineOutbox] IndexedDB open error, using memory fallback', err);
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  public subscribe(listener: OutboxListener): () => void {
    this.listeners.add(listener);
    this.getAll().then((items) => listener(items.length, items));
    return () => this.listeners.delete(listener);
  }

  private async notify(): Promise<void> {
    const items = await this.getAll();
    for (const l of this.listeners) {
      try {
        l(items.length, items);
      } catch (e) {
        console.error('[OfflineOutbox] Listener error', e);
      }
    }
  }

  /**
   * Queue a mutation for offline synchronization.
   */
  public async enqueue(mutation: {
    type: OutboxMutationType;
    endpoint: string;
    method?: 'POST' | 'PATCH' | 'PUT';
    payload: Record<string, unknown>;
    job_id?: number | string;
    idempotency_key?: string;
  }): Promise<OutboxItem> {
    const item: OutboxItem = {
      id: 'outbox_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      idempotency_key: mutation.idempotency_key || 'idem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      type: mutation.type,
      endpoint: mutation.endpoint,
      method: mutation.method || 'POST',
      payload: mutation.payload,
      job_id: mutation.job_id,
      createdAt: Date.now(),
      retries: 0,
      status: 'pending',
    };

    const db = await this.initDb();
    if (db) {
      await new Promise<void>((resolve, reject) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.put(item);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        } catch (e) {
          reject(e);
        }
      }).catch((e) => {
        console.warn('[OfflineOutbox] IndexedDB put error, falling back to memory', e);
        this.memoryFallback.push(item);
      });
    } else {
      this.memoryFallback.push(item);
    }

    await this.notify();
    return item;
  }

  /**
   * Get all queued items in chronological order.
   */
  public async getAll(): Promise<OutboxItem[]> {
    const db = await this.initDb();
    if (db) {
      try {
        const items = await new Promise<OutboxItem[]>((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([...this.memoryFallback]);
        });
        return items.sort((a, b) => a.createdAt - b.createdAt);
      } catch {
        return [...this.memoryFallback].sort((a, b) => a.createdAt - b.createdAt);
      }
    }
    return [...this.memoryFallback].sort((a, b) => a.createdAt - b.createdAt);
  }

  public async getPendingCount(): Promise<number> {
    const items = await this.getAll();
    return items.length;
  }

  /**
   * Remove an item from the queue after successful sync.
   */
  public async remove(id: string): Promise<void> {
    const db = await this.initDb();
    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.delete(id);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }
    this.memoryFallback = this.memoryFallback.filter((i) => i.id !== id);
    await this.notify();
  }

  /**
   * Clear all items.
   */
  public async clear(): Promise<void> {
    const db = await this.initDb();
    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.clear();
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }
    this.memoryFallback = [];
    await this.notify();
  }

  /**
   * Synchronize queued outbox items with backend API.
   * Can be invoked with an ApiClient instance.
   */
  public async sync(client: ApiClient): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing) {
      return { synced: 0, failed: 0 };
    }

    const items = await this.getAll();
    if (items.length === 0) {
      return { synced: 0, failed: 0 };
    }

    // Check connectivity
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    let synced = 0;
    let failed = 0;

    try {
      // 1. Try batch sync endpoint first (/api/sync)
      const mutations = items.map((i) => ({
        id: i.id,
        idempotency_key: i.idempotency_key,
        type: i.type,
        job_id: i.job_id,
        payload: i.payload,
      }));

      try {
        const batchRes = await client.syncBatch(mutations);
        if (batchRes && Array.isArray(batchRes.results)) {
          for (const res of batchRes.results) {
            if (res.status === 'synced') {
              const matchedItem = items.find((i) => i.idempotency_key === res.idempotency_key || i.id === res.idempotency_key);
              if (matchedItem) {
                await this.remove(matchedItem.id);
                synced++;
              }
            }
          }
        }
      } catch (batchErr) {
        console.warn('[OfflineOutbox] Batch sync failed, falling back to sequential item replay', batchErr);
        // 2. Sequential fallback replay in FIFO order
        for (const item of items) {
          try {
            await client.replayOutboxItem(item);
            await this.remove(item.id);
            synced++;
          } catch (itemErr) {
            console.error(`[OfflineOutbox] Failed to replay item ${item.id}`, itemErr);
            failed++;
          }
        }
      }
    } finally {
      this.isSyncing = false;
      await this.notify();
    }

    return { synced, failed };
  }

  /**
   * Process outbox queue and push unsynced changes
   */
  public async processQueue(client?: ApiClient): Promise<{ synced: number; failed: number }> {
    if (!client) {
      const clientMod = await import('../api/client');
      return this.sync(clientMod.default);
    }
    return this.sync(client);
  }
}

export const outbox = new OfflineOutbox();
