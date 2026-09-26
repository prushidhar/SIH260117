'use client';

import React, { useState } from 'react';
import { 
  Brain, 
  CheckCircle2, 
  Loader2, 
  Circle, 
  XCircle, 
  ChevronDown, 
  ChevronUp, 
  Terminal, 
  ShieldCheck, 
  Clock, 
  Cpu, 
  Layers,
  Sparkles
} from 'lucide-react';
import type { AgentStep } from '@/store/indra-store';

export default function AgentTrace({ steps }: { steps: AgentStep[] }) {
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);

  const hasInProgress = steps.some((s) => s.status === 'in-progress');
  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const totalCount = steps.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const toggleExpand = (stepId: string) => {
    setExpandedStepId(expandedStepId === stepId ? null : stepId);
  };

  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800 shadow-xs space-y-3 font-mono text-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center text-violet-600 dark:text-violet-400">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-bold tracking-wider text-slate-800 dark:text-zinc-200 uppercase">
              Deterministic DAG Execution Pipeline
            </span>
            <div className="text-[9px] text-slate-400 dark:text-zinc-500 font-sans">
              100% Air-Gapped Reasoning & Verification Flow
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[10px]">
            <span className="text-slate-500">Pipeline:</span>
            <span className="font-bold text-violet-600 dark:text-violet-400">{completedCount}/{totalCount} Completed</span>
          </div>

          {hasInProgress && (
            <div className="flex items-center gap-1 text-[10px] text-violet-600 dark:text-violet-400 font-bold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Executing...</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Interactive Connected Pipeline Nodes */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {steps.map((step, idx) => {
          const isExpanded = expandedStepId === step.id;
          const isCompleted = step.status === 'completed';
          const isInProgress = step.status === 'in-progress';
          const isFailed = step.status === 'failed';

          return (
            <div key={step.id} className="flex items-center gap-1.5">
              <button
                onClick={() => toggleExpand(step.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-medium transition-all shadow-2xs cursor-pointer ${
                  isCompleted
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold'
                    : isInProgress
                    ? 'bg-violet-50 dark:bg-violet-950/40 border-violet-300 dark:border-violet-700 text-violet-900 dark:text-violet-200 ring-2 ring-violet-500/20 font-bold'
                    : isFailed
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 font-semibold'
                    : 'bg-slate-50 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400'
                }`}
              >
                {isCompleted && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                )}
                {isInProgress && (
                  <Loader2 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 animate-spin flex-shrink-0" />
                )}
                {isFailed && (
                  <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                )}
                {!isCompleted && !isInProgress && !isFailed && (
                  <Circle className="w-3.5 h-3.5 text-slate-300 dark:text-zinc-600 flex-shrink-0" />
                )}
                <span>{step.label}</span>
                {isExpanded ? (
                  <ChevronUp className="w-3 h-3 text-slate-400" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                )}
              </button>

              {idx < steps.length - 1 && (
                <span className="text-slate-300 dark:text-zinc-600 font-bold text-xs hidden sm:inline">→</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Expanded Step Details Drawer */}
      {expandedStepId && (() => {
        const activeStep = steps.find((s) => s.id === expandedStepId);
        if (!activeStep) return null;

        return (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs space-y-2 animate-in fade-in duration-150 font-mono">
            <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-zinc-800/70 pb-1.5 text-[10px]">
              <span className="font-bold text-violet-700 dark:text-violet-400 uppercase">
                Step Inspector: {activeStep.label}
              </span>
              <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                activeStep.status === 'completed'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                  : activeStep.status === 'in-progress'
                  ? 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400'
                  : 'bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300'
              }`}>
                {activeStep.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 dark:text-zinc-400">
              <div>• Execution Engine: Local AST Sandbox</div>
              <div>• Data Residency: 100% On-Premise</div>
              <div>• Security Scope: Loopback 127.0.0.1</div>
              <div>• Verification: Evidence Lock™ Active</div>
            </div>

            {activeStep.detail && (
              <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 text-[10px] text-slate-700 dark:text-zinc-300">
                {activeStep.detail}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
