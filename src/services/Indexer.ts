import { LocalAgentService } from './LocalAgentService';
import { VectorStorage, DocumentChunk } from './VectorStorage';

export class Indexer {
  private static isIndexing = false;

  static async indexWorkspace(rootPath: string, onProgress?: (current: number, total: number) => void) {
    if (this.isIndexing) return;
    this.isIndexing = true;

    try {
      await VectorStorage.init();
      const files = await window.em.listAllFiles(rootPath);
      const total = files.length;
      let current = 0;

      for (const file of files) {
        if (this.shouldIgnore(file)) continue;

        try {
          const content = await window.em.readFile(file);
          if (content.length > 50000) continue; // Skip very large files for now

          const chunks = this.chunkText(content, 1000);
          const entities = this.extractEntities(content);

          for (let i = 0; i < chunks.length; i++) {
            const embedding = await LocalAgentService.generateEmbedding(chunks[i]);
            if (embedding && !embedding.error) {
              await VectorStorage.addChunk({
                id: `${file}-${i}`,
                path: file,
                content: chunks[i],
                embedding: embedding,
                metadata: { 
                  timestamp: Date.now(),
                  entities: entities.filter(e => chunks[i].includes(e.name))
                }
              });
            }
          }
        } catch (err) {
          console.error(`Failed to index file: ${file}`, err);
        }

        current++;
        onProgress?.(current, total);
      }
    } finally {
      this.isIndexing = false;
    }
  }

  private static extractEntities(content: string): { type: string, name: string }[] {
    const entities: { type: string, name: string }[] = [];
    const classRegex = /class\s+([a-zA-Z0-9_]+)/g;
    const funcRegex = /function\s+([a-zA-Z0-9_]+)|const\s+([a-zA-Z0-9_]+)\s*=\s*(\(.*?\)|async\s*\(.*?\))\s*=>/g;
    const interfaceRegex = /interface\s+([a-zA-Z0-9_]+)/g;

    let match;
    while ((match = classRegex.exec(content)) !== null) entities.push({ type: 'class', name: match[1] });
    while ((match = funcRegex.exec(content)) !== null) entities.push({ type: 'function', name: match[1] || match[2] });
    while ((match = interfaceRegex.exec(content)) !== null) entities.push({ type: 'interface', name: match[1] });

    return entities;
  }

  private static chunkText(text: string, size: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += size) {
      chunks.push(text.slice(i, i + size));
    }
    return chunks;
  }

  private static shouldIgnore(path: string): boolean {
    const ignoreList = ['node_modules', '.git', 'dist', 'build', '.exe', '.dll', '.zip', '.gguf'];
    return ignoreList.some(item => path.includes(item));
  }
}
