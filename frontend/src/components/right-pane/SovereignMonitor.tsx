'use client';

import { ShieldCheck, Lock, Radio, Network, CheckCircle2, AlertOctagon } from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { useWebSocket } from '@/providers/WebSocketProvider';

export default function SovereignMonitor() {
  const { blockedCount, networkEvents } = useIndraStore();
  const { networkStatus } = useWebSocket();

  return (
    <div className="p-4 text-slate-800 dark:text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:text-zinc-400 font-mono">
            0-WAN Sovereign Monitor
          </h2>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 text-[9px] font-mono font-medium">
          <span className={`w-1.5 h-1.5 rounded-full ${
            networkStatus === 'connected'
              ? 'bg-emerald-500 animate-pulse'
              : networkStatus === 'reconnecting'
              ? 'bg-amber-500 animate-pulse'
              : 'bg-rose-500'
          }`} />
          <span className="text-slate-600 dark:text-zinc-400 uppercase">
            {networkStatus === 'connected' ? 'WS:LIVE' : networkStatus === 'reconnecting' ? 'WS:RETRY' : 'WS:OFFLINE'}
          </span>
        </div>
      </div>

      {/* Strict 0-WAN Air-Gap Metrics */}
      <div className="flex flex-col space-y-0.5 text-xs">
        <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-zinc-800/40">
          <span className="text-slate-500 dark:text-zinc-400 text-[11px]">WAN Egress</span>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-rose-600 dark:text-rose-400 text-xs font-mono font-bold">BLOCKED (0-WAN)</span>
          </div>
        </div>

        <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-zinc-800/40">
          <span className="text-slate-500 dark:text-zinc-400 text-[11px]">External Sockets</span>
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold">0 OUTBOUND</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </div>
        </div>

        <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-zinc-800/40">
          <span className="text-slate-500 dark:text-zinc-400 text-[11px]">Traffic Scope</span>
          <span className="text-emerald-700 dark:text-emerald-400 text-[11px] font-mono font-semibold">LOOPBACK (::1)</span>
        </div>

        <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-zinc-800/40">
          <span className="text-slate-500 dark:text-zinc-400 text-[11px]">Data Residency</span>
          <span className="text-emerald-700 dark:text-emerald-400 text-[11px] font-mono font-bold">100% LOCAL</span>
        </div>

        <div className="flex items-center justify-between py-1.5">
          <span className="text-slate-500 dark:text-zinc-400 text-[11px]">Cryptographic Root</span>
          <div className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span className="text-slate-700 dark:text-zinc-300 text-[10px] font-mono font-semibold">SHA-256 MERKLE</span>
          </div>
        </div>
      </div>

      {/* Blocked Packet Intercept Counter */}
      <div className="mt-3 p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/25 border border-rose-200/80 dark:border-rose-900/40">
        <div className="flex items-baseline justify-between">
          <div className="text-rose-600 dark:text-rose-400 text-xl font-mono font-bold">{blockedCount}</div>
          <span className="text-[9px] font-mono font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider bg-rose-100 dark:bg-rose-900/50 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
            CONTAINED
          </span>
        </div>
        <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 font-mono">
          outbound egress requests contained by local proxy
        </div>
      </div>

      {/* Live Intercept Stream from ws://localhost:8000/ws/network */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-[9px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-mono font-bold">
            Recent Containment Intercepts
          </h3>
          <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-mono">Live WebSocket</span>
        </div>

        {networkEvents.length === 0 ? (
          <div className="text-[10px] text-slate-400 dark:text-zinc-500 italic py-2.5 text-center bg-slate-50/60 dark:bg-zinc-900/30 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800">
            Waiting for live telemetry from ws://localhost:8000/ws/network...
          </div>
        ) : (
          <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
            {networkEvents.slice(0, 5).map((event, index) => (
              <div 
                key={event.id || index} 
                className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50 dark:bg-zinc-900/50 border border-slate-200/70 dark:border-zinc-800/50 text-[10px] font-mono"
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                  <span className="text-slate-800 dark:text-zinc-200 truncate font-medium">{event.destination}</span>
                </div>
                <span className="text-slate-400 dark:text-zinc-500 ml-2 text-[9px] flex-shrink-0">{event.timestamp}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
