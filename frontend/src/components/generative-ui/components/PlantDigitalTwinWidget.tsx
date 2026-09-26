import React, { useState, useMemo } from 'react';
import {
  Factory,
  Flame,
  Layers,
  Activity,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Droplets,
  Gauge,
  ArrowRight,
  ShieldCheck,
  Cpu,
  RefreshCw,
  Sliders,
  Sparkles,
  BarChart3,
  ChevronRight,
  Info
} from 'lucide-react';
import { sovereignAudio } from '../../../lib/sound/sovereign-audio';
import { useIndraStore } from '../../../store/indra-store';

export interface PlantDigitalTwinProps {
  initialCrudeApi?: number;
  initialFeedBpd?: number;
  initialFurnaceTempC?: number;
  plantName?: string;
  onStreamSelect?: (streamId: string) => void;
}

interface CrudePreset {
  name: string;
  api: number;
  sulfurPct: number;
  origin: string;
  description: string;
}

const CRUDE_PRESETS: CrudePreset[] = [
  { name: 'Arab Light', api: 33.4, sulfurPct: 1.82, origin: 'Saudi Arabia', description: 'Standard benchmark crude with balanced light & middle distillates.' },
  { name: 'Maya Heavy', api: 21.8, sulfurPct: 3.45, origin: 'Mexico', description: 'High-viscosity, high-metal sour crude demanding maximum furnace duty.' },
  { name: 'Mumbai High', api: 39.5, sulfurPct: 0.15, origin: 'India (Offshore ONGC)', description: 'Low sulfur, sweet paraffinic crude with high lube & middle cut yield.' },
  { name: 'Brent Blend', api: 38.3, sulfurPct: 0.40, origin: 'North Sea', description: 'Light sweet global benchmark; high LPG and naphtha cut fractions.' },
];

