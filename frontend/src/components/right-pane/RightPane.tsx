'use client';

import { X, ShieldAlert, Package, Layers } from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import SovereignMonitor from './SovereignMonitor';
import Deliverables from './Deliverables';
import PIDViewer from './PIDViewer';

export default function RightPane() {
  const { setRightPaneOpen, deliverables, activePIDDoc } = useIndraStore();

  return (
    <aside className="w-80 h-full flex flex-col bg-white dark:bg-zinc-950 border-l border-slate-200/80 dark:border-zinc-800/80 select-none z-10 flex-shrink-0 shadow-xs animate-in slide-in-from-right-4 duration-200">
      {/* Pane Header */}
      <div className="h-11 px-3.5 border-b border-slate-200/70 dark:border-zinc-800/70 flex items-center justify-between bg-slate-50/70 dark:bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-200/80 dark:border-violet-800/50">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <span className="font-mono text-xs font-bold tracking-wider text-slate-800 dark:text-zinc-200 uppercase">
            Sovereign Inspector
          </span>
          {deliverables.length > 0 && (
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 font-mono font-bold border border-violet-200 dark:border-violet-800">
              {deliverables.length}
            </span>
          )}
        </div>

        <button
          onClick={() => setRightPaneOpen(false)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Collapse Right Inspector Pane"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Inspector Content */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin dark:scrollbar-thumb-zinc-700 divide-y divide-slate-100 dark:divide-zinc-800/70">
        {/* Deliverables section */}
        <Deliverables />

        {/* P&ID CAD & Telemetry Viewer */}
        <PIDViewer />

        {/* 0-WAN Sovereign Hardware & Network Monitor */}
        <SovereignMonitor />
      </div>
    </aside>
  );
}
