import { MAX_PENDING_CAPTURES, type PendingCapture, type UploadSummary } from './types';

const DATABASE = 'screenpulse-captures';
const STORE = 'pending-captures';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: 'captureId' });
      store.createIndex('createdAt', 'createdAt');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open screenshot queue.'));
  });
}

async function withStore<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = operation(transaction.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Screenshot queue operation failed.'));
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => db.close();
  });
}

export async function getPendingCount(): Promise<number> {
  return withStore('readonly', (store) => store.count());
}

export async function addPendingCapture(capture: PendingCapture): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    const store = transaction.objectStore(STORE);
    const count = store.count();
    count.onsuccess = () => {
      if (count.result >= MAX_PENDING_CAPTURES) {
        transaction.abort();
        reject(new QueueFullError());
        return;
      }
      store.add(capture);
    };
    count.onerror = () => reject(count.error ?? new Error('Could not count screenshot queue.'));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save screenshot.'));
    transaction.onabort = () => db.close();
  });
  db.close();
}

export async function getLatestPendingCapture(): Promise<PendingCapture | undefined> {
  const db = await openDatabase();
  return new Promise<PendingCapture | undefined>((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readonly');
    const request = transaction.objectStore(STORE).index('createdAt').openCursor(null, 'prev');
    request.onsuccess = () => resolve(request.result?.value as PendingCapture | undefined);
    request.onerror = () => reject(request.error ?? new Error('Could not read screenshot queue.'));
    transaction.oncomplete = () => db.close();
  });
}

/** Returns the newest local captures first, without loading more than requested. */
export async function listPendingCaptures(limit = 20): Promise<PendingCapture[]> {
  const db = await openDatabase();
  return new Promise<PendingCapture[]>((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readonly');
    const captures: PendingCapture[] = [];
    const request = transaction.objectStore(STORE).index('createdAt').openCursor(null, 'prev');
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor || captures.length >= limit) return;
      captures.push(cursor.value as PendingCapture);
      cursor.continue();
    };
    request.onerror = () => reject(request.error ?? new Error('Could not list local screenshots.'));
    transaction.oncomplete = () => {
      db.close();
      resolve(captures);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error ?? new Error('Could not list local screenshots.'));
    };
  });
}

/** Permanently removes one local capture. */
export async function deletePendingCapture(captureId: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(captureId));
}

/** Permanently removes every local screenshot after the IndexedDB transaction commits. */
export async function clearPendingCaptures(): Promise<void> {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    const request = transaction.objectStore(STORE).clear();
    request.onerror = () => reject(request.error ?? new Error('Could not clear local screenshots.'));
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error ?? new Error('Could not clear local screenshots.'));
    };
    transaction.onabort = () => db.close();
  });
}

export async function updatePendingCapture(captureId: string, updates: Partial<PendingCapture>): Promise<PendingCapture | undefined> {
  const db = await openDatabase();
  return new Promise<PendingCapture | undefined>((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    const store = transaction.objectStore(STORE);
    const getRequest = store.get(captureId);
    let updated: PendingCapture | undefined;
    getRequest.onsuccess = () => {
      const current = getRequest.result as PendingCapture | undefined;
      if (!current) return;
      updated = { ...current, ...updates };
      store.put(updated);
    };
    getRequest.onerror = () => reject(getRequest.error ?? new Error('Could not update local screenshot.'));
    transaction.oncomplete = () => {
      db.close();
      resolve(updated);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error ?? new Error('Could not update local screenshot.'));
    };
  });
}

export async function getUploadSummary(): Promise<UploadSummary> {
  const captures = await listPendingCaptures(MAX_PENDING_CAPTURES);
  return captures.reduce<UploadSummary>((summary, capture) => {
    summary[capture.status] += 1;
    return summary;
  }, { pending: 0, uploaded: 0, failed: 0 });
}

export class QueueFullError extends Error {
  constructor() {
    super(`The local queue already has ${MAX_PENDING_CAPTURES} screenshots.`);
    this.name = 'QueueFullError';
  }
}
