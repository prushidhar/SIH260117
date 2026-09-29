'use client';

import React, { useState, useMemo } from 'react';
import {
  Flame,
  Zap,
  Gauge,
  Crosshair,
  FileCheck,
  Sliders,
  CheckCircle2,
  TrendingUp,
  Cpu,
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import type { SteamTurbineCogenWidgetProps } from '../types';

export default function SteamTurbineCogenWidget({
  assetTag = 'TG-201',
  title = 'ASME PTC 6 EXTRACTION-CONDENSING STEAM TURBINE COGEN BALANCE',
  standard = 'ASME PTC 6 / ISO 2314',
  throttleInletFlowTph = 180.0,
  throttlePressureBar = 105.0,
  throttleTempC = 535.0,
  extractionFlowTph = 85.0,
  extractionPressureBar = 12.5,
  exhaustPressureBar = 0.08,
  electricalPowerMwe = 42.5,
  thermalDutyMwth = 68.4,
  specificSteamConsumptionKgKwh = 4.18,
  isentropicEfficiencyPercent = 88.2,
}: SteamTurbineCogenWidgetProps) {
  const { selectTag, addDeliverable, addToast } = useIndraStore();

  // Interactive slider for process steam extraction demand (t/h)
  const [extractionDemand, setExtractionDemand] = useState<number>(extractionFlowTph);
  const [throttleFlow, setThrottleFlow] = useState<number>(throttleInletFlowTph);

  // Dynamic heat & mass balance calculations:
  // Condensing stage flow = Throttle flow - Extraction flow
  const condensingFlow = useMemo(() => {
    return Math.max(10.0, throttleFlow - extractionDemand);
  }, [throttleFlow, extractionDemand]);

  // Electrical output model (HP stage + LP condensing stage)
  // HP section generates ~0.14 MWe per t/h
  // LP condensing section generates ~0.26 MWe per t/h
  const dynamicPowerMwe = useMemo(() => {
    const hpPower = throttleFlow * 0.138;
    const lpPower = condensingFlow * 0.252;
    return parseFloat((hpPower + lpPower).toFixed(2));
  }, [throttleFlow, condensingFlow]);

  // Thermal duty delivered to process header: ~0.76 MWth per t/h of 12.5 bar extraction steam
  const dynamicThermalMwth = useMemo(() => {
    return parseFloat((extractionDemand * 0.772).toFixed(2));
  }, [extractionDemand]);

  // Specific Steam Consumption: kg throttle steam / kWh gross electrical output
  const dynamicSsc = useMemo(() => {
    const ssc = (throttleFlow * 1000) / (dynamicPowerMwe * 1000 || 1);
    return parseFloat(ssc.toFixed(2));
  }, [throttleFlow, dynamicPowerMwe]);

  // Overall Cogeneration Fuel Utilization Efficiency (First Law):
  // (Power + Heat) / Fuel Heat Input
  const cogenEfficiencyPercent = useMemo(() => {
    // Estimated thermal energy in throttle steam = ~145 MWth
    const totalOutput = dynamicPowerMwe + dynamicThermalMwth;
    const eff = Math.min(89.5, (totalOutput / 138.0) * 100);
    return parseFloat(eff.toFixed(1));
  }, [dynamicPowerMwe, dynamicThermalMwth]);

  const handleLocateTag = () => {
    selectTag(assetTag);
    broadcastSyncEvent({
      type: 'TAG_SELECTED',
      tag: assetTag,
      metadata: {
        source: 'SteamTurbineCogenWidget',
        powerMwe: dynamicPowerMwe,
        thermalMwth: dynamicThermalMwth,
        extractionTph: extractionDemand,
      },
    });
  };

  const handleExportCogenAudit = () => {
    const now = new Date().toLocaleTimeString();
    addDeliverable({
      id: `del-cogen-${Date.now()}`,
      name: `ASME_PTC_6_Cogen_Balance_${assetTag}.docx`,
      filename: `ASME_PTC_6_Cogen_Balance_${assetTag}.docx`,
      type: 'docx',
      size: '2.8 MB',
      generatedAt: now,
      timestamp: now,
      description: `ASME PTC 6 Extraction-Condensing Heat Balance Audit for ${assetTag}`,
      url: '#',
      hash: 'b149c0948e89f81a74092b8746c0918237498172938471928374918273645192',
    });

    addToast({
      type: 'success',
      title: 'Cogen Heat Balance Compiled',
      message: `ASME PTC 6 Heat balance deliverable registered for ${assetTag}.`,
    });
  };

  return (
    <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl font-mono text-xs text-zinc-200 select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-zinc-800/80 gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handleLocateTag}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/80 hover:bg-amber-900/90 border border-amber-700/80 text-amber-300 font-bold transition-all cursor-pointer group"
            title="Locate steam turbine on P&ID"
          >
            <Crosshair className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-45 transition-transform" />
            <span>{assetTag}</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-zinc-100 tracking-wider">{title}</h4>
              <span className="px-2 py-0.5 rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800 text-[9px] font-bold">
                {standard}
              </span>
            </div>
            <div className="text-[10px] text-zinc-400">
              Throttle: {throttlePressureBar} bar a, {throttleTempC}°C • Extraction: {extractionPressureBar} bar a • Vacuum: {exhaustPressureBar} bar a
            </div>
          </div>
        </div>

        {/* Cogen Efficiency Stamp */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold border bg-emerald-950/80 border-emerald-700 text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>COGEN EFFICIENCY: {cogenEfficiencyPercent}%</span>
          </div>

          <button
            onClick={handleExportCogenAudit}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-amber-400 transition-colors cursor-pointer"
            title="Export ASME PTC 6 report"
          >
            <FileCheck className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3 Core Output KPI Faceplates */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        {/* Electrical Output */}
        <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 relative overflow-hidden">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
            <span className="uppercase font-bold flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              ELECTRICAL GENERATION
            </span>
            <span className="text-amber-400 font-bold">GRID SYNC</span>
          </div>
          <div className="text-xl font-bold text-zinc-100 mt-1">
            {dynamicPowerMwe} <span className="text-xs text-zinc-400 font-normal">MWe</span>
          </div>
          <div className="text-[9px] text-zinc-500 mt-1">
            Generator terminal gross power (cos φ = 0.85)
          </div>
        </div>

        {/* Process Thermal Duty */}
        <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 relative overflow-hidden">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
            <span className="uppercase font-bold flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              PROCESS THERMAL DUTY
            </span>
            <span className="text-rose-400 font-bold">HEADER 12.5B</span>
          </div>
          <div className="text-xl font-bold text-zinc-100 mt-1">
            {dynamicThermalMwth} <span className="text-xs text-zinc-400 font-normal">MWth</span>
          </div>
          <div className="text-[9px] text-zinc-500 mt-1">
            Delivered to reboilers & plant distillation
          </div>
        </div>

        {/* Specific Steam Consumption */}
        <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 relative overflow-hidden">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
            <span className="uppercase font-bold flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              SPECIFIC STEAM RATE
            </span>
            <span className="text-cyan-400 font-bold">PTC 6 BENCHMARK</span>
          </div>
          <div className="text-xl font-bold text-zinc-100 mt-1">
            {dynamicSsc} <span className="text-xs text-zinc-400 font-normal">kg/kWh</span>
          </div>
          <div className="text-[9px] text-zinc-500 mt-1">
            Throttle mass flow per gross kWh generated
          </div>
        </div>
      </div>

      {/* Interactive Mass Balance Schematic Vector */}
      <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 mb-3">
        <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-2">
          <span className="font-bold uppercase tracking-wider text-zinc-300">
            TURBINE EXPANSION & MASS SPLIT SCHEMATIC
          </span>
          <span>Throttle: {throttleFlow} t/h (100%)</span>
        </div>

        {/* Visual Steam Flow Distribution Bar */}
        <div className="space-y-1.5">
          <div className="h-6 w-full bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden flex text-[10px] font-bold">
            {/* Extraction Segment */}
            <div
              className="bg-rose-900/80 border-r border-rose-700/60 text-rose-200 flex items-center justify-center transition-all duration-300"
              style={{ width: `${(extractionDemand / throttleFlow) * 100}%` }}
            >
              Extraction: {extractionDemand} t/h ({Math.round((extractionDemand / throttleFlow) * 100)}%)
            </div>

            {/* Condensing Exhaust Segment */}
            <div
              className="bg-cyan-950/80 text-cyan-200 flex items-center justify-center transition-all duration-300"
              style={{ width: `${(condensingFlow / throttleFlow) * 100}%` }}
            >
              Condenser: {condensingFlow.toFixed(1)} t/h ({Math.round((condensingFlow / throttleFlow) * 100)}%)
            </div>
          </div>

          <div className="flex items-center justify-between text-[9px] text-zinc-500">
            <span>HP Section (105 &rarr; 12.5 bar a)</span>
            <span>LP Condensing Section (12.5 &rarr; 0.08 bar a vacuum)</span>
          </div>
        </div>
      </div>

      {/* Interactive Extraction Demand Slider */}
      <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/90 space-y-2 mb-3">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-zinc-400 flex items-center gap-1 font-bold">
            <Sliders className="w-3 h-3 text-amber-400" />
            ADJUST PROCESS EXTRACTION STEAM DEMAND:
          </span>
          <span className="text-amber-400 font-bold">{extractionDemand} t/h</span>
        </div>

        <input
          type="range"
          min={30}
          max={150}
          step={5}
          value={extractionDemand}
          onChange={(e) => setExtractionDemand(Number(e.target.value))}
          className="w-full accent-amber-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
        />

        <div className="flex items-center justify-between text-[9px] text-zinc-500">
          <span>Min Turndown (30 t/h)</span>
          <span>Nominal Balance (85 t/h)</span>
          <span>Max Thermal Draw (150 t/h)</span>
        </div>
      </div>

      {/* Thermodynamic Stage Metadata Footer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px]">
        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-zinc-500 uppercase">HP STEAM ENTHALPY</div>
          <div className="font-bold text-zinc-200 mt-0.5">3,462 kJ/kg</div>
        </div>

        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-zinc-500 uppercase">EXTRACTION ENTHALPY</div>
          <div className="font-bold text-zinc-200 mt-0.5">2,845 kJ/kg</div>
        </div>

        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-zinc-500 uppercase">CONDENSER HOTWELL</div>
          <div className="font-bold text-zinc-200 mt-0.5">41.5°C (Sat)</div>
        </div>

        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-zinc-500 uppercase">ISENTROPIC EFF</div>
          <div className="font-bold text-emerald-400 mt-0.5">{isentropicEfficiencyPercent}%</div>
        </div>
      </div>
    </div>
  );
}
