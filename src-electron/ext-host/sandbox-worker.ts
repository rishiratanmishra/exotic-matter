import { parentPort, workerData } from 'worker_threads';
import { createApiShim } from './api-shim';
import fs from 'fs';

if (!parentPort) throw new Error("Must run as a worker thread");

if (process.env.STRICT_PERMS === 'true') {
  // Block dangerous modules
  const blockedModules = ['child_process', 'cluster', 'v8', 'vm'];
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  
  Module.prototype.require = function(request: string) {
    if (blockedModules.includes(request)) {
      throw new Error(`[Sandbox] Module Access Denied: ${request}`);
    }
    if (request === 'vscode' || request === 'em') {
        return apiShim;
    }
    return originalRequire.apply(this, arguments);
  };

  // Block sensitive FS access
  const path = require('path');
  const proxyFs = new Proxy(fs, {
    get(target, prop) {
      const original = (target as any)[prop];
      if (typeof original === 'function') {
        return (...args: any[]) => {
          const firstArg = args[0];
          if (typeof firstArg === 'string') {
            const resolvedPath = path.resolve(firstArg);
            const isSafe = resolvedPath.startsWith(extPath) || 
                           (process.env.WORKSPACE_PATH && resolvedPath.startsWith(process.env.WORKSPACE_PATH));
            
            if (!isSafe && !resolvedPath.includes('node_modules')) {
               throw new Error(`[Sandbox] FS Access Denied: ${resolvedPath}. Extensions can only access their own files or the workspace.`);
            }
          }
          return original.apply(target, args);
        };
      }
      return original;
    }
  });
  
  // Replace fs with proxy
  (fs as any) = proxyFs;
} else {
  // Even if not strict, still provide the API shim
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function(request: string) {
    if (request === 'vscode' || request === 'em') {
      return apiShim;
    }
    return originalRequire.apply(this, arguments);
  };
}

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
