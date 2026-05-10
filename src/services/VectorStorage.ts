export interface DocumentChunk {
  id: string;
  path: string;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
}

export class VectorStorage {
  private static dbName = 'em-vector-db';
  private static storeName = 'chunks';

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

  static async addChunk(chunk: DocumentChunk) {
    const db = await this.getDB();
    const transaction = db.transaction(this.storeName, 'readwrite');
    const store = transaction.objectStore(this.storeName);
    return new Promise<void>((resolve, reject) => {
      const request = store.put(chunk);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  static async getChunksByPath(path: string): Promise<DocumentChunk[]> {
    const db = await this.getDB();
    const transaction = db.transaction(this.storeName, 'readonly');
    const store = transaction.objectStore(this.storeName);
    const index = store.index('path');
    return new Promise((resolve, reject) => {
      const request = index.getAll(path);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  static async search(queryEmbedding: number[], topK = 5): Promise<DocumentChunk[]> {
    const db = await this.getDB();
    const transaction = db.transaction(this.storeName, 'readonly');
    const store = transaction.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const chunks: DocumentChunk[] = request.result;
        // Cosine similarity search
        const results = chunks
          .map(chunk => ({
            chunk,
            score: this.cosineSimilarity(queryEmbedding, chunk.embedding)
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, topK)
          .map(r => r.chunk);
        
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private static cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let mA = 0;
    let mB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      mA += a[i] * a[i];
      mB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(mA) * Math.sqrt(mB));
  }

  private static getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onsuccess = (event: any) => resolve(event.target.result);
      request.onerror = () => reject(request.error);
    });
  }
}
