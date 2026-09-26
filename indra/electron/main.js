const { app, BrowserWindow, ipcMain, dialog, Notification, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const net = require('net');

let mainWindow = null;

function waitForServerAndLoad(win, targetUrl) {
  let isNavigated = false;
  const splashPath = path.join(__dirname, 'splash.html');

  if (fs.existsSync(splashPath)) {
    win.loadFile(splashPath);
  }

  const checkPort = () => {
    if (isNavigated || win.isDestroyed()) return;

    const socket = new net.Socket();
    socket.setTimeout(1200);

    socket.on('connect', () => {
      socket.destroy();
      if (!isNavigated && !win.isDestroyed()) {
        isNavigated = true;
        // Port is open! Give Next.js a short moment and load
        setTimeout(() => {
          if (!win.isDestroyed()) {
            win.loadURL(targetUrl);
          }
        }, 500);
      }
    });

    socket.on('error', () => {
      socket.destroy();
      setTimeout(checkPort, 600);
    });

    socket.on('timeout', () => {
      socket.destroy();
      setTimeout(checkPort, 600);
    });

    socket.connect(3000, '127.0.0.1');
  };

  // If loading fails while compiling, retry gracefully
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    if (errorCode === -3) return; // ERR_ABORTED - navigation cancelled
    console.warn(`[INDRA Navigation] Port open but page compilation in progress (${errorCode}: ${errorDescription}). Retrying...`);
    setTimeout(() => {
      if (!win.isDestroyed()) {
        win.loadURL(targetUrl);
      }
    }, 1500);
  });

  // Start polling after 500ms
  setTimeout(checkPort, 500);
}

function createWindow() {
  const iconPath = path.join(__dirname, '../public/logo.png');

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    title: 'INDRA — Sovereign AI Workbench',
    backgroundColor: '#080c14',
    autoHideMenuBar: true,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  });

  const appUrl = process.env.APP_URL || 'http://localhost:3000/workbench';
  waitForServerAndLoad(mainWindow, appUrl);

  // Prevent navigation to non-localhost URLs (Air-Gap loopback guarantee)
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const parsed = new URL(url);
    if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
      event.preventDefault();
      console.warn(`[AIR-GAP IPC BLOCKED] Egress navigation to ${url} strictly aborted.`);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    app.quit();
  });
}

// IPC Handlers
ipcMain.handle('dialog:openFile', async (event, options = {}) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win, {
    title: options.title || 'Select Engineering Documents for Knowledge Base',
    defaultPath: options.defaultPath,
    buttonLabel: options.buttonLabel || 'Select Documents',
    filters: options.filters || [
      { name: 'Engineering Documents', extensions: ['pdf', 'docx', 'xlsx', 'csv', 'txt', 'png', 'jpg', 'jpeg'] },
      { name: 'P&ID Diagrams', extensions: ['png', 'jpg', 'jpeg', 'svg', 'pdf'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: options.properties || ['openFile', 'multiSelections'],
  });

  if (result.canceled) {
    return { canceled: true, filePaths: [] };
  }
  return { canceled: false, filePaths: result.filePaths };
});

ipcMain.handle('fs:readFile', async (event, filePath) => {
  try {
    const stats = await fs.promises.stat(filePath);
    const buffer = await fs.promises.readFile(filePath);
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();

    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.csv': 'text/csv',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.txt': 'text/plain',
    };

    return {
      success: true,
      name: fileName,
      path: filePath,
      size: stats.size,
      mtime: stats.mtime.toISOString(),
      mimeType: mimeTypes[ext] || 'application/octet-stream',
      base64: buffer.toString('base64'),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('notification:show', (event, { title, body, silent = false }) => {
  if (Notification.isSupported()) {
    const iconPath = path.join(__dirname, '../public/logo.png');
    const notification = new Notification({
      title: title || 'INDRA Workbench',
      body: body || '',
      icon: fs.existsSync(iconPath) ? iconPath : undefined,
      silent,
    });
    notification.show();
    return { success: true };
  }
  return { success: false, error: 'Notifications not supported' };
});

ipcMain.handle('app:getInfo', () => ({
  platform: process.platform,
  arch: process.arch,
  version: app.getVersion(),
  isAirGapped: true,
  loopbackUrl: 'http://127.0.0.1:8000',
  electronVersion: process.versions.electron,
  nodeVersion: process.versions.node,
}));

ipcMain.handle('shell:openPath', async (event, targetPath) => {
  return await shell.openPath(targetPath);
});

// Multi-Window & Multi-Monitor Sub-Window Manager
const subWindows = new Map();

function createSubWindow(type, options = {}) {
  // If window already open, focus it
  const existingWin = subWindows.get(type);
  if (existingWin && !existingWin.isDestroyed()) {
    existingWin.focus();
    return existingWin;
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  let winConfig = {
    width: 1200,
    height: 800,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  };

  let targetRoute = `/detach/${type}`;

  if (type === 'pid') {
    winConfig = {
      ...winConfig,
      width: options.width || 1280,
      height: options.height || 850,
      minWidth: 800,
      minHeight: 600,
      title: 'INDRA — P&ID Engineering Schematic (Monitor 2)',
    };
  } else if (type === 'audit') {
    winConfig = {
      ...winConfig,
      width: options.width || 1200,
      height: options.height || 850,
      minWidth: 800,
      minHeight: 600,
      title: 'INDRA — Merkle Audit Ledger & 3-Tier HITL',
    };
  } else if (type === 'monitor') {
    winConfig = {
      ...winConfig,
      width: 400,
      height: 260,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      resizable: false,
      skipTaskbar: false,
      title: 'INDRA — Sovereign Egress Monitor',
    };
  }

  const subWin = new BrowserWindow(winConfig);
  subWin.loadURL(`${appUrl}${targetRoute}`);

  // Prevent egress outside localhost
  subWin.webContents.on('will-navigate', (event, url) => {
    const parsed = new URL(url);
    if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
      event.preventDefault();
      console.warn(`[AIR-GAP IPC BLOCKED] Egress navigation from subwindow to ${url} aborted.`);
    }
  });

  subWin.on('closed', () => {
    subWindows.delete(type);
    // Notify main window that sub-window closed
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window:state-updated', {
        type: 'WINDOW_CLOSED',
        windowType: type,
      });
    }
  });

  subWindows.set(type, subWin);
  return subWin;
}

// Multi-Window IPC Handlers
ipcMain.handle('window:open', async (event, { type, options }) => {
  createSubWindow(type, options);
  return { success: true };
});

ipcMain.handle('window:close', async (event, type) => {
  const win = subWindows.get(type);
  if (win && !win.isDestroyed()) {
    win.close();
    subWindows.delete(type);
  }
  return { success: true };
});

ipcMain.handle('window:state-sync', (event, payload) => {
  // Broadcast state updates across all open windows (main and subwindows)
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents !== event.sender) {
    mainWindow.webContents.send('window:state-updated', payload);
  }
  for (const [winType, win] of subWindows.entries()) {
    if (win && !win.isDestroyed() && win.webContents !== event.sender) {
      win.webContents.send('window:state-updated', payload);
    }
  }
  return { success: true };
});

// App Lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
