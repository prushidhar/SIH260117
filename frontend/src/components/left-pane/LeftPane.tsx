'use client';

import BrandHeader from './BrandHeader';
import NavigationMenu from './NavigationMenu';
import ConversationHistory from './ConversationHistory';
import { Settings, ShieldCheck } from 'lucide-react';
import { useIndraStore } from '@/store/indra-store';

export default function LeftPane() {
  const { setSettingsOpen } = useIndraStore();

  return (
    <aside className="w-64 h-full flex flex-col bg-white dark:bg-zinc-950 border-r border-slate-200/80 dark:border-zinc-800/80 select-none z-10 flex-shrink-0 shadow-xs">
      {/* Top Header & Brand */}
      <BrandHeader />

      {/* Navigation & Projects */}
      <NavigationMenu />

      {/* Conversation Sessions History */}
      <div className="flex-1 min-h-0 flex flex-col">
        <ConversationHistory />
      </div>

      {/* Bottom Settings Footer */}
      <div className="p-2.5 border-t border-slate-200/70 dark:border-zinc-800/70 bg-white dark:bg-zinc-950 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
        <button 
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-zinc-100 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-900 cursor-pointer font-medium"
          title="Open Settings"
        >
          <Settings className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
          <span className="text-[11px]">Settings</span>
        </button>

        <div className="flex items-center gap-1.5 text-[10px] font-mono font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/50">
          <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          <span>READY</span>
        </div>
      </div>
    </aside>
  );
}

