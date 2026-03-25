import { spawn, ChildProcess } from 'child_process';

export class LSPManager {
  private static instance: LSPManager;
  private languageServers: Map<string, ChildProcess> = new Map();

  public static getInstance(): LSPManager {
    if (!this.instance) this.instance = new LSPManager();
    return this.instance;
  }

  /**
   * Spawns a dedicated language server for a given language ID.
   * Maps server stdout/stdin directly into Monaco Diagnostics mapping pipeline over IPC.
   */
  public spawnLanguageServer(languageId: string, binPath: string, args: string[]) {
    if (this.languageServers.has(languageId)) return;

    console.log(`[LSP] Spawning server for ${languageId}: ${binPath} ${args.join(' ')}`);
    const serverProcess = spawn(binPath, args);

    serverProcess.stdout.on('data', (data) => {
      this.handleLSPMessage(languageId, data.toString());
    });

    serverProcess.stderr.on('data', (data) => {
      console.warn(`[LSP] ${languageId} stderr:`, data.toString());
    });

    serverProcess.on('exit', (code) => {
      console.log(`[LSP] ${languageId} server exited with code ${code}`);
      this.languageServers.delete(languageId);
    });

    this.languageServers.set(languageId, serverProcess);
  }

  private handleLSPMessage(languageId: string, rawData: string) {
    try {
      const parts = rawData.split('\r\n\r\n');
      if (parts.length > 1) {
        const payload = JSON.parse(parts[1]);
        if (payload.method === 'textDocument/publishDiagnostics') {
          // Route diagnostics back to MainWindow (UI) to display Monaco markers
          console.log(`[LSP] Diagnostics received for ${languageId}`, payload.params.uri);
          // IPC dispatch to WebContents logic goes here...
        }
      }
    } catch (e) {
      // Ignore partial chunks. Robust buffers are needed in production
    }
  }

  public sendToLSP(languageId: string, method: string, params: any) {
    const server = this.languageServers.get(languageId);
    if (!server) return;
    
    const payload = JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    });
    const msg = `Content-Length: ${Buffer.byteLength(payload)}\r\n\r\n${payload}`;
    server.stdin?.write(msg);
  }
}
