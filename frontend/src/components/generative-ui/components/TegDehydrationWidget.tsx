'use client';

import React, { useState, useMemo } from 'react';
import {
  Droplets,
  Flame,
  Gauge,
  Crosshair,
  FileCheck,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import type { TegDehydrationWidgetProps } from '../types';

export default function TegDehydrationWidget({
  assetTag = 'V-204',
  title = 'GPSA SEC 20 TEG GLYCOL DEHYDRATION & REBOILER DUTY',
  gasInletFlowMmscfd = 45.0,
  gasInletPressureBar = 68.0,
  gasInletTempC = 32.0,
  richGlycolConcentrationPercent = 96.4,
  leanGlycolConcentrationPercent = 99.85,
  reboilerTempC = 204.0, // 400°F (thermal degradation limit is 206.7°C / 404°F)
  reboilerDutyKw = 485.0,
  waterDewPointC = -38.5,
  waterContentLbsMmscf = 3.6, // pipeline custody transfer spec is <= 4.0 lbs/MMSCF
  glycolCirculationRateGpm = 18.5,
}: TegDehydrationWidgetProps) {
  const { selectTag, addDeliverable, addToast } = useIndraStore();

  const [reboilerTemp, setReboilerTemp] = useState<number>(reboilerTempC);
  const [circRateGpm, setCircRateGpm] = useState<number>(glycolCirculationRateGpm);

  // Dynamic lean concentration model based on reboiler temp:
  // At 204°C + stripping gas: 99.85%
  // Below 190°C: ~98.8%
  const dynamicLeanConcentration = useMemo(() => {
    if (reboilerTemp >= 204) return 99.85;
    const base = 98.2 + ((reboilerTemp - 180) / (204 - 180)) * (99.85 - 98.2);
    return parseFloat(base.toFixed(2));
  }, [reboilerTemp]);

  // Dynamic water content in treated dry gas (lbs/MMSCF):
  // Lower lean concentration or lower circulation rate increases moisture
  const dynamicWaterContent = useMemo(() => {
    const leanPurityFactor = (100 - dynamicLeanConcentration) * 12;
    const circFactor = Math.max(0.6, 20 / (circRateGpm || 1));
    const moisture = (2.2 + leanPurityFactor * 0.8) * circFactor;
    return parseFloat(moisture.toFixed(1));
  }, [dynamicLeanConcentration, circRateGpm]);

  // Water dew point depression based on moisture content
  const dynamicDewPointC = useMemo(() => {
    // 4.0 lbs/MMSCF corresponds to ~-38°C at 68 bar
    const dp = -52 + dynamicWaterContent * 3.8;
    return parseFloat(dp.toFixed(1));
  }, [dynamicWaterContent]);

  // Dynamic reboiler duty (kW): Sensible heat + Latent heat of water vaporization
  const dynamicReboilerDutyKw = useMemo(() => {
    const sensible = circRateGpm * 14.2;
    const duty = sensible + 220;
    return Math.round(duty);
  }, [circRateGpm]);

  // Thermal degradation risk check: TEG begins pyrolytic decomposition at > 206.7°C (404°F)
  const isThermalDegradationRisk = reboilerTemp >= 206.0;
  const isPipelineSpecCompliant = dynamicWaterContent <= 4.0;

  const handleLocateTag = () => {
    selectTag(assetTag);
    broadcastSyncEvent({
      type: 'TAG_SELECTED',
      tag: assetTag,
      metadata: {
        source: 'TegDehydrationWidget',
        moisture: dynamicWaterContent,
        leanConc: dynamicLeanConcentration,
        reboilerTemp,
      },
    });
  };

  const handleExportTegAudit = () => {
    const now = new Date().toLocaleTimeString();
    addDeliverable({
      id: `del-teg-${Date.now()}`,
      name: `GPSA_Sec20_TEG_Audit_${assetTag}.docx`,
      filename: `GPSA_Sec20_TEG_Audit_${assetTag}.docx`,
      type: 'docx',
      size: '2.5 MB',
      generatedAt: now,
      timestamp: now,
      description: `GPSA Section 20 Glycol Dehydration Compliance Audit for ${assetTag}`,
      url: '#',
      hash: 'c891240981b23901a87b1c09841829e712903847120938471092837419283749',
    });

    addToast({
      type: 'success',
      title: 'TEG Audit Compiled',
      message: `Glycol dehydration statutory audit report added to deliverables.`,
    });
  };

  return (
    <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl font-mono text-xs text-zinc-200 select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-zinc-800/80 gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handleLocateTag}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-950/80 hover:bg-teal-900/90 border border-teal-700/80 text-teal-300 font-bold transition-all cursor-pointer group"
            title="Locate TEG contactor on P&ID"
          >
            <Crosshair className="w-3.5 h-3.5 text-teal-400 group-hover:rotate-45 transition-transform" />
            <span>{assetTag}</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-zinc-100 tracking-wider">{title}</h4>
              <span className="px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800 text-[9px] font-bold">
                GPSA SEC 20
              </span>
            </div>
            <div className="text-[10px] text-zinc-400">
              Inlet Gas: {gasInletFlowMmscfd} MMSCFD @ {gasInletPressureBar} bar a, {gasInletTempC}°C
            </div>
          </div>
        </div>

        {/* Pipeline Moisture Compliance Badge */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              isPipelineSpecCompliant && !isThermalDegradationRisk
                ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                : isThermalDegradationRisk
                ? 'bg-rose-950/80 border-rose-700 text-rose-300 animate-pulse'
                : 'bg-amber-950/80 border-amber-700 text-amber-300'
            }`}
          >
            {isPipelineSpecCompliant ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            <span>
              {isThermalDegradationRisk
                ? 'TEG THERMAL DEGRADATION RISK (>206°C)'
                : isPipelineSpecCompliant
                ? `CUSTODY SPEC PASS (${dynamicWaterContent} lbs/MMSCF)`
                : `SPEC EXCEEDED (${dynamicWaterContent} lbs/MMSCF)`}
            </span>
          </div>

          <button
            onClick={handleExportTegAudit}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-teal-400 transition-colors cursor-pointer"
            title="Export GPSA Sec 20 audit"
          >
            <FileCheck className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dual Column Schematic Visualizer: Contactor (Left) + Reboiler/Regenerator (Right) */}
      <div className="relative bg-zinc-900/60 rounded-xl border border-zinc-800 p-3 mb-3">
        <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-2">
          <span className="font-bold uppercase tracking-wider text-zinc-300">
            COUNTER-CURRENT ABSORBER & STRIPPER MASS TRANSFER SCHEMATIC
          </span>
          <div className="flex items-center gap-3">
            <span className="text-teal-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-teal-400" /> Lean Glycol ({dynamicLeanConcentration}%)
            </span>
            <span className="text-amber-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> Rich Glycol ({richGlycolConcentrationPercent}%)
            </span>
          </div>
        </div>

        {/* SVG Animated Process Flow Diagram */}
        <div className="relative w-full h-52 flex items-center justify-center">
          <svg className="w-full h-full" viewBox="0 0 540 220">
            <defs>
              <linearGradient id="glycolColumnGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
            </defs>

            {/* CONTACTOR ABSORBER COLUMN (Left) */}
            <rect x="70" y="25" width="80" height="170" rx="14" fill="url(#glycolColumnGrad)" stroke="#38bdf8" strokeWidth="1.5" />
            <text x="110" y="20" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle">
              CONTACTOR V-204
            </text>

            {/* Structured Packing Trays in Absorber */}
            {[50, 75, 100, 125, 150].map((y) => (
              <line key={y} x1="75" y1={y} x2="145" y2={y} stroke="#334155" strokeWidth="2" strokeDasharray="4 2" />
            ))}

            {/* Rising Gas Bubbles in Absorber */}
            <circle cx="95" cy="140" r="3" fill="#38bdf8" opacity="0.8" className="animate-pulse" />
            <circle cx="120" cy="115" r="4" fill="#38bdf8" opacity="0.6" className="animate-pulse" />
            <circle cx="105" cy="80" r="3" fill="#38bdf8" opacity="0.9" className="animate-pulse" />
            <circle cx="115" cy="45" r="4" fill="#38bdf8" opacity="0.7" className="animate-pulse" />

            {/* Wet Gas In (Bottom Left) */}
            <path d="M 10 165 L 70 165" stroke="#38bdf8" strokeWidth="2" fill="none" />
            <text x="15" y="158" fill="#38bdf8" fontSize="8">WET GAS IN</text>

            {/* Dry Gas Out (Top) */}
            <path d="M 110 25 L 110 5 L 200 5" stroke="#10b981" strokeWidth="2" fill="none" />
            <text x="140" y="15" fill="#10b981" fontSize="8" fontWeight="bold">DRY GAS OUT ({dynamicWaterContent} lbs)</text>

            {/* Lean Glycol In (Top of Contactor) */}
            <path d="M 230 45 L 150 45" stroke="#14b8a6" strokeWidth="2" strokeDasharray="3 2" fill="none" />
            <text x="160" y="40" fill="#14b8a6" fontSize="8">LEAN GLYCOL IN</text>

            {/* Rich Glycol Out (Bottom of Contactor &rarr; Reboiler) */}
            <path d="M 110 195 L 110 210 L 320 210 L 320 160" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 2" fill="none" />
            <text x="170" y="205" fill="#f59e0b" fontSize="8">RICH GLYCOL &rarr; REBOILER</text>

            {/* REGENERATOR STILL COLUMN & REBOILER (Right) */}
            {/* Still Column */}
            <rect x="350" y="40" width="40" height="70" rx="8" fill="url(#glycolColumnGrad)" stroke="#f59e0b" strokeWidth="1.5" />
            <text x="370" y="32" fill="#f59e0b" fontSize="9" fontWeight="bold" textAnchor="middle">STILL COL</text>

            {/* Water Vapor Vent Out of Still Top */}
            <path d="M 370 40 L 370 15 L 430 15" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="2 2" fill="none" />
            <text x="380" y="10" fill="#94a3b8" fontSize="8">H₂O VAPOR VENT</text>

            {/* Horizontal Reboiler Kettle */}
            <rect x="320" y="110" width="130" height="55" rx="12" fill="url(#glycolColumnGrad)" stroke="#f43f5e" strokeWidth="1.5" />
            <text x="385" y="132" fill="#f43f5e" fontSize="9" fontWeight="bold" textAnchor="middle">
              REBOILER E-208 ({reboilerTemp}°C)
            </text>
            <text x="385" y="145" fill="#cbd5e1" fontSize="8" textAnchor="middle">
              Duty: {dynamicReboilerDutyKw} kW
            </text>

            {/* Stripping Gas Sparger Vector */}
            <line x1="335" y1="155" x2="435" y2="155" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 2" />

            {/* Lean Surge Return & Pump */}
            <path d="M 450 140 L 480 140 L 480 80 L 300 80 L 300 45 L 230 45" stroke="#14b8a6" strokeWidth="2" fill="none" />
            {/* Circulation Pump Symbol */}
            <circle cx="480" cy="110" r="10" fill="#0f172a" stroke="#14b8a6" strokeWidth="1.5" />
            <text x="505" y="114" fill="#14b8a6" fontSize="8">P-202 ({circRateGpm} GPM)</text>
          </svg>
        </div>
      </div>

      {/* 3 Core Performance KPI Faceplates */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        {/* Dry Gas Moisture Content */}
        <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
            <span className="uppercase font-bold flex items-center gap-1 text-teal-300">
              <Droplets className="w-3.5 h-3.5 text-teal-400" />
              TREATED WATER CONTENT
            </span>
            <span className={isPipelineSpecCompliant ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              CUSTODY SPEC
            </span>
          </div>
          <div className="text-xl font-bold text-zinc-100 mt-1">
            {dynamicWaterContent} <span className="text-xs text-zinc-400 font-normal">lbs/MMSCF</span>
          </div>
          <div className="text-[9px] text-zinc-500 mt-1">
            Max pipeline transport limit: 4.0 lbs/MMSCF
          </div>
        </div>

        {/* Water Dew Point Depression */}
        <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
            <span className="uppercase font-bold flex items-center gap-1 text-cyan-300">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              WATER DEW POINT
            </span>
            <span className="text-cyan-400 font-bold">@ 68 BAR</span>
          </div>
          <div className="text-xl font-bold text-cyan-400 mt-1">
            {dynamicDewPointC}°C
          </div>
          <div className="text-[9px] text-zinc-500 mt-1">
            Depression below gas inlet ({gasInletTempC}°C): &Delta;{(gasInletTempC - dynamicDewPointC).toFixed(1)}°C
          </div>
        </div>

        {/* Lean Glycol Concentration */}
        <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
            <span className="uppercase font-bold flex items-center gap-1 text-amber-300">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              LEAN PURITY (REBOILER)
            </span>
            <span className="text-amber-400 font-bold">STRIPPING GAS</span>
          </div>
          <div className="text-xl font-bold text-zinc-100 mt-1">
            {dynamicLeanConcentration}% <span className="text-xs text-zinc-400 font-normal">wt TEG</span>
          </div>
          <div className="text-[9px] text-zinc-500 mt-1">
            Rich inlet: {richGlycolConcentrationPercent}% wt &rarr; Lean return: {dynamicLeanConcentration}%
          </div>
        </div>
      </div>

      {/* Interactive Operational Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        {/* Reboiler Temp Slider */}
        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/90 space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-zinc-400 flex items-center gap-1 font-bold">
              <Sliders className="w-3 h-3 text-rose-400" />
              REBOILER FIRE-TUBE TEMPERATURE:
            </span>
            <span className={`font-bold ${isThermalDegradationRisk ? 'text-rose-400' : 'text-zinc-200'}`}>
              {reboilerTemp}°C
            </span>
          </div>
          <input
            type="range"
            min={180}
            max={208}
            step={0.5}
            value={reboilerTemp}
            onChange={(e) => setReboilerTemp(Number(e.target.value))}
            className="w-full accent-rose-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
          />
          <div className="flex items-center justify-between text-[9px] text-zinc-500">
            <span>180°C (Low Stripping)</span>
            <span className="text-emerald-400 font-bold">204°C Target</span>
            <span className="text-rose-400">206.7°C Thermal Breakdown Limit</span>
          </div>
        </div>

        {/* Glycol Circulation Rate Slider */}
        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/90 space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-zinc-400 flex items-center gap-1 font-bold">
              <Sliders className="w-3 h-3 text-teal-400" />
              GLYCOL CIRCULATION PUMP RATE:
            </span>
            <span className="text-teal-400 font-bold">{circRateGpm} GPM</span>
          </div>
          <input
            type="range"
            min={8}
            max={30}
            step={0.5}
            value={circRateGpm}
            onChange={(e) => setCircRateGpm(Number(e.target.value))}
            className="w-full accent-teal-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
          />
          <div className="flex items-center justify-between text-[9px] text-zinc-500">
            <span>8 GPM (Under-circulation)</span>
            <span>18.5 GPM Nominal</span>
            <span>30 GPM (Max Hydraulic Load)</span>
          </div>
        </div>
      </div>

      {/* Auxiliary Metadata Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px]">
        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-zinc-500 uppercase">REBOILER HEAT DUTY</div>
          <div className="font-bold text-zinc-200 mt-0.5">{dynamicReboilerDutyKw} kW</div>
        </div>

        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-zinc-500 uppercase">WATER REMOVED</div>
          <div className="font-bold text-zinc-200 mt-0.5">82.4 kg/h</div>
        </div>

        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-zinc-500 uppercase">STRIPPING GAS</div>
          <div className="font-bold text-zinc-200 mt-0.5">3.5 SCF/gal</div>
        </div>

        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-zinc-500 uppercase">HYDRATE MARGIN</div>
          <div className="font-bold text-emerald-400 mt-0.5">+48.5°C Margin</div>
        </div>
      </div>
    </div>
  );
}
