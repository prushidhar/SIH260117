/**
 * useCrossWindowSync — React Hook connecting Zustand store to Multi-Window Bus
 * 
 * Automatically synchronizes equipment selections, detected OCR tags,
 * egress security alerts, and theme state across all open windows.
 */

'use client';

import { useEffect, useCallback } from 'react';
import { useIndraStore } from '@/store/indra-store';
import { multiWindowSync, type CrossWindowEvent, type DetachedWindowType } from '@/lib/sync/multi-window-sync';

export function useCrossWindowSync() {
  const {
    detectedTags,
    setDetectedTags,
    blockedCount,
    theme,
    setTheme,
    addNetworkEvent,
    incrementBlockedCount,
  } = useIndraStore();

  // Listen for events from other windows
  useEffect(() => {
    const unsubscribe = multiWindowSync.subscribe((event: CrossWindowEvent) => {
      switch (event.type) {
        case 'TAGS_DETECTED':
          if (event.tags && event.tags.length > 0) {
            setDetectedTags(event.tags);
          }
          break;

        case 'EGRESS_EVENT':
          if (event.event) {
            addNetworkEvent(event.event);
          } else {
            incrementBlockedCount();
          }
          break;

        case 'THEME_SYNC':
          if (event.theme) {
            setTheme(event.theme);
          }
          break;

        case 'HITL_UPDATE':
          // Refresh approvals when signed in another window
          useIndraStore.getState().fetchPendingApprovals();
          break;
      }
    });

    return unsubscribe;
  }, [setDetectedTags, addNetworkEvent, incrementBlockedCount, setTheme]);

  /**
   * Broadcast a tag selection to all other windows (e.g. Monitor 2 P&ID canvas)
   */
  const broadcastTagSelection = useCallback((tag: string) => {
    multiWindowSync.broadcast({
      type: 'TAG_SELECTED',
      tag,
    });
  }, []);

  /**
   * Broadcast detected tags to all other windows
   */
  const broadcastDetectedTags = useCallback((tags: string[]) => {
    multiWindowSync.broadcast({
      type: 'TAGS_DETECTED',
      tags,
    });
  }, []);

  /**
   * Detach a view to a secondary window
   */
  const detachWindow = useCallback((type: DetachedWindowType) => {
    return multiWindowSync.openWindow(type);
  }, []);

  return {
    broadcastTagSelection,
    broadcastDetectedTags,
    detachWindow,
    isWindowDetached: (type: DetachedWindowType) => multiWindowSync.isWindowDetached(type),
  };
}
