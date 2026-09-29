'use client';

import { useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import useIndraStore from '@/store/indra-store';
import { sovereignAudio } from '@/lib/audio/sound-effects';

interface ControlRoomShortcutsProps {
  onOpenSearch: () => void;
  isSearchOpen: boolean;
  onCloseSearch: () => void;
}

export function useControlRoomShortcuts({
  onOpenSearch,
  isSearchOpen,
  onCloseSearch,
}: ControlRoomShortcutsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAgentWorking, abortTask, addToast } = useIndraStore();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // 1. Universal Asset Search: Ctrl + K or Cmd + K
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        e.stopPropagation();
        if (isSearchOpen) {
          onCloseSearch();
        } else {
          onOpenSearch();
          sovereignAudio.playClick(0.08);
        }
        return;
      }

      // 2. Emergency Abort / Trip: Escape
      if (e.key === 'Escape') {
        if (isSearchOpen) {
          e.preventDefault();
          onCloseSearch();
          return;
        }

        if (isAgentWorking) {
          e.preventDefault();
          abortTask();
          sovereignAudio.playAlertTone(0.22);
          addToast({
            type: 'warning',
            title: 'EMERGENCY TASK ABORT / TRIP',
            message: 'Active reasoning task aborted by operator via [Esc] trip interlock.',
          });
          return;
        }
      }

      // Check if target is an interactive typing element
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl?.getAttribute('contenteditable') === 'true';

      // 3. Quick Pane Switching (Keys '1', '2', '3', '4') when NOT typing
      if (!isInput && !e.ctrlKey && !e.metaKey && !e.altKey && !isSearchOpen) {
        if (e.key === '1') {
          e.preventDefault();
          sovereignAudio.playShortcut(0.08);
          router.push('/workbench');
        } else if (e.key === '2') {
          e.preventDefault();
          sovereignAudio.playShortcut(0.08);
          router.push('/canvas');
        } else if (e.key === '3') {
          e.preventDefault();
          sovereignAudio.playShortcut(0.08);
          router.push('/knowledge');
        } else if (e.key === '4') {
          e.preventDefault();
          sovereignAudio.playShortcut(0.08);
          router.push('/audit');
        }
      }
    },
    [
      onOpenSearch,
      isSearchOpen,
      onCloseSearch,
      isAgentWorking,
      abortTask,
      addToast,
      router,
      pathname,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
