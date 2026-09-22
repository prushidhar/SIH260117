'use client';

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { ShieldCheck, X, Link, Lock, CheckCircle2 } from 'lucide-react';
import useSpatialStore from '@/store/spatial-store';

export default function AuditBlockNode({ id, data }: { id: string; data: any }) {
  const { removeNode } = useSpatialStore();

  return (
    <div className="w-[360px] rounded-2xl bg-white dark:bg-zinc-900 border-2 border-emerald-500/60 shadow-2xl shadow-emerald-500/10 text-slate-800 dark:text-zinc-200 overflow-hidden font-sans">
      <Handle type="target" position={Position.Left} className="w-3.5 h-3.5 bg-emerald-600 border-2 border-white dark:border-zinc-900 -ml-1.5" />
      <Handle type="target" position={Position.Top} className="w-3.5 h-3.5 bg-emerald-600 border-2 border-white dark:border-zinc-900 -mt-1.5" />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/60 dark:to-teal-950/60 border-b border-emerald-100 dark:border-emerald-900/50">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span>{data?.title || 'Merkle Proof Block #4'}</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-mono font-bold">
                VERIFIED
              </span>
            </div>
            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
              Immutable SHA-256 Ledger Node
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

      {/* Merkle Cryptographic Proof Body */}
      <div className="p-3 space-y-2.5 text-xs font-mono bg-slate-50/50 dark:bg-zinc-950/40">
        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase flex items-center gap-1">
            <Lock className="w-3 h-3 text-amber-500" />
            <span>Active Merkle Root</span>
          </span>
          <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-[10px] text-emerald-600 dark:text-emerald-400 break-all font-bold">
            {data?.merkleRoot || 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069'}
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] pt-1 text-slate-500 dark:text-zinc-400 border-t border-slate-200 dark:border-zinc-800">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>0 Tampering Detected</span>
          </span>
          <span>Air-Gapped Node</span>
        </div>
      </div>
    </div>
  );
}
