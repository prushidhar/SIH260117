'use client';

import { useRef, useEffect } from 'react';
import { Calculator, Activity } from 'lucide-react';
import useIndraStore, { Message } from '@/store/indra-store';
import { useWebSocket } from '@/providers/WebSocketProvider';
import UserMessage from './UserMessage';
import AgentMessage from './AgentMessage';
import ChatInput from './ChatInput';

const verifiedWorkflows = [
  {
    title: 'ASME B31.3 Pipe Thickness Calculation',
    desc: 'Deterministic calculation for minimum required wall thickness under design pressure & temperature',
    query: 'Calculate minimum required pipe wall thickness under ASME B31.3 for design pressure 24.0 bar, temperature 180°C, and ASTM A106 Grade B pipe',
    icon: Calculator,
    badge: 'Calculation',
  },
  {
    title: 'Pump P-101 Live Telemetry & Control',
    desc: 'Interactive telemetry gauge, vibration analysis line chart, and PLC setpoint controls',
    query: 'What is the status of pump P-101? Stream live telemetry gauge, vibration chart, and DCS setpoint control deck',
    icon: Activity,
    badge: 'Telemetry',
  },
];

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
  const { messages, setInputValue } = useIndraStore();
  const { sendMessage, isAgentWorking } = useWebSocket();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Empty state — show home screen
  if (messages.length === 0) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-10 flex flex-col items-center select-none">
        <div className="w-full max-w-2xl flex flex-col items-center my-auto">
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-20 h-20 mb-4 flex items-center justify-center">
              <img src="/logo.png" alt="INDRA" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight mb-2">
              Industrial AI Co-Pilot
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
              Multi-step reasoning, ASME & P&ID verification, and deterministic engineering calculations.
            </p>
          </div>

          <ChatInput mode="center" />

          <div className="w-full mt-8">
            <div className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-3 px-1">
              Suggested Workflows
            </div>
            <div className="grid grid-cols-2 gap-3">
              {verifiedWorkflows.map((starter) => {
                const Icon = starter.icon;
                return (
                  <button
                    key={starter.title}
                    onClick={() => {
                      if (isAgentWorking) return;
                      setInputValue(starter.query);
                      sendMessage(starter.query);
                    }}
                    className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-medium">
                        {starter.badge}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200">{starter.title}</div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 leading-normal line-clamp-2">
                      {starter.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active conversation — normalize order then render top-to-bottom
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
