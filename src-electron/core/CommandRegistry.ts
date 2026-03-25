import { ExtensionHostManager } from '../ext-host/ExtensionHostManager';

type CommandCallback = (...args: any[]) => Promise<any> | any;

export class CommandRegistry {
  private static handlers = new Map<string, CommandCallback>();
  private static remoteCommands = new Map<string, string>(); // commandId -> workerId
  private static pendingRequests = new Map<string, { resolve: any, reject: any }>();

  public static registerLocal(id: string, callback: CommandCallback) {
    this.handlers.set(id, callback);
  }

  public static registerRemote(id: string, extId: string) {
    this.remoteCommands.set(id, extId);
  }

  public static async executeCommand(id: string, ...args: any[]): Promise<any> {
    const localHandler = this.handlers.get(id);
    if (localHandler) {
      return await localHandler(...args);
    }

    const workerId = this.remoteCommands.get(id);
    if (workerId) {
      return new Promise((resolve, reject) => {
        const reqId = Date.now().toString() + Math.random().toString();
        this.pendingRequests.set(reqId, { resolve, reject });
        ExtensionHostManager.getInstance().dispatchToWorker(workerId, {
          type: 'EXECUTE_REMOTE_COMMAND',
          reqId,
          commandId: id,
          args
        });
      });
    }

    throw new Error(`Command not found: ${id}`);
  }

  public static handleCommandReply(reqId: string, error?: string, result?: any) {
    const pending = this.pendingRequests.get(reqId);
    if (pending) {
       this.pendingRequests.delete(reqId);
       if (error) pending.reject(new Error(error));
       else pending.resolve(result);
    }
  }

  public static getAllExportedCommands(): { id: string }[] {
    const list: { id: string }[] = [];
    for (const [id] of this.handlers) list.push({ id });
    for (const [id] of this.remoteCommands) list.push({ id });
    return list;
  }
}
