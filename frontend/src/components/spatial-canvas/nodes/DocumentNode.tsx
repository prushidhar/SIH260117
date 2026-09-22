'use client';

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { FileText, X, ExternalLink, Hash } from 'lucide-react';
import useSpatialStore from '@/store/spatial-store';

export default function DocumentNode({ id, data }: { id: string; data: any }) {
  const { removeNode } = useSpatialStore();

  return (
    <div className="w-[380px] rounded-2xl bg-white dark:bg-zinc-900 border-2 border-amber-500/60 shadow-2xl shadow-amber-500/10 text-slate-800 dark:text-zinc-200 overflow-hidden font-sans">
      <Handle type="target" position={Position.Left} className="w-3.5 h-3.5 bg-amber-600 border-2 border-white dark:border-zinc-900 -ml-1.5" />
      <Handle type="source" position={Position.Right} className="w-3.5 h-3.5 bg-amber-600 border-2 border-white dark:border-zinc-900 -mr-1.5" />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/60 dark:to-yellow-950/60 border-b border-amber-100 dark:border-amber-900/50">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-zinc-100">
              {data?.title || 'ASME B31.3 Specification'}
            </div>
            <div className="text-[10px] text-amber-700 dark:text-amber-400 font-mono">
              {data?.subtitle || 'Process Piping Standard (2024)'}
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

      {/* Document Chunk Content Preview */}
      <div className="p-3 text-xs text-slate-600 dark:text-zinc-300 space-y-2 bg-slate-50/50 dark:bg-zinc-950/40">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span className="flex items-center gap-1">
            <Hash className="w-3 h-3" />
            <span>Section 304.1.2</span>
          </span>
          <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-bold">
            98.4% Relevance
          </span>
        </div>

        <p className="text-[11px] leading-relaxed italic bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 font-serif">
          {data?.snippet ||
            '“Formula 3a: The required thickness of straight sections of pipe under internal design pressure shall be determined by tm = (P * D) / (2 * (S * E * W + P * Y)) + c.”'}
        </p>

        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1">
          <span>In-Browser WASM Index</span>
          <span>384d Dense Vector</span>
        </div>
      </div>
    </div>
  );
}
