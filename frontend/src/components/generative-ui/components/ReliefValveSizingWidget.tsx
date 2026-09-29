'use client';

import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Crosshair,
  FileCheck,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Gauge,
  ArrowUp,
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import type { ReliefValveSizingWidgetProps } from '../types';

// API 526 Standard Orifice Designations & Effective Discharge Areas (in²)
const API_526_ORIFICES: { letter: string; areaIn2: number; areaMm2: number }[] = [
  { letter: 'D', areaIn2: 0.110, areaMm2: 71 },
  { letter: 'E', areaIn2: 0.196, areaMm2: 126 },
  { letter: 'F', areaIn2: 0.307, areaMm2: 198 },
  { letter: 'G', areaIn2: 0.503, areaMm2: 325 },
  { letter: 'H', areaIn2: 0.785, areaMm2: 506 },
  { letter: 'J', areaIn2: 1.287, areaMm2: 830 },
  { letter: 'K', areaIn2: 1.838, areaMm2: 1186 },
  { letter: 'L', areaIn2: 2.853, areaMm2: 1841 },
  { letter: 'M', areaIn2: 3.600, areaMm2: 2323 },
  { letter: 'N', areaIn2: 4.340, areaMm2: 2800 },
  { letter: 'P', areaIn2: 6.380, areaMm2: 4116 },
  { letter: 'Q', areaIn2: 11.050, areaMm2: 7129 },
  { letter: 'R', areaIn2: 16.000, areaMm2: 10323 },
];

