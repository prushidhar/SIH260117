'use client';

import React, { useState, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Crosshair,
  Sliders,
  ShieldCheck,
  Zap,
  ArrowRight,
  FileCheck,
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import type { CompressorAntiSurgeWidgetProps } from '../types';

export default function CompressorAntiSurgeWidget({
  assetTag = 'K-102',
  title = 'API 617 CENTRIFUGAL COMPRESSOR ANTI-SURGE MAP & ASV RESPONSE',
  standard = 'API 617 8th Ed. / ISO 10439-2',
  suctionPressureBar = 18.5,
  dischargePressureBar = 56.4,
  operatingFlowM3h = 14200,
  designFlowM3h = 16500,
  operatingSpeedRpm = 10450,
  ratedSpeedRpm = 11200,
  asvValveTravelPercent = 0,
  surgeMarginPercent = 14.2,
  polytropicHeadKjKg = 112.4,
  polytropicEfficiencyPercent = 84.6,
}: CompressorAntiSurgeWidgetProps) {
  const { selectTag, addDeliverable, addToast } = useIndraStore();

  // Interactive flow control slider to simulate process surge approach
  const [currentFlow, setCurrentFlow] = useState<number>(operatingFlowM3h);
  const [speedRpm, setSpeedRpm] = useState<number>(operatingSpeedRpm);

  // Compression pressure ratio
  const pressureRatio = useMemo(() => {
    return parseFloat((dischargePressureBar / Math.max(1, suctionPressureBar)).toFixed(2));
  }, [dischargePressureBar, suctionPressureBar]);

  // Surge Limit Line (SLL) flow at current pressure ratio: q_sll = (pressureRatio / 3.8)^1.8 * 9800
  const sllFlow = useMemo(() => {
    const base = (pressureRatio / 3.2);
    return Math.round(Math.pow(base, 1.4) * 8800);
  }, [pressureRatio]);

  // Surge Control Line (SCL) flow = SLL + 10% safety margin
  const sclFlow = useMemo(() => {
    return Math.round(sllFlow * 1.10);
  }, [sllFlow]);

  // Dynamic calculated surge margin: (Flow - SLL) / Flow * 100%
  const dynamicSurgeMargin = useMemo(() => {
    const margin = ((currentFlow - sllFlow) / Math.max(1, currentFlow)) * 100;
    return parseFloat(margin.toFixed(1));
  }, [currentFlow, sllFlow]);

  // Dynamic ASV valve travel: Opens proportionally if flow drops below SCL
  const calculatedAsvTravel = useMemo(() => {
    if (currentFlow >= sclFlow) return 0;
    if (currentFlow <= sllFlow) return 100;
    const fraction = (sclFlow - currentFlow) / Math.max(1, sclFlow - sllFlow);
    return Math.round(fraction * 100);
  }, [currentFlow, sclFlow, sllFlow]);

  const isSurgeTrip = currentFlow <= sllFlow;
  const isSurgeWarning = currentFlow < sclFlow && !isSurgeTrip;
  const isSafe = currentFlow >= sclFlow;

  const handleLocateTag = () => {
    selectTag(assetTag);
    broadcastSyncEvent({
      type: 'TAG_SELECTED',
      tag: assetTag,
      metadata: {
        source: 'CompressorAntiSurgeWidget',
        surgeMargin: dynamicSurgeMargin,
        flow: currentFlow,
        asvTravel: calculatedAsvTravel,
      },
    });
  };

  const handleExportReport = () => {
    const now = new Date().toLocaleTimeString();
    addDeliverable({
      id: `del-surge-${Date.now()}`,
      name: `API_617_Surge_Audit_${assetTag}.docx`,
      filename: `API_617_Surge_Audit_${assetTag}.docx`,
      type: 'docx',
      size: '2.4 MB',
      generatedAt: now,
      timestamp: now,
      description: `API 617 Anti-Surge Dynamic Verification for ${assetTag} at ${speedRpm} RPM`,
      url: '#',
      hash: 'a98f12c431b99a89c47e8109bf56029381742091728491823719283749182736',
    });

    addToast({
      type: 'success',
      title: 'Anti-Surge Validation Exported',
      message: `Surge verification certificate for ${assetTag} added to deliverables audit.`,
    });
  };

  // SVG coordinate mapping for the 500x260 compressor map
  // Flow X: 6,000 to 22,000 m3/h -> SVG X: 60 to 460
  // Pressure Ratio Y: 1.5 to 4.5 -> SVG Y: 220 to 30
  const mapFlowToX = (flow: number) => {
    const clamped = Math.max(6000, Math.min(22000, flow));
    return 60 + ((clamped - 6000) / (22000 - 6000)) * 400;
  };

  const mapRatioToY = (ratio: number) => {
    const clamped = Math.max(1.5, Math.min(4.5, ratio));
    return 220 - ((clamped - 1.5) / (4.5 - 1.5)) * 190;
  };

  const opX = mapFlowToX(currentFlow);
  const opY = mapRatioToY(pressureRatio);

  return (
    <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl font-mono text-xs text-zinc-200 select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-zinc-800/80 gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handleLocateTag}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900/90 border border-emerald-700/80 text-emerald-300 font-bold transition-all cursor-pointer group"
            title="Locate compressor on P&ID"
          >
            <Crosshair className="w-3.5 h-3.5 text-emerald-400 group-hover:rotate-45 transition-transform" />
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
              Polytropic Head: {polytropicHeadKjKg} kJ/kg • Efficiency: {polytropicEfficiencyPercent}%
            </div>
          </div>
        </div>

        {/* Surge Status Badge */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              isSurgeTrip
                ? 'bg-rose-950/80 border-rose-600 text-rose-300 animate-pulse'
                : isSurgeWarning
                ? 'bg-amber-950/80 border-amber-600 text-amber-300'
                : 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
            }`}
          >
            {isSurgeTrip ? (
              <AlertTriangle className="w-3.5 h-3.5" />
            ) : isSurgeWarning ? (
              <Zap className="w-3.5 h-3.5" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>
              {isSurgeTrip
                ? 'SURGE TRIP ACTIVE'
                : isSurgeWarning
                ? `RECYCLE ACTIVE (+${dynamicSurgeMargin}% MARGIN)`
                : `STABLE (+${dynamicSurgeMargin}% SURGE MARGIN)`}
            </span>
          </div>

          <button
            onClick={handleExportReport}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-emerald-400 transition-colors cursor-pointer"
            title="Export API 617 surge certificate"
          >
            <FileCheck className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* API 617 Performance & Anti-Surge Characteristic Coordinate Map */}
      <div className="relative bg-zinc-900/60 rounded-xl border border-zinc-800 p-3 mb-3">
        <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
          <span className="font-bold uppercase tracking-wider text-zinc-300">
            COMPRESSOR CHARACTERISTIC MAP (PRESSURE RATIO vs INLET FLOW)
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-rose-500 inline-block" /> SLL (Surge Limit Line)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-amber-500 border-dashed inline-block" /> SCL (10% Control Line)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-cyan-400 inline-block" /> 100% Speed Curve
            </span>
          </div>
        </div>

        {/* SVG Coordinate Visualizer */}
        <div className="relative w-full h-56 flex items-center justify-center">
          <svg className="w-full h-full" viewBox="0 0 500 260">
            <defs>
              <linearGradient id="surgeDangerArea" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#e11d48" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#e11d48" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            {[70, 120, 170, 220].map((y) => (
              <line key={y} x1="50" y1={y} x2="470" y2={y} stroke="#27272a" strokeWidth="1" strokeDasharray="3 3" />
            ))}
            {[100, 180, 260, 340, 420].map((x) => (
              <line key={x} x1={x} y1="20" x2={x} y2="230" stroke="#27272a" strokeWidth="1" strokeDasharray="3 3" />
            ))}

            {/* Y-Axis (Pressure Ratio Pd/Ps) */}
            <line x1="50" y1="20" x2="50" y2="230" stroke="#52525b" strokeWidth="1.5" />
            <text x="45" y="35" fill="#a1a1aa" fontSize="9" textAnchor="end" fontFamily="monospace">4.5</text>
            <text x="45" y="100" fill="#a1a1aa" fontSize="9" textAnchor="end" fontFamily="monospace">3.5</text>
            <text x="45" y="160" fill="#a1a1aa" fontSize="9" textAnchor="end" fontFamily="monospace">2.5</text>
            <text x="45" y="225" fill="#a1a1aa" fontSize="9" textAnchor="end" fontFamily="monospace">1.5</text>
            <text x="18" y="125" fill="#71717a" fontSize="8" transform="rotate(-90 18 125)" textAnchor="middle">
              PRESSURE RATIO (Pd / Ps)
            </text>

            {/* X-Axis (Flow Rate m3/h) */}
            <line x1="50" y1="230" x2="470" y2="230" stroke="#52525b" strokeWidth="1.5" />
            <text x="60" y="245" fill="#a1a1aa" fontSize="9" textAnchor="middle" fontFamily="monospace">6k</text>
            <text x="160" y="245" fill="#a1a1aa" fontSize="9" textAnchor="middle" fontFamily="monospace">10k</text>
            <text x="260" y="245" fill="#a1a1aa" fontSize="9" textAnchor="middle" fontFamily="monospace">14k</text>
            <text x="360" y="245" fill="#a1a1aa" fontSize="9" textAnchor="middle" fontFamily="monospace">18k</text>
            <text x="460" y="245" fill="#a1a1aa" fontSize="9" textAnchor="middle" fontFamily="monospace">22k</text>
            <text x="260" y="256" fill="#71717a" fontSize="8" textAnchor="middle">
              REDUCED INLET VOLUMETRIC FLOW (m³/h)
            </text>

            {/* Surge Zone Shading */}
            <path
              d="M 50 20 L 140 20 C 120 70, 95 140, 75 230 L 50 230 Z"
              fill="url(#surgeDangerArea)"
            />

            {/* SLL Curve (Surge Limit Line - Red Solid) */}
            <path
              d="M 75 230 C 95 140, 120 70, 140 20"
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2.5"
            />

            {/* SCL Curve (Surge Control Line - Amber Dashed) */}
            <path
              d="M 95 230 C 120 140, 150 70, 175 20"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="5 3"
            />

            {/* Speed Characteristic Curves */}
            {/* 105% Speed Curve */}
            <path
              d="M 160 30 C 230 45, 330 90, 440 170"
              fill="none"
              stroke="#06b6d4"
              strokeWidth="1.5"
              strokeOpacity="0.4"
            />
            {/* 100% Rated Speed Curve */}
            <path
              d="M 135 60 C 210 75, 300 120, 410 200"
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2.5"
            />
            {/* 90% Speed Curve */}
            <path
              d="M 115 110 C 180 125, 270 160, 370 230"
              fill="none"
              stroke="#06b6d4"
              strokeWidth="1.5"
              strokeOpacity="0.4"
            />

            {/* Operating Point Marker */}
            <g transform={`translate(${opX}, ${opY})`}>
              <circle r="9" fill={isSurgeTrip ? '#f43f5e' : isSurgeWarning ? '#f59e0b' : '#10b981'} opacity="0.3" className="animate-ping" />
              <circle r="5" fill={isSurgeTrip ? '#f43f5e' : isSurgeWarning ? '#f59e0b' : '#10b981'} stroke="#ffffff" strokeWidth="1.5" />
              {/* Target Hairline Callout */}
              <line x1="0" y1="-12" x2="0" y2="-24" stroke="#a1a1aa" strokeWidth="1" />
              <rect x="-38" y="-38" width="76" height="14" rx="3" fill="#18181b" stroke="#3f3f46" strokeWidth="0.8" />
              <text x="0" y="-28" fill="#e4e4e7" fontSize="8" textAnchor="middle" fontWeight="bold">
                {currentFlow} m³/h
              </text>
            </g>
          </svg>
        </div>
      </div>

      {/* ASV Valve Travel & Quick Response Bar */}
      <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-zinc-300">
              ANTI-SURGE RECYCLE VALVE (FV-102 ASV) TRAVEL:
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
              FAIL-OPEN (FO) • STROKE &lt; 1.2s
            </span>
          </div>
          <span className={`text-xs font-bold ${calculatedAsvTravel > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {calculatedAsvTravel}% OPEN
          </span>
        </div>

        {/* Segmented Valve Position Bar */}
        <div className="h-3 w-full bg-zinc-950 rounded-full border border-zinc-800 overflow-hidden flex">
          <div
            className={`h-full transition-all duration-300 ${
              calculatedAsvTravel > 50
                ? 'bg-rose-500'
                : calculatedAsvTravel > 0
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${calculatedAsvTravel}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[9px] text-zinc-500">
          <span>0% (Fully Closed - Max Process Yield)</span>
          <span>SCL Trigger: {sclFlow.toLocaleString()} m³/h</span>
          <span>100% (Full Recycle Dump)</span>
        </div>
      </div>

      {/* Interactive Process Simulator Slider */}
      <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/90 space-y-2 mb-3">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-zinc-400 flex items-center gap-1 font-bold">
            <Sliders className="w-3 h-3 text-cyan-400" />
            SIMULATE PROCESS FLOW PERTURBATION (SUCTION CHOKE):
          </span>
          <span className="text-cyan-400 font-bold">{currentFlow.toLocaleString()} m³/h</span>
        </div>

        <input
          type="range"
          min={7500}
          max={20000}
          step={100}
          value={currentFlow}
          onChange={(e) => setCurrentFlow(Number(e.target.value))}
          className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
        />

        <div className="flex items-center justify-between text-[9px] text-zinc-500">
          <span>Deep Surge Choke (7,500 m³/h)</span>
          <span>Design Point ({designFlowM3h.toLocaleString()} m³/h)</span>
          <span>Over-capacity (20,000 m³/h)</span>
        </div>
      </div>

      {/* 4 Engineering Metric Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-zinc-500 uppercase">SUCTION / DISCH P</div>
          <div className="text-xs font-bold text-zinc-200 mt-0.5">
            {suctionPressureBar} / {dischargePressureBar} <span className="text-[9px] text-zinc-500">bar</span>
          </div>
        </div>

        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-zinc-500 uppercase">PRESSURE RATIO</div>
          <div className="text-xs font-bold text-cyan-400 mt-0.5">
            {pressureRatio}x <span className="text-[9px] text-zinc-500">r_p</span>
          </div>
        </div>

        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-zinc-500 uppercase">OPERATING SPEED</div>
          <div className="text-xs font-bold text-zinc-200 mt-0.5">
            {operatingSpeedRpm.toLocaleString()} <span className="text-[9px] text-zinc-500">RPM</span>
          </div>
        </div>

        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-zinc-500 uppercase">SURGE MARGIN</div>
          <div className={`text-xs font-bold mt-0.5 ${dynamicSurgeMargin < 10 ? 'text-rose-400' : 'text-emerald-400'}`}>
            +{dynamicSurgeMargin}%
          </div>
        </div>
      </div>
    </div>
  );
}
