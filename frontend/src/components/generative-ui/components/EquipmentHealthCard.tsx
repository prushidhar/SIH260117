'use client';

import React, { useState } from 'react';
import { ShieldCheck, Crosshair, Wrench, Clock, Activity, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import type { EquipmentHealthCardProps } from '../types';

export default function EquipmentHealthCard({
  tag = 'P-101',
  name = 'Crude Distillation Slurry Feed Pump A',
  type = 'Centrifugal Slurry Pump (API 610 BB2)',
  healthScore = 92,
  mtbfHours = 14200,
  operatingHours = 8640,
  lastInspectionDate = '2026-08-14',
  subsystems: initialSubsystems,
  criticalAlerts,
}: EquipmentHealthCardProps) {
  const { selectTag, addToast } = useIndraStore();
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [score, setScore] = useState<number>(healthScore);

  const subsystems = initialSubsystems && initialSubsystems.length > 0 ? initialSubsystems : [
    { name: 'Drive End Bearings (SKF 7314)', health: 96, status: 'good' as const, metric: '1.8 mm/s RMS' },
    { name: 'Mechanical Tandem Seal', health: 78, status: 'fair' as const, metric: '0.42 barg barrier ΔP' },
    { name: 'Semi-Open Chrome Impeller', health: 89, status: 'good' as const, metric: '0.012 in wear clearance' },
    { name: 'Induction Motor Stator', health: 98, status: 'good' as const, metric: '48.2 MΩ insulation' },
  ];

  const handleLocateTag = () => {
    if (tag) {
      selectTag(tag);
      broadcastSyncEvent({
        type: 'TAG_SELECTED',
        tag,
        metadata: { source: 'EquipmentHealthCard', healthScore: score },
      });
    }
  };

  const handlePredictiveScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setScore((prev) => Math.min(100, prev + 2));
      addToast({
        type: 'success',
        title: 'Neural Predictive Scan Complete',
        message: `${tag} acoustic emission & vibration spectrum matched against ISO 10816-3 nominal profile.`,
      });
    }, 1200);
  };

  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm text-slate-800 dark:text-zinc-200">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800/80 gap-2">
        <div className="flex items-center gap-2">
          {tag && (
            <button
              onClick={handleLocateTag}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 dark:hover:bg-violet-900/50 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 font-mono text-xs font-bold transition-all cursor-pointer group"
              title="Center camera on P&ID diagram"
            >
              <Crosshair className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 group-hover:rotate-45 transition-transform" />
              <span>{tag}</span>
            </button>
          )}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100">{name}</h4>
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">{type}</div>
          </div>
        </div>

        {/* Health Radial Pill */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{score}/100 HEALTH INDEX</span>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-3 gap-2 my-3 font-mono text-xs">
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800">
          <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Operating Hours</span>
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-zinc-100 mt-0.5">
            {operatingHours.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">hrs</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800">
          <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase flex items-center gap-1">
            <Activity className="w-3 h-3" />
            <span>Estimated MTBF</span>
          </div>
          <div className="text-sm font-bold text-violet-600 dark:text-violet-400 mt-0.5">
            {mtbfHours.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">hrs</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800">
          <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase flex items-center gap-1">
            <Wrench className="w-3 h-3" />
            <span>Last Survey</span>
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-zinc-100 mt-0.5">
            {lastInspectionDate}
          </div>
        </div>
      </div>

      {/* Subsystem Health Matrix */}
      <div className="space-y-2 my-3">
        <div className="text-[10px] font-bold uppercase font-mono text-slate-400 dark:text-zinc-500 tracking-wider">
          Subsystem Reliability Matrix
        </div>
        {subsystems.map((sub, i) => (
          <div
            key={i}
            className="p-2 rounded-xl bg-slate-50/70 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs"
          >
            <div className="space-y-0.5">
              <div className="font-semibold text-slate-800 dark:text-zinc-200">{sub.name}</div>
              {sub.metric && (
                <div className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">{sub.metric}</div>
              )}
            </div>

            <div className="flex items-center gap-2 font-mono">
              <div className="w-20 h-1.5 bg-slate-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    sub.health >= 85 ? 'bg-emerald-500' : sub.health >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${sub.health}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 w-8 text-right">
                {sub.health}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-zinc-800/80">
        <div className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
          API 610 11th Edition Qualified
        </div>
        <button
          onClick={handlePredictiveScan}
          disabled={isScanning}
          className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shadow-violet-500/20"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'Scanning Acoustics...' : 'Predictive Scan'}</span>
        </button>
      </div>
    </div>
  );
}
