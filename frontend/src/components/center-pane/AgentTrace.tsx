'use client';

import { Brain, CheckCircle2, Loader2, Circle, XCircle } from 'lucide-react';
import type { AgentStep } from '@/store/indra-store';

export default function AgentTrace({ steps }: { steps: AgentStep[] }) {
  const hasInProgress = steps.some((s) => s.status === 'in-progress');

  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800 shadow-xs space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center">
          <Brain className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
        </div>
        <span className="text-[11px] font-bold tracking-wider text-slate-800 dark:text-zinc-200 uppercase font-mono">
          Agent Execution Pipeline
        </span>
        {hasInProgress && (
          <Loader2 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 animate-spin ml-auto" />
        )}
      </div>

      {/* Connected Pipeline Steps (AI Doodle Style) */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all shadow-xs ${
                step.status === 'completed'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold'
                  : step.status === 'in-progress'
                  ? 'bg-violet-50 dark:bg-violet-950/40 border-violet-300 dark:border-violet-700 text-violet-900 dark:text-violet-200 ring-2 ring-violet-500/20 font-bold'
                  : step.status === 'failed'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 font-semibold'
                  : 'bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400'
              }`}
            >
              {step.status === 'completed' && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              )}
              {step.status === 'in-progress' && (
                <Loader2 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 animate-spin flex-shrink-0" />
              )}
              {step.status === 'failed' && (
                <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
              )}
              {step.status === 'pending' && (
                <Circle className="w-3.5 h-3.5 text-slate-300 dark:text-zinc-600 flex-shrink-0" />
              )}
              <span>{step.label}</span>
            </div>
            {idx < steps.length - 1 && (
              <span className="text-slate-300 dark:text-zinc-600 font-bold text-xs hidden sm:inline">→</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
