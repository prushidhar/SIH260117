'use client';

import { Cpu, RefreshCw, Loader2, Zap, ShieldCheck, HardDrive } from 'lucide-react';
import { useModelsQuery } from '@/lib/queries';

interface ResidentModel {
  id: string;
  name: string;
  role: string;
  sizeParams: string;
  capabilities?: string[];
  vramGb: number;
  vramUsage: number;
  status: string;
  contextWindow?: string;
}

const DEFAULT_RESIDENT_MODELS: ResidentModel[] = [
  {
    id: 'Qwen/Qwen3-8B-AWQ',
    name: 'Qwen 3 (8B) AWQ',
    role: 'Reasoning & DAG Orchestration',
    sizeParams: '8.2B',
    capabilities: ['reasoning', 'dag-orchestration', 'safety-logic'],
    vramGb: 5.5,
    vramUsage: 34,
    status: 'loaded',
    contextWindow: '32K'
  },
  {
    id: 'Qwen/Qwen2.5-Coder-7B-Instruct',
    name: 'Qwen 2.5 Coder (7B)',
    role: 'Engineering Math & Code Sandbox',
    sizeParams: '7.6B',
    capabilities: ['coding', 'asme-math', 'sandbox', 'synthesis'],
    vramGb: 4.8,
    vramUsage: 28,
    status: 'loaded',
    contextWindow: '128K'
  },
  {
    id: 'Qwen/Qwen2.5-VL-7B-Instruct',
    name: 'Qwen 2.5 VL (7B)',
    role: 'P&ID Vision & CAD Inspection',
    sizeParams: '7.6B',
    capabilities: ['vision-ocr', 'pid-diagram-parsing', 'cad-inspection'],
    vramGb: 6.0,
    vramUsage: 38,
    status: 'loaded',
    contextWindow: '32K'
  }
];

export default function ActiveModels() {
  const { data: loadedModels = [], isLoading, isRefetching, refetch } = useModelsQuery();

  const modelsToShow: ResidentModel[] = loadedModels.length > 0 
    ? (loadedModels as ResidentModel[]) 
    : DEFAULT_RESIDENT_MODELS;

  return (
    <div className="px-3 py-3 border-b border-slate-200/70 dark:border-zinc-800/70 font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-2.5">
        <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-zinc-500">
          <Cpu className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
          <span>Resident Local Models (3)</span>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-200 p-0.5 rounded transition-colors cursor-pointer disabled:opacity-50"
          title="Refresh resident models from /api/models"
        >
          <RefreshCw className={`w-3 h-3 ${isRefetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4 text-xs text-slate-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5 text-violet-500" />
          <span>Polling local weights...</span>
        </div>
      ) : (
        <div className="space-y-2">
          {modelsToShow.map((model) => (
            <div 
              key={model.id} 
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xs hover:border-violet-300 dark:hover:border-violet-700 transition-all"
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                  <span className="text-slate-800 dark:text-zinc-200 text-[11px] font-bold truncate">
                    {model.name}
                  </span>
                </div>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 font-bold flex-shrink-0 border border-violet-200 dark:border-violet-800">
                  {model.sizeParams || '7B'}
                </span>
              </div>

              <div className="text-slate-500 dark:text-zinc-400 text-[9px] mt-1 pl-3 truncate flex items-center justify-between">
                <span className="truncate">{model.role}</span>
                <span className="text-slate-400 dark:text-zinc-500 text-[8px] shrink-0 font-bold">
                  {model.contextWindow || '32K'}
                </span>
              </div>

              {/* VRAM allocation progress track */}
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-[8px] text-slate-400 dark:text-zinc-500">
                  <span>VRAM Allocation</span>
                  <span className="font-bold text-slate-600 dark:text-zinc-300">{model.vramUsage}% ({model.vramGb} GB)</span>
                </div>
                <div className="w-full h-1 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(5, model.vramUsage || 15))}%` }}
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Air-Gap Model Isolation Badge */}
          <div className="flex items-center justify-between pt-1 px-1 text-[9px] text-slate-400 dark:text-zinc-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>Zero-WAN On-Premise GPU</span>
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">AIR-GAPPED</span>
          </div>
        </div>
      )}
    </div>
  );
}
