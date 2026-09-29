'use client';

import { Paperclip, RotateCcw, GitFork } from 'lucide-react';
import useIndraStore, { type Message } from '@/store/indra-store';

export default function UserMessage({ message }: { message: Message }) {
  const { setInputValue, addToast, forkSession } = useIndraStore();

  const handleReplay = () => {
    setInputValue(message.content);
    addToast({
      type: 'info',
      title: 'Prompt Replayed',
      message: 'Loaded user prompt back into input buffer.',
    });
  };

  const handleFork = () => {
    forkSession(message.id);
  };

  return (
    <div className="flex justify-end group/usermsg">
      <div className="max-w-[70%]">
        {message.attachments && message.attachments.length > 0 && (
          <div className="mb-2 space-y-1">
            {message.attachments.map((att, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs"
              >
                <Paperclip className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs text-slate-800 dark:text-zinc-200 font-medium">{att.name}</span>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500 ml-auto">{att.size}</span>
              </div>
            ))}
          </div>
        )}
        <div className="px-4 py-3 rounded-xl rounded-br-sm bg-emerald-600 text-white relative shadow-xs">
          <p className="text-sm font-normal leading-relaxed whitespace-pre-wrap">{message.content}</p>
          {message.timestamp && (
            <p className="text-[10px] text-emerald-200 mt-1 text-right font-mono">{message.timestamp}</p>
          )}
        </div>

        {/* Hover-triggered Replay & Fork Session Actions */}
        <div className="flex items-center gap-1.5 opacity-0 group-hover/usermsg:opacity-100 transition-opacity mt-1.5 justify-end">
          <button
            onClick={handleReplay}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-300 text-[11px] font-mono border border-slate-200 dark:border-zinc-700 shadow-2xs transition-colors cursor-pointer"
            title="Replay: Load prompt back into input buffer"
          >
            <RotateCcw className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Replay</span>
          </button>

          <button
            onClick={handleFork}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-300 text-[11px] font-mono border border-slate-200 dark:border-zinc-700 shadow-2xs transition-colors cursor-pointer"
            title="Fork Session: Branch scenario into parallel what-if sandbox"
          >
            <GitFork className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
            <span>Fork Session</span>
          </button>
        </div>
      </div>
    </div>
  );
}
