'use client';

import React, { useState, useMemo } from 'react';
import {
  Droplets,
  Wind,
  Gauge,
  Crosshair,
  FileCheck,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Layers,
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import type { CoolingTowerPsychrometricWidgetProps } from '../types';

export default function CoolingTowerPsychrometricWidget({
  assetTag = 'CT-301',
  title = 'CTI ATC-105 COOLING TOWER PSYCHROMETRIC & THERMAL APPROACH',
  dryBulbTempC = 34.5,
  relativeHumidityPercent = 62.0,
  coldWaterSupplyTempC = 31.2,
  hotWaterReturnTempC = 41.8,
  circulatingWaterFlowM3h = 12500,
  cyclesOfConcentration = 4.8,
  coolingDutyMw = 154.2,
  evaporationRateM3h = 228.5,
  blowdownRateM3h = 60.1,
  driftLossPercent = 0.005,
}: CoolingTowerPsychrometricWidgetProps) {
  const { selectTag, addDeliverable, addToast } = useIndraStore();

  const [tDb, setTDb] = useState<number>(dryBulbTempC);
  const [rh, setRh] = useState<number>(relativeHumidityPercent);
  const [coc, setCoc] = useState<number>(cyclesOfConcentration);

  // Stull (2011) Empirical Wet-Bulb Temperature Formula:
  // Twb = Tdb * atan(0.151977 * (RH + 8.313659)^0.5) + atan(Tdb + RH) - atan(RH - 1.676331) + 0.00391838 * (RH)^1.5 * atan(0.023101 * RH) - 4.686035
  const wetBulbTempC = useMemo(() => {
    const term1 = tDb * Math.atan(0.151977 * Math.pow(rh + 8.313659, 0.5));
    const term2 = Math.atan(tDb + rh);
    const term3 = Math.atan(rh - 1.676331);
    const term4 = 0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh);
    const twb = term1 + term2 - term3 + term4 - 4.686035;
    return parseFloat(twb.toFixed(1));
  }, [tDb, rh]);

  // Cooling Range: Thwr - Tcws (usually ~10°C)
  const rangeDeltaC = useMemo(() => {
    return parseFloat((hotWaterReturnTempC - coldWaterSupplyTempC).toFixed(1));
  }, [hotWaterReturnTempC, coldWaterSupplyTempC]);

  // Tower Approach: Tcws - Twb (nominal ~4.0°C to 5.5°C)
  const approachDeltaC = useMemo(() => {
    const approach = coldWaterSupplyTempC - wetBulbTempC;
    return parseFloat(approach.toFixed(1));
  }, [coldWaterSupplyTempC, wetBulbTempC]);

  // Water balance:
  // Evaporation rate: E = 0.00085 * CircFlow * Range
  const calculatedEvapM3h = useMemo(() => {
    return parseFloat((0.00085 * circulatingWaterFlowM3h * rangeDeltaC * 1.8).toFixed(1));
  }, [circulatingWaterFlowM3h, rangeDeltaC]);

  // Blowdown rate: B = E / (COC - 1)
  const calculatedBlowdownM3h = useMemo(() => {
    if (coc <= 1.05) return 999;
    return parseFloat((calculatedEvapM3h / (coc - 1)).toFixed(1));
  }, [calculatedEvapM3h, coc]);

  // Approach compliance check (Design Approach = 4.2°C)
  const isApproachCompliant = approachDeltaC <= 5.5;

  const handleLocateTag = () => {
    selectTag(assetTag);
    broadcastSyncEvent({
      type: 'TAG_SELECTED',
      tag: assetTag,
      metadata: {
        source: 'CoolingTowerPsychrometricWidget',
        twb: wetBulbTempC,
        approach: approachDeltaC,
        coc,
      },
    });
  };

  const handleExportCtReport = () => {
    const now = new Date().toLocaleTimeString();
    addDeliverable({
      id: `del-ct-${Date.now()}`,
      name: `CTI_ATC_105_Thermal_Audit_${assetTag}.docx`,
      filename: `CTI_ATC_105_Thermal_Audit_${assetTag}.docx`,
      type: 'docx',
      size: '1.9 MB',
      generatedAt: now,
      timestamp: now,
      description: `CTI ATC-105 Cooling Tower Performance Acceptance Audit for ${assetTag}`,
      url: '#',
      hash: 'e892c01928471092837419283740192837401928374019283740192837401928',
    });

    addToast({
      type: 'success',
      title: 'Cooling Tower Audit Compiled',
      message: `Thermal acceptance test report generated for ${assetTag}.`,
    });
  };

  return (
    <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl font-mono text-xs text-zinc-200 select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-zinc-800/80 gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handleLocateTag}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900/90 border border-cyan-700/80 text-cyan-300 font-bold transition-all cursor-pointer group"
            title="Locate cooling tower on P&ID"
          >
            <Crosshair className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-45 transition-transform" />
            <span>{assetTag}</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-zinc-100 tracking-wider">{title}</h4>
              <span className="px-2 py-0.5 rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800 text-[9px] font-bold">
                CTI ATC-105
              </span>
            </div>
            <div className="text-[10px] text-zinc-400">
              Circulating Flow: {circulatingWaterFlowM3h.toLocaleString()} m³/h • Thermal Duty: {coolingDutyMw} MWth
            </div>
          </div>
        </div>

        {/* Approach Performance Badge */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold border ${
              isApproachCompliant
                ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                : 'bg-amber-950/80 border-amber-700 text-amber-300'
            }`}
          >
            {isApproachCompliant ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            <span>APPROACH: {approachDeltaC}°C ({isApproachCompliant ? 'PASS' : 'EXCEEDED'})</span>
          </div>

          <button
            onClick={handleExportCtReport}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-cyan-400 transition-colors cursor-pointer"
            title="Export CTI ATC-105 test report"
          >
            <FileCheck className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3 Core Psychrometric & Water Temperature Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        {/* Ambient Wet-Bulb Temp (Stull Equation) */}
        <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
            <span className="uppercase font-bold flex items-center gap-1 text-cyan-300">
              <Wind className="w-3.5 h-3.5 text-cyan-400" />
              STULL WET-BULB (Twb)
            </span>
            <span className="text-zinc-500">ATMOSPHERIC</span>
          </div>
          <div className="text-xl font-bold text-cyan-400 mt-1">
            {wetBulbTempC}°C
          </div>
          <div className="text-[9px] text-zinc-500 mt-1">
            Theoretical thermodynamic cooling limit at {rh}% RH
          </div>
        </div>

        {/* Thermal Approach Delta */}
        <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
            <span className="uppercase font-bold flex items-center gap-1 text-emerald-300">
              <Gauge className="w-3.5 h-3.5 text-emerald-400" />
              TOWER APPROACH (Tcws - Twb)
            </span>
            <span className="text-emerald-400 font-bold">&Delta;T</span>
          </div>
          <div className="text-xl font-bold text-zinc-100 mt-1">
            {approachDeltaC}°C
          </div>
          <div className="text-[9px] text-zinc-500 mt-1">
            Design benchmark: 4.2°C (Cold supply: {coldWaterSupplyTempC}°C)
          </div>
        </div>

        {/* Cooling Range */}
        <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
            <span className="uppercase font-bold flex items-center gap-1 text-amber-300">
              <Droplets className="w-3.5 h-3.5 text-amber-400" />
              COOLING RANGE (Thwr - Tcws)
            </span>
            <span className="text-amber-400 font-bold">&Delta;T</span>
          </div>
          <div className="text-xl font-bold text-zinc-100 mt-1">
            {rangeDeltaC}°C
          </div>
          <div className="text-[9px] text-zinc-500 mt-1">
            Hot return: {hotWaterReturnTempC}°C &rarr; Cold supply: {coldWaterSupplyTempC}°C
          </div>
        </div>
      </div>

      {/* Cycles of Concentration (COC) Chemistry & Water Balance Bar */}
      <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-2 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-zinc-300">
              CYCLES OF CONCENTRATION (COC) WATER CHEMISTRY:
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
              SILICA & HARDNESS SCALING ENVELOPE
            </span>
          </div>
          <span className="text-xs font-bold text-cyan-400">{coc.toFixed(1)}x COC</span>
        </div>

        {/* Segmented COC Bar */}
        <div className="h-4 w-full bg-zinc-950 rounded-full border border-zinc-800 relative overflow-hidden flex items-center">
          {/* Optimal zone (3.5 to 6.0) */}
          <div className="absolute left-[35%] w-[35%] h-full bg-emerald-950/80 border-x border-emerald-700/60" />
          {/* Excessive Blowdown zone (< 3.0) */}
          <div className="absolute left-0 w-[30%] h-full bg-cyan-950/40" />
          {/* Scaling Danger zone (> 7.0) */}
          <div className="absolute right-0 w-[25%] h-full bg-rose-950/50" />

          {/* Current Needle */}
          {(() => {
            const pct = Math.max(0, Math.min(100, (coc / 8.0) * 100));
            return (
              <div
                className="absolute h-full w-2 bg-cyan-400 border border-white rounded z-10 shadow-md transition-all duration-300"
                style={{ left: `calc(${pct}% - 4px)` }}
              />
            );
          })()}
        </div>

        <div className="flex items-center justify-between text-[9px] text-zinc-500">
          <span>1.0x (Raw Make-up)</span>
          <span className="text-emerald-400 font-bold">4.0x - 6.0x OPTIMAL CONSERVATION</span>
          <span className="text-rose-400">8.0x (Silica Precipitation Risk)</span>
        </div>
      </div>

      {/* Interactive Ambient Weather Conditions Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/90 space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-zinc-400 flex items-center gap-1 font-bold">
              <Sliders className="w-3 h-3 text-amber-400" />
              AMBIENT DRY-BULB TEMPERATURE:
            </span>
            <span className="text-amber-400 font-bold">{tDb}°C</span>
          </div>
          <input
            type="range"
            min={15}
            max={48}
            step={0.5}
            value={tDb}
            onChange={(e) => setTDb(Number(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
          />
        </div>

        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/90 space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-zinc-400 flex items-center gap-1 font-bold">
              <Sliders className="w-3 h-3 text-cyan-400" />
              AMBIENT RELATIVE HUMIDITY:
            </span>
            <span className="text-cyan-400 font-bold">{rh}% RH</span>
          </div>
          <input
            type="range"
            min={20}
            max={95}
            step={1}
            value={rh}
            onChange={(e) => setRh(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
          />
        </div>
      </div>

      {/* Water Loss & Mass Balance KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px]">
        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-zinc-500 uppercase">EVAPORATION LOSS</div>
          <div className="font-bold text-zinc-200 mt-0.5">{calculatedEvapM3h} m³/h</div>
        </div>

        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-zinc-500 uppercase">BLOWDOWN RATE</div>
          <div className="font-bold text-zinc-200 mt-0.5">{calculatedBlowdownM3h} m³/h</div>
        </div>

        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-zinc-500 uppercase">DRIFT LOSS ELIMINATOR</div>
          <div className="font-bold text-zinc-200 mt-0.5">{driftLossPercent}% (&lt; 0.005%)</div>
        </div>

        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-zinc-500 uppercase">TOTAL MAKE-UP REQ</div>
          <div className="font-bold text-cyan-400 mt-0.5">
            {(calculatedEvapM3h + calculatedBlowdownM3h).toFixed(1)} m³/h
          </div>
        </div>
      </div>
    </div>
  );
}
