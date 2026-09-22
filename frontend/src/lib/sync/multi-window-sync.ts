/**
 * Universal Multi-Window Cross-Process Synchronization Engine
 * 
 * Synchronizes Zustand state across Electron BrowserWindow instances
 * via Electron IPC, with automatic fallback to the HTML5 BroadcastChannel API
 * when running in standard web browsers.
 */

import { isNativeApp } from '@/lib/native-bridge';
import type { NetworkEvent } from '@/store/indra-store';

export type DetachedWindowType = 'pid' | 'audit' | 'monitor';

export type CrossWindowEventPayload =
  | { type: 'TAG_SELECTED'; tag: string; metadata?: Record<string, any> }
  | { type: 'TAGS_DETECTED'; tags: string[] }
  | { type: 'EGRESS_EVENT'; blockedCount: number; event?: NetworkEvent }
  | { type: 'HITL_UPDATE'; taskId: string; approved: boolean; signature?: string }
  | { type: 'THEME_SYNC'; theme: 'light' | 'dark' }
  | { type: 'WINDOW_DETACHED'; windowType: DetachedWindowType }
  | { type: 'WINDOW_CLOSED'; windowType: DetachedWindowType };

export type CrossWindowEvent = CrossWindowEventPayload & { source: string };

type CrossWindowListener = (event: CrossWindowEvent) => void;

class MultiWindowSyncBus {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<CrossWindowListener> = new Set();
  private electronUnsubscribe: (() => void) | null = null;
  private windowId: string;
  private detachedWindows: Set<DetachedWindowType> = new Set();

  constructor() {
    this.windowId = typeof window !== 'undefined'
      ? `win-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
      : 'server';

    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    // 1. Browser BroadcastChannel setup (works in all modern browsers and Electron)
    if ('BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('indra-cross-window-sync');
        this.channel.onmessage = (messageEvent) => {
          const data = messageEvent.data as CrossWindowEvent;
          if (data && data.source !== this.windowId) {
            this.notifyListeners(data);
          }
        };
      } catch (err) {
        console.warn('[MultiWindowSync] BroadcastChannel init failed:', err);
      }
    }

    // 2. Electron IPC Listener (if running in Electron)
    if (isNativeApp() && window.electronAPI?.onStateUpdated) {
      this.electronUnsubscribe = window.electronAPI.onStateUpdated((data: any) => {
        if (data && data.source !== this.windowId) {
          this.notifyListeners(data);
        }
      });
    }
  }

  public getWindowId(): string {
    return this.windowId;
  }

  /**
   * Broadcast an event to all other open windows
   */
  public broadcast(event: CrossWindowEventPayload): void {
    const fullEvent = { ...event, source: this.windowId } as CrossWindowEvent;

    // Track detached window lifecycle locally
    if (fullEvent.type === 'WINDOW_DETACHED') {
      this.detachedWindows.add(fullEvent.windowType);
    } else if (fullEvent.type === 'WINDOW_CLOSED') {
      this.detachedWindows.delete(fullEvent.windowType);
    }

    // 1. Broadcast via Electron IPC if available
    if (isNativeApp() && window.electronAPI?.broadcastState) {
      window.electronAPI.broadcastState(fullEvent).catch(() => {});
    }

    // 2. Broadcast via BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage(fullEvent);
      } catch (err) {
        console.warn('[MultiWindowSync] postMessage failed:', err);
      }
    }
  }

  /**
   * Subscribe to cross-window events
   */
  public subscribe(listener: CrossWindowListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(event: CrossWindowEvent): void {
    // Update local detached window set
    if (event.type === 'WINDOW_DETACHED') {
      this.detachedWindows.add(event.windowType);
    } else if (event.type === 'WINDOW_CLOSED') {
      this.detachedWindows.delete(event.windowType);
    }

    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('[MultiWindowSync] Listener error:', err);
      }
    });
  }

  /**
   * Check if a specific sub-window is currently detached
   */
  public isWindowDetached(type: DetachedWindowType): boolean {
    return this.detachedWindows.has(type);
  }

  /**
   * Open a detached / pop-out window (Electron BrowserWindow or Web window.open)
   */
  public async openWindow(type: DetachedWindowType, options?: Record<string, any>): Promise<boolean> {
    this.detachedWindows.add(type);
    this.broadcast({ type: 'WINDOW_DETACHED', windowType: type });

    // 1. In Electron: use native BrowserWindow IPC
    if (isNativeApp() && window.electronAPI?.openSubWindow) {
      try {
        const res = await window.electronAPI.openSubWindow(type, options);
        return res.success;
      } catch (err) {
        console.warn('[MultiWindowSync] Electron openSubWindow failed, falling back to web:', err);
      }
    }

    // 2. In Browser: use window.open
    if (typeof window !== 'undefined') {
      let features = 'width=1200,height=800,menubar=no,toolbar=no,location=no,status=no';
      if (type === 'monitor') {
        features = 'width=420,height=280,menubar=no,toolbar=no,location=no,status=no';
      }
      const newWin = window.open(`/detach/${type}`, `indra-${type}-window`, features);
      if (newWin) {
        newWin.focus();
        return true;
      }
    }

    return false;
  }

  /**
   * Close a detached window
   */
  public async closeWindow(type: DetachedWindowType): Promise<void> {
    this.detachedWindows.delete(type);
    this.broadcast({ type: 'WINDOW_CLOSED', windowType: type });

    if (isNativeApp() && window.electronAPI?.closeSubWindow) {
      await window.electronAPI.closeSubWindow(type);
    }
  }
}

// Global Singleton
export const multiWindowSync = new MultiWindowSyncBus();

/**
 * Convenience helper to broadcast a cross-window synchronization event
 */
export function broadcastSyncEvent(event: CrossWindowEventPayload): void {
  multiWindowSync.broadcast(event);
}
