'use client';

import { useState, useMemo } from 'react';
import useIndraStore from '@/store/indra-store';
import type { Message } from '@/store/indra-store';
import { useWebSocket } from '@/providers/WebSocketProvider';
import ToolExecution from './ToolExecution';
import MarkdownRenderer from '@/components/common/MarkdownRenderer';
import GenerativeUIBlock from '@/components/generative-ui/GenerativeUIBlock';
import { 
  Cpu, 
  AlertCircle, 
  Play, 
  Copy, 
  Check, 
  Loader2,
  FileText,
  FileSpreadsheet,
  Presentation,
  Crosshair,
  ShieldCheck,
  Lock,
  Stamp,
  Download,
  Sparkles
} from 'lucide-react';

export default function AgentMessage({ message }: { message: Message }) {
  const { 
    runOfflineSimulation, 
    selectTag, 
    setRightPaneOpen, 
    setActiveNav, 
    setApprovalsModalOpen 
  } = useIndraStore();
  const { isAgentWorking, retryMessage } = useWebSocket();
  const [copied, setCopied] = useState(false);

  // Extract industrial equipment tags referenced in the response
  const detectedTagsInMsg = useMemo(() => {
    const textToSearch = `${message.content || ''} ${message.toolExecution?.code || ''} ${message.toolExecution?.output || ''}`;
    const tagMatches = textToSearch.match(/\b([A-Z]{1,4}-\d{2,4}[A-Z]?|CDU-[A-Za-z0-9\-]+|P-\d{3}[A-Z]?|E-\d{3}|V-\d{3}|K-\d{3}|T-\d{3}|FIC-\d{3}|TIC-\d{3}|LIC-\d{3}|PIC-\d{3}|PSV-\d{3})\b/g);
    if (!tagMatches) return [];
    const blacklist = new Set(['ASME', 'ANSI', 'NEMA', 'ASTM', 'IEEE', 'API', 'TEMA', 'IEC', 'JSON', 'HTML', 'REST', 'HTTP', 'CMMC', 'RMS', 'NPSH', 'LMTD']);
    const unique = Array.from(new Set(tagMatches)).filter(t => !blacklist.has(t) && t.length >= 3);
    return unique.slice(0, 3);
  }, [message.content, message.toolExecution]);

  const primaryTag = detectedTagsInMsg[0] || 'P-101';

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

  const handleInspectTag = (tag: string) => {
    selectTag(tag);
    setRightPaneOpen(true);
  };

  return (
    <div className="flex justify-start">
      <div className="max-w-[88%] space-y-3">
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

          <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
            <Lock className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
            <span>0-WAN AIR-GAP</span>
          </span>

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
          <div className="group/msg relative px-4 py-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 shadow-xs">
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

            {/* Quick Sovereign Action Bar (Post-Synthesis Deliverables & Telemetry Shortcuts) */}
            {message.content && !isAgentWorking && (
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-violet-600 dark:text-violet-400" />
                    <span>Statutory Deliverables & Inspection Shortcuts</span>
                  </span>
                  <span className="text-[9px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200/80 dark:border-emerald-800/40 font-semibold">
                    100% Deterministic AST
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {/* Word Deliverable */}
                  <a
                    href={`http://localhost:8000/api/deliverables/sample/docx?equipment_tag=${encodeURIComponent(primaryTag)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all cursor-pointer shadow-2xs"
                    title={`Download Statutory Plant Maintenance Approval Note (.docx) for ${primaryTag}`}
                  >
                    <FileText className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    <span>Statutory Note (.docx)</span>
                    <Download className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                  </a>

                  {/* Excel Deliverable */}
                  <a
                    href={`http://localhost:8000/api/deliverables/sample/xlsx?equipment_tag=${encodeURIComponent(primaryTag)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all cursor-pointer shadow-2xs"
                    title={`Download Executive 4-Tab Calculation Spreadsheet (.xlsx) for ${primaryTag}`}
                  >
                    <FileSpreadsheet className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>Calculations (.xlsx)</span>
                    <Download className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                  </a>

                  {/* Pitch Deck Deliverable */}
                  <a
                    href="http://localhost:8000/api/sih/pitch-deck"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium font-mono text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-all cursor-pointer shadow-2xs"
                    title="Download Official 6-Slide Smart India Hackathon Pitch Deck (.pptx)"
                  >
                    <Presentation className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    <span>SIH Pitch Deck (.pptx)</span>
                    <Download className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                  </a>

                  {/* P&ID Tag Locator Buttons */}
                  {detectedTagsInMsg.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleInspectTag(tag)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium font-mono text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/60 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 transition-all cursor-pointer shadow-2xs"
                      title={`Inspect ${tag} on interactive P&ID CAD canvas`}
                    >
                      <Crosshair className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                      <span>Inspect {tag}</span>
                    </button>
                  ))}

                  {/* Merkle Ledger Jump */}
                  <button
                    onClick={() => setActiveNav('audit')}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium font-mono text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all cursor-pointer shadow-2xs"
                    title="View tamper-evident Merkle hash audit ledger"
                  >
                    <ShieldCheck className="w-3 h-3 text-slate-600 dark:text-zinc-400" />
                    <span>Merkle Ledger</span>
                  </button>

                  {/* HITL Sign-off Jump */}
                  <button
                    onClick={() => setApprovalsModalOpen(true)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium font-mono text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-all cursor-pointer shadow-2xs"
                    title="Open Human-in-the-Loop 3-Tier Authority Sign-Off console"
                  >
                    <Stamp className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                    <span>HITL Sign-Off</span>
                  </button>
                </div>

                {/* Sub-bar with Air-gap certificate & timestamp */}
                <div className="flex items-center justify-between text-[9.5px] font-mono text-slate-400 dark:text-zinc-500 pt-1">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                    <span>Air-Gap Sealed: IEC 62443 / CMMC OT</span>
                  </span>
                  <span>{message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : 'Verified on-premise'}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
