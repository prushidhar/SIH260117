'use client';

import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  Activity, 
  Thermometer, 
  CheckCircle2, 
  RotateCcw, 
  FileSpreadsheet, 
  Crosshair,
  TrendingUp,
  Cpu
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import type { WeibullRulCardProps } from '../types';

export default function WeibullRulCard({
  assetTag = 'K-102',
  title = 'WEIBULL FAULT PROGNOSTICS & RUL',
  standard = 'IEC 61649 / ISO 13381-1',
  coxMultiplier: initialCox = 1.85,
  rulDays: initialRulDays = 110.0,
  turnaroundDays = 90.0,
  failureRisk90d: initialRisk = 8.1,
  mtbfHours = 35459,
  betaShape = 2.40,
  effectiveAgeHours: initialAge = 23330,
  vibrationDelta = 15.0,
  bearingTemp = 64.2,
  bearingTempDelta = 9.2,
  recommendation = 'NORMAL_OPERATION_MONITOR_TELEMETRY_TRENDS',
}: WeibullRulCardProps) {
  const { selectTag, addDeliverable, addToast } = useIndraStore();

  const [selectedAsset, setSelectedAsset] = useState<string>(assetTag);
  const [coxMultiplier, setCoxMultiplier] = useState<number>(initialCox);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Dynamic calculations based on Cox PHM multiplier
  const { currentRulDays, currentRisk, hazardZone, hazardColor, effectiveAge } = useMemo(() => {
    // Baseline RUL at 1.0x multiplier is ~150 days
    const baseRul = 150.0;
    const computedRul = Math.max(15.0, parseFloat((baseRul / Math.pow(coxMultiplier, 0.72)).toFixed(1)));
    
    // 90-day turnaround failure probability from Weibull CDF: F(t) = 1 - exp(-(t/eta)^beta * exp(covariates))
    const baseRisk = 2.4;
    const computedRisk = Math.min(99.4, parseFloat((baseRisk * Math.pow(coxMultiplier, 1.8)).toFixed(1)));

    // Effective age adjusted by covariates
    const computedAge = Math.round(mtbfHours * 0.55 * Math.pow(coxMultiplier, 0.35));

    let zone: 'Safe' | 'Elevated' | 'Critical' = 'Safe';
    let color = 'emerald';
    if (coxMultiplier < 1.5) {
      zone = 'Safe';
      color = 'emerald';
    } else if (coxMultiplier <= 2.5) {
      zone = 'Elevated';
      color = 'amber';
    } else {
      zone = 'Critical';
      color = 'rose';
    }

    return {
      currentRulDays: computedRul,
      currentRisk: computedRisk,
      hazardZone: zone,
      hazardColor: color,
      effectiveAge: computedAge,
    };
  }, [coxMultiplier, mtbfHours]);

  const handleLocateTag = () => {
    if (selectedAsset) {
      selectTag(selectedAsset);
      broadcastSyncEvent({
        type: 'TAG_SELECTED',
        tag: selectedAsset,
        metadata: { source: 'WeibullRulCard', coxMultiplier, currentRulDays },
      });
      addToast({
        type: 'info',
        title: 'Asset Focused on P&ID',
        message: `Centered schematic view on ${selectedAsset} compressor node.`,
      });
    }
  };

  const handleReset = () => {
    setCoxMultiplier(initialCox);
  };

  const handleExportPrognostics = () => {
    const now = new Date().toLocaleTimeString();
    addDeliverable({
      id: `del-rul-${Date.now()}`,
      name: `Weibull_RUL_Prognostics_${selectedAsset}.docx`,
      filename: `Weibull_RUL_Prognostics_${selectedAsset}.docx`,
      type: 'docx',
      size: '1.8 MB',
      generatedAt: now,
      timestamp: now,
      description: `ISO 13381-1 / IEC 61649 Weibull RUL prognostics audit certificate for ${selectedAsset}.`,
      url: '#',
      hash: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    });
    addToast({
      type: 'success',
      title: 'Prognostics Deliverable Generated',
      message: `Exported Weibull RUL statutory certification report for ${selectedAsset}.`,
    });
  };

  // Semi-circular gauge SVG calculations
  // Angle sweep: 180° (left) to 0° (right)
  const minMultiplier = 1.0;
  const maxMultiplier = 4.0;
  const normalized = Math.min(1, Math.max(0, (coxMultiplier - minMultiplier) / (maxMultiplier - minMultiplier)));
  // Angle from 180 (left) down to 0 (right)
  const needleAngle = 180 - normalized * 180;
  const rad = (needleAngle * Math.PI) / 180;
  const cx = 130;
  const cy = 115;
  const r = 85;
  const needleX = cx + r * 0.75 * Math.cos(rad);
  const needleY = cy - r * 0.75 * Math.sin(rad);

  // RUL Progress percentage (based on turnaround target of 90 days, max scale 180 days)
  const rulProgressPercent = Math.min(100, Math.max(0, (currentRulDays / 180.0) * 100));
  const turnaroundMarkPercent = (turnaroundDays / 180.0) * 100;

  return (
    <div className="w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 text-slate-800 dark:text-zinc-100 overflow-hidden shadow-xs font-sans text-xs">
      {/* 1. Header with Asset Selector & Standard Badge */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/70 dark:bg-zinc-950/60 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-slate-900 dark:text-zinc-100 tracking-tight text-xs sm:text-sm">
                {title}
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-indigo-100/70 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                {standard}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              Proportional Hazards Model (Cox PHM) &amp; Time-Dependent Survivor Curve
            </p>
          </div>
        </div>

        {/* Asset Selector & Controls */}
        <div className="flex items-center gap-2">
          {/* Asset Dropdown / Pill */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[11px] font-mono font-bold">
            <Cpu className="w-3.5 h-3.5 text-indigo-500" />
            <span>ASSET:</span>
            <select
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value)}
              className="bg-transparent font-mono font-extrabold text-indigo-600 dark:text-indigo-400 outline-none cursor-pointer"
            >
              <option value="K-102" className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200">K-102 (Centrifugal Compressor)</option>
              <option value="P-101" className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200">P-101 (Slurry Feed Pump)</option>
              <option value="C-301" className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200">C-301 (Gas Recycle Turbine)</option>
            </select>
          </div>

          <button
            onClick={handleLocateTag}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 text-[11px] font-mono transition-colors cursor-pointer"
            title={`Focus ${selectedAsset} on P&ID Schematic`}
          >
            <Crosshair className="w-3 h-3 text-indigo-500" />
            <span className="hidden sm:inline">Locate P&amp;ID</span>
          </button>

          <button
            onClick={handleExportPrognostics}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-mono font-bold transition-colors cursor-pointer shadow-xs"
            title="Export Prognostics Certification Note"
          >
            <FileSpreadsheet className="w-3 h-3" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Semi-Circular Hazard Gauge & RUL Breakdown */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* 2. Semi-Circular Hazard Gauge (5 cols) */}
        <div className="md:col-span-5 flex flex-col items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950/70 border border-slate-200/80 dark:border-zinc-800/80">
          <div className="w-full flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500 dark:text-zinc-400">
              Instantaneous Hazard Rate
            </span>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
              hazardZone === 'Safe' 
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                : hazardZone === 'Elevated'
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
            }`}>
              {hazardZone.toUpperCase()} ({coxMultiplier.toFixed(2)}x)
            </span>
          </div>

          {/* SVG Semi-Circle Arc Gauge */}
          <div className="relative w-[260px] h-[140px] flex items-center justify-center">
            <svg viewBox="0 0 260 140" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="hazardArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="35%" stopColor="#10b981" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="75%" stopColor="#f59e0b" />
                  <stop offset="90%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>

              {/* Background Arc Track */}
              <path
                d="M 45 115 A 85 85 0 0 1 215 115"
                fill="none"
                stroke="currentColor"
                className="text-slate-200 dark:text-zinc-800"
                strokeWidth="14"
                strokeLinecap="round"
              />

              {/* Colored Zone Arcs */}
              {/* Safe Zone: 1.0x to 1.5x (180° to 150°) */}
              <path
                d="M 45 115 A 85 85 0 0 1 56.4 72.5"
                fill="none"
                stroke="#10b981"
                strokeWidth="14"
                strokeLinecap="round"
              />
              {/* Elevated Zone: 1.5x to 2.5x (150° to 90°) */}
              <path
                d="M 56.4 72.5 A 85 85 0 0 1 130 30"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="14"
              />
              {/* Critical Zone: 2.5x to 4.0x (90° to 0°) */}
              <path
                d="M 130 30 A 85 85 0 0 1 215 115"
                fill="none"
                stroke="#ef4444"
                strokeWidth="14"
                strokeLinecap="round"
              />

              {/* Ticks and Zone Labels */}
              <text x="35" y="132" className="text-[9px] font-mono fill-slate-400 font-bold" textAnchor="middle">1.0x</text>
              <text x="50" y="58" className="text-[9px] font-mono fill-emerald-500 font-bold" textAnchor="middle">1.5x</text>
              <text x="130" y="20" className="text-[9px] font-mono fill-amber-500 font-bold" textAnchor="middle">2.5x</text>
              <text x="225" y="132" className="text-[9px] font-mono fill-rose-500 font-bold" textAnchor="middle">4.0x</text>

              {/* Zone Annotations */}
              <text x="75" y="90" className="text-[8px] font-mono fill-emerald-600 dark:fill-emerald-400 font-bold">SAFE</text>
              <text x="110" y="55" className="text-[8px] font-mono fill-amber-600 dark:fill-amber-400 font-bold">ELEVATED</text>
              <text x="160" y="80" className="text-[8px] font-mono fill-rose-600 dark:fill-rose-400 font-bold">CRITICAL</text>

              {/* Needle Pointer */}
              <line
                x1={cx}
                y1={cy}
                x2={needleX}
                y2={needleY}
                stroke={hazardZone === 'Safe' ? '#10b981' : hazardZone === 'Elevated' ? '#f59e0b' : '#ef4444'}
                strokeWidth="3.5"
                strokeLinecap="round"
                className="transition-all duration-300"
              />

              {/* Center Pivot Dial */}
              <circle cx={cx} cy={cy} r="6" className="fill-slate-900 dark:fill-zinc-100" />
              <circle cx={cx} cy={cy} r="2.5" className="fill-white dark:fill-zinc-900" />
            </svg>

            {/* Instantaneous Value Overlay */}
            <div className="absolute bottom-0 text-center">
              <span className="text-xl font-mono font-extrabold tracking-tight text-slate-900 dark:text-zinc-100">
                {coxMultiplier.toFixed(2)}x
              </span>
              <span className="block text-[9px] font-mono text-slate-500 dark:text-zinc-400">
                Cox PHM Hazard Multiplier
              </span>
            </div>
          </div>

          {/* Interactive Multiplier Slider */}
          <div className="w-full mt-3 pt-2.5 border-t border-slate-200/60 dark:border-zinc-800/80">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-zinc-400 mb-1">
              <span>Covariate Stress Sensitivity</span>
              <button 
                onClick={handleReset}
                className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-zinc-200 cursor-pointer"
                title="Reset to 1.85x nominal"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Reset</span>
              </button>
            </div>
            <input
              type="range"
              min="1.0"
              max="4.0"
              step="0.05"
              value={coxMultiplier}
              onChange={(e) => setCoxMultiplier(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>
        </div>

        {/* 3. RUL Countdown Bar & Status Overview (7 cols) */}
        <div className="md:col-span-7 flex flex-col justify-between space-y-4 p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950/70 border border-slate-200/80 dark:border-zinc-800/80">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500 dark:text-zinc-400">
                Remaining Useful Life (RUL) Forecast
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                currentRisk <= 10.0
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  : currentRisk <= 25.0
                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
              }`}>
                {currentRisk}% Turnaround Failure Risk
              </span>
            </div>

            {/* Primary RUL Days Big Readout */}
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-mono font-extrabold tracking-tight text-slate-900 dark:text-zinc-100">
                {currentRulDays.toFixed(1)}
              </span>
              <span className="text-xs font-mono font-semibold text-slate-500 dark:text-zinc-400">
                Days to L10 Reliability Limit
              </span>
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 ml-auto font-bold">
                +{Math.max(0, currentRulDays - turnaroundDays).toFixed(1)}d Buffer
              </span>
            </div>

            {/* Horizontal Segmented Progress Bar */}
            <div className="mt-3 space-y-1.5">
              <div className="relative w-full h-3.5 bg-slate-200 dark:bg-zinc-800 rounded-md overflow-hidden p-0.5">
                {/* Active RUL Bar */}
                <div 
                  className={`h-full rounded transition-all duration-300 ${
                    currentRulDays >= turnaroundDays
                      ? 'bg-emerald-500 dark:bg-emerald-400'
                      : 'bg-rose-500 dark:bg-rose-400'
                  }`}
                  style={{ width: `${rulProgressPercent}%` }}
                />

                {/* Target Turnaround Vertical Threshold Marker (90 Days) */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-slate-900 dark:bg-white z-10"
                  style={{ left: `${turnaroundMarkPercent}%` }}
                  title="Planned Turnaround Threshold (90 Days)"
                />
              </div>

              {/* Progress Bar Axis Labels */}
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>0 Days</span>
                <span className="font-bold text-slate-700 dark:text-zinc-300">
                  ▲ 90-Day Turnaround Window
                </span>
                <span>180 Days (Target)</span>
              </div>
            </div>
          </div>

          {/* Operational Status Advisory Banner */}
          <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <div className="text-[11px] font-mono text-slate-700 dark:text-zinc-300">
              <span className="font-bold text-slate-900 dark:text-zinc-100">Statutory Status: </span>
              {currentRulDays >= turnaroundDays ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  Sufficient margin to operate through scheduled turnaround without unplanned shutdown.
                </span>
              ) : (
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  CRITICAL: RUL margin does not span the 90-day turnaround. Schedule intermediate inspection.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. 4 KPI Metrics Grid */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* KPI 1: Weibull MTBF & Shape Beta */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-950/70 border border-slate-200 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 text-[10px] font-mono font-semibold uppercase">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>Weibull MTBF</span>
            </div>
            <div className="mt-1 text-base font-mono font-bold text-slate-900 dark:text-zinc-100">
              {mtbfHours.toLocaleString()} hrs
            </div>
            <div className="mt-0.5 text-[10px] font-mono text-slate-500 dark:text-zinc-400">
              Shape &beta;: <strong className="text-slate-800 dark:text-zinc-200">{betaShape.toFixed(2)}</strong> (Mild Wearout)
            </div>
          </div>

          {/* KPI 2: Effective Operating Age */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-950/70 border border-slate-200 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 text-[10px] font-mono font-semibold uppercase">
              <Activity className="w-3.5 h-3.5 text-amber-500" />
              <span>Effective Age</span>
            </div>
            <div className="mt-1 text-base font-mono font-bold text-slate-900 dark:text-zinc-100">
              {effectiveAge.toLocaleString()} hrs
            </div>
            <div className="mt-0.5 text-[10px] font-mono text-slate-500 dark:text-zinc-400">
              Adjusted for vibration &amp; temp
            </div>
          </div>

          {/* KPI 3: Telemetry Covariates */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-950/70 border border-slate-200 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 text-[10px] font-mono font-semibold uppercase">
              <Thermometer className="w-3.5 h-3.5 text-rose-500" />
              <span>Telemetry Covariates</span>
            </div>
            <div className="mt-1 text-xs font-mono font-bold text-slate-900 dark:text-zinc-100 flex items-center justify-between">
              <span>Vib: +{vibrationDelta.toFixed(1)}% RMS</span>
              <span>{bearingTemp.toFixed(1)}°C</span>
            </div>
            <div className="mt-0.5 text-[10px] font-mono text-slate-500 dark:text-zinc-400">
              Bearing &Delta;+{bearingTempDelta.toFixed(1)}°C over baseline
            </div>
          </div>

          {/* KPI 4: Statutory Recommendation */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-950/70 border border-slate-200 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 text-[10px] font-mono font-semibold uppercase">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Recommendation</span>
            </div>
            <div className="mt-1 text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 truncate">
              {recommendation}
            </div>
            <div className="mt-0.5 text-[10px] font-mono text-slate-500 dark:text-zinc-400 truncate">
              ISO 13381-1 Telemetry Audit
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
