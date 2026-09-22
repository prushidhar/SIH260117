const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  openFileDialog: (options) => ipcRenderer.invoke('dialog:openFile', options),
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  showNotification: (options) => ipcRenderer.invoke('notification:show', options),
  getAppInfo: () => ipcRenderer.invoke('app:getInfo'),
  openPath: (targetPath) => ipcRenderer.invoke('shell:openPath', targetPath),
  openSubWindow: (type, options) => ipcRenderer.invoke('window:open', { type, options }),
  closeSubWindow: (type) => ipcRenderer.invoke('window:close', type),
  broadcastState: (payload) => ipcRenderer.invoke('window:state-sync', payload),
  onStateUpdated: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('window:state-updated', subscription);
    return () => ipcRenderer.removeListener('window:state-updated', subscription);
  },
});
