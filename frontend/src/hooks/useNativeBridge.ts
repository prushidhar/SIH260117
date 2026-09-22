'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  isNativeApp, 
  getNativeAppInfo, 
  sendNativeNotification, 
  pickNativeFiles,
  revealInExplorer 
} from '@/lib/native-bridge';
import type { NativeAppInfo, FileDialogOptions, NativeNotificationOptions } from '@/types/electron';

export function useNativeBridge() {
  const [isNative, setIsNative] = useState(false);
  const [appInfo, setAppInfo] = useState<NativeAppInfo | null>(null);

  useEffect(() => {
    const native = isNativeApp();
    setIsNative(native);
    if (native) {
      getNativeAppInfo().then(setAppInfo);
    }
  }, []);

  const notify = useCallback(async (options: NativeNotificationOptions) => {
    return await sendNativeNotification(options);
  }, []);

  const openFileDialog = useCallback(async (options?: FileDialogOptions) => {
    return await pickNativeFiles(options);
  }, []);

  const revealFile = useCallback(async (filePath: string) => {
    return await revealInExplorer(filePath);
  }, []);

  return {
    isNative,
    appInfo,
    notify,
    openFileDialog,
    revealFile,
  };
}

export default useNativeBridge;
