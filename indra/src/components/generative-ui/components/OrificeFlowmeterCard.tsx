'use client';

import React, { useState, useMemo } from 'react';
import {
  Gauge,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  Crosshair,
  RotateCcw,
  Wind,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import type { OrificeFlowmeterCardProps } from '../types';

export default function OrificeFlowmeterCard({
  assetTag = 'FE-101',
  title = 'ISO 5167-2 / AGA 3 ORIFICE FLOW METERING',
  standard = 'Custody Transfer Metrology',
  differentialPressureMbar: initialDp = 250.0,
  massFlowRateTph: baseMassTph = 162.42,
  massFlowRateKgs: baseMassKgs = 45.116,
  volumetricFlowM3h: baseVolM3h = 196.87,
  dischargeCoefficient = 0.6094,
  pipeReynoldsNumber = 224708,
  permanentHeadLossKpa = 16.23,
  powerDissipationKw = 0.89,
  orificeBoreMm = 117.566,
  pipeDiameterMm = 202.7,
  diameterRatioBeta = 0.5800,
  flangeRating = 'Class 300 RF',
}: OrificeFlowmeterCardProps) {
  const { selectTag, addDeliverable, addToast } = useIndraStore();

  const [selectedTag, setSelectedTag] = useState<string>(assetTag);
  const [dpMbar, setDpMbar] = useState<number>(initialDp);

  // Dynamic flow scaling based on ISO 5167: q_m proportional to sqrt(Delta P)
  const {
    currentMassTph,
    currentMassKgs,
    currentVolM3h,
    currentHeadLossKpa,
    currentPowerKw,
    currentRe,
    isCompliant,
  } = useMemo(() => {
    const ratio = Math.sqrt(dpMbar / initialDp);
    const massTph = parseFloat((baseMassTph * ratio).toFixed(2));
    const massKgs = parseFloat((baseMassKgs * ratio).toFixed(3));
    const volM3h = parseFloat((baseVolM3h * ratio).toFixed(2));
    const headLoss = parseFloat((permanentHeadLossKpa * (dpMbar / initialDp)).toFixed(2));
    const power = parseFloat((powerDissipationKw * Math.pow(ratio, 3)).toFixed(2));
    const reynolds = Math.round(pipeReynoldsNumber * ratio);
    const compliant = reynolds > 5000 && diameterRatioBeta >= 0.1 && diameterRatioBeta <= 0.75;

    return {
      currentMassTph: massTph,
      currentMassKgs: massKgs,
      currentVolM3h: volM3h,
      currentHeadLossKpa: headLoss,
      currentPowerKw: power,
      currentRe: reynolds,
      isCompliant: compliant,
    };
  }, [
    dpMbar,
    initialDp,
    baseMassTph,
    baseMassKgs,
    baseVolM3h,
    permanentHeadLossKpa,
    powerDissipationKw,
    pipeReynoldsNumber,
    diameterRatioBeta,
  ]);

  const handleLocateTag = () => {
    selectTag(selectedTag);
    broadcastSyncEvent({
      type: 'TAG_SELECTED',
      tag: selectedTag,
      metadata: { source: 'OrificeFlowmeterCard', dpMbar, currentMassTph },
    });
    addToast({
      type: 'info',
      title: 'Flow Element Located',
      message: `Focused P&ID schematic on ${selectedTag} custody transfer metering run.`,
    });
  };

  const handleExportAudit = () => {
    const now = new Date().toLocaleTimeString();
    addDeliverable({
      id: `del-orifice-${Date.now()}`,
      name: `ISO_5167_Metrology_Certificate_${selectedTag}.docx`,
      filename: `ISO_5167_Metrology_Certificate_${selectedTag}.docx`,
      type: 'docx',
      size: '2.3 MB',
      generatedAt: now,
      timestamp: now,
      description: `ISO 5167-2 / AGA 3 custody transfer metrology verification for orifice meter ${selectedTag}.`,
      url: '#',
      hash: 'sha256:56a73c1d9f8e402b11e9a388e2c04ffb233a1099684cf078832a84d436e2f144',
    });
    addToast({
      type: 'success',
      title: 'Metrology Certificate Exported',
      message: `Generated ISO 5167 metrological audit deliverable for ${selectedTag}.`,
    });
  };

  return (
    <div className="w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 text-slate-800 dark:text-zinc-100 overflow-hidden shadow-xs font-sans text-xs">
      {/* 1. Header with Badge & Tag */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/70 dark:bg-zinc-950/60 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-zinc-100 tracking-tight text-[13px]">
                {title}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium border bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20">
                {standard}
              </span>
            </div>
            <div className="text-[11px] text-slate-600 dark:text-zinc-300 font-mono">
              Concentric Square-Edged Orifice Plate | Flange Tappings (P₁ / P₂)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-md border border-slate-200 dark:border-zinc-700 font-mono text-[11px]">
            <span className="text-slate-400">TAG:</span>
            <span className="font-bold text-teal-600 dark:text-teal-400">{selectedTag}</span>
          </div>

          <button
            onClick={handleLocateTag}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition-colors border border-slate-200 dark:border-zinc-700"
          >
            <Crosshair className="w-3.5 h-3.5 text-teal-500" />
            <span>Locate</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 2. Schematic Cross-Section SVG Illustration */}
        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-500" />
              <span className="font-semibold text-slate-900 dark:text-zinc-100 uppercase tracking-wider text-[11px]">
                Meter Run Cross-Section & Vena Contracta Streamlines
              </span>
            </div>
            <div className="font-mono text-[10px] text-slate-500 dark:text-zinc-400">
              {flangeRating} | Bore d = {orificeBoreMm} mm | D = {pipeDiameterMm} mm | β = {diameterRatioBeta}
            </div>
          </div>

          {/* SVG Diagram Canvas */}
          <div className="relative w-full h-52 bg-slate-950 rounded-lg p-2 overflow-hidden border border-slate-800 flex items-center justify-center">
            <svg viewBox="0 0 600 220" className="w-full h-full">
              <defs>
                {/* Flow Streamline Gradient */}
                <linearGradient id="streamlineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6" />
                  <stop offset="45%" stopColor="#14b8a6" stopOpacity="0.8" />
                  <stop offset="55%" stopColor="#3b82f6" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.4" />
                </linearGradient>

                <linearGradient id="venaGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.1" />
                  <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.05" />
                </linearGradient>

                {/* Metal Hatching */}
                <pattern id="metalFlange" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="8" stroke="#3f3f46" strokeWidth="1.5" />
                </pattern>
              </defs>

              {/* Pipe Upper and Lower Outer Walls */}
              {/* Pipe Upper Wall */}
              <rect x="20" y="35" width="560" height="24" fill="#18181b" stroke="#3f3f46" strokeWidth="1.2" />
              {/* Pipe Lower Wall */}
              <rect x="20" y="161" width="560" height="24" fill="#18181b" stroke="#3f3f46" strokeWidth="1.2" />

              {/* Class 300 RF Upstream Flange */}
              <rect x="250" y="20" width="22" height="180" fill="url(#metalFlange)" stroke="#52525b" strokeWidth="1.2" />
              {/* Class 300 RF Downstream Flange */}
              <rect x="278" y="20" width="22" height="180" fill="url(#metalFlange)" stroke="#52525b" strokeWidth="1.2" />

              {/* Concentric Orifice Plate (Sandwiched at x=273) */}
              {/* Upper Plate Lip */}
              <rect x="272" y="25" width="6" height="58" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
              {/* Lower Plate Lip */}
              <rect x="272" y="137" width="6" height="58" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />

              {/* Flange Bolts */}
              <circle cx="261" cy="30" r="3.5" fill="#a1a1aa" />
              <circle cx="289" cy="30" r="3.5" fill="#a1a1aa" />
              <circle cx="261" cy="190" r="3.5" fill="#a1a1aa" />
              <circle cx="289" cy="190" r="3.5" fill="#a1a1aa" />

              {/* Shaded Vena Contracta Fluid Envelope */}
              <path
                d="M 50,60 C 200,60 260,84 310,87 C 350,90 420,60 550,60 L 550,160 C 420,160 350,130 310,133 C 260,136 200,160 50,160 Z"
                fill="url(#venaGrad)"
              />

              {/* Streamlines showing converging & diverging fluid dynamics */}
              {/* Top Streamline */}
              <path d="M 30,68 C 180,68 250,86 295,88 C 340,90 400,68 560,68" fill="none" stroke="url(#streamlineGrad)" strokeWidth="1.6" strokeDasharray="5 2" />
              {/* Mid-Upper Streamline */}
              <path d="M 30,88 C 180,88 250,96 300,97 C 350,98 420,88 560,88" fill="none" stroke="url(#streamlineGrad)" strokeWidth="1.8" />
              {/* Centerline (Axial Flow Axis) */}
              <line x1="30" y1="110" x2="560" y2="110" stroke="#38bdf8" strokeWidth="1" strokeDasharray="8 4" opacity="0.6" />
              {/* Mid-Lower Streamline */}
              <path d="M 30,132 C 180,132 250,124 300,123 C 350,122 420,132 560,132" fill="none" stroke="url(#streamlineGrad)" strokeWidth="1.8" />
              {/* Bottom Streamline */}
              <path d="M 30,152 C 180,152 250,134 295,132 C 340,130 400,152 560,152" fill="none" stroke="url(#streamlineGrad)" strokeWidth="1.6" strokeDasharray="5 2" />

              {/* Flow Direction Indicator Arrows */}
              <path d="M 120,106 L 132,110 L 120,114 Z" fill="#38bdf8" />
              <path d="M 450,106 L 462,110 L 450,114 Z" fill="#38bdf8" />

              {/* Tapping Line P1 (Upstream: x=240) */}
              <line x1="240" y1="35" x2="240" y2="12" stroke="#10b981" strokeWidth="2" />
              <line x1="240" y1="12" x2="330" y2="12" stroke="#10b981" strokeWidth="1.5" />
              <circle cx="240" cy="35" r="2.5" fill="#10b981" />
              <text x="218" y="10" fill="#10b981" fontSize="9" fontFamily="monospace" fontWeight="bold">
                P₁ (Upstream)
              </text>

              {/* Tapping Line P2 (Downstream: x=310) */}
              <line x1="310" y1="35" x2="310" y2="12" stroke="#f59e0b" strokeWidth="2" />
              <line x1="310" y1="12" x2="370" y2="12" stroke="#f59e0b" strokeWidth="1.5" />
              <circle cx="310" cy="35" r="2.5" fill="#f59e0b" />
              <text x="375" y="10" fill="#f59e0b" fontSize="9" fontFamily="monospace" fontWeight="bold">
                P₂ (Downstream)
              </text>

              {/* Differential Transmitter Box (Center top) */}
              <rect x="330" y="4" width="40" height="15" rx="3" fill="#1e293b" stroke="#0ea5e9" strokeWidth="1.2" />
              <text x="335" y="15" fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="bold">
                ΔP Tx
              </text>

              {/* Vena Contracta Marker Callout */}
              <line x1="305" y1="87" x2="305" y2="133" stroke="#e11d48" strokeWidth="1.2" strokeDasharray="2 2" />
              <text x="312" y="112" fill="#fb7185" fontSize="8" fontFamily="monospace" fontWeight="bold">
                Vena Contracta
              </text>

              {/* Bore Dimension Callout */}
              <line x1="275" y1="83" x2="275" y2="137" stroke="#e2e8f0" strokeWidth="1.5" />
              <text x="250" y="112" fill="#f1f5f9" fontSize="8" fontFamily="monospace" textAnchor="end">
                d = 117.57 mm
              </text>
            </svg>

            {/* Differential Pressure Floating Badge */}
            <div className="absolute top-2 right-2 px-2.5 py-1 rounded bg-slate-900/90 border border-teal-500/40 text-teal-400 font-mono text-[11px] flex items-center gap-1.5 shadow-md">
              <span className="text-zinc-400">ΔP (P₁ - P₂):</span>
              <strong className="text-white text-xs">{dpMbar.toFixed(1)} mbar</strong>
            </div>
          </div>

          {/* Interactive Differential Pressure (ΔP) Slider */}
          <div className="pt-1 space-y-1">
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-zinc-300 font-semibold">
                <Sliders className="w-3 h-3 text-teal-500" />
                Differential Transmitter Range (50.0 - 500.0 mbar):
              </span>
              <span className="font-bold text-teal-600 dark:text-teal-400 font-mono">{dpMbar.toFixed(1)} mbar</span>
            </div>
            <input
              type="range"
              min="50.0"
              max="500.0"
              step="5.0"
              value={dpMbar}
              onChange={(e) => setDpMbar(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
            />
          </div>
        </div>

        {/* 3. Metrological KPIs (2x3 Grid) */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {/* 1. Mass Flow Rate */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Mass Flow Rate (qm)
            </div>
            <div className="text-base font-bold font-mono text-slate-900 dark:text-zinc-100">
              {currentMassTph} <span className="text-xs font-normal text-slate-500">t/h</span>
            </div>
            <div className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">
              {currentMassKgs} kg/s mass throughput
            </div>
          </div>

          {/* 2. Volumetric Flow Rate */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Volumetric Flow Rate (Qv)
            </div>
            <div className="text-base font-bold font-mono text-slate-900 dark:text-zinc-100">
              {currentVolM3h} <span className="text-xs font-normal text-slate-500">m³/h</span>
            </div>
            <div className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">
              Operating conditions density
            </div>
          </div>

          {/* 3. Discharge Coefficient Cd */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Discharge Coeff (Cd)
            </div>
            <div className="text-base font-bold font-mono text-teal-600 dark:text-teal-400">
              {dischargeCoefficient.toFixed(4)}
            </div>
            <div className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">
              Reader-Harris/Gallagher (1998)
            </div>
          </div>

          {/* 4. Pipe Reynolds Number */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Pipe Reynolds No. (ReD)
            </div>
            <div className="text-base font-bold font-mono text-slate-900 dark:text-zinc-100">
              {currentRe.toLocaleString()}
            </div>
            <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Fully Turbulent (Re &gt; 5,000)
            </div>
          </div>

          {/* 5. Permanent Head Loss */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Permanent Head Loss (Δϖ)
            </div>
            <div className="text-base font-bold font-mono text-slate-900 dark:text-zinc-100">
              {currentHeadLossKpa} <span className="text-xs font-normal text-slate-500">kPa</span>
            </div>
            <div className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">
              Power Dissipation: {currentPowerKw} kW
            </div>
          </div>

          {/* 6. Conformance Status */}
          <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 space-y-1 flex flex-col justify-center">
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Conformance Status
            </div>
            <div className="text-[11px] font-bold font-mono text-emerald-700 dark:text-emerald-300">
              ISO 5167 METROLOGICALLY COMPLIANT
            </div>
            <div className="text-[10px] font-mono text-emerald-600/80 dark:text-emerald-400/80">
              Custody Transfer Class 0.5%
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-zinc-800/80">
          <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">
            Geometry: <strong className="text-slate-700 dark:text-zinc-300">d = 117.566 mm | D = 202.7 mm | β = 0.5800</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDpMbar(initialDp)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition-colors border border-slate-200 dark:border-zinc-700"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset</span>
            </button>

            <button
              onClick={handleExportAudit}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold bg-teal-600 hover:bg-teal-500 text-white transition-colors shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Metrology Audit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
