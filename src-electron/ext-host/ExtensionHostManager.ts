import { Worker } from 'worker_threads';
import { join } from 'path';
import { LifecycleManager } from './LifecycleManager';
import { CommandRegistry } from '../core/CommandRegistry';

export class ExtensionHostManager {
  private static instance: ExtensionHostManager;
  private workers: Map<string, Worker> = new Map();
  private lifecycleManager: LifecycleManager;

  private constructor() {
    this.lifecycleManager = new LifecycleManager(this);
  }

  public static getInstance(): ExtensionHostManager {
    if (!ExtensionHostManager.instance) {
      ExtensionHostManager.instance = new ExtensionHostManager();
    }
    return ExtensionHostManager.instance;
  }

  /**
   * Spawns an isolated Node.js worker thread for an extension.
   * Untrusted extensions run in strict sandboxes.
   */
  public async spawnExtension(extId: string, extPath: string, manifest: any): Promise<void> {
    const isTrusted = manifest.trusted === true;
    const workerFile = 'sandbox-worker.js'; 
    // In production, 'sandbox-worker.js' must be built into dist-electron/ext-host/
    const workerScript = join(__dirname, workerFile);

    try {
      const worker = new Worker(workerScript, {
        workerData: { extId, extPath, manifest },
        env: { STRICT_PERMS: isTrusted ? 'false' : 'true', EXT_ID: extId }
      });

      worker.on('message', (msg) => this.handleIPCMessage(extId, msg));
      worker.on('error', (err) => this.lifecycleManager.handleCrash(extId, err, extPath, manifest));
      worker.on('exit', (code) => {
        if (code !== 0) {
          this.lifecycleManager.handleCrash(extId, new Error(`Worker stopped with exit code ${code}`), extPath, manifest);
        }
      });

      this.workers.set(extId, worker);
      this.lifecycleManager.markState(extId, 'loading');

      // Boot it up
      worker.postMessage({ type: 'ACTIVATE_EXTENSION', data: { extPath } });

    } catch (err) {
      console.error(`[ExtHost] Failed to spawn worker for ${extId}:`, err);
    }
  }

  private handleIPCMessage(extId: string, msg: any) {
    switch (msg.type) {
      case 'ACTIVATED':
        this.lifecycleManager.markState(extId, 'active');
        break;
      case 'REGISTER_COMMAND':
        CommandRegistry.registerRemote(msg.commandId, extId);
        break;
      case 'EXECUTE_COMMAND':
        CommandRegistry.executeCommand(msg.commandId, ...msg.args).then(res => {
          this.dispatchToWorker(extId, { type: 'COMMAND_RESULT', reqId: msg.reqId, result: res });
        }).catch(err => {
          this.dispatchToWorker(extId, { type: 'COMMAND_ERROR', reqId: msg.reqId, error: err.message });
        });
        break;
      case 'COMMAND_RESULT':
        CommandRegistry.handleCommandReply(msg.reqId, undefined, msg.result);
        break;
      case 'COMMAND_ERROR':
        CommandRegistry.handleCommandReply(msg.reqId, msg.error, undefined);
        break;
      case 'UI_MESSAGE':
        console.log(`[ExtHost Message from ${extId}] ${msg.text}`);
        break;
      case 'ERROR':
        console.error(`[ExtHost Error from ${extId}] ${msg.error}`);
        break;
    }
  }

  public dispatchToWorker(extId: string, payload: any) {
    const worker = this.workers.get(extId);
    if (worker) {
      worker.postMessage(payload);
    } else {
      console.warn(`[ExtHost] Cannot dispatch to missing worker ${extId}`);
    }
  }

  public terminateWorker(extId: string) {
    const worker = this.workers.get(extId);
    if (worker) {
      worker.terminate();
      this.workers.delete(extId);
    }
  }
}