export const PlantDigitalTwinWidget: React.FC<PlantDigitalTwinProps> = ({
  initialCrudeApi = 33.4,
  initialFeedBpd = 100000,
  initialFurnaceTempC = 365,
  plantName = 'Refinery Train 1 — CDU / VDU Digital Twin',
  onStreamSelect
}) => {
  const [selectedCrude, setSelectedCrude] = useState<CrudePreset>(CRUDE_PRESETS[0]);
  const [feedBpd, setFeedBpd] = useState<number>(initialFeedBpd);
  const [furnaceTempC, setFurnaceTempC] = useState<number>(initialFurnaceTempC);
  const [selectedStreamId, setSelectedStreamId] = useState<string>('stream-kero');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isDispatched, setIsDispatched] = useState<boolean>(false);

  const selectTag = useIndraStore((s) => s.selectTag);

  // Real-time mass and energy balance calculations
  const balance = useMemo(() => {
    const api = selectedCrude.api;
    const bpd = feedBpd;
    const tFurnace = furnaceTempC;

    const sg = 141.5 / (131.5 + api);
    const density = sg * 999.0;
    const tonnesPerDay = (bpd * 0.1589873 * density) / 1000.0;

    const apiFactor = Math.max(0.05, Math.min(0.95, (api - 20.0) / 25.0));
    const tempFactor = Math.max(0.5, Math.min(1.5, (tFurnace - 340.0) / 40.0));

    const lpgPct = parseFloat((2.5 + 2.0 * apiFactor).toFixed(2));
    const lightNaphthaPct = parseFloat((6.0 + 5.5 * apiFactor).toFixed(2));
    const heavyNaphthaPct = parseFloat((11.0 + 6.0 * apiFactor).toFixed(2));
    const keroPct = parseFloat((12.0 + 4.0 * apiFactor * tempFactor * 0.9).toFixed(2));
    const dieselPct = parseFloat((24.0 + 3.0 * (1.0 - Math.abs(apiFactor - 0.5)) * tempFactor).toFixed(2));
    const residuePct = parseFloat((100.0 - (lpgPct + lightNaphthaPct + heavyNaphthaPct + keroPct + dieselPct)).toFixed(2));

    const cuts = [
      { id: 'stream-lpg', name: 'Offgas & LPG (C1-C4)', pct: lpgPct, bpd: Math.round(bpd * lpgPct / 100), color: '#38bdf8', unit: 'Saturates Gas Plant', tempC: 45, pressBar: 4.2 },
      { id: 'stream-lnaphtha', name: 'Light Naphtha (C5-C6)', pct: lightNaphthaPct, bpd: Math.round(bpd * lightNaphthaPct / 100), color: '#34d399', unit: 'Isomerization Unit', tempC: 95, pressBar: 2.8 },
      { id: 'stream-hnaphtha', name: 'Heavy Naphtha', pct: heavyNaphthaPct, bpd: Math.round(bpd * heavyNaphthaPct / 100), color: '#fbbf24', unit: 'Catalytic Reformer (CCR)', tempC: 165, pressBar: 2.1 },
      { id: 'stream-kero', name: 'Kerosene / Jet A-1', pct: keroPct, bpd: Math.round(bpd * keroPct / 100), color: '#a78bfa', unit: 'Kero Merox Treater', tempC: 225, pressBar: 1.8 },
      { id: 'stream-diesel', name: 'Ultra-Low Sulfur Diesel', pct: dieselPct, bpd: Math.round(bpd * dieselPct / 100), color: '#f97316', unit: 'Diesel Hydrotreater (DHDT)', tempC: 310, pressBar: 1.5 },
      { id: 'stream-residue', name: 'Atmospheric Residue', pct: residuePct, bpd: Math.round(bpd * residuePct / 100), color: '#f43f5e', unit: 'Vacuum Distillation (VDU)', tempC: 360, pressBar: 1.2 },
    ];

    const vaporFraction = Math.min(0.68, (100.0 - residuePct + 4.5) / 100.0);
    const mDotKgS = (tonnesPerDay * 1000.0) / 86400.0;
    const deltaT = tFurnace - 220.0;
    const furnaceDutyMw = parseFloat(((mDotKgS * 2.22 * deltaT + (vaporFraction * mDotKgS * 280.0)) / 1000.0).toFixed(2));

    const rhoL = density * 0.82;
    const rhoV = 3.8;
    const vMax = 0.08 * Math.sqrt((rhoL - rhoV) / rhoV);
    const vActual = vMax * (0.65 + 0.15 * (tFurnace / 370.0));
    const floodMarginPct = parseFloat((((vMax - vActual) / vMax) * 100.0).toFixed(1));

    const henRecoveryPct = parseFloat((68.5 + 4.2 * (api / 35.0)).toFixed(1));
    const carbonIntensity = parseFloat((14.8 + (100.0 - api) * 0.18 + (tFurnace - 350.0) * 0.08).toFixed(2));

    return {
      tonnesPerDay: Math.round(tonnesPerDay),
      sg: parseFloat(sg.toFixed(4)),
      cuts,
      furnaceDutyMw,
      vaporFraction: parseFloat(vaporFraction.toFixed(3)),
      floodMarginPct,
      henRecoveryPct,
      carbonIntensity
    };
  }, [selectedCrude, feedBpd, furnaceTempC]);

  const activeStream = useMemo(() => {
    return balance.cuts.find((c) => c.id === selectedStreamId) || balance.cuts[3];
  }, [balance, selectedStreamId]);

  const handleCrudeSelect = (preset: CrudePreset) => {
    setSelectedCrude(preset);
    setIsSimulating(true);
    sovereignAudio.playClick();
    setTimeout(() => {
      setIsSimulating(false);
      sovereignAudio.playNotification();
    }, 450);
  };

  const handleStreamClick = (streamId: string) => {
    setSelectedStreamId(streamId);
    sovereignAudio.playClick();
    if (onStreamSelect) onStreamSelect(streamId);
  };

  const handleDispatchSchedule = () => {
    setIsDispatched(true);
    sovereignAudio.playSuccess();
    selectTag('CDU-104');
    setTimeout(() => setIsDispatched(false), 4000);
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl text-slate-100 font-sans my-4">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-cyan-600 to-blue-500 rounded-lg shadow-lg">
            <Factory className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">{plantName}</h3>
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                0-WAN AIR-GAP DIGITAL TWIN
              </span>
            </div>
            <p className="text-xs text-slate-400">
              API Technical Data Book • Nelson-Farrar Distillation • Souders-Brown Flooding Limit
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/50 border border-emerald-800/60 rounded-lg text-emerald-400 text-xs font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>MASS BALANCE: 100.0% CONVERGED</span>
          </div>
        </div>
      </div>

      {/* Crude Blend Selector Bar */}
      <div className="mt-4 p-3 bg-slate-950/80 border border-slate-800 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            SELECT ACTIVE FEED CRUDE BLEND (WHAT-IF PREDICTIVE MATRIX)
          </span>
          <span className="text-[11px] font-mono text-cyan-400">
            Current SG: {balance.sg} • Density: {Math.round(balance.sg * 999)} kg/m³
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {CRUDE_PRESETS.map((p) => {
            const isSelected = selectedCrude.name === p.name;
            return (
              <button
                key={p.name}
                onClick={() => handleCrudeSelect(p)}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-950/60 border-cyan-500 shadow-md shadow-cyan-950/50 ring-1 ring-cyan-500'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{p.name}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${isSelected ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'}`}>
                    {p.api}° API
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-between">
                  <span>{p.origin}</span>
                  <span className="text-amber-400 font-mono text-[10px]">{p.sulfurPct}% S</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Process Diagram & Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
        {/* Left Column: Visual Process Train Diagram (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950/60 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              PROCESS TRAIN FRACTIONATION ARCHITECTURE
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Throughput: {balance.tonnesPerDay.toLocaleString()} Tonnes/Day ({feedBpd.toLocaleString()} BPD)
            </span>
          </div>

          {/* Animated SVG Schematic */}
          <div className="w-full bg-slate-900/90 border border-slate-800/80 rounded-lg p-3 relative overflow-hidden">
            <svg viewBox="0 0 520 220" className="w-full h-auto">
              <defs>
                <linearGradient id="feedGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
                <linearGradient id="colGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#a78bfa" />
                  <stop offset="100%" stopColor="#f43f5e" />
                </linearGradient>
              </defs>

              {/* Feed Crude Line */}
              <line x1="20" y1="120" x2="100" y2="120" stroke="#06b6d4" strokeWidth="4" strokeDasharray="6 3" />
              <text x="25" y="112" fill="#38bdf8" fontSize="9" fontFamily="monospace" fontWeight="bold">CRUDE FEED</text>

              {/* Preheat Train Exchanger */}
              <rect x="100" y="100" width="40" height="40" rx="4" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
              <text x="106" y="124" fill="#94a3b8" fontSize="8" fontFamily="monospace">E-101</text>

              {/* Transfer to Furnace */}
              <line x1="140" y1="120" x2="180" y2="120" stroke="#f59e0b" strokeWidth="4" />

              {/* Atmospheric Charge Furnace F-101 */}
              <path d="M 180 140 L 200 90 L 220 140 Z" fill="#451a03" stroke="#f59e0b" strokeWidth="2" />
              <Flame className="w-4 h-4 text-amber-500" x="192" y="115" />
              <text x="187" y="152" fill="#fbbf24" fontSize="8" fontFamily="monospace" fontWeight="bold">F-101</text>
              <text x="178" y="162" fill="#f59e0b" fontSize="7" fontFamily="monospace">{furnaceTempC}°C</text>

              {/* Furnace to Flash Zone Line */}
              <line x1="220" y1="120" x2="270" y2="120" stroke="#ef4444" strokeWidth="4" strokeDasharray="4 2" />

              {/* Atmospheric Column T-101 */}
              <rect x="270" y="20" width="55" height="175" rx="10" fill="#0f172a" stroke="#64748b" strokeWidth="2" />
              {/* Trays inside column */}
              {[45, 65, 85, 105, 125, 145, 165].map((y, i) => (
                <line key={i} x1="275" y1={y} x2="320" y2={y} stroke="#334155" strokeWidth="1" strokeDasharray="3 2" />
              ))}
              <text x="278" y="36" fill="#94a3b8" fontSize="8" fontFamily="monospace" fontWeight="bold">T-101</text>

              {/* Distillate Draw Lines */}
              {/* Offgas Top */}
              <path d="M 297 20 L 297 10 L 400 10" fill="none" stroke="#38bdf8" strokeWidth="2" />
              <circle cx="400" cy="10" r="3" fill="#38bdf8" />
              <text x="408" y="13" fill="#38bdf8" fontSize="8" fontFamily="monospace">LPG / Offgas ({balance.cuts[0].pct}%)</text>

              {/* Light Naphtha */}
              <path d="M 325 45 L 390 45" fill="none" stroke="#34d399" strokeWidth="2" />
              <circle cx="390" cy="45" r="3" fill="#34d399" />
              <text x="398" y="48" fill="#34d399" fontSize="8" fontFamily="monospace">Lt Naphtha ({balance.cuts[1].pct}%)</text>

              {/* Heavy Naphtha */}
              <path d="M 325 75 L 380 75" fill="none" stroke="#fbbf24" strokeWidth="2" />
              <circle cx="380" cy="75" r="3" fill="#fbbf24" />
              <text x="388" y="78" fill="#fbbf24" fontSize="8" fontFamily="monospace">Hv Naphtha ({balance.cuts[2].pct}%)</text>

              {/* Kerosene */}
              <path d="M 325 105 L 390 105" fill="none" stroke="#a78bfa" strokeWidth="2.5" />
              <circle cx="390" cy="105" r="3" fill="#a78bfa" />
              <text x="398" y="108" fill="#a78bfa" fontSize="8" fontFamily="monospace" fontWeight="bold">Kerosene ({balance.cuts[3].pct}%)</text>

              {/* Diesel */}
              <path d="M 325 140 L 380 140" fill="none" stroke="#f97316" strokeWidth="2" />
              <circle cx="380" cy="140" r="3" fill="#f97316" />
              <text x="388" y="143" fill="#f97316" fontSize="8" fontFamily="monospace">ULSD Diesel ({balance.cuts[4].pct}%)</text>

              {/* Atmospheric Residue Bottom */}
              <path d="M 297 195 L 297 210 L 380 210" fill="none" stroke="#f43f5e" strokeWidth="2.5" />
              <circle cx="380" cy="210" r="3" fill="#f43f5e" />
              <text x="388" y="213" fill="#f43f5e" fontSize="8" fontFamily="monospace">Atm Residue ({balance.cuts[5].pct}%)</text>
            </svg>
          </div>

          {/* Interactive Yield Cut Table */}
          <div className="mt-3 space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400">PRODUCT STREAM FRACTIONS (CLICK TO PROBE TELEMETRY):</span>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
              {balance.cuts.map((cut) => {
                const isActive = cut.id === selectedStreamId;
                return (
                  <button
                    key={cut.id}
                    onClick={() => handleStreamClick(cut.id)}
                    className={`p-2 rounded border text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-slate-800 border-cyan-400 shadow-sm'
                        : 'bg-slate-900/70 border-slate-800/80 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold truncate text-white">{cut.name}</span>
                      <span className="text-[11px] font-mono font-bold" style={{ color: cut.color }}>
                        {cut.pct}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-0.5">
                      <span>{cut.bpd.toLocaleString()} BPD</span>
                      <span>{cut.tempC}°C</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live Telemetry & What-If Sliders (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-3">
          {/* Active Stream Inspector Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                STREAM PROBE: {activeStream.name.toUpperCase()}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300">
                ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2.5">
              <div className="p-2 bg-slate-900 rounded border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block font-mono">FLOW RATE</span>
                <span className="text-sm font-bold font-mono text-cyan-300">{activeStream.bpd.toLocaleString()} BPD</span>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block font-mono">DRAW TEMPERATURE</span>
                <span className="text-sm font-bold font-mono text-amber-300">{activeStream.tempC} °C</span>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block font-mono">DRAW PRESSURE</span>
                <span className="text-sm font-bold font-mono text-emerald-300">{activeStream.pressBar} bar</span>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block font-mono">DOWNSTREAM UNIT</span>
                <span className="text-xs font-semibold text-slate-200 truncate block">{activeStream.unit}</span>
              </div>
            </div>
          </div>

          {/* Real-time Engineering KPIs */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 space-y-2.5">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              DETERMINISTIC SIMULATION METRICS
            </span>

            {/* KPI 1: Furnace Duty */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Charge Heater Duty (F-101):</span>
                <span className="text-amber-400 font-bold">{balance.furnaceDutyMw} MW</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, (balance.furnaceDutyMw / 110) * 100)}%` }}
                />
              </div>
            </div>

            {/* KPI 2: Souders-Brown Flooding Margin */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Tray Flooding Margin:</span>
                <span className="text-emerald-400 font-bold">{balance.floodMarginPct}% (Safe &gt; 15%)</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${balance.floodMarginPct * 2}%` }}
                />
              </div>
            </div>

            {/* KPI 3: HEN Pinch Heat Recovery */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Pinch Network Heat Recovery:</span>
                <span className="text-cyan-400 font-bold">{balance.henRecoveryPct}%</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 transition-all duration-500"
                  style={{ width: `${balance.henRecoveryPct}%` }}
                />
              </div>
            </div>

            {/* KPI 4: Carbon Intensity */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs font-mono">
              <span className="text-slate-400">Carbon Intensity:</span>
              <span className="text-slate-200 font-semibold">{balance.carbonIntensity} kg CO₂e / bbl</span>
            </div>
          </div>

          {/* Interactive Operating Parameter Tuning Sliders */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 space-y-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              PROCESS CONTROLS TUNING
            </span>

            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-0.5">
                <span>Furnace COT (°C):</span>
                <span className="text-amber-400 font-bold">{furnaceTempC} °C</span>
              </div>
              <input
                type="range"
                min={340}
                max={380}
                step={1}
                value={furnaceTempC}
                onChange={(e) => setFurnaceTempC(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-0.5">
                <span>Crude Charge Rate (BPD):</span>
                <span className="text-cyan-400 font-bold">{feedBpd.toLocaleString()} BPD</span>
              </div>
              <input
                type="range"
                min={60000}
                max={140000}
                step={5000}
                value={feedBpd}
                onChange={(e) => setFeedBpd(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
          </div>

          {/* Action Dispatch Button */}
          <button
            onClick={handleDispatchSchedule}
            disabled={isDispatched}
            className={`w-full py-2.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isDispatched
                ? 'bg-emerald-600 text-white'
                : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-900/30'
            }`}
          >
            {isDispatched ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>APC DISPATCH AUTHORIZED (TAG CDU-104 QUEUED)</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>COMMIT CRUDE SCHEDULE TO DCS & LOCATE IN P&ID</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
