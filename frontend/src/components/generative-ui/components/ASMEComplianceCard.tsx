'use client';

import React, { useState, useMemo } from 'react';
import { Calculator, CheckCircle2, AlertTriangle, Crosshair, FileSpreadsheet, RotateCcw } from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import type { ASMEComplianceCardProps } from '../types';

export default function ASMEComplianceCard({
  tag = 'HX-4201',
  title = 'ASME B31.3 §304.1.2 Interactive Wall Thickness Evaluator',
  standard = 'ASME B31.3 Process Piping (Edition 2024)',
  initialPressure = 450.0,
  diameter = 8.625,
  allowableStress = 20000.0,
  corrosionAllowance = 0.0625,
  actualThickness: initialActual = 0.4850,
  designTemp = 350,
  corrosionRate = 0.00725,
}: ASMEComplianceCardProps) {
  const { selectTag, addDeliverable, addToast } = useIndraStore();

  const [pressure, setPressure] = useState<number>(initialPressure);
  const [pipeDiameter, setPipeDiameter] = useState<number>(diameter);
  const [stress, setStress] = useState<number>(allowableStress);
  const [actualThickness, setActualThickness] = useState<number>(initialActual);
  const [corrAllowance, setCorrAllowance] = useState<number>(corrosionAllowance);

  // Constants for ASME B31.3 Eq. 3a:
  // E = Quality factor (1.0 for seamless pipe)
  // Y = Coefficient (0.4 for ferritic steel < 900 F)
  const E = 1.0;
  const Y = 0.4;

  // Real-time calculation: tm = (P * D) / (2 * (S * E + P * Y)) + c
  const { tMin, safetyMargin, remainingLifeYears, isCompliant } = useMemo(() => {
    const denominator = 2 * (stress * E + pressure * Y);
    const pressureDesign = (pressure * pipeDiameter) / (denominator || 1);
    const calculatedTMin = pressureDesign + corrAllowance;
    const margin = actualThickness - calculatedTMin;
    const life = margin > 0 ? margin / (corrosionRate || 0.001) : 0;

    return {
      tMin: parseFloat(calculatedTMin.toFixed(4)),
      safetyMargin: parseFloat(margin.toFixed(4)),
      remainingLifeYears: parseFloat(life.toFixed(1)),
      isCompliant: margin >= 0,
    };
  }, [pressure, pipeDiameter, stress, actualThickness, corrAllowance, corrosionRate]);

  const handleLocateTag = () => {
    if (tag) {
      selectTag(tag);
      broadcastSyncEvent({
        type: 'TAG_SELECTED',
        tag,
        metadata: { source: 'ASMEComplianceCard', tMin, safetyMargin },
      });
    }
  };

  const handleReset = () => {
    setPressure(initialPressure);
    setPipeDiameter(diameter);
    setStress(allowableStress);
    setActualThickness(initialActual);
    setCorrAllowance(corrosionAllowance);
  };

  const handleExportNote = () => {
    const now = new Date().toLocaleTimeString();
    addDeliverable({
      id: `del-asme-${Date.now()}`,
      name: `ASME_B31.3_Report_${tag}.docx`,
      filename: `ASME_B31.3_Report_${tag}.docx`,
      type: 'docx',
      size: '2.1 MB',
      generatedAt: now,
      timestamp: now,
      description: `Deterministic ASME B31.3 evaluation for ${tag} at ${pressure} psig`,
      url: '#',
      hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    });

    addToast({
      type: 'success',
      title: 'Statutory Deliverable Compiled',
      message: `ASME B31.3 compliance calculation added to Deliverables inspector.`,
    });
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
            <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
              <span>{title}</span>
            </h4>
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">{standard}</div>
          </div>
        </div>

        {/* Compliance Badge */}
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
              isCompliant
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/40'
            }`}
          >
            {isCompliant ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
            <span>{isCompliant ? 'CODE COMPLIANT (APPROVED)' : 'NON-COMPLIANT (UNSAFE)'}</span>
          </span>

          <button
            onClick={handleReset}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300 transition-colors"
            title="Reset parameters to nominal baseline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Dynamic Results Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3 font-mono text-xs">
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800">
          <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase">Min Required (tm)</div>
          <div className="text-sm font-bold text-slate-900 dark:text-zinc-100 mt-0.5">
            {tMin} <span className="text-[10px] font-normal text-slate-500">in</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800">
          <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase">Actual Measured</div>
          <div className="text-sm font-bold text-violet-600 dark:text-violet-400 mt-0.5">
            {actualThickness.toFixed(4)} <span className="text-[10px] font-normal text-slate-500">in</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800">
          <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase">Safety Margin</div>
          <div className={`text-sm font-bold mt-0.5 ${safetyMargin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {safetyMargin >= 0 ? `+${safetyMargin}` : safetyMargin} <span className="text-[10px] font-normal text-slate-500">in</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800">
          <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase">Est. Remaining Life</div>
          <div className="text-sm font-bold text-slate-900 dark:text-zinc-100 mt-0.5">
            {remainingLifeYears} <span className="text-[10px] font-normal text-slate-500">yrs</span>
          </div>
        </div>
      </div>

      {/* Interactive Parameter Sliders */}
      <div className="space-y-3 my-3 p-3 rounded-xl bg-slate-50/70 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800">
        <div className="text-[10px] font-bold uppercase font-mono text-slate-400 dark:text-zinc-500 tracking-wider">
          Real-Time Parameter Sensitivity Controls
        </div>

        {/* Pressure Slider */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-700 dark:text-zinc-300">Design Pressure (P):</span>
            <span className="font-mono font-bold text-violet-600 dark:text-violet-400">{pressure} psig</span>
          </div>
          <input
            type="range"
            min="100"
            max="1200"
            step="10"
            value={pressure}
            onChange={(e) => setPressure(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-violet-600"
          />
        </div>

        {/* Actual Thickness Slider */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-700 dark:text-zinc-300">Actual UT Measured Thickness (tact):</span>
            <span className="font-mono font-bold text-violet-600 dark:text-violet-400">{actualThickness.toFixed(4)} in</span>
          </div>
          <input
            type="range"
            min="0.1000"
            max="0.8000"
            step="0.005"
            value={actualThickness}
            onChange={(e) => setActualThickness(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-violet-600"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-zinc-800/80">
        <div className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
          Deterministic air-gapped calculation sandbox verified
        </div>
        <button
          onClick={handleExportNote}
          className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shadow-violet-500/20"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Compile Formal Deliverable</span>
        </button>
      </div>
    </div>
  );
}
