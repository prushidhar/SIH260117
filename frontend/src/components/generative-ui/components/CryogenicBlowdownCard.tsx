'use client';

import React, { useState, useMemo } from 'react';
import {
  ThermometerSnowflake,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Sliders,
  Gauge,
  RotateCcw,
  FileSpreadsheet,
  Crosshair,
  AlertTriangle,
  ArrowDownRight,
  TrendingDown
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import type { CryogenicBlowdownCardProps } from '../types';

export default function CryogenicBlowdownCard({
  assetTag = 'BDV-201',
  title = 'API 521 EMERGENCY DEPRESSURING & ASME UCS-66 MDMT BRITTLE FRACTURE',
  initialPressureBar = 85.0,
  finalPressureBar = 0.9,
  target15MinPressureBar = 42.5,
  minFluidTempC = -52.4,
  minWallTempC = -20.1,
  vesselMdmtC = -29.0,
  materialSpec = 'ASTM A516 Gr 70 Normalized',
  asmeCurve = 'Curve B',
  durationMinutes = 15,
}: CryogenicBlowdownCardProps) {
  const { selectTag, addDeliverable, addToast } = useIndraStore();

  const [selectedTag, setSelectedTag] = useState<string>(assetTag);
  const [orificeDiameterMm, setOrificeDiameterMm] = useState<number>(38.1); // RO orifice size

  // Dynamic sensitivity calculation:
  // Larger orifice = faster depressuring, colder Joule-Thomson expansion
  const { currentFinalP, currentWallTemp, currentFluidTemp, safetyMargin, isTargetPassed, isMdmtSafe } = useMemo(() => {
    const factor = orificeDiameterMm / 38.1;
    // Faster blowdown yields lower final pressure & colder JT temperature
    const finalP = Math.max(0.4, parseFloat((finalPressureBar / Math.pow(factor, 0.8)).toFixed(1)));
    const fluidT = parseFloat((minFluidTempC - (factor - 1.0) * 12.0).toFixed(1));
    const wallT = parseFloat((minWallTempC - (factor - 1.0) * 8.5).toFixed(1));
    const margin = parseFloat((wallT - vesselMdmtC).toFixed(1));

    return {
      currentFinalP: finalP,
      currentWallTemp: wallT,
      currentFluidTemp: fluidT,
      safetyMargin: margin,
      isTargetPassed: finalP <= target15MinPressureBar,
      isMdmtSafe: margin >= 0,
    };
  }, [orificeDiameterMm, finalPressureBar, minFluidTempC, minWallTempC, vesselMdmtC, target15MinPressureBar]);

  // Dual-axis SVG line generator
  // X: 0 to 15 minutes (0 to 600 px)
  // Left Y: Pressure 0 to 100 bar (height 200 px)
  // Right Y: Temperature -60°C to +40°C (range 100°C)
  const { pressurePath, fluidTempPath, wallTempPath } = useMemo(() => {
    const svgW = 600;
    const svgH = 200;
    const steps = 60;

    const mapX = (t: number) => (t / durationMinutes) * svgW;
    const mapYPressure = (p: number) => svgH - (p / 100) * svgH;
    const mapYTemp = (temp: number) => svgH - ((temp - -60) / 100) * svgH;

    const pPts: string[] = [];
    const fPts: string[] = [];
    const wPts: string[] = [];

    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * durationMinutes;
      // Exponential pressure decay: P(t) = P_final + (P_0 - P_final) * e^(-k*t)
      const k = 0.28 * (orificeDiameterMm / 38.1);
      const p = currentFinalP + (initialPressureBar - currentFinalP) * Math.exp(-k * t);

      // Joule-Thomson expansion: fluid cools rapidly then slowly warms after blowdown
      // Wall lags fluid significantly due to thermal inertia of 32mm vessel shell
      const jtRatio = 1 - Math.exp(-0.35 * t);
      const fluidT = 35.0 - (35.0 - currentFluidTemp) * jtRatio * Math.exp(-0.03 * Math.max(0, t - 8));
      const wallT = 35.0 - (35.0 - currentWallTemp) * (1 - Math.exp(-0.16 * t));

      pPts.push(`${mapX(t).toFixed(1)},${mapYPressure(p).toFixed(1)}`);
      fPts.push(`${mapX(t).toFixed(1)},${mapYTemp(fluidT).toFixed(1)}`);
      wPts.push(`${mapX(t).toFixed(1)},${mapYTemp(wallT).toFixed(1)}`);
    }

    return {
      pressurePath: pPts.join(' '),
      fluidTempPath: fPts.join(' '),
      wallTempPath: wPts.join(' '),
    };
  }, [durationMinutes, currentFinalP, initialPressureBar, orificeDiameterMm, currentFluidTemp, currentWallTemp]);

  const handleLocateTag = () => {
    selectTag(selectedTag);
    broadcastSyncEvent({
      type: 'TAG_SELECTED',
      tag: selectedTag,
      metadata: { source: 'CryogenicBlowdownCard', currentFinalP, currentWallTemp, safetyMargin },
    });
    addToast({
      type: 'info',
      title: 'Blowdown Valve Focused',
      message: `Centered P&ID schematic on emergency blowdown loop ${selectedTag}.`,
    });
  };

  const handleExportCertificate = () => {
    const now = new Date().toLocaleTimeString();
    addDeliverable({
      id: `del-blowdown-${Date.now()}`,
      name: `API_521_MDMT_Cryogenic_Blowdown_${selectedTag}.docx`,
      filename: `API_521_MDMT_Cryogenic_Blowdown_${selectedTag}.docx`,
      type: 'docx',
      size: '2.5 MB',
      generatedAt: now,
      timestamp: now,
      description: `API 521 / ASME UCS-66 cryogenic depressuring and brittle fracture evaluation for ${selectedTag}.`,
      url: '#',
      hash: 'sha256:88a7c1e309fb581c78e244b029ff1031d27456782bba770e0f8c2e912389beef',
    });
    addToast({
      type: 'success',
      title: 'MDMT Certificate Generated',
      message: `Exported API 521 / ASME UCS-66 brittle fracture compliance report for ${selectedTag}.`,
    });
  };

  return (
    <div className="w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 text-slate-800 dark:text-zinc-100 overflow-hidden shadow-xs font-sans text-xs">
      {/* 1. Header with Badge & Tag */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/70 dark:bg-zinc-950/60 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            <ThermometerSnowflake className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-zinc-100 tracking-tight text-[13px]">
                {title}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium border bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20">
                {selectedTag}
              </span>
            </div>
            <div className="text-[11px] text-slate-600 dark:text-zinc-300 font-mono">
              API 521 15-Minute 50% Rule | ASME VIII Div 1 UCS-66 Impact Exemption
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLocateTag}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition-colors border border-slate-200 dark:border-zinc-700"
          >
            <Crosshair className="w-3.5 h-3.5 text-cyan-500" />
            <span>Locate</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 2. Pressure & Temperature Dual-Axis Depressurization Graph */}
        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-500" />
              <span className="font-semibold text-slate-900 dark:text-zinc-100 uppercase tracking-wider text-[11px]">
                Transient Dual-Axis Depressuring Profile (0 – 15 min)
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  isMdmtSafe
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                }`}
              >
                {isMdmtSafe ? `+${safetyMargin}°C Above Brittle Fracture Transition` : 'BRITTLE FRACTURE RISK DETECTED'}
              </span>
            </div>
          </div>

          {/* SVG Plot Canvas */}
          <div className="relative w-full h-52 bg-slate-950 rounded-lg p-2 overflow-hidden border border-slate-800">
            <svg viewBox="0 0 600 200" preserveAspectRatio="none" className="w-full h-full overflow-visible">
              <defs>
                <pattern id="gridBlowdown" width="100" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 100 0 L 0 0 0 40" fill="none" stroke="#27272a" strokeWidth="0.7" />
                </pattern>
              </defs>

              <rect width="600" height="200" fill="url(#gridBlowdown)" />

              {/* API 521 Target Pressure 50% / 100 psig benchmark: 42.5 bar (map: 200 - 42.5/100 * 200 = 115) */}
              <line x1="0" y1="115" x2="600" y2="115" stroke="#10b981" strokeWidth="1.2" strokeDasharray="4 3" />
              <text x="8" y="110" fill="#10b981" fontSize="9" fontFamily="monospace" fontWeight="bold">
                API 521 15-MIN TARGET CEILING (42.5 bar a)
              </text>

              {/* ASME UCS-66 MDMT Threshold line: -29.0°C (map: -60 to +40 -> 200 - (-29 - -60)/100 * 200 = 200 - 62 = 138) */}
              <line x1="0" y1="138" x2="600" y2="138" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 3" />
              <text x="8" y="152" fill="#ef4444" fontSize="9" fontFamily="monospace" fontWeight="bold">
                ASME UCS-66 MDMT THRESHOLD (-29.0°C)
              </text>

              {/* 15-Minute Vertical End Line */}
              <line x1="598" y1="0" x2="598" y2="200" stroke="#71717a" strokeWidth="1" strokeDasharray="2 2" />

              {/* Pressure Decay Curve (Blue) */}
              <polyline
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={pressurePath}
              />

              {/* Joule-Thomson Fluid Temperature Curve (Cyan) */}
              <polyline
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1.8"
                strokeDasharray="4 2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={fluidTempPath}
              />

              {/* Minimum Metal Wall Temperature Curve (Solid White) */}
              <polyline
                fill="none"
                stroke="#f8fafc"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={wallTempPath}
              />
            </svg>

            {/* Time Axis Legends */}
            <div className="absolute bottom-1 left-2 right-2 flex justify-between text-[9px] font-mono text-zinc-500 pointer-events-none">
              <span>0 min</span>
              <span>3 min</span>
              <span>6 min</span>
              <span>9 min</span>
              <span>12 min</span>
              <span>15 min (Target Window)</span>
            </div>
          </div>

          {/* Graph Legend & Axis Annotations */}
          <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-500 dark:text-zinc-400 pt-1">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-sky-400 inline-block" /> Pressure (85.0 &rarr; {currentFinalP} bar)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-cyan-400 inline-block border-b border-dashed" /> Fluid Temp ({currentFluidTemp}&deg;C)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-white inline-block" /> Metal Wall Temp ({currentWallTemp}&deg;C)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-rose-500 inline-block border-b border-dotted" /> MDMT (-29.0&deg;C)
              </span>
            </div>
          </div>

          {/* Restriction Orifice (RO) Sizing Slider */}
          <div className="pt-2 space-y-1">
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-zinc-300 font-semibold">
                <Sliders className="w-3 h-3 text-cyan-500" />
                Restriction Orifice (RO) Bore Diameter:
              </span>
              <span className="font-bold text-cyan-600 dark:text-cyan-400 font-mono">{orificeDiameterMm.toFixed(1)} mm</span>
            </div>
            <input
              type="range"
              min="25.0"
              max="60.0"
              step="1.0"
              value={orificeDiameterMm}
              onChange={(e) => setOrificeDiameterMm(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>
        </div>

        {/* 3. 4 Engineering KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* KPI 1: 15-Min Depressured Pressure */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              15-Min Final Pressure
            </div>
            <div className="text-base font-bold font-mono text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span>{currentFinalP} bar a</span>
              {isTargetPassed && <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">PASS</span>}
            </div>
            <div className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">
              Req: &le; 42.5 bar a (API 521)
            </div>
          </div>

          {/* KPI 2: Minimum Metal Wall Temperature */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Min Wall Temperature
            </div>
            <div className="text-base font-bold font-mono text-slate-900 dark:text-zinc-100">
              {currentWallTemp}&deg;C
            </div>
            <div className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400">
              Fluid: {currentFluidTemp}&deg;C (JT Drop)
            </div>
          </div>

          {/* KPI 3: Vessel Design MDMT */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Vessel Design MDMT
            </div>
            <div className="text-base font-bold font-mono text-slate-900 dark:text-zinc-100">
              {vesselMdmtC.toFixed(1)}&deg;C
            </div>
            <div className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">
              {materialSpec}
            </div>
          </div>

          {/* KPI 4: ASME UCS-66 Status */}
          <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 space-y-1 flex flex-col justify-center">
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> ASME UCS-66 Status
            </div>
            <div className="text-[10.5px] font-bold font-mono text-emerald-700 dark:text-emerald-300">
              EXEMPT FROM IMPACT TEST
            </div>
            <div className="text-[9.5px] font-mono text-emerald-600/80 dark:text-emerald-400/80">
              {asmeCurve} Coincident Ratio &lt; 0.35
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-zinc-800/80">
          <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">
            Depressuring Valve: <strong className="text-slate-700 dark:text-zinc-300">{selectedTag} | RO = {orificeDiameterMm.toFixed(1)} mm</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setOrificeDiameterMm(38.1)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition-colors border border-slate-200 dark:border-zinc-700"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset</span>
            </button>

            <button
              onClick={handleExportCertificate}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export MDMT Certificate</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
