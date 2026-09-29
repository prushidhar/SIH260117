'use client';

import React, { useState, useMemo } from 'react';
import {
  Waves,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Sliders,
  Gauge,
  ArrowRight,
  RotateCcw,
  FileSpreadsheet,
  Crosshair,
  AlertTriangle,
  Zap,
  Cylinder
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import type { WaterHammerCardProps } from '../types';

export default function WaterHammerCard({
  assetTag = 'PL-204 (24-inch NPS Crude Pipeline, 12.5 km)',
  title = 'JOUKOWSKY WATER HAMMER & TRANSIENT ACOUSTIC SURGE',
  standard = 'ASME B31.4 § 404.3.4',
  steadyPressureBar = 38.5,
  peakSurgePressureBar = 62.57,
  allowableSurgeCeilingBar = 70.4,
  initialClosureTimeSec = 3.5,
  criticalPipePeriodSec = 21.2,
  accumulatorVolumeM3 = 2.55,
  kineticEnergyMJ = 8.12,
  recommendedClosureSec = 31.8,
  waveSpeedMs = 1179,
  pipelineLengthKm = 12.5,
}: WaterHammerCardProps) {
  const { selectTag, addDeliverable, addToast } = useIndraStore();

  const [selectedAsset, setSelectedAsset] = useState<string>(assetTag);
  const [closureTime, setClosureTime] = useState<number>(initialClosureTimeSec);

  // Joukowsky calculation:
  // Critical time Tc = 2L / a = 2 * 12500 / 1179 = 21.2s
  // If tc <= Tc: Rapid closure -> Full Joukowsky Delta P = Delta P_max (24.07 bar)
  // If tc > Tc: Slow closure -> Attenuated Delta P = Delta P_max * (Tc / tc)
  const fullDeltaP = peakSurgePressureBar - steadyPressureBar; // 24.07 bar

  const { currentDeltaP, currentPeakP, isRapidClosure, surgeMarginPercent, isExceeded } = useMemo(() => {
    const isRapid = closureTime <= criticalPipePeriodSec;
    const computedDeltaP = isRapid
      ? fullDeltaP
      : fullDeltaP * (criticalPipePeriodSec / closureTime);
    const peak = parseFloat((steadyPressureBar + computedDeltaP).toFixed(2));
    const margin = parseFloat((((allowableSurgeCeilingBar - peak) / allowableSurgeCeilingBar) * 100).toFixed(1));
    const exceeded = peak > allowableSurgeCeilingBar;

    return {
      currentDeltaP: parseFloat(computedDeltaP.toFixed(2)),
      currentPeakP: peak,
      isRapidClosure: isRapid,
      surgeMarginPercent: margin,
      isExceeded: exceeded,
    };
  }, [closureTime, criticalPipePeriodSec, fullDeltaP, steadyPressureBar, allowableSurgeCeilingBar]);

  // Generate SVG waveform coordinates for 0 to 60 seconds
  const svgWaveformPoints = useMemo(() => {
    const points: string[] = [];
    const totalDuration = 60.0;
    const steps = 180;
    const svgWidth = 600;
    const svgHeight = 200;
    const maxPlotP = 85.0; // pressure range 0 to 85 bar
    const minPlotP = 20.0;

    const mapX = (t: number) => (t / totalDuration) * svgWidth;
    const mapY = (p: number) => svgHeight - ((p - minPlotP) / (maxPlotP - minPlotP)) * svgHeight;

    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * totalDuration;
      let p = steadyPressureBar;

      if (t >= closureTime * 0.4) {
        // Acoustic reflection cycle: period = 21.2s
        const tWave = t - closureTime * 0.4;
        const decay = Math.exp(-0.048 * tWave);
        const wave = Math.cos((2 * Math.PI * tWave) / criticalPipePeriodSec);
        p = steadyPressureBar + currentDeltaP * decay * wave;
      }

      const x = mapX(t).toFixed(1);
      const y = Math.min(svgHeight, Math.max(0, mapY(p))).toFixed(1);
      points.push(`${x},${y}`);
    }

    return points.join(' ');
  }, [closureTime, criticalPipePeriodSec, currentDeltaP, steadyPressureBar]);

  const handleLocateAsset = () => {
    const tagMatch = selectedAsset.split(' ')[0] || 'PL-204';
    selectTag(tagMatch);
    broadcastSyncEvent({
      type: 'TAG_SELECTED',
      tag: tagMatch,
      metadata: { source: 'WaterHammerCard', closureTime, currentPeakP, isRapidClosure },
    });
    addToast({
      type: 'info',
      title: 'Pipeline Surge Route Focused',
      message: `Centered P&ID schematic on ${tagMatch} acoustic transient boundary.`,
    });
  };

  const handleExportDeliverable = () => {
    const now = new Date().toLocaleTimeString();
    addDeliverable({
      id: `del-surge-${Date.now()}`,
      name: `ASME_B31_4_Surge_Analysis_${selectedAsset.split(' ')[0]}.docx`,
      filename: `ASME_B31_4_Surge_Analysis_${selectedAsset.split(' ')[0]}.docx`,
      type: 'docx',
      size: '2.6 MB',
      generatedAt: now,
      timestamp: now,
      description: `ASME B31.4 § 404.3.4 Joukowsky acoustic water hammer & surge attenuation audit for ${selectedAsset}.`,
      url: '#',
      hash: 'sha256:d892a0194e4f71a06e9389279148d28cf896b01a1c4e532b2170c01c0aa89f55',
    });
    addToast({
      type: 'success',
      title: 'Surge Audit Deliverable Generated',
      message: `Exported Joukowsky transient shock analysis for ${selectedAsset.split(' ')[0]}.`,
    });
  };

  return (
    <div className="w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 text-slate-800 dark:text-zinc-100 overflow-hidden shadow-xs font-sans text-xs">
      {/* 1. Header with Standards Badge & Asset Selector */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/70 dark:bg-zinc-950/60 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            <Waves className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-zinc-100 tracking-tight text-[13px]">
                {title}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                {standard}
              </span>
            </div>
            <div className="text-[11px] text-slate-600 dark:text-zinc-300 font-mono">
              Joukowsky Equation: ΔP = ρ · a · Δv | Wave Speed a = {waveSpeedMs} m/s
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedAsset}
            onChange={(e) => setSelectedAsset(e.target.value)}
            className="text-[11px] font-mono px-2.5 py-1 rounded-md border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="PL-204 (24-inch NPS Crude Pipeline, 12.5 km)">
              PL-204 (24-inch NPS Crude Pipeline, 12.5 km)
            </option>
            <option value="PL-108 (16-inch Condensate, 8.2 km)">
              PL-108 (16-inch Condensate, 8.2 km)
            </option>
            <option value="FW-302 (12-inch Firewater Ring, 3.4 km)">
              FW-302 (12-inch Firewater Ring, 3.4 km)
            </option>
          </select>

          <button
            onClick={handleLocateAsset}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition-colors border border-slate-200 dark:border-zinc-700"
          >
            <Crosshair className="w-3.5 h-3.5 text-sky-500" />
            <span>Locate</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 2. Interactive Acoustic Waveform Visualizer */}
        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-500" />
              <span className="font-semibold text-slate-900 dark:text-zinc-100 uppercase tracking-wider text-[11px]">
                Acoustic Pressure Waveform Reflection (0 – 60s)
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  isExceeded
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                }`}
              >
                {isExceeded ? 'SURGE CEILING EXCEEDED' : `+${surgeMarginPercent}% Below Permissible Limit`}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                Peak: <strong className="text-slate-900 dark:text-zinc-100 font-bold">{currentPeakP} bar</strong>
              </span>
            </div>
          </div>

          {/* SVG Plot Canvas */}
          <div className="relative w-full h-48 bg-slate-950 rounded-lg p-2 overflow-hidden border border-slate-800">
            <svg viewBox="0 0 600 200" preserveAspectRatio="none" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="surgeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                </linearGradient>
                <pattern id="gridPattern" width="100" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 100 0 L 0 0 0 40" fill="none" stroke="#27272a" strokeWidth="0.7" />
                </pattern>
              </defs>

              {/* Grid Background */}
              <rect width="600" height="200" fill="url(#gridPattern)" />

              {/* Pressure Level Horizontal Guidelines */}
              {/* Allowable Surge Ceiling: 70.4 bar (map: 20 to 85 -> 200 - (70.4-20)/65 * 200 = 200 - 155.07 = 44.9) */}
              <line x1="0" y1="44.9" x2="600" y2="44.9" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 3" />
              <text x="6" y="39" fill="#ef4444" fontSize="9" fontFamily="monospace" fontWeight="bold">
                ASME B31.4 ALLOWABLE SURGE CEILING (70.4 bar)
              </text>

              {/* Steady Operating Pressure: 38.5 bar (map: 200 - (38.5-20)/65 * 200 = 200 - 56.92 = 143.1) */}
              <line x1="0" y1="143.1" x2="600" y2="143.1" stroke="#71717a" strokeWidth="1" strokeDasharray="3 3" />
              <text x="6" y="156" fill="#a1a1aa" fontSize="9" fontFamily="monospace">
                STEADY OPERATING BASELINE (38.5 bar)
              </text>

              {/* Critical Time Barrier line (21.2s) */}
              <line x1={(21.2 / 60) * 600} y1="0" x2={(21.2 / 60) * 600} y2="200" stroke="#38bdf8" strokeWidth="1" strokeDasharray="2 2" />
              <text x={(21.2 / 60) * 600 + 4} y="15" fill="#38bdf8" fontSize="8" fontFamily="monospace">
                2L/a = 21.2s
              </text>

              {/* Valve Closure Event Marker */}
              <line x1={(closureTime / 60) * 600} y1="0" x2={(closureTime / 60) * 600} y2="200" stroke="#fbbf24" strokeWidth="1.5" />
              <circle cx={(closureTime / 60) * 600} cy={143.1} r="4" fill="#fbbf24" />

              {/* Transient Acoustic Surge Oscillating Polyline */}
              <polyline
                fill="none"
                stroke={isExceeded ? '#f43f5e' : '#f59e0b'}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={svgWaveformPoints}
              />
            </svg>

            {/* Time Axis Legends */}
            <div className="absolute bottom-1 left-2 right-2 flex justify-between text-[9px] font-mono text-zinc-500 pointer-events-none">
              <span>0s</span>
              <span>10s</span>
              <span>20s</span>
              <span>30s</span>
              <span>40s</span>
              <span>50s</span>
              <span>60s</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-500 dark:text-zinc-400 pt-1">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-amber-500 inline-block" /> Transient Shockwave
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-red-500 inline-block border-b border-dotted" /> 70.4 bar Limit
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-zinc-500 inline-block border-b border-dashed" /> 38.5 bar Steady
              </span>
            </div>
            <div>
              Peak Surge: <span className="font-bold text-slate-900 dark:text-zinc-100">{currentPeakP} bar</span> ({currentDeltaP > 0 ? `+${currentDeltaP}` : currentDeltaP} bar shock)
            </div>
          </div>
        </div>

        {/* 3. Dynamic Valve Closure Time Slider & State Badging */}
        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-500" />
              <span className="font-semibold text-slate-900 dark:text-zinc-100 uppercase tracking-wider text-[11px]">
                Emergency Shutdown Valve (ESDV) Closure Duration (tc)
              </span>
            </div>

            {/* Closure Regime Badge */}
            {isRapidClosure ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse">
                <ShieldAlert className="w-3 h-3" />
                RAPID CLOSURE (FULL JOUKOWSKY SHOCK)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-3 h-3" />
                GRADUAL CLOSURE (ATTENUATED REFLECTION)
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-slate-600 dark:text-zinc-400">Closure Time:</span>
              <span className="font-bold text-slate-900 dark:text-zinc-100">{closureTime.toFixed(1)} seconds</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="30.0"
              step="0.5"
              value={closureTime}
              onChange={(e) => setClosureTime(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400 dark:text-zinc-500">
              <span>1.0s (Catastrophic Trip)</span>
              <span className="text-sky-500 font-semibold">Critical 2L/a Threshold: 21.2s</span>
              <span>30.0s (Throttled Ramp)</span>
            </div>
          </div>
        </div>

        {/* 4. Gas Bladder Sizing Panel & Kinetic Mitigation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400">
              <span className="text-[10px] font-mono uppercase tracking-wider">Surge Accumulator Vol</span>
              <Cylinder className="w-3.5 h-3.5 text-sky-500" />
            </div>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-zinc-100">
              {accumulatorVolumeM3.toFixed(2)} m³
            </div>
            <div className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">
              2,550 L Precharged N₂ Bladder
            </div>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400">
              <span className="text-[10px] font-mono uppercase tracking-wider">Kinetic Energy Dissipation</span>
              <Zap className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-zinc-100">
              {kineticEnergyMJ.toFixed(2)} MJ
            </div>
            <div className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">
              Fluid Column Kinetic Momentum
            </div>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400">
              <span className="text-[10px] font-mono uppercase tracking-wider">Min Safe Closure Duration</span>
              <Gauge className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
              ≥ {recommendedClosureSec.toFixed(1)} s
            </div>
            <div className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">
              Prevents Elastic Pipe Rupture
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-zinc-800/80">
          <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">
            Pipeline: <strong className="text-slate-700 dark:text-zinc-300">L = {pipelineLengthKm} km | 24&quot; NPS</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setClosureTime(initialClosureTimeSec)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition-colors border border-slate-200 dark:border-zinc-700"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset</span>
            </button>

            <button
              onClick={handleExportDeliverable}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-colors shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Surge Deliverable</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
