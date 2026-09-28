'use client';

import React, { useState } from 'react';
import { 
  Flame, 
  Leaf, 
  DollarSign, 
  Zap, 
  Crosshair, 
  FileSpreadsheet, 
  Layers, 
  CheckCircle2, 
  Info,
  ArrowRight
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import type { PinchNetworkCardProps } from '../types';

export default function PinchNetworkCard({
  assetTag = 'HEN-400',
  title = 'LINNHOFF PINCH ANALYSIS & HEAT EXCHANGER NETWORK',
  standard = 'TEMA / 2nd-Law Exergy',
  recoveredHeatMW = 34.58,
  recoveryPercent = 93.0,
  deltaTMin = 10.0,
  pinchHotTemp = 340.0,
  pinchColdTemp = 330.0,
  annualSavingsUSD = '$7,110,755 USD/year',
  avoidedCarbonTonnes = '58,664 tonnes CO₂/yr',
  exergeticEfficiency = 72.9,
  exergyDestructionMW = 4.11,
  hotUtilityMinMW = 2.61,
  coldUtilityMinMW = 1.85,
}: PinchNetworkCardProps) {
  const { selectTag, addDeliverable, addToast } = useIndraStore();

  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; temp: string; enthalpy: string } | null>(null);

  const handleLocateTag = () => {
    if (assetTag) {
      selectTag(assetTag);
      broadcastSyncEvent({
        type: 'TAG_SELECTED',
        tag: assetTag,
        metadata: { source: 'PinchNetworkCard', recoveredHeatMW, deltaTMin },
      });
      addToast({
        type: 'info',
        title: 'HEN Network Focused',
        message: `Centered P&ID schematic on ${assetTag} maximum energy recovery network.`,
      });
    }
  };

  const handleExportReport = () => {
    const now = new Date().toLocaleTimeString();
    addDeliverable({
      id: `del-pinch-${Date.now()}`,
      name: `Linnhoff_Pinch_Analysis_${assetTag}.docx`,
      filename: `Linnhoff_Pinch_Analysis_${assetTag}.docx`,
      type: 'docx',
      size: '2.4 MB',
      generatedAt: now,
      timestamp: now,
      description: `TEMA Second-Law Exergy & Linnhoff Pinch optimization deliverable for ${assetTag}.`,
      url: '#',
      hash: 'sha256:8b4e21a6c8893d58a70c0291f09bb2f97c413b59a68bc1d61a8ef71c045b7e21',
    });
    addToast({
      type: 'success',
      title: 'HEN Report Generated',
      message: `Exported thermodynamic pinch analysis deliverable for ${assetTag}.`,
    });
  };

  return (
    <div className="w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 text-slate-800 dark:text-zinc-100 overflow-hidden shadow-xs font-sans text-xs">
      {/* 1. Header with Badge & Tag */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/70 dark:bg-zinc-950/60 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/60 flex items-center justify-center text-cyan-600 dark:text-cyan-400 flex-shrink-0">
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-slate-900 dark:text-zinc-100 tracking-tight text-xs sm:text-sm">
                {title}
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-cyan-100/70 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60">
                {standard}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              Maximum Energy Recovery (MER) Network &bull; Target Asset: <strong className="font-mono text-slate-700 dark:text-zinc-300">{assetTag}</strong>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[11px] font-mono font-bold">
            <Layers className="w-3.5 h-3.5 text-cyan-500" />
            <span>HEN NODE:</span>
            <span className="text-cyan-600 dark:text-cyan-400">{assetTag}</span>
          </div>

          <button
            onClick={handleLocateTag}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 text-[11px] font-mono transition-colors cursor-pointer"
            title={`Focus ${assetTag} on P&ID`}
          >
            <Crosshair className="w-3 h-3 text-cyan-500" />
            <span className="hidden sm:inline">Locate HEN</span>
          </button>

          <button
            onClick={handleExportReport}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-mono font-bold transition-colors cursor-pointer shadow-xs"
            title="Export TEMA Pinch Deliverable"
          >
            <FileSpreadsheet className="w-3 h-3" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* 2. Temperature-Enthalpy (T-H) Composite Curve Section */}
      <div className="p-4 space-y-4">
        <div className="rounded-xl border border-slate-200/90 dark:border-zinc-800/90 bg-slate-50/60 dark:bg-zinc-950/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-slate-700 dark:text-zinc-200">
                Temperature &ndash; Enthalpy (T-H) Composite Curves
              </span>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                Energy cascade representation showing maximum overlap between process heat sinks and sources.
              </p>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-[10px] font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-rose-500 inline-block rounded" />
                <span className="text-slate-600 dark:text-zinc-300 font-semibold">Hot Composite (370°C &rarr; 140°C)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-blue-500 inline-block rounded" />
                <span className="text-slate-600 dark:text-zinc-300 font-semibold">Cold Composite (40°C &rarr; 330°C)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                <span className="text-amber-600 dark:text-amber-400 font-bold">&Delta;Tmin = {deltaTMin}°C Pinch</span>
              </div>
            </div>
          </div>

          {/* SVG Interactive T-H Chart Viewport */}
          <div className="relative w-full h-[240px] bg-white dark:bg-zinc-900 rounded-lg border border-slate-200/70 dark:border-zinc-800/80 p-2 overflow-hidden select-none">
            <svg viewBox="0 0 520 230" className="w-full h-full overflow-visible">
              <defs>
                {/* Heat Recovery Area Gradient */}
                <linearGradient id="pinchRecoveryGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.20" />
                  <stop offset="90%" stopColor="#f59e0b" stopOpacity="0.30" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.15" />
                </linearGradient>

                <pattern id="gridPattern" width="40" height="25" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 25" fill="none" stroke="currentColor" className="text-slate-100 dark:text-zinc-800/60" strokeWidth="0.75" />
                </pattern>
              </defs>

              {/* Grid Background */}
              <rect x="50" y="15" width="450" height="175" fill="url(#gridPattern)" />

              {/* Axes lines */}
              {/* Y Axis (Temp) */}
              <line x1="50" y1="15" x2="50" y2="190" stroke="currentColor" className="text-slate-300 dark:text-zinc-700" strokeWidth="1.5" />
              {/* X Axis (Enthalpy) */}
              <line x1="50" y1="190" x2="500" y2="190" stroke="currentColor" className="text-slate-300 dark:text-zinc-700" strokeWidth="1.5" />

              {/* Y Axis Labels (Temperature in °C) */}
              <text x="42" y="24" className="text-[9px] font-mono fill-slate-400" textAnchor="end">400°C</text>
              <text x="42" y="65" className="text-[9px] font-mono fill-slate-400" textAnchor="end">300°C</text>
              <text x="42" y="110" className="text-[9px] font-mono fill-slate-400" textAnchor="end">200°C</text>
              <text x="42" y="155" className="text-[9px] font-mono fill-slate-400" textAnchor="end">100°C</text>
              <text x="42" y="193" className="text-[9px] font-mono fill-slate-400" textAnchor="end">0°C</text>

              {/* X Axis Labels (Enthalpy H in MWth) */}
              <text x="50" y="206" className="text-[9px] font-mono fill-slate-400" textAnchor="middle">0</text>
              <text x="160" y="206" className="text-[9px] font-mono fill-slate-400" textAnchor="middle">10</text>
              <text x="270" y="206" className="text-[9px] font-mono fill-slate-400" textAnchor="middle">20</text>
              <text x="385" y="206" className="text-[9px] font-mono fill-slate-400" textAnchor="middle">30</text>
              <text x="495" y="206" className="text-[9px] font-mono fill-slate-400" textAnchor="middle">40 MW</text>

              {/* Shaded Heat Recovery Zone between curves:
                  Hot Curve coords:
                  (60, 36.5) [370°C] -> (200, 48) [345°C] -> (385, 52) [340°C PINCH] -> (465, 142) [140°C]
                  Cold Curve coords:
                  (465, 56.5) [330°C] -> (385, 56.5) [330°C PINCH] -> (200, 115) [200°C] -> (70, 187) [40°C]
              */}
              <path
                d="M 60 36.5 
                   L 200 48 
                   L 385 52 
                   L 465 142 
                   L 465 56.5 
                   L 385 56.5 
                   L 200 115 
                   L 70 187 
                   Z"
                fill="url(#pinchRecoveryGrad)"
                className="transition-opacity hover:opacity-90"
              />

              {/* Shaded Recovery Center Annotation */}
              <rect x="180" y="75" width="200" height="24" rx="4" className="fill-white/80 dark:fill-zinc-950/80 stroke-emerald-500/30" />
              <text x="280" y="91" className="text-[9px] font-mono font-bold fill-emerald-600 dark:fill-emerald-400" textAnchor="middle">
                Internal Heat Recovery: {recoveredHeatMW} MWth ({recoveryPercent}%)
              </text>

              {/* Cold Composite Curve (Blue Line from 40°C up to 330°C) */}
              <polyline
                points="70,187 200,115 385,56.5 465,56.5"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Hot Composite Curve (Red Line from 370°C down to 140°C) */}
              <polyline
                points="60,36.5 200,48 385,52 465,142"
                fill="none"
                stroke="#ef4444"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* PINCH POINT Vertical Marker Line */}
              <line
                x1="385"
                y1="15"
                x2="385"
                y2="190"
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />

              {/* Hot Pinch Point Marker Dot */}
              <circle cx="385" cy="52" r="5" className="fill-rose-500 stroke-white dark:stroke-zinc-900" strokeWidth="2" />

              {/* Cold Pinch Point Marker Dot */}
              <circle cx="385" cy="56.5" r="5" className="fill-blue-500 stroke-white dark:stroke-zinc-900" strokeWidth="2" />

              {/* Pinch Callout Pill Tag */}
              <g transform="translate(290, 18)">
                <rect width="190" height="20" rx="4" className="fill-amber-500/90 text-white" />
                <text x="95" y="14" className="text-[9px] font-mono font-bold fill-white" textAnchor="middle">
                  PINCH: &Delta;Tmin = {deltaTMin}°C (Hot: {pinchHotTemp}°C / Cold: {pinchColdTemp}°C)
                </text>
              </g>

              {/* End Point Dot Callouts */}
              <circle cx="60" cy="36.5" r="3.5" className="fill-rose-600" />
              <text x="65" y="32" className="text-[8px] font-mono font-bold fill-rose-500">370°C</text>

              <circle cx="465" cy="142" r="3.5" className="fill-rose-600" />
              <text x="470" y="146" className="text-[8px] font-mono font-bold fill-rose-500">140°C</text>

              <circle cx="70" cy="187" r="3.5" className="fill-blue-600" />
              <text x="75" y="182" className="text-[8px] font-mono font-bold fill-blue-500">40°C</text>

              <circle cx="465" cy="56.5" r="3.5" className="fill-blue-600" />
              <text x="470" y="60" className="text-[8px] font-mono font-bold fill-blue-500">330°C</text>
            </svg>
          </div>

          {/* Minimum Utilities Callout Footer */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-zinc-800/80 text-[11px] font-mono">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-zinc-400">Target External Utilities:</span>
              <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 font-bold border border-rose-200 dark:border-rose-900/60">
                Hot Utility (QH,min): {hotUtilityMinMW} MWth
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-900/60">
                Cold Utility (QC,min): {coldUtilityMinMW} MWth
              </span>
            </div>

            <div className="flex items-center gap-1 text-slate-500 dark:text-zinc-400">
              <Info className="w-3.5 h-3.5 text-cyan-500" />
              <span>Network Topology: 6 TEMA Shell &amp; Tube Units</span>
            </div>
          </div>
        </div>

        {/* 3. Financial & Sustainability Impact Cards (3 Cards Grid) */}
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500 dark:text-zinc-400 mb-2">
            Thermodynamic, Financial &amp; Decarbonization Yield
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Card 1: Annual Fuel Gas Savings */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950/70 border border-slate-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-zinc-400">
                  Annual Fuel Gas Savings
                </span>
                <div className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="mt-2 text-xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
                {annualSavingsUSD}
              </div>

              <p className="mt-1 text-[10px] font-mono text-slate-500 dark:text-zinc-400">
                Direct fuel reduction in natural gas fired heaters (LHV = 48.5 MJ/kg).
              </p>
            </div>

            {/* Card 2: Avoided Carbon Emissions */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950/70 border border-slate-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-zinc-400">
                  Avoided Carbon Emissions
                </span>
                <div className="w-6 h-6 rounded-md bg-cyan-100 dark:bg-cyan-950/60 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                  <Leaf className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="mt-2 text-xl font-mono font-extrabold text-cyan-600 dark:text-cyan-400 tracking-tight">
                {avoidedCarbonTonnes}
              </div>

              <p className="mt-1 text-[10px] font-mono text-slate-500 dark:text-zinc-400">
                Scope 1 emission abatement per GHG Protocol combustion factors.
              </p>
            </div>

            {/* Card 3: Second-Law Exergetic Efficiency & Destruction */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950/70 border border-slate-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-zinc-400">
                  Second-Law Exergetic Efficiency
                </span>
                <div className="w-6 h-6 rounded-md bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Zap className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="mt-2 text-xl font-mono font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight flex items-baseline gap-2">
                <span>{exergeticEfficiency}%</span>
                <span className="text-[11px] font-normal text-purple-600 dark:text-purple-400 font-mono">
                  ({exergyDestructionMW} MW Exergy Loss)
                </span>
              </div>

              <p className="mt-1 text-[10px] font-mono text-slate-500 dark:text-zinc-400">
                Carnot work potential utilization across all 6 exchanger shells.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
