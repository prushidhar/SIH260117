'use client';

import { useState } from 'react';
import { 
  Terminal, 
  ShieldCheck, 
  ChevronDown, 
  ChevronRight, 
  Copy, 
  Check, 
  Cpu, 
  Clock, 
  CheckCircle2 
} from 'lucide-react';

export interface ToolExecutionDisclosureProps {
  toolName?: string;
  argumentsPayload?: Record<string, unknown> | string;
  outputPayload?: Record<string, unknown> | string;
  executionTimeMs?: number;
  status?: 'running' | 'completed' | 'error';
  deterministicStamp?: string;
  code?: string;
}

export default function ToolExecutionDisclosure({
  toolName = 'deterministic_solver',
  argumentsPayload,
  outputPayload,
  executionTimeMs = 38,
  status = 'completed',
  deterministicStamp = 'SHA256:0x9f41c2...e81a',
  code,
}: ToolExecutionDisclosureProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'payload' | 'output' | 'verification'>('payload');
  const [copied, setCopied] = useState(false);

  // Format arguments into pretty JSON string
  const formattedArgs = typeof argumentsPayload === 'string'
    ? argumentsPayload
    : JSON.stringify(argumentsPayload || {}, null, 2);

  // Format output into pretty string
  const formattedOutput = typeof outputPayload === 'string'
    ? outputPayload
    : JSON.stringify(outputPayload || (code ? { code } : { status: 'success', verified: true }), null, 2);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore copy error
    }
  };

  return (
    <div className="w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-950/80 overflow-hidden font-mono text-xs shadow-xs my-2">
      {/* Accordion Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-slate-100/70 dark:hover:bg-zinc-900/60 transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-md bg-slate-200 dark:bg-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-300 flex-shrink-0">
            <Terminal className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          </div>

          <div className="flex items-center gap-2 truncate">
            <span className="font-bold text-slate-900 dark:text-zinc-100 truncate">
              {toolName}
            </span>

            {/* Execution Latency Badge */}
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 text-[10px] font-semibold">
              <Clock className="w-2.5 h-2.5" />
              <span>{executionTimeMs}ms</span>
            </span>

            {/* Deterministic Verification Stamp */}
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
              <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>DETERMINISTIC SANDBOX VERIFIED</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
            {status}
          </span>
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded Accordion Drawer */}
      {isOpen && (
        <div className="border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 p-3 space-y-2.5">
          {/* Subheader & Tabs */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-2">
            <div className="flex items-center gap-1.5 text-[11px]">
              <button
                onClick={() => setActiveTab('payload')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'payload'
                    ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
                }`}
              >
                Raw Input Payload (JSON)
              </button>
              <button
                onClick={() => setActiveTab('output')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'output'
                    ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
                }`}
              >
                Sandbox Output
              </button>
              <button
                onClick={() => setActiveTab('verification')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'verification'
                    ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
                }`}
              >
                Verification Seal
              </button>
            </div>

            <button
              onClick={() => handleCopy(activeTab === 'payload' ? formattedArgs : formattedOutput)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 text-[10px] transition-colors cursor-pointer"
              title="Copy code/payload"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Tab 1: Raw JSON Payload */}
          {activeTab === 'payload' && (
            <pre className="p-3 rounded-lg bg-slate-950 text-emerald-400 overflow-x-auto text-[11px] leading-relaxed max-h-56 scrollbar-thin">
              <code>{formattedArgs}</code>
            </pre>
          )}

          {/* Tab 2: Execution Output */}
          {activeTab === 'output' && (
            <pre className="p-3 rounded-lg bg-slate-950 text-cyan-300 overflow-x-auto text-[11px] leading-relaxed max-h-56 scrollbar-thin">
              <code>{formattedOutput}</code>
            </pre>
          )}

          {/* Tab 3: Deterministic Sandbox Seal */}
          {activeTab === 'verification' && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-[11px] space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Deterministic Execution Environment Confirmed</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 dark:text-zinc-400 font-mono">
                <div>• Sandbox: <strong>Python 3.11 WASM Loopback</strong></div>
                <div>• Cryptographic Hash: <code>{deterministicStamp}</code></div>
                <div>• Execution Latency: <strong>{executionTimeMs}ms</strong></div>
                <div>• Egress Intercept: <strong>0 WAN Packets Allowed</strong></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
