/**
 * HVACHome Stale-While-Revalidate (SWR) Offline Cache
 * 
 * Provides instantaneous (<10ms) rendering from memory and IndexedDB,
 * seamless background revalidation, ETag support, and delta queries (?since=).
 */

interface CacheRecord<T> {
  key: string;
  data: T;
  timestamp: number;
  etag?: string | null;
}

const CACHE_DB_NAME = 'hvachome_cache_db';
const CACHE_DB_VERSION = 1;
const CACHE_STORE_NAME = 'cache_store';

class AppCache {
  private memCache: Map<string, CacheRecord<unknown>> = new Map();
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private updateListeners: Set<(key: string, data: unknown) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initDb();
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
        const req = window.indexedDB.open(CACHE_DB_NAME, CACHE_DB_VERSION);
        req.onupgradeneeded = (e: IDBVersionChangeEvent) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
            db.createObjectStore(CACHE_STORE_NAME, { keyPath: 'key' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          console.warn('[AppCache] IndexedDB failed to open, using memory cache');
          resolve(null);
        };
      } catch (err) {
        console.warn('[AppCache] IndexedDB init error:', err);
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  /**
   * Synchronous check against in-memory cache (0-1ms)
   */
  public getSync<T>(key: string): T | null {
    const record = this.memCache.get(key) as CacheRecord<T> | undefined;
    return record ? record.data : null;
  }

  /**
   * Asynchronous check against memory then IndexedDB (<10ms)
   */
  public async get<T>(key: string): Promise<T | null> {
    // 1. Memory cache hit
    if (this.memCache.has(key)) {
      const record = this.memCache.get(key) as CacheRecord<T>;
      return record.data;
    }

    // 2. IndexedDB check
    const db = await this.initDb();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(CACHE_STORE_NAME, 'readonly');
        const store = tx.objectStore(CACHE_STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => {
          const res = req.result as CacheRecord<T> | undefined;
          if (res && res.data !== undefined) {
            this.memCache.set(key, res);
            resolve(res.data);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  /**
   * Get metadata (timestamp, etag) for SWR conditional requests
   */
  public async getMeta(key: string): Promise<{ timestamp: number; etag?: string | null } | null> {
    const record = this.memCache.get(key);
    if (record) {
      return { timestamp: record.timestamp, etag: record.etag };
    }

    const db = await this.initDb();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(CACHE_STORE_NAME, 'readonly');
        const store = tx.objectStore(CACHE_STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => {
          const res = req.result as CacheRecord<unknown> | undefined;
          if (res) {
            this.memCache.set(key, res);
            resolve({ timestamp: res.timestamp, etag: res.etag });
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  /**
   * Set cache entry in both memory and IndexedDB
   */
  public async set<T>(key: string, data: T, etag?: string | null): Promise<void> {
    const record: CacheRecord<T> = {
      key,
      data,
      timestamp: Date.now(),
      etag: etag || null,
    };

    this.memCache.set(key, record as CacheRecord<unknown>);

    const db = await this.initDb();
    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(CACHE_STORE_NAME, 'readwrite');
          const store = tx.objectStore(CACHE_STORE_NAME);
          store.put(record);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }

    // Notify listeners
    this.updateListeners.forEach((listener) => {
      try {
        listener(key, data);
      } catch {
        // Ignore listener error
      }
    });
  }

  /**
   * Invalidate a single key
   */
  public async invalidate(key: string): Promise<void> {
    this.memCache.delete(key);
    const db = await this.initDb();
    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(CACHE_STORE_NAME, 'readwrite');
          const store = tx.objectStore(CACHE_STORE_NAME);
          store.delete(key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }
  }

  /**
   * Subscribe to cache updates for subtle "Updated" indicators
   */
  public onUpdate(listener: (key: string, data: unknown) => void): () => void {
    this.updateListeners.add(listener);
    return () => this.updateListeners.delete(listener);
  }
}

export const appCache = new AppCache();
