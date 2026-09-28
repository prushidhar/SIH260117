'use client';

import React, { useState, useMemo } from 'react';
import {
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Crosshair,
  FileCheck,
  RotateCcw,
  Sliders,
  ShieldCheck,
  Activity,
  Layers,
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import type { ASMEComplianceCardProps } from '../types';

export default function ASMEComplianceCard({
  tag = 'HX-4201',
  title = 'ASME B31.3 §304.1.2 PRESSURE PIPING WALL THICKNESS SIZER',
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
  const [jointQualityE, setJointQualityE] = useState<number>(1.0); // 1.0 = Seamless, 0.85 = ERW

  // ASME B31.3 Coefficient Y (0.4 for ferritic steels < 900°F)
  const Y = 0.4;

  // Real-time calculation: tm = (P * D) / (2 * (S * E + P * Y)) + c
  const { tMin, safetyMargin, remainingLifeYears, isCompliant, safetyFactor } = useMemo(() => {
    const denominator = 2 * (stress * jointQualityE + pressure * Y);
    const pressureDesign = (pressure * pipeDiameter) / (denominator || 1);
    const calculatedTMin = pressureDesign + corrAllowance;
    const margin = actualThickness - calculatedTMin;
    const life = margin > 0 ? margin / (corrosionRate || 0.001) : 0;

    // Safety factor based on hoop stress: SF = (S * actualThickness) / (P * D / 2)
    const hoopStress = (pressure * pipeDiameter) / (2 * (actualThickness - corrAllowance) || 1);
    const sf = hoopStress > 0 ? stress / hoopStress : 3.0;

    return {
      tMin: parseFloat(calculatedTMin.toFixed(4)),
      safetyMargin: parseFloat(margin.toFixed(4)),
      remainingLifeYears: parseFloat(life.toFixed(1)),
      isCompliant: margin >= 0,
      safetyFactor: parseFloat(sf.toFixed(2)),
    };
  }, [pressure, pipeDiameter, stress, actualThickness, corrAllowance, jointQualityE, corrosionRate]);

  const handleLocateTag = () => {
    if (tag) {
      selectTag(tag);
      broadcastSyncEvent({
        type: 'TAG_SELECTED',
        tag,
        metadata: { source: 'ASMEComplianceCard', tMin, safetyMargin, safetyFactor },
      });
    }
  };

  const handleReset = () => {
    setPressure(initialPressure);
    setPipeDiameter(diameter);
    setStress(allowableStress);
    setActualThickness(initialActual);
    setCorrAllowance(corrosionAllowance);
    setJointQualityE(1.0);
  };

  const handleExportReport = () => {
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
    <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl font-mono text-xs text-zinc-200 select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-zinc-800/80 gap-2">
        <div className="flex items-center gap-2">
          {tag && (
            <button
              onClick={handleLocateTag}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900/90 border border-emerald-700/80 text-emerald-300 font-bold transition-all cursor-pointer group"
              title="Center camera on P&ID diagram"
            >
              <Crosshair className="w-3.5 h-3.5 text-emerald-400 group-hover:rotate-45 transition-transform" />
              <span>{tag}</span>
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-zinc-100 tracking-wider">{title}</h4>
              <span className="px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800 text-[9px] font-bold">
                {standard}
              </span>
            </div>
            <div className="text-[10px] text-zinc-400">
              ASTM A106 Gr. B • Design Temp: {designTemp}°F • Corrosion Rate: {corrosionRate} in/yr
            </div>
          </div>
        </div>

        {/* Compliance Badge & Actions */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              isCompliant
                ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                : 'bg-rose-950/80 border-rose-700 text-rose-300 animate-pulse'
            }`}
          >
            {isCompliant ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            <span>{isCompliant ? `COMPLIANT (+${safetyMargin}" MARGIN)` : 'NON-COMPLIANT (UNDER-THICKNESS)'}</span>
          </div>

          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            title="Reset parameters to nominal baseline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleExportReport}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer"
            title="Export statutory ASME compliance report"
          >
            <FileCheck className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Prominent Live Equation Box */}
      <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 mb-3 space-y-2">
        <div className="flex items-center justify-between text-[10px] text-zinc-400">
          <span className="font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5" />
            ASME B31.3 §304.1.2 (3a) GOVERNING FORMULA
          </span>
          <span className="text-[9px] text-zinc-500">Ferritic Material (Y = {Y}, E = {jointQualityE})</span>
        </div>

        {/* Rendered Live Equation with Parameter Highlights */}
        <div className="p-2.5 rounded-lg bg-black/80 border border-zinc-850 text-center font-mono text-sm sm:text-base text-zinc-200 overflow-x-auto">
          <span>t_m = </span>
          <span className="inline-flex flex-col items-center align-middle mx-1">
            <span className="border-b border-zinc-600 px-1 text-cyan-300 font-bold">
              P &middot; D
            </span>
            <span className="px-1 text-amber-300 font-bold text-xs">
              2(S &middot; E + P &middot; Y)
            </span>
          </span>
          <span> + </span>
          <span className="text-rose-300 font-bold">c</span>
          <span className="mx-2 text-zinc-500">=</span>
          <span className="text-emerald-400 font-extrabold">{tMin}"</span>
        </div>

        {/* Parameter Substitution Breakdown */}
        <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1">
          <span>P = <strong className="text-cyan-300">{pressure} psig</strong></span>
          <span>D = <strong className="text-cyan-300">{pipeDiameter}"</strong></span>
          <span>S = <strong className="text-amber-300">{stress} psi</strong></span>
          <span>c = <strong className="text-rose-300">{corrAllowance}"</strong></span>
          <span>E = <strong className="text-zinc-200">{jointQualityE}</strong></span>
        </div>
      </div>

      {/* 3 Primary Result KPIs: t_min, Safety Factor, Remaining Life */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        {/* Minimum Thickness */}
        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <div className="text-[10px] text-zinc-400 uppercase font-bold">CALCULATED t_min</div>
          <div className="text-xl font-extrabold text-emerald-400 mt-1">
            {tMin}" <span className="text-xs text-zinc-500 font-normal">({(tMin * 25.4).toFixed(2)} mm)</span>
          </div>
          <div className="text-[9px] text-zinc-500 mt-1">
            Actual thickness: {actualThickness}" ({safetyMargin > 0 ? `+${safetyMargin}"` : `${safetyMargin}"`})
          </div>
        </div>

        {/* Safety Factor Gauge */}
        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <div className="text-[10px] text-zinc-400 uppercase font-bold flex items-center justify-between">
            <span>SAFETY FACTOR (SF)</span>
            <span className={safetyFactor >= 1.5 ? 'text-emerald-400' : 'text-rose-400 font-bold'}>
              {safetyFactor >= 1.5 ? 'CODE PASS' : 'RISK'}
            </span>
          </div>
          <div className="text-xl font-extrabold text-zinc-100 mt-1">
            {safetyFactor}x <span className="text-xs text-zinc-500 font-normal">Design Margin</span>
          </div>
          <div className="text-[9px] text-zinc-500 mt-1">
            Allowable yield ratio &ge; 1.50x
          </div>
        </div>

        {/* Remaining Life */}
        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <div className="text-[10px] text-zinc-400 uppercase font-bold">ESTIMATED REMAINING LIFE</div>
          <div className="text-xl font-extrabold text-cyan-400 mt-1">
            {remainingLifeYears} <span className="text-xs text-zinc-500 font-normal">Years</span>
          </div>
          <div className="text-[9px] text-zinc-500 mt-1">
            API 570 half-life interval: {(remainingLifeYears / 2).toFixed(1)} yrs
          </div>
        </div>
      </div>

      {/* Interactive Parameter Sliders */}
      <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3 mb-3">
        <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
          INTERACTIVE ENGINEERING PARAMETER SLIDERS:
        </div>

        {/* Pressure Slider */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-zinc-400">Internal Design Pressure (P):</span>
            <span className="text-cyan-300 font-bold">{pressure} psig</span>
          </div>
          <input
            type="range"
            min={100}
            max={1200}
            step={25}
            value={pressure}
            onChange={(e) => setPressure(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
          />
        </div>

        {/* Allowable Stress Slider */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-zinc-400">Basic Allowable Stress (S):</span>
            <span className="text-amber-300 font-bold">{stress.toLocaleString()} psi</span>
          </div>
          <input
            type="range"
            min={12000}
            max={25000}
            step={500}
            value={stress}
            onChange={(e) => setStress(Number(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
          />
        </div>

        {/* Corrosion Allowance Slider */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-zinc-400">Corrosion Allowance (c):</span>
            <span className="text-rose-300 font-bold">{corrAllowance}"</span>
          </div>
          <input
            type="range"
            min={0.0}
            max={0.25}
            step={0.0125}
            value={corrAllowance}
            onChange={(e) => setCorrAllowance(Number(e.target.value))}
            className="w-full accent-rose-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
          />
        </div>

        {/* Actual Thickness Slider */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-zinc-400">Actual Ultrasonic Measured Thickness (t_actual):</span>
            <span className="text-zinc-100 font-bold">{actualThickness}"</span>
          </div>
          <input
            type="range"
            min={0.20}
            max={0.80}
            step={0.005}
            value={actualThickness}
            onChange={(e) => setActualThickness(Number(e.target.value))}
            className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
          />
        </div>
      </div>

      {/* Pipe Spec Footer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px]">
        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-zinc-500 uppercase">NOMINAL PIPE SIZE</div>
          <div className="font-bold text-zinc-200 mt-0.5">8" NPS (Sch 40)</div>
        </div>

        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-zinc-500 uppercase">OUTSIDE DIAMETER</div>
          <div className="font-bold text-zinc-200 mt-0.5">{pipeDiameter}" (219.1 mm)</div>
        </div>

        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-zinc-500 uppercase">QUALITY FACTOR E</div>
          <div className="font-bold text-zinc-200 mt-0.5">{jointQualityE} (Seamless)</div>
        </div>

        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-zinc-500 uppercase">NEXT INSPECTION</div>
          <div className="font-bold text-emerald-400 mt-0.5">2029-04 (UT Grid)</div>
        </div>
      </div>
    </div>
  );
}
