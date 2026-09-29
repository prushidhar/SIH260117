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
  Thermometer,
  Layers,
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import type { CathodicProtectionCuiWidgetProps } from '../types';

export default function CathodicProtectionCuiWidget({
  assetTag = 'PL-104',
  title = 'NACE SP0169 CATHODIC PROTECTION & API 581 CUI SWEATING ZONE',
  pipeToSoilPotentialMv = -945, // -945 mV vs CSE (-850 mV criterion)
  criterionMv = -850,
  anodeCurrentAmps = 14.2,
  rectifierVoltageVolts = 24.8,
  operatingTempC = 88.0,
  cuiZoneMinC = 50.0,
  cuiZoneMaxC = 150.0,
  insulationType = 'Mineral Wool with Aluminium Cladding',
  cuiRiskScore = 'HIGH',
  api581PofCategory = 4,
  api581CofCategory = 'C',
}: CathodicProtectionCuiWidgetProps) {
  const { selectTag, addDeliverable, addToast } = useIndraStore();

  const [tempC, setTempC] = useState<number>(operatingTempC);
  const [potentialMv, setPotentialMv] = useState<number>(pipeToSoilPotentialMv);

  // Check if pipe-to-soil potential satisfies NACE SP0169 criterion (more negative than -850 mV)
  const isCpProtected = potentialMv <= criterionMv;
  const cpOverprotection = potentialMv < -1200; // Hydrogen embrittlement / coating disbondment risk

  // Check CUI sweating zone: 50°C to 150°C is peak risk for cyclic condensation
  const isInCuiSweatingZone = tempC >= cuiZoneMinC && tempC <= cuiZoneMaxC;
  const isSevereCui = tempC >= 65 && tempC <= 110;

  // Dynamic calculated CUI status
  const cuiStatus = useMemo(() => {
    if (isSevereCui) return { label: 'CRITICAL CUI CONDENSATION ZONE', color: 'text-rose-400', badge: 'bg-rose-950/80 border-rose-700 text-rose-300' };
    if (isInCuiSweatingZone) return { label: 'ELEVATED CUI SWEATING RISK', color: 'text-amber-400', badge: 'bg-amber-950/80 border-amber-700 text-amber-300' };
    return { label: 'OUTSIDE SWEATING ZONE (DRY REGIME)', color: 'text-emerald-400', badge: 'bg-emerald-950/80 border-emerald-700 text-emerald-300' };
  }, [isInCuiSweatingZone, isSevereCui]);

  const handleLocateTag = () => {
    selectTag(assetTag);
    broadcastSyncEvent({
      type: 'TAG_SELECTED',
      tag: assetTag,
      metadata: {
        source: 'CathodicProtectionCuiWidget',
        potentialMv,
        tempC,
        cuiZone: isInCuiSweatingZone,
      },
    });
  };

  const handleExportCpAudit = () => {
    const now = new Date().toLocaleTimeString();
    addDeliverable({
      id: `del-cp-${Date.now()}`,
      name: `NACE_SP0169_CP_CUI_Audit_${assetTag}.docx`,
      filename: `NACE_SP0169_CP_CUI_Audit_${assetTag}.docx`,
      type: 'docx',
      size: '2.1 MB',
      generatedAt: now,
      timestamp: now,
      description: `NACE SP0169 / API 581 Cathodic Protection & CUI Integrity Report for ${assetTag}`,
      url: '#',
      hash: 'f7823901a87b1c09841829e71290384712093847109283741928374918237491',
    });

    addToast({
      type: 'success',
      title: 'Corrosion Deliverable Generated',
      message: `Cathodic protection and CUI audit report registered for ${assetTag}.`,
    });
  };

  return (
    <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl font-mono text-xs text-zinc-200 select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-zinc-800/80 gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handleLocateTag}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900/90 border border-emerald-700/80 text-emerald-300 font-bold transition-all cursor-pointer group"
            title="Locate asset on P&ID"
          >
            <Crosshair className="w-3.5 h-3.5 text-emerald-400 group-hover:rotate-45 transition-transform" />
            <span>{assetTag}</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-zinc-100 tracking-wider">{title}</h4>
              <span className="px-2 py-0.5 rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800 text-[9px] font-bold">
                NACE SP0169 / API 581
              </span>
            </div>
            <div className="text-[10px] text-zinc-400">
              Impression Current Rectifier: {rectifierVoltageVolts}V, {anodeCurrentAmps}A • Insul: {insulationType}
            </div>
          </div>
        </div>

        {/* Protection Pill */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold border ${
              isCpProtected && !cpOverprotection
                ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                : cpOverprotection
                ? 'bg-amber-950/80 border-amber-700 text-amber-300'
                : 'bg-rose-950/80 border-rose-700 text-rose-300'
            }`}
          >
            {isCpProtected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            <span>
              {isCpProtected
                ? cpOverprotection
                  ? 'CP OVER-PROTECTED (COATING STRESS)'
                  : 'NACE SP0169 COMPLIANT (-850mV PASS)'
                : 'UNDER-PROTECTED (CORROSION RISK)'}
            </span>
          </div>

          <button
            onClick={handleExportCpAudit}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-emerald-400 transition-colors cursor-pointer"
            title="Export CP & CUI report"
          >
            <FileCheck className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top 2 Primary Gauges: CP Potential Meter + CUI Thermal Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        {/* NACE SP0169 Pipe-to-Soil Potential Meter */}
        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-bold text-zinc-300 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              PIPE-TO-SOIL POLARIZED POTENTIAL (vs Cu/CuSO₄ CSE)
            </span>
            <span className={`font-bold ${isCpProtected ? 'text-emerald-400' : 'text-rose-400'}`}>
              {potentialMv} mV
            </span>
          </div>

          {/* Visual Potential Range Bar */}
          {/* -500 mV (unprotected) to -1300 mV (overprotected) */}
          <div className="h-5 w-full bg-zinc-950 rounded-lg border border-zinc-800 relative overflow-hidden flex items-center">
            {/* Safe NACE zone (-850 to -1150 mV) */}
            <div className="absolute left-[43.7%] w-[37.5%] h-full bg-emerald-950/80 border-x border-emerald-700/60" />
            {/* Danger Underprotected zone (-500 to -850 mV) */}
            <div className="absolute left-0 w-[43.7%] h-full bg-rose-950/40" />
            {/* Overprotected zone (-1150 to -1300 mV) */}
            <div className="absolute right-0 w-[18.8%] h-full bg-amber-950/40" />

            {/* Benchmark Marker at -850 mV (43.75%) */}
            <div className="absolute left-[43.75%] h-full w-0.5 bg-white z-10" />

            {/* Current Value Indicator Marker */}
            {/* Map potentialMv from -500 (0%) to -1300 (100%) */}
            {(() => {
              const pct = Math.max(0, Math.min(100, ((-potentialMv - 500) / (1300 - 500)) * 100));
              return (
                <div
                  className="absolute h-full w-2 bg-cyan-400 border border-white rounded z-20 shadow-md transition-all duration-300"
                  style={{ left: `calc(${pct}% - 4px)` }}
                />
              );
            })()}
          </div>

          <div className="flex items-center justify-between text-[9px] text-zinc-500">
            <span className="text-rose-400">-500 mV (Anodic Dissolution)</span>
            <span className="text-white font-bold">-850 mV Criterion</span>
            <span className="text-amber-400">-1,300 mV (Hydrogen Risk)</span>
          </div>
        </div>

        {/* CUI Sweating Zone Thermal Bar */}
        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-bold text-zinc-300 flex items-center gap-1">
              <Thermometer className="w-3.5 h-3.5 text-amber-400" />
              CUI SWEATING CONDENSATION THERMAL TRACKER
            </span>
            <span className={`font-bold ${cuiStatus.color}`}>
              {tempC.toFixed(1)}°C
            </span>
          </div>

          {/* Thermal Sweating Range Bar (0°C to 200°C) */}
          <div className="h-5 w-full bg-zinc-950 rounded-lg border border-zinc-800 relative overflow-hidden flex items-center">
            {/* CUI Sweating Zone (50°C to 150°C -> 25% to 75%) */}
            <div className="absolute left-[25%] w-[50%] h-full bg-amber-950/70 border-x border-amber-600/70" />
            {/* Peak Condensation Sub-Zone (65°C to 110°C -> 32.5% to 55%) */}
            <div className="absolute left-[32.5%] w-[22.5%] h-full bg-rose-950/80 border-x border-rose-600/60" />

            {/* Current Operating Temp Needle */}
            {(() => {
              const tempPct = Math.max(0, Math.min(100, (tempC / 200) * 100));
              return (
                <div
                  className="absolute h-full w-2 bg-amber-400 border border-white rounded z-20 shadow-md transition-all duration-300"
                  style={{ left: `calc(${tempPct}% - 4px)` }}
                />
              );
            })()}
          </div>

          <div className="flex items-center justify-between text-[9px] text-zinc-500">
            <span>0°C (Cold)</span>
            <span className="text-rose-400 font-bold">50°C - 150°C CUI ZONE</span>
            <span>200°C (Dry Regime)</span>
          </div>
        </div>
      </div>

      {/* API 581 5x5 Risk Matrix & CUI Assessment Strip */}
      <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 mb-3">
        <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-2">
          <span className="font-bold uppercase tracking-wider text-zinc-300">
            API 581 QUANTITATIVE RISK RANKING (POF {api581PofCategory} × COF {api581CofCategory})
          </span>
          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${cuiStatus.badge}`}>
            {cuiStatus.label}
          </span>
        </div>

        {/* 5x5 Mini Risk Matrix Grid */}
        <div className="grid grid-cols-5 gap-1 text-center font-bold text-[9px]">
          {['A', 'B', 'C', 'D', 'E'].map((cofCol) => (
            <div key={cofCol} className="space-y-1">
              {[5, 4, 3, 2, 1].map((pofRow) => {
                const isSelected = pofRow === api581PofCategory && cofCol === api581CofCategory;
                // Risk coloring
                const isHighRisk = pofRow >= 4 && (cofCol === 'D' || cofCol === 'E' || cofCol === 'C');
                const isMedRisk = (pofRow === 3 && cofCol !== 'A') || (pofRow >= 4 && (cofCol === 'A' || cofCol === 'B'));

                const cellBg = isSelected
                  ? 'bg-rose-500 text-black ring-2 ring-white animate-pulse'
                  : isHighRisk
                  ? 'bg-rose-950/70 text-rose-300 border border-rose-800'
                  : isMedRisk
                  ? 'bg-amber-950/70 text-amber-300 border border-amber-800'
                  : 'bg-zinc-900 text-zinc-500 border border-zinc-800';

                return (
                  <div
                    key={`${pofRow}-${cofCol}`}
                    className={`py-1 rounded transition-all ${cellBg}`}
                  >
                    {pofRow}{cofCol}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between text-[9px] text-zinc-500 mt-2">
          <span>&larr; COF Severity (A=Minor to E=Catastrophic) &rarr;</span>
          <span>Target NDT Inspection Interval: <strong className="text-zinc-300">12 Months (Pulsed Eddy Current)</strong></span>
        </div>
      </div>

      {/* Interactive Sliders: Temperature & CP Potential */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/90 space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-zinc-400 flex items-center gap-1 font-bold">
              <Sliders className="w-3 h-3 text-amber-400" />
              ADJUST OPERATING FLUID TEMPERATURE:
            </span>
            <span className="text-amber-400 font-bold">{tempC}°C</span>
          </div>
          <input
            type="range"
            min={20}
            max={180}
            step={2}
            value={tempC}
            onChange={(e) => setTempC(Number(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
          />
        </div>

        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/90 space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-zinc-400 flex items-center gap-1 font-bold">
              <Sliders className="w-3 h-3 text-cyan-400" />
              ADJUST CATHODIC POLARIZED POTENTIAL:
            </span>
            <span className="text-cyan-400 font-bold">{potentialMv} mV</span>
          </div>
          <input
            type="range"
            min={-1300}
            max={-600}
            step={10}
            value={potentialMv}
            onChange={(e) => setPotentialMv(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
          />
        </div>
      </div>

      {/* 4 Bottom Metric Callouts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px]">
        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-zinc-500 uppercase">ANODE BED CURRENT</div>
          <div className="font-bold text-zinc-200 mt-0.5">{anodeCurrentAmps} Amps</div>
        </div>

        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-zinc-500 uppercase">RECTIFIER DC VOLTS</div>
          <div className="font-bold text-zinc-200 mt-0.5">{rectifierVoltageVolts} Volts</div>
        </div>

        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-zinc-500 uppercase">NACE CRITERION</div>
          <div className="font-bold text-emerald-400 mt-0.5">-850 mV CSE</div>
        </div>

        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-zinc-500 uppercase">RECOMMENDED NDT</div>
          <div className="font-bold text-zinc-300 mt-0.5">PEC / Guided Wave</div>
        </div>
      </div>
    </div>
  );
}
