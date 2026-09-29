'use client';

import React, { useState, useMemo } from 'react';
import {
  Activity,
  Gauge,
  Sliders,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  FileSpreadsheet,
  Crosshair,
  AlertTriangle,
  Zap,
  Radio,
  Disc
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import type { RotorDynamicsCardProps } from '../types';

export default function RotorDynamicsCard({
  assetTag = 'TG-502 (48 MW Turbine)',
  title = 'API 684 / API 617 ROTORDYNAMICS & CAMPBELL RESONANCE DIAGRAM',
  operatingSpeedRpm = 5400,
  maxContinuousSpeedRpm = 5670,
  tripSpeedRpm = 6210,
  firstCriticalSpeedRpm = 2450,
  firstCriticalFreqHz = 40.8,
  firstSeparationMarginPercent = 16.0,
  secondCriticalSpeedRpm = 7800,
  secondCriticalFreqHz = 130.0,
  secondSeparationMarginPercent = 26.0,
  misalignmentRatio2X1X = 0.40,
  bearingDerateFactor = 0.98,
  vanePassMultiplier = 17,
}: RotorDynamicsCardProps) {
  const { selectTag, addDeliverable, addToast } = useIndraStore();

  const [selectedTag, setSelectedTag] = useState<string>(assetTag);
  const [currentSpeedRpm, setCurrentSpeedRpm] = useState<number>(operatingSpeedRpm);

  // Dynamic separation margin and resonance detection
  const { currentFreqHz, vanePassHz, isNc1Interference, isNc2Interference, separationStatus } = useMemo(() => {
    const f1X = parseFloat((currentSpeedRpm / 60).toFixed(1));
    const vpf = Math.round(f1X * vanePassMultiplier);

    // API 684 exclusion zones:
    // Nc1 +/- 16% -> 2058 to 2842 RPM
    const nc1Min = firstCriticalSpeedRpm * (1 - firstSeparationMarginPercent / 100);
    const nc1Max = firstCriticalSpeedRpm * (1 + firstSeparationMarginPercent / 100);
    const nc1Hit = currentSpeedRpm >= nc1Min && currentSpeedRpm <= nc1Max;

    // Nc2 - 26% -> 5772 to 9828 RPM
    const nc2Min = secondCriticalSpeedRpm * (1 - secondSeparationMarginPercent / 100);
    const nc2Hit = currentSpeedRpm >= nc2Min;

    let status = 'SAFE_OPERATING_MARGIN';
    if (nc1Hit) status = 'CRITICAL_1_RESONANCE_EXCLUSION';
    else if (nc2Hit) status = 'CRITICAL_2_PROXIMITY_ALERT';

    return {
      currentFreqHz: f1X,
      vanePassHz: vpf,
      isNc1Interference: nc1Hit,
      isNc2Interference: nc2Hit,
      separationStatus: status,
    };
  }, [currentSpeedRpm, firstCriticalSpeedRpm, firstSeparationMarginPercent, secondCriticalSpeedRpm, secondSeparationMarginPercent, vanePassMultiplier]);

  // SVG Campbell diagram coordinate mapping:
  // X: 0 to 8000 RPM (0 to 600 px)
  // Y: 0 to 2000 Hz (200 px to 0 px)
  const svgWidth = 600;
  const svgHeight = 220;
  const maxRpm = 8000;
  const maxHz = 2000;

  const mapX = (rpm: number) => (rpm / maxRpm) * svgWidth;
  const mapY = (hz: number) => svgHeight - (hz / maxHz) * svgHeight;

  // 1X excitation line: (0,0) to (8000, 133.3 Hz)
  const line1XEnd = { x: mapX(8000), y: mapY(8000 / 60) };
  // 2X excitation line: (0,0) to (8000, 266.7 Hz)
  const line2XEnd = { x: mapX(8000), y: mapY((2 * 8000) / 60) };
  // Vane pass frequency (17X): (0,0) to (7058 RPM, 2000 Hz)
  const vpfRpmAtMax = maxHz / (vanePassMultiplier / 60);
  const lineVpfEnd = { x: mapX(Math.min(maxRpm, vpfRpmAtMax)), y: mapY(Math.min(maxHz, (vanePassMultiplier * maxRpm) / 60)) };

  // Nc1 exclusion band (horizontal strip around 40.8 Hz)
  const nc1BandYTop = mapY(firstCriticalFreqHz * 1.16);
  const nc1BandYBot = mapY(firstCriticalFreqHz * 0.84);
  const nc1BandHeight = nc1BandYBot - nc1BandYTop;

  // Operating speed vertical marker
  const opX = mapX(currentSpeedRpm);

  const handleLocateTag = () => {
    const tagMatch = selectedTag.split(' ')[0] || 'TG-502';
    selectTag(tagMatch);
    broadcastSyncEvent({
      type: 'TAG_SELECTED',
      tag: tagMatch,
      metadata: { source: 'RotorDynamicsCard', currentSpeedRpm, currentFreqHz },
    });
    addToast({
      type: 'info',
      title: 'Turbine Train Focused',
      message: `Centered P&ID schematic on turbogenerator shaft train ${tagMatch}.`,
    });
  };

  const handleExportReport = () => {
    const now = new Date().toLocaleTimeString();
    const tagMatch = selectedTag.split(' ')[0] || 'TG-502';
    addDeliverable({
      id: `del-rotor-${Date.now()}`,
      name: `API_684_Campbell_Rotordynamics_${tagMatch}.docx`,
      filename: `API_684_Campbell_Rotordynamics_${tagMatch}.docx`,
      type: 'docx',
      size: '3.1 MB',
      generatedAt: now,
      timestamp: now,
      description: `API 684 / API 617 rotordynamics lateral Campbell diagram and modal resonance clearance audit for ${selectedTag}.`,
      url: '#',
      hash: 'sha256:4a81b22e1189acdf003189ef0981b2cf4817a022998811e9aa33418290bc91ff',
    });
    addToast({
      type: 'success',
      title: 'Campbell Deliverable Exported',
      message: `Generated API 684 rotordynamic clearance certificate for ${tagMatch}.`,
    });
  };

  return (
    <div className="w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 text-slate-800 dark:text-zinc-100 overflow-hidden shadow-xs font-sans text-xs">
      {/* 1. Header with Standards Badge & Asset Tag */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/70 dark:bg-zinc-950/60 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <Disc className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-zinc-100 tracking-tight text-[13px]">
                {title}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium border bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                {selectedTag}
              </span>
            </div>
            <div className="text-[11px] text-slate-600 dark:text-zinc-300 font-mono">
              API 684 Undamped Critical Speed &amp; Campbell Harmonic Ray Triage
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLocateTag}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition-colors border border-slate-200 dark:border-zinc-700"
          >
            <Crosshair className="w-3.5 h-3.5 text-indigo-500" />
            <span>Locate</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 2. Campbell Diagram Resonance Chart */}
        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" />
              <span className="font-semibold text-slate-900 dark:text-zinc-100 uppercase tracking-wider text-[11px]">
                Lateral Campbell Interference Diagram (0 - 8,000 RPM)
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  isNc1Interference || isNc2Interference
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                }`}
              >
                {isNc1Interference
                  ? 'CRITICAL 1 RESONANCE INTERFERENCE'
                  : isNc2Interference
                  ? 'CRITICAL 2 PROXIMITY ALERT'
                  : 'CENTERED IN SAFE OPERATING WINDOW'}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                Speed: <strong className="text-slate-900 dark:text-zinc-100">{currentSpeedRpm} RPM</strong> ({currentFreqHz} Hz)
              </span>
            </div>
          </div>

          {/* SVG Diagram Canvas */}
          <div className="relative w-full h-56 bg-slate-950 rounded-lg p-2 overflow-hidden border border-slate-800">
            <svg viewBox="0 0 600 220" preserveAspectRatio="none" className="w-full h-full overflow-visible">
              <defs>
                <pattern id="gridCampbell" width="75" height="44" patternUnits="userSpaceOnUse">
                  <path d="M 75 0 L 0 0 0 44" fill="none" stroke="#27272a" strokeWidth="0.7" />
                </pattern>
              </defs>

              <rect width="600" height="220" fill="url(#gridCampbell)" />

              {/* Nc1 Exclusion Band (16% Separation Band around 40.8 Hz) */}
              <rect x="0" y={nc1BandYTop} width="600" height={nc1BandHeight} fill="#f43f5e" fillOpacity="0.12" />
              <line x1="0" y1={mapY(firstCriticalFreqHz)} x2="600" y2={mapY(firstCriticalFreqHz)} stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4 2" />
              <text x="8" y={mapY(firstCriticalFreqHz) - 4} fill="#f43f5e" fontSize="8" fontFamily="monospace" fontWeight="bold">
                1st LATERAL CRITICAL Nc1 = 2,450 RPM (40.8 Hz) ±16% BAND
              </text>

              {/* Nc2 Exclusion Band (26% Separation Band around 130 Hz) */}
              <line x1="0" y1={mapY(secondCriticalFreqHz)} x2="600" y2={mapY(secondCriticalFreqHz)} stroke="#e11d48" strokeWidth="1.5" strokeDasharray="4 2" />
              <text x="8" y={mapY(secondCriticalFreqHz) - 4} fill="#fb7185" fontSize="8" fontFamily="monospace" fontWeight="bold">
                2nd LATERAL CRITICAL Nc2 = 7,800 RPM (130.0 Hz) -26% BAND
              </text>

              {/* Excitation Line: 1X Running Speed (Unbalance) */}
              <line x1="0" y1={mapY(0)} x2={line1XEnd.x} y2={line1XEnd.y} stroke="#38bdf8" strokeWidth="2" />
              <text x={line1XEnd.x - 20} y={line1XEnd.y - 6} fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="bold">
                1X Unbalance
              </text>

              {/* Excitation Line: 2X Misalignment */}
              <line x1="0" y1={mapY(0)} x2={line2XEnd.x} y2={line2XEnd.y} stroke="#a855f7" strokeWidth="1.8" strokeDasharray="5 2" />
              <text x={line2XEnd.x - 45} y={line2XEnd.y - 6} fill="#c084fc" fontSize="8" fontFamily="monospace" fontWeight="bold">
                2X Misalignment
              </text>

              {/* Excitation Line: Vane Pass Frequency (17X) */}
              <line x1="0" y1={mapY(0)} x2={lineVpfEnd.x} y2={lineVpfEnd.y} stroke="#f59e0b" strokeWidth="1.8" />
              <text x={lineVpfEnd.x - 65} y={lineVpfEnd.y + 14} fill="#fbbf24" fontSize="8" fontFamily="monospace" fontWeight="bold">
                17X Vane Pass
              </text>

              {/* Operating Speed Marker Line */}
              <line x1={opX} y1="0" x2={opX} y2="220" stroke="#10b981" strokeWidth="2" strokeDasharray="3 3" />
              <circle cx={opX} cy={mapY(currentFreqHz)} r="4" fill="#10b981" />
              <text x={opX + 6} y="25" fill="#10b981" fontSize="9" fontFamily="monospace" fontWeight="bold">
                {currentSpeedRpm} RPM
              </text>
            </svg>

            {/* X-Axis Speed Legends */}
            <div className="absolute bottom-1 left-2 right-2 flex justify-between text-[9px] font-mono text-zinc-500 pointer-events-none">
              <span>0 RPM</span>
              <span>2,000 RPM</span>
              <span>4,000 RPM</span>
              <span>6,000 RPM</span>
              <span>8,000 RPM</span>
            </div>
          </div>

          {/* Diagram Legend & Annotations */}
          <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-500 dark:text-zinc-400 pt-1">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-sky-400 inline-block" /> 1X Ray
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-cyan-400 inline-block border-b border-dashed" /> 2X Ray
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-amber-400 inline-block" /> 17X VPF ({vanePassHz} Hz)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-emerald-500 inline-block border-b border-dashed" /> Operating Speed
              </span>
            </div>
          </div>

          {/* Speed Variation Slider */}
          <div className="pt-2 space-y-1">
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-zinc-300 font-semibold">
                <Sliders className="w-3 h-3 text-indigo-500" />
                Rotor Speed Sweep (1,000 to 7,500 RPM):
              </span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">{currentSpeedRpm} RPM</span>
            </div>
            <input
              type="range"
              min="1000"
              max="7500"
              step="50"
              value={currentSpeedRpm}
              onChange={(e) => setCurrentSpeedRpm(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        </div>

        {/* 3. Alignment & Bearing Degradation Gauges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Misalignment Ratio 2X/1X */}
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Misalignment Ratio (2X / 1X)
              </span>
              <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                NOMINAL SHAFT ALIGNMENT
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900 dark:text-zinc-100">
                {misalignmentRatio2X1X.toFixed(2)}
              </span>
              <span className="text-xs text-slate-500 font-mono">threshold: &lt; 0.50</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${(misalignmentRatio2X1X / 1.0) * 100}%` }}
              />
            </div>
            <div className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 flex justify-between">
              <span>0.00 (Perfect)</span>
              <span>0.50 Warning</span>
              <span>1.00 Critical</span>
            </div>
          </div>

          {/* ISO 281 Bearing Life Derate Factor */}
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                ISO 281 Bearing Life Derate
              </span>
              <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                98% DESIGN L10h LIFE RETAINED
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {bearingDerateFactor.toFixed(2)}x
              </span>
              <span className="text-xs text-slate-500 font-mono">rating: a₁ · aISO factor</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${bearingDerateFactor * 100}%` }}
              />
            </div>
            <div className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 flex justify-between">
              <span>0.50x Severe Degradation</span>
              <span>1.00x Nominal</span>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-zinc-800/80">
          <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">
            Turbomachine: <strong className="text-slate-700 dark:text-zinc-300">48 MW Steam Turbine (Nc1: 2,450 RPM | Nc2: 7,800 RPM)</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentSpeedRpm(operatingSpeedRpm)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition-colors border border-slate-200 dark:border-zinc-700"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset</span>
            </button>

            <button
              onClick={handleExportReport}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Campbell Audit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
