/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("billbookDesktop", {
  getEnvironment: () => ipcRenderer.invoke("desktop:get-environment"),
  getHermesAccess: () => ipcRenderer.invoke("desktop:get-hermes-access"),
  setHermesAccess: (enabled) => ipcRenderer.invoke("desktop:set-hermes-access", enabled),
  getDatabaseStatus: () => ipcRenderer.invoke("desktop:get-database-status"),
  syncWorkspace: (payload) => ipcRenderer.invoke("desktop:sync-workspace", payload),
  readWorkspaceState: () => ipcRenderer.invoke("desktop:read-workspace-state"),
  onDatabaseStatus: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("desktop:database-status", handler);
    return () => {
      ipcRenderer.removeListener("desktop:database-status", handler);
    };
  },

  // Tray-related APIs
  getTrayStatus: () => ipcRenderer.invoke("desktop:get-tray-status"),
  setAutoStart: (enabled) => ipcRenderer.invoke("desktop:set-auto-start", enabled),
  onHermesAccessChanged: (callback) => {
    const handler = (_event, enabled) => callback(enabled);
    ipcRenderer.on("desktop:hermes-access-changed", handler);
    return () => {
      ipcRenderer.removeListener("desktop:hermes-access-changed", handler);
    };
  },
});
