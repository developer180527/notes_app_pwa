import { BookData } from '../types';

const DB_NAME = 'folio-db';
const STORE_NAME = 'books';
const VERSION = 1;

let dbInstance: IDBDatabase | null = null;

// Attempt to persist storage to prevent browser eviction (crucial for iOS)
const requestPersistence = async () => {
  if (navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        await navigator.storage.persist();
        // Log removed to reduce noise
      }
    } catch (err) {
      // Warn suppressed
    }
  }
};

const openDB = (): Promise<IDBDatabase> => {
  // Trigger persistence request on first DB access
  requestPersistence();

  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, VERSION);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      
      // Handle connection closing
      dbInstance.onclose = () => {
        dbInstance = null;
      };
      
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error("IndexedDB connection error:", (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

export const saveBook = async (book: BookData): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(book);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Save failed", err);
    throw err;
  }
};

export const getBooks = async (): Promise<BookData[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Fetch failed", err);
    return [];
  }
};

export const getBook = async (id: string): Promise<BookData | undefined> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Fetch single book failed", err);
    throw err;
  }
};

export const deleteBook = async (id: string): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Delete failed", err);
    throw err;
  }
};

export const importBooks = async (books: BookData[]): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      let completed = 0;
      let errors = 0;

      if (books.length === 0) {
        resolve();
        return;
      }

      books.forEach(book => {
        const request = store.put(book);
        request.onsuccess = () => {
          completed++;
          if (completed + errors === books.length) {
            if (errors > 0) console.warn(`${errors} books failed to import`);
            resolve();
          }
        };
        request.onerror = () => {
          errors++;
          if (completed + errors === books.length) resolve();
        };
      });
    });
  } catch (err) {
    console.error("Import failed", err);
    throw err;
  }
};