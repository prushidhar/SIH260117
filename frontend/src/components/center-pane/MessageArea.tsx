'use client';

import { useRef, useEffect } from 'react';
import useIndraStore, { Message } from '@/store/indra-store';
import UserMessage from './UserMessage';
import AgentMessage from './AgentMessage';
import ChatInput from './ChatInput';

/**
 * Normalize message order so user message ALWAYS appears before its agent reply.
 * Handles both legacy sessions (indexedDB primary-key sorted) and multi-turn conversations.
 */
function normalizeMessageOrder(msgs: Message[]): Message[] {
  if (!msgs || msgs.length <= 1) return msgs || [];

  const list = [...msgs];

  // If messages have explicit orderIndex, use it
  const hasOrderIndex = list.some((m: any) => typeof m.orderIndex === 'number');
  if (hasOrderIndex) {
    return list.sort((a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  }

  // Extract epoch timestamp from id: e.g. msg-user-1726735000000 or msg-agent-1726735000000
  const getSortKey = (m: Message, originalIdx: number): number => {
    const match = m.id?.match(/\d{10,15}/);
    if (match) {
      const ts = parseInt(match[0], 10);
      // User message always gets priority over agent response with same/adjacent timestamp
      return m.role === 'agent' ? ts + 0.5 : ts;
    }
    return originalIdx;
  };

  return list.sort((a, b) => {
    const idxA = msgs.indexOf(a);
    const idxB = msgs.indexOf(b);
    return getSortKey(a, idxA) - getSortKey(b, idxB);
  });
}

export default function MessageArea() {
  const { messages } = useIndraStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Empty state - clean, focused industrial co-pilot home screen
  if (messages.length === 0) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-12 flex flex-col items-center justify-center select-none">
        <div className="w-full max-w-2xl flex flex-col items-center my-auto">
          {/* Header Branding */}
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-16 h-16 mb-4 flex items-center justify-center">
              <img src="/logo.png" alt="INDRA" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight mb-2 font-sans">
              Industrial AI Co-Pilot
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed font-sans">
              Air-gapped deterministic engineering solver, multimodal ISA-5.1 P&amp;ID vision, and statutory code verification.
            </p>
          </div>

          {/* Centered Chat Input Box */}
          <ChatInput mode="center" />
        </div>
      </div>
    );
  }

  // Active conversation - normalize order then render top-to-bottom
  const orderedMessages = normalizeMessageOrder(messages);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 pb-36 space-y-4">
      {orderedMessages.map((msg) =>
        msg.role === 'user' ? (
          <UserMessage key={msg.id} message={msg} />
        ) : (
          <AgentMessage key={msg.id} message={msg} />
        )
      )}
      <div ref={bottomRef} />
    </div>
  );
}
