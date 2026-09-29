'use client';

import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useIndraStore } from '@/store/indra-store';

export default function BrandHeader() {
  const router = useRouter();
  const { newConversation, setActiveNav } = useIndraStore();

  return (
    <div className="px-3 pt-3 pb-2.5 border-b border-slate-200/70 dark:border-zinc-800/70">
      {/* "+ New Conversation" Primary Action Button */}
      <button
        onClick={() => {
          newConversation();
          setActiveNav('workbench');
          router.push('/workbench');
        }}
        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 text-xs font-semibold transition-colors cursor-pointer border border-slate-700 dark:border-zinc-300 shadow-xs"
        title="Start fresh conversation"
      >
        <Plus className="w-4 h-4" />
        <span className="font-semibold text-[11px] tracking-wide font-mono">New Conversation</span>
      </button>
    </div>
  );
}

