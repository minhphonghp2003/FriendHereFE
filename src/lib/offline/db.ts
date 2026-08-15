/**
 * Minimal promise-based IndexedDB wrapper for offline support.
 *
 * Two object stores:
 *  - "api-cache"  → keyed GET responses (keyPath: "key")
 *  - "outbox"     → queued mutations waiting to sync (keyPath: "id", autoIncrement)
 */

const DB_NAME = "friendhere-offline";
const DB_VERSION = 1;

export const STORE_CACHE = "api-cache";
export const STORE_OUTBOX = "outbox";

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Returns true when IndexedDB is usable in the current environment.
 * Guards against SSR / Node where `indexedDB` is undefined.
 */
function isAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDB(): Promise<IDBDatabase> {
  if (!isAvailable()) {
    return Promise.reject(new Error("IndexedDB is not available"));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORE_OUTBOX)) {
        db.createObjectStore(STORE_OUTBOX, { keyPath: "id", autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
    request.onblocked = () => {
      dbPromise = null;
    };
  });

  // Reset on unexpected close so a fresh open can succeed later.
  dbPromise.then((db) => {
    db.onversionchange = () => {
      db.close();
      dbPromise = null;
    };
  });

  return dbPromise;
}

function run<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const request = fn(tx.objectStore(storeName));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );
}

export function dbGet<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  if (!isAvailable()) return Promise.resolve(undefined);
  return run<T>(storeName, "readonly", (store) => store.get(key) as IDBRequest<T>);
}

export function dbGetAll<T>(storeName: string): Promise<T[]> {
  if (!isAvailable()) return Promise.resolve([]);
  return run<T[]>(storeName, "readonly", (store) => store.getAll() as IDBRequest<T[]>);
}

export function dbPut(storeName: string, value: unknown, key?: IDBValidKey): Promise<void> {
  if (!isAvailable()) return Promise.resolve();
  return run(storeName, "readwrite", (store) =>
    key !== undefined ? store.put(value, key) : store.put(value),
  ).then(() => undefined);
}

export function dbDelete(storeName: string, key: IDBValidKey): Promise<void> {
  if (!isAvailable()) return Promise.resolve();
  return run(storeName, "readwrite", (store) => store.delete(key)).then(() => undefined);
}

export function dbCount(storeName: string): Promise<number> {
  if (!isAvailable()) return Promise.resolve(0);
  return run<number>(storeName, "readonly", (store) => store.count());
}
