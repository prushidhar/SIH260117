'use client';

import React, { useState, useMemo } from 'react';
import {
  Grid,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  FileSpreadsheet,
  Crosshair,
  TrendingUp,
  Flame,
  DollarSign,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import type { RbiRiskMatrixCardProps } from '../types';

interface MatrixCellDef {
  pof: number; // 1 to 5
  cof: string; // 'A' | 'B' | 'C' | 'D' | 'E'
  level: 'Low' | 'Medium' | 'Medium-High' | 'High';
}

const POF_LABELS: Record<number, string> = {
  5: '5: >10⁻² /yr',
  4: '4: 10⁻³ - 10⁻²',
  3: '3: 10⁻⁴ - 10⁻³',
  2: '2: 10⁻⁵ - 10⁻⁴',
  1: '1: ≤10⁻⁵ /yr',
};

const COF_LABELS: Record<string, string> = {
  A: 'A: <$10k',
  B: 'B: $10k-$100k',
  C: 'C: $100k-$1M',
  D: 'D: $1M-$10M',
  E: 'E: >$10M',
};

// API 581 standard 5x5 Risk Level mapping
function getApi581RiskLevel(pof: number, cof: string): 'Low' | 'Medium' | 'Medium-High' | 'High' {
  const highCells = ['5E', '5D', '5C', '4E', '4D'];
  const medHighCells = ['5B', '4C', '3E', '3D', '2E'];
  const medCells = ['5A', '4B', '3C', '2D', '1E'];

  const id = `${pof}${cof}`;
  if (highCells.includes(id)) return 'High';
  if (medHighCells.includes(id)) return 'Medium-High';
  if (medCells.includes(id)) return 'Medium';
  return 'Low';
}

export default function RbiRiskMatrixCard({
  assetTag = 'V-301 (Hydrocracker High-Pressure Separator)',
  title = 'API 580 / API 581 QUANTITATIVE RISK-BASED INSPECTION (RBI)',
  standard = 'API 581 3rd Edition',
  activePofCategory: initialPof = 3,
  activeCofCategory: initialCof = 'D',
  multiMechanismDamageFactor = 21.1,
  thinningDamageFactor = 5.1,
  h2sSourDamageFactor = 15.0,
  cuiDamageFactor = 1.0,
  flammableReleaseAreaM2 = 7986.8,
  financialConsequenceUsd = 2190000,
  expectedAnnualizedLossUsd = 1201.72,
  targetIntervalYears = 3.0,
  nextPmWindow = 'Q3 2029',
  mandatoryMitigationTechnique = 'ONSTREAM EXTERNAL PEC & PHASED ARRAY ULTRASONIC GRID',
}: RbiRiskMatrixCardProps) {
  const { selectTag, addDeliverable, addToast } = useIndraStore();

  const [selectedAsset, setSelectedAsset] = useState<string>(assetTag);
  const [selectedPof, setSelectedPof] = useState<number>(initialPof);
  const [selectedCof, setSelectedCof] = useState<string>(initialCof);

  const activeRiskLevel = useMemo(() => {
    return getApi581RiskLevel(selectedPof, selectedCof);
  }, [selectedPof, selectedCof]);

  const pofCategories = [5, 4, 3, 2, 1];
  const cofCategories = ['A', 'B', 'C', 'D', 'E'];

  const handleCellClick = (pof: number, cof: string) => {
    setSelectedPof(pof);
    setSelectedCof(cof);
  };

  const handleLocateTag = () => {
    const tagMatch = selectedAsset.split(' ')[0] || 'V-301';
    selectTag(tagMatch);
    broadcastSyncEvent({
      type: 'TAG_SELECTED',
      tag: tagMatch,
      metadata: { source: 'RbiRiskMatrixCard', pof: selectedPof, cof: selectedCof, riskLevel: activeRiskLevel },
    });
    addToast({
      type: 'info',
      title: 'RBI Target Focused',
      message: `Centered P&ID schematic on ${tagMatch} risk node (Cell ${selectedPof}${selectedCof}).`,
    });
  };

  const handleExportRbi = () => {
    const now = new Date().toLocaleTimeString();
    const tagMatch = selectedAsset.split(' ')[0] || 'V-301';
    addDeliverable({
      id: `del-rbi-${Date.now()}`,
      name: `API_581_RBI_Assessment_${tagMatch}.docx`,
      filename: `API_581_RBI_Assessment_${tagMatch}.docx`,
      type: 'docx',
      size: '2.8 MB',
      generatedAt: now,
      timestamp: now,
      description: `API 580 / API 581 quantitative risk-based inspection strategy and damage mechanisms audit for ${selectedAsset}.`,
      url: '#',
      hash: 'sha256:7c91a0b32e185f4019da8211fc5e6b7201b1f89e13a9681bc26c04f91d830bca',
    });
    addToast({
      type: 'success',
      title: 'RBI Strategy Deliverable Generated',
      message: `Exported API 581 statutory inspection mandate for ${tagMatch}.`,
    });
  };

  // Cell color classes
  const getCellColor = (level: string, isSelected: boolean) => {
    if (isSelected) {
      return 'ring-2 ring-sky-400 ring-offset-1 ring-offset-zinc-900 z-10 scale-[1.03] shadow-lg';
    }
    switch (level) {
      case 'High':
        return 'bg-rose-500/20 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/30';
      case 'Medium-High':
        return 'bg-amber-500/20 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/30';
      case 'Medium':
        return 'bg-yellow-500/20 dark:bg-yellow-950/30 text-yellow-600 dark:text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/30';
      case 'Low':
      default:
        return 'bg-emerald-500/20 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30';
    }
  };

  return (
    <div className="w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 text-slate-800 dark:text-zinc-100 overflow-hidden shadow-xs font-sans text-xs">
      {/* 1. Header with Badge & Asset Selector */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/70 dark:bg-zinc-950/60 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
            <Grid className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-zinc-100 tracking-tight text-[13px]">
                {title}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium border bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20">
                {standard}
              </span>
            </div>
            <div className="text-[11px] text-slate-600 dark:text-zinc-300 font-mono">
              Quantitative POF × COF Risk Ranking & Non-Destructive Testing Strategy
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedAsset}
            onChange={(e) => setSelectedAsset(e.target.value)}
            className="text-[11px] font-mono px-2.5 py-1 rounded-md border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            <option value="V-301 (Hydrocracker High-Pressure Separator)">
              V-301 (Hydrocracker High-Pressure Separator)
            </option>
            <option value="D-105 (Amine Regenerator Column)">
              D-105 (Amine Regenerator Column)
            </option>
            <option value="C-201 (Fractionator Tower Overhead)">
              C-201 (Fractionator Tower Overhead)
            </option>
          </select>

          <button
            onClick={handleLocateTag}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition-colors border border-slate-200 dark:border-zinc-700"
          >
            <Crosshair className="w-3.5 h-3.5 text-orange-500" />
            <span>Locate</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 2. Interactive 5x5 Risk Matrix */}
        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-zinc-100 uppercase tracking-wider text-[11px]">
                API 581 5×5 Quantitative Risk Matrix
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono">
              <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                Operating Coordinate:
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold border bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30">
                Cell {selectedPof}{selectedCof} - {activeRiskLevel.toUpperCase()} RISK
              </span>
            </div>
          </div>

          {/* Matrix Grid Layout */}
          <div className="grid grid-cols-6 gap-1.5 max-w-xl mx-auto pt-1 font-mono">
            {/* Top-Left Empty Header */}
            <div className="h-8 flex items-center justify-center text-[10px] text-slate-400">
              POF \ COF
            </div>
            {/* COF Column Headers */}
            {cofCategories.map((cof) => (
              <div
                key={cof}
                className="h-8 flex flex-col items-center justify-center text-[9px] font-bold text-slate-700 dark:text-zinc-300 text-center leading-tight"
              >
                <span>{cof}</span>
                <span className="text-[8px] font-normal text-slate-400 dark:text-zinc-500">{COF_LABELS[cof].split(':')[1]}</span>
              </div>
            ))}

            {/* Matrix Rows (POF 5 to 1) */}
            {pofCategories.map((pof) => (
              <React.Fragment key={pof}>
                {/* Row Header */}
                <div className="h-11 flex flex-col items-end justify-center pr-2 text-[9px] font-bold text-slate-700 dark:text-zinc-300 leading-tight">
                  <span>{pof}</span>
                  <span className="text-[7.5px] font-normal text-slate-400 dark:text-zinc-500 text-right">{POF_LABELS[pof].split(':')[1]}</span>
                </div>

                {/* 5 Cells in this Row */}
                {cofCategories.map((cof) => {
                  const level = getApi581RiskLevel(pof, cof);
                  const isCurrent = pof === selectedPof && cof === selectedCof;
                  const isDefaultAsset = pof === initialPof && cof === initialCof;

                  return (
                    <button
                      key={`${pof}${cof}`}
                      onClick={() => handleCellClick(pof, cof)}
                      className={`relative h-11 rounded-md border flex flex-col items-center justify-center transition-all cursor-pointer ${getCellColor(
                        level,
                        isCurrent
                      )} ${
                        isCurrent
                          ? level === 'High'
                            ? 'bg-rose-500 text-white font-bold'
                            : level === 'Medium-High'
                            ? 'bg-amber-500 text-white font-bold'
                            : level === 'Medium'
                            ? 'bg-yellow-500 text-slate-900 font-bold'
                            : 'bg-emerald-500 text-white font-bold'
                          : ''
                      }`}
                    >
                      <span className="text-[10px] font-bold tracking-tight">
                        {pof}{cof}
                      </span>
                      <span className="text-[7.5px] uppercase opacity-80">
                        {level === 'Medium-High' ? 'Med-Hi' : level}
                      </span>

                      {/* Active Glowing Indicator for Asset Coordinate */}
                      {isCurrent && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500 border border-white"></span>
                        </span>
                      )}

                      {/* Asset Tag Marker Pill */}
                      {isDefaultAsset && !isCurrent && (
                        <span className="absolute -bottom-1 px-1 rounded text-[7px] font-bold bg-zinc-900 text-amber-400 border border-amber-500/50">
                          V-301
                        </span>
                      )}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          {/* Matrix Legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] font-mono text-slate-500 dark:text-zinc-400 pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500/50 border border-emerald-500 inline-block" /> Low Risk
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-yellow-500/50 border border-yellow-500 inline-block" /> Medium Risk
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-500/50 border border-amber-500 inline-block" /> Medium-High Risk
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-500/50 border border-rose-500 inline-block" /> High Risk
            </span>
          </div>
        </div>

        {/* 3. Consequence & Damage Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Multi-Mechanism Damage Factor */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400">
              <span className="text-[10px] font-mono uppercase tracking-wider">Damage Factor (DF)</span>
              <Layers className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-zinc-100">
              {multiMechanismDamageFactor}
            </div>
            <div className="text-[9.5px] font-mono text-slate-500 dark:text-zinc-400">
              Thin: {thinningDamageFactor} | H₂S: {h2sSourDamageFactor} | CUI: {cuiDamageFactor}
            </div>
          </div>

          {/* Flammable Release Consequence Area */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400">
              <span className="text-[10px] font-mono uppercase tracking-wider">Flammable Release Area</span>
              <Flame className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-zinc-100">
              {flammableReleaseAreaM2.toLocaleString()} <span className="text-xs font-normal text-slate-500">m²</span>
            </div>
            <div className="text-[9.5px] font-mono text-slate-500 dark:text-zinc-400">
              Auto-Ignition & Overpressure
            </div>
          </div>

          {/* Total Financial Consequence */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400">
              <span className="text-[10px] font-mono uppercase tracking-wider">Financial Consequence</span>
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-zinc-100">
              ${(financialConsequenceUsd / 1_000_000).toFixed(2)}M <span className="text-xs font-normal text-slate-500">USD</span>
            </div>
            <div className="text-[9.5px] font-mono text-slate-500 dark:text-zinc-400">
              Cat D Impact Envelope
            </div>
          </div>

          {/* Expected Annualized Loss */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400">
              <span className="text-[10px] font-mono uppercase tracking-wider">Annualized Loss</span>
              <TrendingUp className="w-3.5 h-3.5 text-sky-500" />
            </div>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-zinc-100">
              ${expectedAnnualizedLossUsd.toLocaleString()} <span className="text-xs font-normal text-slate-500">/yr</span>
            </div>
            <div className="text-[9.5px] font-mono text-slate-500 dark:text-zinc-400">
              Risk = POF × COF ($/year)
            </div>
          </div>
        </div>

        {/* 4. Statutory Inspection Mandate Banner */}
        <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/20 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wider text-[11px]">
              <Calendar className="w-4 h-4" />
              API 510 / API 581 Statutory Inspection Mandate
            </div>
            <div className="font-mono text-[11px] text-amber-800 dark:text-amber-300">
              Target Interval: <strong className="font-bold underline">{targetIntervalYears.toFixed(1)} Years</strong> (Next Window: {nextPmWindow})
            </div>
          </div>
          <div className="font-mono text-[10.5px] text-slate-700 dark:text-zinc-300 flex items-start gap-1.5">
            <span className="text-amber-600 dark:text-amber-400 font-bold">Mandatory NDT:</span>
            <span>{mandatoryMitigationTechnique}</span>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-zinc-800/80">
          <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">
            RBI Interval Strategy: <strong className="text-slate-700 dark:text-zinc-300">3.0 Years vs 10-Yr Max Statutory</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedPof(initialPof);
                setSelectedCof(initialCof);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition-colors border border-slate-200 dark:border-zinc-700"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset Matrix</span>
            </button>

            <button
              onClick={handleExportRbi}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold bg-orange-600 hover:bg-orange-500 text-white transition-colors shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export RBI Strategy</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