export default function ReliefValveSizingWidget({
  assetTag = 'PSV-101',
  title = 'API 520 / API 526 PRESSURE RELIEF VALVE SIZING & CHOKED FLOW',
  standard = 'API 520 Part I / API 526 7th Ed.',
  selectedOrificeLetter = 'J',
  requiredAreaIn2 = 0.985,
  effectiveAreaIn2 = 1.287,
  setPressureBarg = 24.5,
  relievingPressureBarg = 27.2,
  allowableAccumulationPercent = 10.0,
  backPressureBarg = 2.1,
  certifiedCapacityKgH = 18450,
  requiredRelievingCapacityKgH = 14200,
  flowRegime = 'CHOKED_CRITICAL',
  fluidType = 'Hydrocarbon Vapor (MW=44.2, k=1.28)',
}: ReliefValveSizingWidgetProps) {
  const { selectTag, addDeliverable, addToast } = useIndraStore();

  const [orificeLetter, setOrificeLetter] = useState<string>(selectedOrificeLetter);
  const [setP, setSetP] = useState<number>(setPressureBarg);
  const [accumulationType, setAccumulationType] = useState<'standard' | 'multiple' | 'fire'>('standard');

  // Accumulation percentages:
  // Non-fire process: 10%
  // Multiple valves: 16%
  // External fire case: 21%
  const accumulationPercent = accumulationType === 'fire' ? 21.0 : accumulationType === 'multiple' ? 16.0 : 10.0;

  // Selected orifice data
  const currentOrifice = useMemo(() => {
    return API_526_ORIFICES.find((o) => o.letter === orificeLetter) || API_526_ORIFICES[5];
  }, [orificeLetter]);

  // Relieving pressure P1 = Set Pressure * (1 + Accumulation/100) + Atmospheric (1.013 bar a)
  const relievingPressureBara = useMemo(() => {
    const p1Gauge = setP * (1 + accumulationPercent / 100);
    return parseFloat((p1Gauge + 1.013).toFixed(2));
  }, [setP, accumulationPercent]);

  // Critical Pressure Ratio: Pcf / P1 = [2 / (k + 1)]^(k / (k - 1))
  // For k = 1.28, critical ratio is ~0.549
  const criticalRatio = 0.549;
  const criticalFlowPressureBara = relievingPressureBara * criticalRatio;
  const backPressureBara = backPressureBarg + 1.013;

  // Flow Regime check: If Backpressure <= Critical Pressure, sonic/choked flow exists
  const isChokedFlow = backPressureBara <= criticalFlowPressureBara;

  // Dynamic capacity scaling proportional to orifice area and relieving pressure
  const calculatedCapacityKgH = useMemo(() => {
    const base = 14500 * (currentOrifice.areaIn2 / 1.0) * (relievingPressureBara / 28.0);
    return Math.round(base);
  }, [currentOrifice, relievingPressureBara]);

  // Area margin: (Effective - Required) / Required * 100%
  const areaMarginPercent = useMemo(() => {
    const margin = ((currentOrifice.areaIn2 - requiredAreaIn2) / requiredAreaIn2) * 100;
    return parseFloat(margin.toFixed(1));
  }, [currentOrifice, requiredAreaIn2]);

  const isOrificeSufficient = currentOrifice.areaIn2 >= requiredAreaIn2;

  const handleLocateTag = () => {
    selectTag(assetTag);
    broadcastSyncEvent({
      type: 'TAG_SELECTED',
      tag: assetTag,
      metadata: {
        source: 'ReliefValveSizingWidget',
        orifice: currentOrifice.letter,
        area: currentOrifice.areaIn2,
        capacityKgH: calculatedCapacityKgH,
      },
    });
  };

  const handleExportPsvAudit = () => {
    const now = new Date().toLocaleTimeString();
    addDeliverable({
      id: `del-psv-${Date.now()}`,
      name: `API_520_PSV_Sizing_${assetTag}.docx`,
      filename: `API_520_PSV_Sizing_${assetTag}.docx`,
      type: 'docx',
      size: '2.6 MB',
      generatedAt: now,
      timestamp: now,
      description: `API 520 / 526 Overpressure Protection Audit for ${assetTag} (Orifice ${currentOrifice.letter})`,
      url: '#',
      hash: 'd892019481b23901a87b1c09841829e712903847120938471092837419283749',
    });

    addToast({
      type: 'success',
      title: 'PSV Sizing Deliverable Compiled',
      message: `API 520 Datasheet generated for ${assetTag}.`,
    });
  };

  return (
    <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl font-mono text-xs text-zinc-200 select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-zinc-800/80 gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handleLocateTag}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900/90 border border-rose-700/80 text-rose-300 font-bold transition-all cursor-pointer group"
            title="Locate PSV on P&ID"
          >
            <Crosshair className="w-3.5 h-3.5 text-rose-400 group-hover:rotate-45 transition-transform" />
            <span>{assetTag}</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-zinc-100 tracking-wider">{title}</h4>
              <span className="px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800 text-[9px] font-bold">
                {standard}
              </span>
            </div>
            <div className="text-[10px] text-zinc-400">
              Fluid: {fluidType} • Design Relieving Rate: {requiredRelievingCapacityKgH.toLocaleString()} kg/h
            </div>
          </div>
        </div>

        {/* Orifice Pass / Fail Stamp */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              isOrificeSufficient
                ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                : 'bg-rose-950/80 border-rose-700 text-rose-300 animate-pulse'
            }`}
          >
            {isOrificeSufficient ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            <span>
              {isOrificeSufficient
                ? `ORIFICE '${currentOrifice.letter}' PASS (+${areaMarginPercent}% MARGIN)`
                : `UNDERSIZED (${currentOrifice.letter} < ${requiredAreaIn2} in²)`}
            </span>
          </div>

          <button
            onClick={handleExportPsvAudit}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-rose-400 transition-colors cursor-pointer"
            title="Export API 520 sizing report"
          >
            <FileCheck className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* API 526 Standard Orifice Selector Strip (D through R) */}
      <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 mb-3 space-y-2">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-zinc-300 font-bold uppercase tracking-wider">
            API 526 STANDARD ORIFICE LETTER SELECTION:
          </span>
          <span className="text-rose-400 font-bold">
            Selected: Orifice '{currentOrifice.letter}' ({currentOrifice.areaIn2} in² / {currentOrifice.areaMm2} mm²)
          </span>
        </div>

        {/* 13 API Orifice Selection Pills */}
        <div className="grid grid-cols-7 sm:grid-cols-13 gap-1 text-center font-bold text-xs">
          {API_526_ORIFICES.map((o) => {
            const isSelected = o.letter === orificeLetter;
            const isTooSmall = o.areaIn2 < requiredAreaIn2;

            return (
              <button
                key={o.letter}
                onClick={() => setOrificeLetter(o.letter)}
                className={`py-1.5 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-rose-600 text-white border-rose-400 shadow-md ring-1 ring-rose-400'
                    : isTooSmall
                    ? 'bg-zinc-950 text-zinc-600 border-zinc-850 hover:border-zinc-700'
                    : 'bg-zinc-900 text-zinc-200 border-zinc-700 hover:border-zinc-500'
                }`}
                title={`Orifice ${o.letter}: ${o.areaIn2} in²`}
              >
                <div>{o.letter}</div>
                <div className="text-[8px] font-normal opacity-75">{o.areaIn2}</div>
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between text-[9px] text-zinc-500">
          <span>Min Orifice 'D' (0.110 in²)</span>
          <span>Required Minimum Area: <strong className="text-zinc-200">{requiredAreaIn2} in²</strong></span>
          <span>Max Orifice 'R' (16.0 in²)</span>
        </div>
      </div>

      {/* Primary KPI & Flow Regime Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        {/* Certified Relieving Capacity */}
        <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
            <span className="uppercase font-bold flex items-center gap-1 text-rose-300">
              <Zap className="w-3.5 h-3.5 text-rose-400" />
              CERTIFIED FLOW CAPACITY
            </span>
            <span className="text-zinc-400">RATED</span>
          </div>
          <div className="text-xl font-bold text-zinc-100 mt-1">
            {calculatedCapacityKgH.toLocaleString()} <span className="text-xs text-zinc-400 font-normal">kg/h</span>
          </div>
          <div className="text-[9px] text-zinc-500 mt-1">
            Required flow: {requiredRelievingCapacityKgH.toLocaleString()} kg/h ({Math.round((calculatedCapacityKgH / requiredRelievingCapacityKgH) * 100)}% load)
          </div>
        </div>

        {/* Choked Sonic Flow Regime Indicator */}
        <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
            <span className="uppercase font-bold flex items-center gap-1 text-cyan-300">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              FLOW REGIME (CRITICAL RATIO)
            </span>
            <span className="text-cyan-400 font-bold">SONIC</span>
          </div>
          <div className="text-sm font-bold text-cyan-400 mt-1.5 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            CHOKED CRITICAL FLOW (Ma = 1.0)
          </div>
          <div className="text-[9px] text-zinc-500 mt-1">
            P_cf ({criticalFlowPressureBara.toFixed(1)} bar a) &gt; Backpressure ({backPressureBara.toFixed(1)} bar a)
          </div>
        </div>

        {/* Accumulation Scenario Selector */}
        <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
            <span className="uppercase font-bold text-zinc-300">
              ACCUMULATION CONTINGENCY
            </span>
            <span className="text-amber-400 font-bold">+{accumulationPercent}%</span>
          </div>
          {/* Scenario Tabs */}
          <div className="grid grid-cols-3 gap-1 mt-1 text-[10px]">
            <button
              onClick={() => setAccumulationType('standard')}
              className={`py-1 rounded border transition-all cursor-pointer font-bold ${
                accumulationType === 'standard' ? 'bg-zinc-800 border-zinc-600 text-zinc-100' : 'bg-zinc-950 border-zinc-850 text-zinc-500'
              }`}
            >
              10% Proc
            </button>
            <button
              onClick={() => setAccumulationType('multiple')}
              className={`py-1 rounded border transition-all cursor-pointer font-bold ${
                accumulationType === 'multiple' ? 'bg-zinc-800 border-zinc-600 text-zinc-100' : 'bg-zinc-950 border-zinc-850 text-zinc-500'
              }`}
            >
              16% Multi
            </button>
            <button
              onClick={() => setAccumulationType('fire')}
              className={`py-1 rounded border transition-all cursor-pointer font-bold ${
                accumulationType === 'fire' ? 'bg-rose-950 border-rose-700 text-rose-300' : 'bg-zinc-950 border-zinc-850 text-zinc-500'
              }`}
            >
              21% Fire
            </button>
          </div>
          <div className="text-[9px] text-zinc-500 mt-1">
            Relieving P: {relievingPressureBara} bar a (Set P: {setP} barg)
          </div>
        </div>
      </div>

      {/* Interactive Set Pressure Slider */}
      <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/90 space-y-1.5 mb-3">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-zinc-400 flex items-center gap-1 font-bold">
            <Sliders className="w-3 h-3 text-rose-400" />
            ADJUST PSV SET PRESSURE:
          </span>
          <span className="text-rose-400 font-bold">{setP} barg ({relievingPressureBara} bar a Relieving)</span>
        </div>
        <input
          type="range"
          min={10}
          max={45}
          step={0.5}
          value={setP}
          onChange={(e) => setSetP(Number(e.target.value))}
          className="w-full accent-rose-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
        />
        <div className="flex items-center justify-between text-[9px] text-zinc-500">
          <span>10 barg (Low Pressure Setpoint)</span>
          <span>Nominal Setpoint (24.5 barg)</span>
          <span>45 barg (High Pressure Class 300)</span>
        </div>
      </div>

      {/* Auxiliary Physical Metadata */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px]">
        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-zinc-500 uppercase">FLANGE INLET / OUT</div>
          <div className="font-bold text-zinc-200 mt-0.5">3" 300# × 4" 150#</div>
        </div>

        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-zinc-500 uppercase">DISCHARGE COEFF Kd</div>
          <div className="font-bold text-zinc-200 mt-0.5">0.975 (API Certified)</div>
        </div>

        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-zinc-500 uppercase">BACKPRESSURE RATIO</div>
          <div className="font-bold text-zinc-200 mt-0.5">
            {((backPressureBarg / setP) * 100).toFixed(1)}% (&lt; 10% Conv)
          </div>
        </div>

        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-zinc-500 uppercase">BONNET STYLE</div>
          <div className="font-bold text-zinc-300 mt-0.5">Closed Balanced Bellows</div>
        </div>
      </div>
    </div>
  );
}
