'use client';

import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Cpu, Send, Sparkles, X, Terminal, Bot, User } from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { useWebSocket } from '@/providers/WebSocketProvider';
import useSpatialStore from '@/store/spatial-store';

export default function AgentChatNode({ id, data }: { id: string; data: any }) {
  const { messages, activeModel, isAgentWorking } = useIndraStore();
  const { sendMessage } = useWebSocket();
  const { removeNode } = useSpatialStore();
  const [localInput, setLocalInput] = useState('');

  const handleSend = () => {
    if (!localInput.trim() || isAgentWorking) return;
    sendMessage(localInput.trim());
    setLocalInput('');
  };

  const recentMessages = messages.slice(-3);

  return (
    <div className="w-[440px] rounded-2xl bg-white dark:bg-zinc-900 border-2 border-slate-700/80 shadow-2xl shadow-slate-900/40 text-slate-800 dark:text-zinc-200 overflow-hidden font-sans">
      {/* Input / Output Connection Handles */}
      <Handle type="target" position={Position.Left} className="w-3.5 h-3.5 bg-slate-600 border-2 border-white dark:border-zinc-900 -ml-1.5" />
      <Handle type="source" position={Position.Right} className="w-3.5 h-3.5 bg-slate-600 border-2 border-white dark:border-zinc-900 -mr-1.5" />
      <Handle type="source" position={Position.Bottom} className="w-3.5 h-3.5 bg-slate-600 border-2 border-white dark:border-zinc-900 -mb-1.5" />

      {/* Node Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100 dark:bg-zinc-800/90 border-b border-slate-200 dark:border-zinc-700">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 flex items-center justify-center">
            <img src="/logo.png" alt="INDRA" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span>{data?.title || 'INDRA Reasoning Agent'}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
              {activeModel}
            </div>
          </div>
        </div>

        <button
          onClick={() => removeNode(id)}
          className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Message Feed Container */}
      <div className="p-3 max-h-[320px] overflow-y-auto space-y-2.5 text-xs text-slate-700 dark:text-zinc-300 bg-slate-50/50 dark:bg-zinc-950/30">
        {recentMessages.length === 0 ? (
          <div className="py-6 text-center text-slate-400 dark:text-zinc-500 font-mono text-[11px] space-y-1">
            <Bot className="w-6 h-6 mx-auto text-slate-400 opacity-60" />
            <p>Spatial reasoning core ready.</p>
            <p className="text-[10px] text-slate-400">Ask a question or connect a P&ID / document node.</p>
          </div>
        ) : (
          recentMessages.map((msg) => (
            <div
              key={msg.id}
              className={`p-2.5 rounded-xl text-xs space-y-1 ${
                msg.role === 'user'
                  ? 'bg-slate-800 dark:bg-zinc-700 text-white ml-6 shadow-xs'
                  : 'bg-white dark:bg-zinc-800/90 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 mr-4 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono opacity-80 pb-0.5 border-b border-white/20 dark:border-zinc-700">
                <span className="font-bold uppercase flex items-center gap-1">
                  {msg.role === 'user' ? <User className="w-2.5 h-2.5" /> : <Bot className="w-2.5 h-2.5" />}
                  <span>{msg.role === 'user' ? 'Operator' : 'INDRA AI'}</span>
                </span>
                <span>{msg.timestamp}</span>
              </div>
              <div className="text-[11px] leading-relaxed line-clamp-4">
                {msg.content}
              </div>
            </div>
          ))
        )}

        {isAgentWorking && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-[11px] text-slate-700 dark:text-zinc-300 font-mono">
            <Cpu className="w-3.5 h-3.5 animate-spin text-emerald-500" />
            <span>Sovereign neural reasoning in progress...</span>
          </div>
        )}
      </div>

      {/* In-Node Input Box */}
      <div className="p-2.5 bg-white dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800 flex items-center gap-1.5">
        <input
          type="text"
          value={localInput}
          onChange={(e) => setLocalInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
          placeholder="Ask INDRA or dispatch calculation..."
          className="flex-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-800 dark:text-zinc-100 focus:outline-none focus:border-slate-500"
        />
        <button
          onClick={handleSend}
          disabled={!localInput.trim() || isAgentWorking}
          className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
