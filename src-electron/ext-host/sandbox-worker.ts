import { parentPort, workerData } from 'worker_threads';
import { createApiShim } from './api-shim';
import fs from 'fs';

if (!parentPort) throw new Error("Must run as a worker thread");

if (process.env.STRICT_PERMS === 'true') {
  const originalReadFile = fs.readFile;
  (fs as any).readFile = function(...args: any[]) {
    const filePath = args[0] as string;
    if (filePath.includes('/etc/passwd') || filePath.includes('C:\\Windows')) {
       throw new Error(`[Sandbox] FS Read Access Denied: ${filePath}`);
    }
    return originalReadFile.apply(fs, args as any);
  };
}

const { extId, extPath, manifest } = workerData;
const apiShim = createApiShim(parentPort);

const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(request: string) {
  if (request === 'vscode' || request === 'em') {
    return apiShim;
  }
  return originalRequire.apply(this, arguments);
};

parentPort.on('message', async (msg) => {
  if (msg.type === 'ACTIVATE_EXTENSION') {
    try {
      const extMainPath = msg.data.extPath; 
      let resolvedMain;
      try {
        resolvedMain = require.resolve(extMainPath);
      } catch {
        const path = require('path');
        resolvedMain = require.resolve(path.join(extMainPath, manifest.main || 'index.js'));
      }
      
      const extModule = require(resolvedMain);

      if (typeof extModule.activate === 'function') {
        const ctx = {
           subscriptions: [],
           extensionPath: extMainPath,
           extensionUri: extMainPath,
           id: extId
        };
        await extModule.activate(ctx);
        parentPort?.postMessage({ type: 'ACTIVATED', extId });
      } else {
        parentPort?.postMessage({ type: 'ACTIVATED', extId });
      }
    } catch (err: any) {
      console.error(`[Worker ${extId}] Activation Error:`, err);
      parentPort?.postMessage({ type: 'ERROR', extId, error: err.stack });
      process.exit(1); 
    }
  } else if (msg.type === 'EXECUTE_REMOTE_COMMAND') {
    const fn = (global as any).__extCommands?.get(msg.commandId);
    if (fn) {
      try {
        const result = await fn(...msg.args);
        parentPort?.postMessage({ type: 'COMMAND_RESULT', reqId: msg.reqId, result });
      } catch (err: any) {
        parentPort?.postMessage({ type: 'COMMAND_ERROR', reqId: msg.reqId, error: err.message });
      }
    }
  }
});
