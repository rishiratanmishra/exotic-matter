import { Storage } from 'redux-persist';

const createIndexedDBStorage = (dbName: string): Storage => {
  return {
    getItem: (key: string) => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = (event: any) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('keyvaluepairs')) {
            db.createObjectStore('keyvaluepairs');
          }
        };
        request.onsuccess = (event: any) => {
          const db = event.target.result;
          const transaction = db.transaction('keyvaluepairs', 'readonly');
          const store = transaction.objectStore('keyvaluepairs');
          const getRequest = store.get(key);
          getRequest.onsuccess = () => resolve(getRequest.result);
          getRequest.onerror = () => reject(getRequest.error);
        };
        request.onerror = () => reject(request.error);
      });
    },
    setItem: (key: string, value: any) => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = (event: any) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('keyvaluepairs')) {
            db.createObjectStore('keyvaluepairs');
          }
        };
        request.onsuccess = (event: any) => {
          const db = event.target.result;
          const transaction = db.transaction('keyvaluepairs', 'readwrite');
          const store = transaction.objectStore('keyvaluepairs');
          const putRequest = store.put(value, key);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        };
        request.onerror = () => reject(request.error);
      });
    },
    removeItem: (key: string) => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onsuccess = (event: any) => {
          const db = event.target.result;
          const transaction = db.transaction('keyvaluepairs', 'readwrite');
          const store = transaction.objectStore('keyvaluepairs');
          const deleteRequest = store.delete(key);
          deleteRequest.onsuccess = () => resolve();
          deleteRequest.onerror = () => reject(deleteRequest.error);
        };
        request.onerror = () => reject(request.error);
      });
    },
  };
};

export default createIndexedDBStorage('em-state-db');
