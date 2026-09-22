/**
 * Floating Transparent Sovereign Monitor Desktop Widget
 * 
 * Always-on-top, frameless desktop widget tracking live egress containment
 * and air-gap integrity. Draggable across monitors.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Lock, 
  X, 
  Activity, 
  WifiOff, 
  Radio, 
  AlertTriangle 
} from 'lucide-react';
import useIndraStore, { type NetworkEvent } from '@/store/indra-store';
import { multiWindowSync, type CrossWindowEvent } from '@/lib/sync/multi-window-sync';

export default function DetachedMonitorWidget() {
  const { blockedCount, networkEvents } = useIndraStore();
  const [liveBlockedCount, setLiveBlockedCount] = useState(blockedCount);
  const [events, setEvents] = useState<NetworkEvent[]>(networkEvents.slice(0, 4));
  const [flashing, setFlashing] = useState(false);

  // Cross-window event listener for real-time security events
  useEffect(() => {
    const unsubscribe = multiWindowSync.subscribe((event: CrossWindowEvent) => {
      if (event.type === 'EGRESS_EVENT') {
        setLiveBlockedCount(event.blockedCount);
        if (event.event) {
          setEvents((prev) => [event.event!, ...prev.slice(0, 3)]);
        }
        // Flash border on security event
        setFlashing(true);
        setTimeout(() => setFlashing(false), 800);
      }
    });

    return unsubscribe;
  }, []);

  const handleClose = () => {
    multiWindowSync.closeWindow('monitor');
  };

  return (
    <div className="h-screen w-screen p-2 bg-transparent select-none overflow-hidden font-mono text-xs flex items-center justify-center">
      {/* Draggable HUD Card Container */}
      <div 
        className={`w-full h-full rounded-2xl bg-black/92 backdrop-blur-2xl border transition-all duration-300 shadow-2xl flex flex-col overflow-hidden ${
          flashing
            ? 'border-rose-500 shadow-rose-500/30'
            : 'border-zinc-800/80 shadow-black/80'
        }`}
      >
        {/* Draggable Titlebar */}
        <div 
          className="h-9 px-3.5 bg-zinc-950/80 border-b border-zinc-800/60 flex items-center justify-between cursor-move"
          style={{ WebkitAppRegion: 'drag' } as any}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-[11px] text-zinc-100 tracking-wider">
              INDRA SOVEREIGN HUD
            </span>
            <span className="text-[8px] px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 font-bold">
              0-WAN
            </span>
          </div>

          <button
            onClick={handleClose}
            className="p-1 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            style={{ WebkitAppRegion: 'no-drag' } as any}
            title="Close Floating Widget"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Live Security Metrics */}
        <div className="p-3 flex-1 flex flex-col justify-between">
          <div className="grid grid-cols-2 gap-2">
            {/* Egress Contained Counter */}
            <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/60 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-400">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[8px] text-zinc-500 uppercase tracking-wider block">
                  Egress Drops
                </span>
                <span className="text-sm font-extrabold text-rose-400 block leading-tight">
                  {liveBlockedCount} PACKETS
                </span>
              </div>
            </div>

            {/* Loopback Status */}
            <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/60 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-emerald-400">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[8px] text-zinc-500 uppercase tracking-wider block">
                  Air-Gap Loopback
                </span>
                <span className="text-[11px] font-bold text-emerald-400 block leading-tight">
                  127.0.0.1
                </span>
              </div>
            </div>
          </div>

          {/* Mini Security Event Ticker */}
          <div className="mt-2 pt-2 border-t border-zinc-900 flex-1">
            <div className="text-[8px] text-zinc-500 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Security Event Stream</span>
              <span className="text-emerald-500 text-[8px] flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 animate-pulse" /> LIVE
              </span>
            </div>

            {events.length === 0 ? (
              <div className="text-[10px] text-zinc-500 italic py-1">
                Strict air-gap active. All unauthorized socket attempts dropped.
              </div>
            ) : (
              <div className="space-y-1 overflow-hidden">
                {events.slice(0, 2).map((ev, i) => (
                  <div 
                    key={ev.id || i}
                    className="flex items-center justify-between text-[9px] text-zinc-400 bg-zinc-900/40 px-2 py-1 rounded border border-zinc-800/40"
                  >
                    <span className="text-rose-400 font-bold truncate max-w-[170px]">
                      {ev.action || 'EGRESS_BLOCKED'}: {ev.destination || 'External WAN'}
                    </span>
                    <span className="text-zinc-500 text-[8px]">
                      {ev.timestamp || 'Just now'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
