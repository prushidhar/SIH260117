'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  MessageSquare, 
  Trash2, 
  Clock, 
  ChevronDown, 
  ChevronRight,
  Sparkles,
  Archive
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';

function formatTimeAgo(isoString?: string): string {
  if (!isoString) return 'Recent';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recent';
  }
}

export default function ConversationHistory() {
  const { 
    sessions, 
    currentSessionId, 
    loadSession, 
    deleteSession, 
    clearAllSessions,
    messages 
  } = useIndraStore();

  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(true);

  // If there are no sessions yet and current conversation has messages, we still show the current active one
  const totalCount = sessions.length;

  return (
    <div className="px-2 py-2 border-b border-slate-200/70 dark:border-zinc-800/70">
      {/* Header bar */}
      <div className="flex items-center justify-between px-2 mb-1.5">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-zinc-500 font-mono hover:text-slate-700 dark:hover:text-zinc-300 transition-colors cursor-pointer"
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
          <span>Chat History</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 font-mono">
            {totalCount}
          </span>
        </button>

        {totalCount > 0 && isExpanded && (
          <button
            onClick={() => {
              if (window.confirm('Clear all conversation history? This cannot be undone.')) {
                clearAllSessions();
              }
            }}
            className="text-[10px] text-slate-400 hover:text-rose-600 dark:text-zinc-500 dark:hover:text-rose-400 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            title="Clear all saved sessions"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Collapsible Session List */}
      {isExpanded && (
        <div className="space-y-1 max-h-44 overflow-y-auto scrollbar-thin dark:scrollbar-thumb-zinc-700 pr-1">
          {sessions.length === 0 ? (
            <div className="px-2.5 py-3 rounded-xl bg-slate-50/60 dark:bg-zinc-900/40 border border-dashed border-slate-200 dark:border-zinc-800 text-center space-y-1">
              <Archive className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 mx-auto" />
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                {messages.length > 0 ? 'Active chat will auto-persist' : 'No saved sessions'}
              </p>
            </div>
          ) : (
            sessions.map((session) => {
              const isActive = session.id === currentSessionId;
              const msgCount = (session.messages && session.messages.length > 0) ? session.messages.length : ((session as any).messageCount || 0);
              const timeAgo = formatTimeAgo(session.updatedAt || session.createdAt);

              return (
                <div
                  key={session.id}
                  onClick={() => {
                    loadSession(session.id);
                    router.push('/workbench');
                  }}
                  className={`group relative flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-xs cursor-pointer transition-all duration-150 border ${
                    isActive
                      ? 'bg-violet-50/90 dark:bg-violet-950/50 border-violet-200 dark:border-violet-800/60 text-violet-900 dark:text-violet-200 shadow-2xs font-medium'
                      : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${
                      isActive ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400 dark:text-zinc-500 group-hover:text-slate-600 dark:group-hover:text-zinc-300'
                    }`} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] font-medium leading-tight">
                        {session.title || 'Audit Session'}
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-400 dark:text-zinc-500 font-mono mt-0.5">
                        <span>{timeAgo}</span>
                        <span>•</span>
                        <span>{msgCount} {msgCount === 1 ? 'msg' : 'msgs'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Delete session button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 dark:text-zinc-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-all cursor-pointer flex-shrink-0"
                    title="Delete session"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
