import { ExtensionHostManager } from './ExtensionHostManager';

export type ExtensionState = 'uninstalled' | 'installed' | 'loading' | 'active' | 'crashed' | 'failed';

export class LifecycleManager {
  private hostManager: ExtensionHostManager;
  private extensionStates: Map<string, ExtensionState> = new Map();
  private retryCounts: Map<string, number> = new Map();
  private MAX_RETRIES = 3;

  constructor(hostManager: ExtensionHostManager) {
    this.hostManager = hostManager;
  }

  public markState(extId: string, state: ExtensionState) {
    this.extensionStates.set(extId, state);
    console.log(`[Lifecycle] Extension ${extId} entered state: ${state}`);
  }

  public getState(extId: string): ExtensionState {
    return this.extensionStates.get(extId) || 'uninstalled';
  }

  public handleCrash(extId: string, err: Error, extPath: string, manifest: any) {
    console.error(`[Lifecycle] CRASH DETECTED for ${extId}: ${err.message}`);
    this.markState(extId, 'crashed');
    this.hostManager.terminateWorker(extId);

    const retries = this.retryCounts.get(extId) || 0;
    if (retries < this.MAX_RETRIES) {
      this.retryCounts.set(extId, retries + 1);
      console.log(`[Lifecycle] Attempting restart ${retries + 1}/${this.MAX_RETRIES} for ${extId}...`);
      
      setTimeout(() => {
        console.log(`[Lifecycle] Restarting ${extId}...`);
        this.hostManager.spawnExtension(extId, extPath, manifest);
      }, 2000);
    } else {
      console.error(`[Lifecycle] Maximum retries reached for ${extId}. Extension disabled.`);
      this.markState(extId, 'failed');
    }
  }
}
