export interface FileHistoryEntry {
  id: string; // path-timestamp
  path: string;
  content: string;
  timestamp: number;
}

export class HistoryService {
  private static dbName = 'em-history-db';
  private static storeName = 'history';

  static async init() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('path', 'path', { unique: false });
        }
      };
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  static async saveSnapshot(path: string, content: string) {
    const db = await this.getDB();
    const transaction = db.transaction(this.storeName, 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    const entry: FileHistoryEntry = {
      id: `${path}-${Date.now()}`,
      path,
      content,
      timestamp: Date.now()
    };

    return new Promise<void>((resolve, reject) => {
      const request = store.put(entry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  static async getHistory(path: string): Promise<FileHistoryEntry[]> {
    const db = await this.getDB();
    const transaction = db.transaction(this.storeName, 'readonly');
    const store = transaction.objectStore(this.storeName);
    const index = store.index('path');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(path);
      request.onsuccess = () => {
        const results: FileHistoryEntry[] = request.result;
        resolve(results.sort((a, b) => b.timestamp - a.timestamp));
      };
      request.onerror = () => reject(request.error);
    });
  }

  private static getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onsuccess = (event: any) => resolve(event.target.result);
      request.onerror = () => reject(request.error);
    });
  }
}
