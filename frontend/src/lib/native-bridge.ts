import type { 
  FileDialogOptions, 
  NativeFileResult, 
  NativeNotificationOptions, 
  NativeAppInfo 
} from '@/types/electron';

export function isNativeApp(): boolean {
  return typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron);
}

export async function getNativeAppInfo(): Promise<NativeAppInfo> {
  if (isNativeApp() && window.electronAPI) {
    return await window.electronAPI.getAppInfo();
  }
  return {
    platform: typeof navigator !== 'undefined' ? navigator.platform : 'web',
    arch: 'x64',
    version: '1.0.0',
    isAirGapped: true,
    loopbackUrl: 'http://127.0.0.1:8000',
  };
}

/**
 * Dispatches a native OS desktop notification.
 * In Electron: triggers Windows Action Center / macOS Notification Center.
 * In Browser: falls back to HTML5 Web Notifications API.
 */
export async function sendNativeNotification(options: NativeNotificationOptions): Promise<boolean> {
  try {
    if (isNativeApp() && window.electronAPI) {
      const res = await window.electronAPI.showNotification(options);
      return res.success;
    }

    // Web Browser Fallback
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(options.title, {
          body: options.body,
          icon: options.icon || '/logo.png',
          silent: options.silent,
        });
        return true;
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(options.title, {
            body: options.body,
            icon: options.icon || '/logo.png',
            silent: options.silent,
          });
          return true;
        }
      }
    }
  } catch (err) {
    console.warn('[NativeBridge] Notification failed:', err);
  }
  return false;
}

/**
 * Opens native OS file picker and converts local disk files to standard File objects.
 * In Electron: opens native OS file dialog (dialog.showOpenDialog) and reads local file buffers.
 * In Browser: falls back to hidden HTML file input picker.
 */
export async function pickNativeFiles(options?: FileDialogOptions): Promise<File[]> {
  if (isNativeApp() && window.electronAPI) {
    const dialogRes = await window.electronAPI.openFileDialog(options);
    if (dialogRes.canceled || !dialogRes.filePaths.length) {
      return [];
    }

    const files: File[] = [];
    for (const filePath of dialogRes.filePaths) {
      const readRes = await window.electronAPI.readFile(filePath);
      if (readRes.success && readRes.base64) {
        // Convert base64 to Uint8Array and File
        const byteCharacters = atob(readRes.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: readRes.mimeType });
        const file = new File([blob], readRes.name, {
          type: readRes.mimeType,
          lastModified: new Date(readRes.mtime).getTime(),
        });
        files.push(file);
      }
    }
    return files;
  }

  // Web Browser Fallback
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      return resolve([]);
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = options?.properties?.includes('multiSelections') !== false;

    if (options?.filters && options.filters.length > 0) {
      const exts = options.filters
        .flatMap((f) => f.extensions)
        .filter((ext) => ext !== '*')
        .map((ext) => (ext.startsWith('.') ? ext : `.${ext}`))
        .join(',');
      if (exts) input.accept = exts;
    }

    input.onchange = () => {
      const fileList = input.files;
      if (fileList && fileList.length > 0) {
        resolve(Array.from(fileList));
      } else {
        resolve([]);
      }
    };

    input.click();
  });
}

/**
 * Reveals a file path in the native file explorer (Windows Explorer / macOS Finder).
 */
export async function revealInExplorer(filePath: string): Promise<string> {
  if (isNativeApp() && window.electronAPI) {
    return await window.electronAPI.openPath(filePath);
  }
  return '';
}
