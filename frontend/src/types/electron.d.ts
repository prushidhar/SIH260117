export interface FileDialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: { name: string; extensions: string[] }[];
  properties?: ('openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles')[];
}

export interface NativeFileResult {
  success: boolean;
  name: string;
  path: string;
  size: number;
  mtime: string;
  mimeType: string;
  base64: string;
  error?: string;
}

export interface NativeNotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  silent?: boolean;
}

export interface NativeAppInfo {
  platform: string;
  arch: string;
  version: string;
  isAirGapped: boolean;
  loopbackUrl: string;
  electronVersion?: string;
  nodeVersion?: string;
}

export interface ElectronAPI {
  isElectron: boolean;
  openFileDialog: (options?: FileDialogOptions) => Promise<{ canceled: boolean; filePaths: string[] }>;
  readFile: (filePath: string) => Promise<NativeFileResult>;
  showNotification: (options: NativeNotificationOptions) => Promise<{ success: boolean; error?: string }>;
  getAppInfo: () => Promise<NativeAppInfo>;
  openPath: (targetPath: string) => Promise<string>;
  openSubWindow: (type: 'pid' | 'audit' | 'monitor', options?: Record<string, any>) => Promise<{ success: boolean }>;
  closeSubWindow: (type: 'pid' | 'audit' | 'monitor') => Promise<{ success: boolean }>;
  broadcastState: (payload: any) => Promise<{ success: boolean }>;
  onStateUpdated: (callback: (payload: any) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
