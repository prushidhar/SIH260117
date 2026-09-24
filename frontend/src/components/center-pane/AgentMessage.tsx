'use client';

import { useState } from 'react';
import useIndraStore from '@/store/indra-store';
import type { Message } from '@/store/indra-store';
import { useWebSocket } from '@/providers/WebSocketProvider';
import ToolExecution from './ToolExecution';
import MarkdownRenderer from '@/components/common/MarkdownRenderer';
import GenerativeUIBlock from '@/components/generative-ui/GenerativeUIBlock';
import { Cpu, AlertCircle, RefreshCw, Play, Copy, Check, Loader2 } from 'lucide-react';

export default function AgentMessage({ message }: { message: Message }) {
  const { runOfflineSimulation } = useIndraStore();
  const { isAgentWorking, retryMessage } = useWebSocket();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!message.content) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(message.content);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = message.content;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Failed to copy response text:', err);
    }
  };

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-3">
        {/* Agent label */}
        <div className="flex items-center gap-2 mb-1">
          <div className="relative w-6 h-6 flex items-center justify-center flex-shrink-0">
            <img src="/logo.png" alt="INDRA" className="w-full h-full object-contain drop-shadow-[0_1px_4px_rgba(124,58,237,0.25)]" />
          </div>
          <span className="text-[11px] font-extrabold tracking-wider text-slate-800 dark:text-zinc-200 uppercase font-mono">INDRA</span>
          
          {message.modelUsed && (
            <span className="text-[10px] font-mono text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/40 border border-violet-200/80 dark:border-violet-800/50 flex items-center gap-1 font-semibold">
              <Cpu className="w-2.5 h-2.5 text-violet-600 dark:text-violet-400" />
              <span>{message.modelUsed}</span>
            </span>
          )}

          {isAgentWorking && message.agentSteps?.some((s) => s.status !== 'completed') && (
            <span className="text-[10px] text-violet-600 dark:text-violet-400 animate-pulse font-mono font-medium">sovereign reasoning...</span>
          )}
        </div>

        {/* Tool Execution */}
        {message.toolExecution && <ToolExecution execution={message.toolExecution} />}

        {/* Content or Error Card */}
        {message.isError ? (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-xs font-medium space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 font-semibold">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Backend offline or busy (127.0.0.1:8000)</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => runOfflineSimulation(message.id)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                  title="Run autonomous offline simulation engine"
                >
                  <Play className="w-3 h-3" />
                  <span>Run Air-Gapped Engine</span>
                </button>
                <button
                  onClick={() => retryMessage(message.id)}
                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-medium transition-colors cursor-pointer"
                >
                  Retry
                </button>
              </div>
            </div>
            <p className="text-[10px] text-amber-800/80 dark:text-amber-300/80 font-mono">
              Launch backend via <code>python desktop_launcher.py</code>, or click &quot;Run Air-Gapped Engine&quot; for instant on-premise execution.
            </p>
          </div>
        ) : (
          <div className="group/msg relative px-4 py-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200">
            {message.content ? (
              <>
                {/* Quick Hover Copy Button in Top Right */}
                <div className="absolute top-3 right-3 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 border border-slate-200/80 dark:border-zinc-700 transition-all cursor-pointer shadow-xs"
                    title="Copy full response"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <MarkdownRenderer content={message.content} />
              </>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                <span>Thinking...</span>
              </div>
            )}

            {/* Direct Server-Driven Generative UI Micro-Frontends */}
            {message.generativeUI && message.generativeUI.length > 0 && (
              <div className="space-y-3 mt-3 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                {message.generativeUI.map((spec, idx) => (
                  <GenerativeUIBlock key={spec.id || `genui-${idx}`} spec={spec} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
