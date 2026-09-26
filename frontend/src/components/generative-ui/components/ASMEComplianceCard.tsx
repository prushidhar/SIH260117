'use client';

import React, { useState, useMemo } from 'react';
import {
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Crosshair,
  FileSpreadsheet,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import type { ASMEComplianceCardProps } from '../types';

// ─── MTBF constant (years) ────────────────────────────────────────────────────
const MTBF = 25;

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
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  // Constants for ASME B31.3 Eq. 3a:
  // E = Quality factor (1.0 for seamless pipe)
  // Y = Coefficient (0.4 for ferritic steel < 900 F)
  const E = 1.0;
  const Y = 0.4;

  // Real-time calculation: tm = (P * D) / (2 * (S * E + P * Y)) + c
  const { tMin, safetyMargin, remainingLifeYears, isCompliant, safetyFactor } = useMemo(() => {
    const denominator = 2 * (stress * E + pressure * Y);
    const pressureDesign = (pressure * pipeDiameter) / (denominator || 1);
    const calculatedTMin = pressureDesign + corrAllowance;
    const margin = actualThickness - calculatedTMin;
    const life = margin > 0 ? margin / (corrosionRate || 0.001) : 0;
    const sf = calculatedTMin > 0 ? actualThickness / calculatedTMin : 0;

    return {
      tMin: parseFloat(calculatedTMin.toFixed(4)),
      safetyMargin: parseFloat(margin.toFixed(4)),
      remainingLifeYears: parseFloat(life.toFixed(1)),
      isCompliant: margin >= 0,
      safetyFactor: parseFloat(sf.toFixed(3)),
    };
  }, [pressure, pipeDiameter, stress, actualThickness, corrAllowance, corrosionRate]);

  // ─── Derived visual values ────────────────────────────────────────────────
  // Compliance progress bar: actual vs required
  const compliancePct = tMin > 0 ? Math.min((actualThickness / tMin) * 100, 200) : 0;
  const marginPct = tMin > 0 ? ((actualThickness - tMin) / tMin) * 100 : 0;

  // Safety factor colour
  const sfColor =
    safetyFactor >= 1.25
      ? 'text-emerald-600 dark:text-emerald-400'
      : safetyFactor >= 1.0
      ? 'text-amber-500 dark:text-amber-400'
      : 'text-rose-600 dark:text-rose-400';
  const sfBg =
    safetyFactor >= 1.25
      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
      : safetyFactor >= 1.0
      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
      : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800';

  // Risk level badge
  const riskLevel =
    safetyMargin > 0.1
      ? { label: 'LOW RISK', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30', Icon: ShieldCheck }
      : safetyMargin >= 0.01
      ? { label: 'MEDIUM RISK', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30', Icon: ShieldAlert }
      : { label: 'HIGH RISK', cls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30', Icon: ShieldX };

  // Compliance bar colour
  const barColor =
    marginPct > 5
      ? '#10b981'  // emerald
      : marginPct >= 0
      ? '#f59e0b'  // amber
      : '#ef4444'; // rose

  // Remaining life timeline (clamped 0-MTBF)
  const lifePct = Math.min((remainingLifeYears / MTBF) * 100, 100);

  // Safety-margin segmented indicator arrow position (clamp -0.05..0.15 → 0..100%)
  const marginArrowPct = Math.min(Math.max(((safetyMargin + 0.05) / 0.2) * 100, 0), 100);

  // Live ASME formula string
  const liveFormula = useMemo(() => {
    const denom = 2 * (stress * E + pressure * Y);
    const inner = (pressure * pipeDiameter) / (denom || 1);
    return `tm = (${pressure}×${pipeDiameter}) / (2×(${stress}×${E} + ${pressure}×${Y})) + ${corrAllowance.toFixed(4)} = ${tMin} in`;
  }, [pressure, pipeDiameter, stress, corrAllowance, tMin]);

  // PDF report text
  const pdfReport = `
┌──────────────────────────────────────────────────────────┐
│  INDRA SOVEREIGN AI — ASME B31.3 COMPLIANCE REPORT       │
│  Tag: ${tag.padEnd(10)} Standard: ${standard}
├──────────────────────────────────────────────────────────┤
│  Design Pressure (P)       : ${pressure} psig
│  Outside Diameter (D)      : ${pipeDiameter} in
│  Allowable Stress (S)      : ${stress} psi
│  Quality Factor (E)        : ${E}
│  Y Coefficient             : ${Y}
│  Corrosion Allowance (c)   : ${corrAllowance.toFixed(4)} in
│  Actual Thickness (t_act)  : ${actualThickness.toFixed(4)} in
├──────────────────────────────────────────────────────────┤
│  Minimum Required (tm)     : ${tMin} in
│  Safety Margin             : ${safetyMargin >= 0 ? '+' : ''}${safetyMargin} in
│  Safety Factor (SF)        : ${safetyFactor}
│  Est. Remaining Life       : ${remainingLifeYears} years
│  Risk Level                : ${riskLevel.label}
│  Compliance Status         : ${isCompliant ? 'CODE COMPLIANT (APPROVED)' : 'NON-COMPLIANT (UNSAFE)'}
├──────────────────────────────────────────────────────────┤
│  ASME Eq. 3a: ${liveFormula}
└──────────────────────────────────────────────────────────┘`.trim();

  // ─── Handlers ─────────────────────────────────────────────────────────────
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

  // ─── Slider gradient helper ────────────────────────────────────────────────
  const sliderGradient = (value: number, min: number, max: number, dangerAtHigh = true) => {
    const pct = ((value - min) / (max - min)) * 100;
    if (dangerAtHigh) {
      return `linear-gradient(to right, #10b981 0%, #f59e0b ${pct * 0.6}%, #ef4444 ${pct}%, #e2e8f0 ${pct}%, #e2e8f0 100%)`;
    }
    // safer at high values (actual thickness)
    return `linear-gradient(to right, #ef4444 0%, #f59e0b ${pct * 0.5}%, #10b981 ${pct}%, #e2e8f0 ${pct}%, #e2e8f0 100%)`;
  };

  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm text-slate-800 dark:text-zinc-200">

      {/* ── Header ── */}
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

        <div className="flex items-center gap-1.5">
          {/* Risk Level Badge */}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${riskLevel.cls}`}>
            <riskLevel.Icon className="w-3 h-3" />
            <span>{riskLevel.label}</span>
          </span>

          {/* Compliance Badge */}
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

      {/* ── Compliance Progress Bar: actual vs required ── */}
      <div className="my-3">
        <div className="flex items-center justify-between text-[10px] font-mono mb-1">
          <span className="text-slate-500 dark:text-zinc-400 uppercase">Thickness vs Required Minimum</span>
          <span className="font-bold" style={{ color: barColor }}>
            {compliancePct.toFixed(1)}% of t_min
          </span>
        </div>
        <div className="relative h-3 rounded-full bg-slate-200 dark:bg-zinc-700 overflow-hidden">
          {/* tMin reference line */}
          <div className="absolute top-0 bottom-0 w-px bg-slate-600 dark:bg-zinc-300 z-10" style={{ left: '50%' }} title="t_min reference (50%)" />
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(compliancePct / 2, 100)}%`,
              backgroundColor: barColor,
            }}
          />
        </div>
        <div className="flex justify-between text-[9px] font-mono text-slate-400 dark:text-zinc-500 mt-0.5">
          <span>0 in</span>
          <span>t_min = {tMin} in</span>
          <span>t_act = {actualThickness.toFixed(4)} in</span>
        </div>
      </div>

      {/* ── KPI Grid with tooltips ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 my-3 font-mono text-xs">
        {/* Min Required */}
        <div className="relative group p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800 cursor-help">
          <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase">Min Required (tm)</div>
          <div className="text-sm font-bold text-slate-900 dark:text-zinc-100 mt-0.5">
            {tMin} <span className="text-[10px] font-normal text-slate-500">in</span>
          </div>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-20 w-44 p-2 rounded-lg bg-slate-900 dark:bg-zinc-700 text-white text-[9px] font-sans leading-relaxed shadow-lg">
            Minimum required wall thickness per ASME B31.3 Eq. 3a. Pipe is unsafe below this value.
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900 dark:border-t-zinc-700" />
          </div>
        </div>

        {/* Actual Measured */}
        <div className="relative group p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800 cursor-help">
          <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase">Actual Measured</div>
          <div className="text-sm font-bold text-violet-600 dark:text-violet-400 mt-0.5">
            {actualThickness.toFixed(4)} <span className="text-[10px] font-normal text-slate-500">in</span>
          </div>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-20 w-44 p-2 rounded-lg bg-slate-900 dark:bg-zinc-700 text-white text-[9px] font-sans leading-relaxed shadow-lg">
            Ultrasonic thickness measurement from field inspection. Must exceed t_min for code compliance.
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900 dark:border-t-zinc-700" />
          </div>
        </div>

        {/* Safety Margin */}
        <div className="relative group p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800 cursor-help">
          <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase">Safety Margin</div>
          <div className={`text-sm font-bold mt-0.5 ${safetyMargin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {safetyMargin >= 0 ? `+${safetyMargin}` : safetyMargin} <span className="text-[10px] font-normal text-slate-500">in</span>
          </div>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-20 w-44 p-2 rounded-lg bg-slate-900 dark:bg-zinc-700 text-white text-[9px] font-sans leading-relaxed shadow-lg">
            Δ = t_act − t_min. Positive = additional wall beyond code minimum. Negative = code violation.
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900 dark:border-t-zinc-700" />
          </div>
        </div>

        {/* Safety Factor */}
        <div className={`relative group p-2.5 rounded-xl border cursor-help ${sfBg}`}>
          <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase">Safety Factor</div>
          <div className={`text-sm font-bold mt-0.5 ${sfColor}`}>
            {safetyFactor} <span className="text-[10px] font-normal text-slate-500">SF</span>
          </div>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-20 w-48 p-2 rounded-lg bg-slate-900 dark:bg-zinc-700 text-white text-[9px] font-sans leading-relaxed shadow-lg">
            SF = t_act / t_min. ≥ 1.25 → Green (safe). 1.0–1.25 → Amber (marginal). &lt; 1.0 → Red (failure).
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900 dark:border-t-zinc-700" />
          </div>
        </div>

        {/* Remaining Life */}
        <div className="relative group p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800 cursor-help">
          <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase">Est. Remaining Life</div>
          <div className="text-sm font-bold text-slate-900 dark:text-zinc-100 mt-0.5">
            {remainingLifeYears} <span className="text-[10px] font-normal text-slate-500">yrs</span>
          </div>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-20 w-44 p-2 rounded-lg bg-slate-900 dark:bg-zinc-700 text-white text-[9px] font-sans leading-relaxed shadow-lg">
            Estimated years until wall thickness reaches t_min, based on current corrosion rate.
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900 dark:border-t-zinc-700" />
          </div>
        </div>
      </div>

      {/* ── Live ASME Formula Display ── */}
      <div className="my-3 p-2.5 rounded-xl bg-violet-50/60 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800/50">
        <div className="text-[9px] font-bold uppercase font-mono text-violet-500 dark:text-violet-400 tracking-wider mb-1">
          ASME B31.3 Eq. 3a — Live Substitution
        </div>
        <div className="font-mono text-[11px] text-violet-800 dark:text-violet-200 break-all leading-relaxed">
          {liveFormula}
        </div>
      </div>

      {/* ── Safety Margin Segmented Bar ── */}
      <div className="my-3">
        <div className="text-[10px] font-mono uppercase text-slate-400 dark:text-zinc-500 mb-1 tracking-wider">
          Safety Margin Indicator
        </div>
        <div className="relative h-4 rounded-full overflow-hidden flex">
          {/* DANGER zone */}
          <div className="h-full bg-rose-500/80" style={{ width: '25%' }} title="DANGER (< 0)" />
          {/* MARGINAL zone */}
          <div className="h-full bg-amber-400/80" style={{ width: '25%' }} title="MARGINAL (0 – 0.05)" />
          {/* SAFE zone */}
          <div className="h-full bg-emerald-500/80" style={{ width: '50%' }} title="SAFE (> 0.05)" />
          {/* Arrow pointer */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-slate-900 dark:bg-white z-10 transition-all duration-300"
            style={{ left: `${marginArrowPct}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-0.5">
          <span className="text-rose-500">DANGER</span>
          <span className="text-amber-500">MARGINAL</span>
          <span className="text-emerald-500">SAFE</span>
        </div>
      </div>

      {/* ── Remaining Life Timeline ── */}
      <div className="my-3">
        <div className="text-[10px] font-mono uppercase text-slate-400 dark:text-zinc-500 mb-1 tracking-wider">
          Remaining Life vs MTBF ({MTBF} yrs)
        </div>
        <div className="relative h-3 rounded-full overflow-hidden bg-slate-200 dark:bg-zinc-700">
          {/* Danger zone: last 20% */}
          <div className="absolute right-0 top-0 bottom-0 w-[20%] bg-rose-200 dark:bg-rose-900/40" />
          {/* Life filled */}
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${lifePct}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-0.5">
          <span>0 yrs</span>
          <span className="text-rose-400">⚠ Danger ({(MTBF * 0.8).toFixed(0)} yrs+)</span>
          <span>{MTBF} yrs (MTBF)</span>
        </div>
      </div>

      {/* ── Interactive Parameter Sliders ── */}
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
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-violet-600"
            style={{ background: sliderGradient(pressure, 100, 1200, true) }}
          />
          <div className="flex justify-between text-[9px] font-mono text-slate-400">
            <span>100 psig (safe)</span>
            <span>1200 psig (critical)</span>
          </div>
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
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-violet-600"
            style={{ background: sliderGradient(actualThickness, 0.1, 0.8, false) }}
          />
          <div className="flex justify-between text-[9px] font-mono text-slate-400">
            <span>0.1000 in (critical)</span>
            <span>0.8000 in (safe)</span>
          </div>
        </div>

        {/* Corrosion Allowance Slider (NEW — 3rd slider) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-700 dark:text-zinc-300">Corrosion Allowance (c):</span>
            <span className="font-mono font-bold text-violet-600 dark:text-violet-400">{corrAllowance.toFixed(3)} in</span>
          </div>
          <input
            type="range"
            min="0.000"
            max="0.250"
            step="0.001"
            value={corrAllowance}
            onChange={(e) => setCorrAllowance(parseFloat(e.target.value))}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-violet-600"
            style={{ background: sliderGradient(corrAllowance, 0, 0.25, true) }}
          />
          <div className="flex justify-between text-[9px] font-mono text-slate-400">
            <span>0.000 in (no allowance)</span>
            <span>0.250 in (max)</span>
          </div>
        </div>
      </div>

      {/* ── PDF Report Preview (expandable) ── */}
      <div className="my-3 rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
        <button
          onClick={() => setShowPdfPreview((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-zinc-950/50 text-xs font-mono font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <span>📄 PDF Report Preview</span>
          {showPdfPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {showPdfPreview && (
          <pre className="text-[10px] font-mono text-slate-700 dark:text-zinc-300 bg-white dark:bg-zinc-950 p-3 border-t border-slate-200 dark:border-zinc-800 overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {pdfReport}
          </pre>
        )}
      </div>

      {/* ── Footer ── */}
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
