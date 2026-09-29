'use client';

import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  Crosshair, 
  FileSpreadsheet, 
  CheckCircle2, 
  RotateCcw,
  Sliders,
  Layers,
  Activity,
  AlertOctagon
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import type { FatigueMinerCardProps } from '../types';

export default function FatigueMinerCard({
  assetTag = 'V-204',
  title = 'ASME SEC VIII DIV 2 PALMGREN-MINER FATIGUE INTEGRITY',
  standard = 'ASME BPVC VIII.2 Part 5.5 / WRC 107',
  cumulativeDamage: initialDamage = 0.0126,
  remainingMarginPercent = 98.7,
  estimatedLifeYears = 1976,
  stressBlocks: initialBlocks = [
    {
      blockId: 'Block 1',
      description: 'Startup, Shutdown & High Thermal Transients',
      stressRangeMPa: 185.0,
      meanStressMPa: 92.5,
      cyclesApplied: 120,
      cyclesAllowable: 24000,
      damageFraction: 0.0050,
    },
    {
      blockId: 'Block 2',
      description: 'Feed Flow Step Changes & Turndown Fluctuation',
      stressRangeMPa: 125.0,
      meanStressMPa: 68.0,
      cyclesApplied: 4800,
      cyclesAllowable: 680000,
      damageFraction: 0.0071,
    },
    {
      blockId: 'Block 3',
      description: 'Minor Cyclic Compressor Discharge Pulsations',
      stressRangeMPa: 65.0,
      meanStressMPa: 45.0,
      cyclesApplied: 140000,
      cyclesAllowable: 280000000,
      damageFraction: 0.0005,
    },
  ],
}: FatigueMinerCardProps) {
  const { selectTag, addDeliverable, addToast } = useIndraStore();

  const [simulatedSpike, setSimulatedSpike] = useState<boolean>(false);
  const [damageOffset, setDamageOffset] = useState<number>(0);

  // Dynamic Cumulative Damage Calculation
  const { currentDamage, consumedPercent, remainingMargin, remainingYears, isPautMandatory } = useMemo(() => {
    let d = simulatedSpike ? 0.842 : (initialDamage + damageOffset);
    d = Math.max(0.0001, Math.min(1.0, parseFloat(d.toFixed(4))));
    const consumed = parseFloat((d * 100).toFixed(1));
    const margin = parseFloat((100 - consumed).toFixed(1));
    const lifeYears = d > 0 ? Math.round((1.0 - d) / (0.0126 / 25)) : 2000;
    const pautRequired = d >= 0.80;

    return {
      currentDamage: d,
      consumedPercent: consumed,
      remainingMargin: margin,
      remainingYears: lifeYears,
      isPautMandatory: pautRequired,
    };
  }, [simulatedSpike, initialDamage, damageOffset]);

  const handleLocateTag = () => {
    if (assetTag) {
      selectTag(assetTag);
      broadcastSyncEvent({
        type: 'TAG_SELECTED',
        tag: assetTag,
        metadata: { source: 'FatigueMinerCard', currentDamage, isPautMandatory },
      });
      addToast({
        type: 'info',
        title: 'Asset Focused on P&ID',
        message: `Centered view on ${assetTag} high-pressure vessel shell and nozzles.`,
      });
    }
  };

  const handleExportReport = () => {
    const now = new Date().toLocaleTimeString();
    addDeliverable({
      id: `del-fatigue-${Date.now()}`,
      name: `ASME_Palmgren_Miner_Fatigue_${assetTag}.docx`,
      filename: `ASME_Palmgren_Miner_Fatigue_${assetTag}.docx`,
      type: 'docx',
      size: '2.1 MB',
      generatedAt: now,
      timestamp: now,
      description: `ASME Section VIII Div 2 Part 5.5 cumulative fatigue damage certificate for ${assetTag}.`,
      url: '#',
      hash: 'sha256:4c2a71d9e51b32f916e255fa38c8dfa4970e7e1742416b251ff9ea3624df511b',
    });
    addToast({
      type: 'success',
      title: 'Fatigue Report Generated',
      message: `Exported Palmgren-Miner cumulative fatigue certification for ${assetTag}.`,
    });
  };

  // Circular progress meter SVG calculations
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  // Progress fraction from 0 to 1
  const strokeDashoffset = circumference - currentDamage * circumference;

  return (
    <div className="w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 text-slate-800 dark:text-zinc-100 overflow-hidden shadow-xs font-sans text-xs">
      {/* 1. Header with Badge & Tag */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/70 dark:bg-zinc-950/60 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-slate-900 dark:text-zinc-100 tracking-tight text-xs sm:text-sm">
                {title}
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                {standard}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              Goodman-Corrected S-N Curve &bull; Cyclic Damage Summation &Sigma;(n_i / N_i) &bull; Target: <strong className="font-mono text-slate-700 dark:text-zinc-300">{assetTag}</strong>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[11px] font-mono font-bold">
            <Layers className="w-3.5 h-3.5 text-emerald-500" />
            <span>VESSEL:</span>
            <span className="text-emerald-600 dark:text-emerald-400">{assetTag}</span>
          </div>

          <button
            onClick={handleLocateTag}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 text-[11px] font-mono transition-colors cursor-pointer"
            title={`Focus ${assetTag} on P&ID`}
          >
            <Crosshair className="w-3 h-3 text-emerald-500" />
            <span className="hidden sm:inline">Locate P&amp;ID</span>
          </button>

          <button
            onClick={handleExportReport}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-mono font-bold transition-colors cursor-pointer shadow-xs"
            title="Export ASME Sec VIII Div 2 Deliverable"
          >
            <FileSpreadsheet className="w-3 h-3" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid: Cumulative Damage Meter + Summary (4 cols) and Multi-Block Table (8 cols) */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* 2. Cumulative Damage Meter (5 cols) */}
        <div className="md:col-span-5 flex flex-col justify-between p-4 rounded-xl bg-slate-50 dark:bg-zinc-950/70 border border-slate-200/80 dark:border-zinc-800/80">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500 dark:text-zinc-400">
                Cumulative Damage (D)
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                isPautMandatory
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
              }`}>
                {isPautMandatory ? 'HIGH CYCLE EXHAUSTION' : 'NOMINAL FATIGUE REGIME'}
              </span>
            </div>

            {/* Circular Progress Meter */}
            <div className="relative flex items-center justify-center my-3">
              <svg width="150" height="150" viewBox="0 0 150 150" className="rotate-[-90deg]">
                {/* Background Ring Track */}
                <circle
                  cx="75"
                  cy="75"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  className="text-slate-200 dark:text-zinc-800"
                  strokeWidth="11"
                />

                {/* PAUT 0.80 Warning Tick Arc */}
                <circle
                  cx="75"
                  cy="75"
                  r={radius}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="11"
                  strokeDasharray={`${0.20 * circumference} ${0.80 * circumference}`}
                  strokeDashoffset={-0.80 * circumference}
                  strokeOpacity="0.4"
                />

                {/* Active Damage Progress Ring */}
                <circle
                  cx="75"
                  cy="75"
                  r={radius}
                  fill="none"
                  stroke={isPautMandatory ? '#ef4444' : currentDamage > 0.40 ? '#f59e0b' : '#10b981'}
                  strokeWidth="11"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-500 ease-out"
                />
              </svg>

              {/* Center Text Readout */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-mono text-slate-400">Palmgren-Miner D</span>
                <span className="text-2xl font-mono font-extrabold tracking-tight text-slate-900 dark:text-zinc-100">
                  {currentDamage.toFixed(4)}
                </span>
                <span className={`text-[10px] font-mono font-bold ${
                  isPautMandatory ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {consumedPercent}% Consumed
                </span>
              </div>
            </div>

            {/* Fatigue Margin & Life Metrics */}
            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200/60 dark:border-zinc-800/80 font-mono text-[11px]">
              <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                <span className="text-slate-500 dark:text-zinc-400 block text-[9px] uppercase font-semibold">Remaining Margin</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{remainingMargin}%</span>
              </div>
              <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                <span className="text-slate-500 dark:text-zinc-400 block text-[9px] uppercase font-semibold">Estimated Life</span>
                <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">{remainingYears.toLocaleString()} yrs</span>
              </div>
            </div>
          </div>

          {/* Simulation Toggle: Transient Spike Simulation */}
          <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-zinc-800/80">
            <button
              onClick={() => setSimulatedSpike(!simulatedSpike)}
              className={`w-full py-1.5 px-3 rounded-lg text-[10px] font-mono font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border ${
                simulatedSpike
                  ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-700 shadow-xs'
                  : 'bg-white hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-zinc-700'
              }`}
            >
              <Sliders className="w-3 h-3" />
              <span>{simulatedSpike ? 'Reset to Nominal Cyclic Baseline (D = 0.0126)' : 'Simulate Abnormal Overpressure Spike (D = 0.842)'}</span>
            </button>
          </div>
        </div>

        {/* 3. Multi-Block Operating Stress Spectrum Table (7 cols) */}
        <div className="md:col-span-7 flex flex-col justify-between space-y-3 p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950/70 border border-slate-200/80 dark:border-zinc-800/80">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500 dark:text-zinc-400">
                Multi-Block Operating Stress Spectrum
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Goodman Correction: &Delta;&sigma;eq = &Delta;&sigma; / (1 - &sigma;m / &sigma;u)
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <table className="w-full text-left font-mono text-[10px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-950/60 text-slate-600 dark:text-zinc-400">
                    <th className="py-2 px-2.5 font-bold">Stress Block</th>
                    <th className="py-2 px-2 font-bold text-right">&Delta;&sigma; (MPa)</th>
                    <th className="py-2 px-2 font-bold text-right">&sigma;m (MPa)</th>
                    <th className="py-2 px-2 font-bold text-right">Applied (ni)</th>
                    <th className="py-2 px-2 font-bold text-right">Allowable (Ni)</th>
                    <th className="py-2 px-2.5 font-bold text-right">Damage (di)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                  {initialBlocks.map((block) => (
                    <tr key={block.blockId} className="hover:bg-slate-50/50 dark:hover:bg-zinc-850/40 transition-colors">
                      <td className="py-2 px-2.5">
                        <div className="font-bold text-slate-800 dark:text-zinc-200">{block.blockId}</div>
                        <div className="text-[9px] text-slate-400 truncate max-w-[140px] font-sans">{block.description}</div>
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-slate-900 dark:text-zinc-100">{block.stressRangeMPa}</td>
                      <td className="py-2 px-2 text-right text-slate-600 dark:text-zinc-400">{block.meanStressMPa}</td>
                      <td className="py-2 px-2 text-right text-slate-700 dark:text-zinc-300">{block.cyclesApplied.toLocaleString()}</td>
                      <td className="py-2 px-2 text-right text-slate-700 dark:text-zinc-300">{block.cyclesAllowable.toLocaleString()}</td>
                      <td className="py-2 px-2.5 text-right font-bold text-indigo-600 dark:text-indigo-400">{block.damageFraction.toFixed(4)}</td>
                    </tr>
                  ))}
                  {/* Total Row */}
                  <tr className="bg-slate-100/70 dark:bg-zinc-900/90 font-bold border-t-2 border-slate-200 dark:border-zinc-800">
                    <td colSpan={5} className="py-2 px-2.5 text-slate-800 dark:text-zinc-200">
                      Total Cumulative Fatigue Damage &Sigma;(ni / Ni)
                    </td>
                    <td className="py-2 px-2.5 text-right font-extrabold text-indigo-700 dark:text-indigo-300">
                      {initialDamage.toFixed(4)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. PAUT Threshold Indicator */}
          <div className={`p-3 rounded-lg border flex items-start gap-3 transition-colors ${
            isPautMandatory
              ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
          }`}>
            {isPautMandatory ? (
              <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5 animate-pulse" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            )}

            <div className="space-y-1 text-[11px] font-mono">
              <div className="font-bold flex items-center gap-2">
                <span>{isPautMandatory ? 'MANDATORY PAUT REQUIRED PRIOR TO NEXT STARTUP' : 'PAUT INSPECTION DEFERRED - ASSET WITHIN SAFE FATIGUE REGIME'}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-black/10 dark:bg-white/10 font-bold">
                  THRESHOLD: D = 0.80
                </span>
              </div>
              <p className="text-[10px] leading-relaxed opacity-90 font-sans">
                {isPautMandatory
                  ? 'CRITICAL ALERT: Cumulative fatigue damage has breached the statutory threshold (D = 0.842 ≥ 0.80). Mandatory Phased Array Ultrasonic Testing (PAUT) of circumferential weld seams and nozzle-to-shell intersections is required prior to repressurization.'
                  : 'Current cumulative damage (D = 0.0126) is well below the mandatory volumetric NDE threshold of D = 0.80. Voluntary PAUT inspection is safely deferred; vessel integrity remains verified under normal 5-year turnaround schedules.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
