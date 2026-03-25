import { MessagePort } from 'worker_threads';

export function createApiShim(port: MessagePort) {
  return {
    window: {
      showInformationMessage: (text: string) => {
        port.postMessage({ type: 'UI_MESSAGE', text });
      },
      showErrorMessage: (text: string) => {
        port.postMessage({ type: 'UI_MESSAGE', text: `[ERROR] ${text}` });
      }
    },
    commands: {
      registerCommand: (commandId: string, callback: (...args: any[]) => any) => {
        (global as any).__extCommands = (global as any).__extCommands || new Map();
        (global as any).__extCommands.set(commandId, callback);
        port.postMessage({ type: 'REGISTER_COMMAND', commandId });
      },
      executeCommand: (commandId: string, ...args: any[]) => {
        return new Promise((resolve, reject) => {
          const reqId = Date.now().toString() + Math.random().toString();
          const handler = (msg: any) => {
            if (msg.reqId === reqId) {
              port.off('message', handler);
              if (msg.type === 'COMMAND_RESULT') resolve(msg.result);
              if (msg.type === 'COMMAND_ERROR') reject(new Error(msg.error));
            }
          };
          port.on('message', handler);
          port.postMessage({ type: 'EXECUTE_COMMAND', reqId, commandId, args });
        });
      }
    },
    workspace: {
       // Future implementations
    }
  };
}
