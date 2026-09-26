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
        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs text-white font-semibold transition-colors cursor-pointer"
        title="Start fresh conversation"
      >
        <Plus className="w-4 h-4 text-white" />
        <span className="font-semibold text-[11px] tracking-wide">New Conversation</span>
      </button>
    </div>
  );
}

