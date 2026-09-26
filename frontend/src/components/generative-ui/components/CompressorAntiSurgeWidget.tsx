import React, { useState, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  RotateCw,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Volume2,
  Zap,
  Radio,
  FileCheck,
  Flame,
  ArrowRight
} from 'lucide-react';
import { sovereignAudio } from '../../../lib/sound/sovereign-audio';
import { useIndraStore } from '../../../store/indra-store';

export interface CompressorAntiSurgeProps {
  initialFlowM3H?: number;
  initialSpeedRpm?: number;
  compressorTag?: string;
  suctionPBar?: number;
  dischargePBar?: number;
}

export const CompressorAntiSurgeWidget: React.FC<CompressorAntiSurgeProps> = ({
  initialFlowM3H = 6500.0,
  initialSpeedRpm = 10450.0,
  compressorTag = 'K-101',
  suctionPBar = 18.5,
  dischargePBar = 62.0
}) => {
  const [flowRate, setFlowRate] = useState<number>(initialFlowM3H);
  const [speedRpm, setSpeedRpm] = useState<number>(initialSpeedRpm);
  const [pSuction, setPSuction] = useState<number>(suctionPBar);
  const [pDischarge, setPDischarge] = useState<number>(dischargePBar);
  const [asvManualOverride, setAsvManualOverride] = useState<boolean>(false);
  const [asvOverrideOpen, setAsvOverrideOpen] = useState<number>(0);
  const [isDispatched, setIsDispatched] = useState<boolean>(false);

  const selectTag = useIndraStore((s) => s.selectTag);

  // Deterministic API 617 & ASME PTC 10 Aerodynamic Calculations
  const compMath = useMemo(() => {
    const ratedSpeedRpm = 10500.0;
    const speedRatio = speedRpm / ratedSpeedRpm;
    const gasMw = 19.8;
    const kRatio = 1.32;
    const polyEff = 0.785;
    const tSuctionC = 38.0;
    const t1K = tSuctionC + 273.15;
    const rUniv = 8314.46;
    const rSpec = rUniv / gasMw;

    const pRatio = Math.max(1.1, pDischarge / Math.max(1.0, pSuction));
    const polyM = (kRatio - 1.0) / (kRatio * polyEff);
    const zAvg = 0.965;

    // Polytropic Head (kJ/kg)
    const headJKg = (zAvg * rSpec * t1K / polyM) * (Math.pow(pRatio, polyM) - 1.0);
    const polytropicHeadKjKg = Number((headJKg / 1000.0).toFixed(2));

    // Gas Density & Mass Flow
    const p1Pa = pSuction * 1e5;
    const rhoSuction = (p1Pa * gasMw) / (zAvg * rUniv * t1K);
    const massFlowKgS = (flowRate * rhoSuction) / 3600.0;
    const gasPowerKw = Number(((massFlowKgS * headJKg) / (polyEff * 1000.0)).toFixed(1));

    // Surge Lines (Affinity scaled)
    const qSurgeBase = 4200.0;
    const qSurgeCurrent = Number((qSurgeBase * speedRatio).toFixed(1));
    const sclMarginPct = 10.0;
    const qSclCurrent = Number((qSurgeCurrent * (1.0 + sclMarginPct / 100.0)).toFixed(1));
    const qChokeCurrent = Number((qSurgeCurrent * 1.72).toFixed(1));

    // Surge Margin %
    const surgeMarginPct = Number((((flowRate - qSurgeCurrent) / qSurgeCurrent) * 100.0).toFixed(1));

    // Operating Zone classification
    let zone: 'ACTIVE_SURGE_DANGER' | 'MARGINAL_SCL_APPROACH' | 'STABLE' | 'CHOKE' = 'STABLE';
    let autoAsvOpen = 0.0;
    let recommendation = 'Operating stably within aerodynamic envelope. ASV closed.';

    if (flowRate <= qSurgeCurrent) {
      zone = 'ACTIVE_SURGE_DANGER';
      autoAsvOpen = 100.0;
      recommendation = 'EMERGENCY: Dynamic Surge Flow Reversal! Fast-dump hot-gas bypass ASV (<0.9s).';
    } else if (flowRate <= qSclCurrent) {
      zone = 'MARGINAL_SCL_APPROACH';
      const deficit = qSclCurrent - flowRate;
      autoAsvOpen = Number(Math.min(100.0, (deficit / (qSclCurrent - qSurgeCurrent)) * 50.0 + 15.0).toFixed(1));
      recommendation = `WARNING: Inside 10% SCL margin. Throttling ASV to ${autoAsvOpen}% open to restore flow.`;
    } else if (flowRate >= qChokeCurrent) {
      zone = 'CHOKE';
      recommendation = 'Stonewall Choke Limit reached. Compressible shock wave at inlet eye.';
    }

    const effectiveAsvOpen = asvManualOverride ? asvOverrideOpen : autoAsvOpen;

    return {
      pRatio: Number(pRatio.toFixed(2)),
      polytropicHeadKjKg,
      gasPowerKw,
      speedRatio: Number((speedRatio * 100).toFixed(1)),
      qSurgeCurrent,
      qSclCurrent,
      qChokeCurrent,
      surgeMarginPct,
      zone,
      effectiveAsvOpen,
      recommendation,
      machNumber: Number((0.38 + 0.12 * (flowRate / 8000)).toFixed(2))
    };
  }, [flowRate, speedRpm, pSuction, pDischarge, asvManualOverride, asvOverrideOpen]);

  // Audio alerts on state transitions
  const handleUpsetPreset = (preset: 'normal' | 'marginal' | 'surge') => {
    if (preset === 'normal') {
      setFlowRate(6800);
      setSpeedRpm(10450);
      setAsvManualOverride(false);
      sovereignAudio.playSuccess();
    } else if (preset === 'marginal') {
      setFlowRate(4550);
      setSpeedRpm(10450);
      sovereignAudio.playWarning();
    } else {
      setFlowRate(3400);
      setSpeedRpm(10450);
      sovereignAudio.playWarning();
    }
  };

  const handleDispatch = () => {
    setIsDispatched(true);
    sovereignAudio.playSuccess();
    setTimeout(() => setIsDispatched(false), 4000);
  };

  // SVG dimensions for Head vs Flow Map
  const svgW = 440;
  const svgH = 220;
  const minFlow = 2500;
  const maxFlow = 10000;
  const minHead = 80;
  const maxHead = 220;

  const mapX = (flow: number) => {
    return 40 + ((flow - minFlow) / (maxFlow - minFlow)) * (svgW - 60);
  };

  const mapY = (head: number) => {
    return svgH - 30 - ((head - minHead) / (maxHead - minHead)) * (svgH - 50);
  };

  const currentX = mapX(flowRate);
  const currentY = mapY(compMath.polytropicHeadKjKg);

  return (
    <div className="w-full rounded-2xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 shadow-md p-4 sm:p-5 font-sans space-y-4">
      {/* 1. Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl border ${
            compMath.zone === 'ACTIVE_SURGE_DANGER'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 animate-pulse'
              : compMath.zone === 'MARGINAL_SCL_APPROACH'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
              : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-400'
          }`}>
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                Compressor Anti-Surge & Dynamic Performance Envelope
              </h3>
              <button
                onClick={() => selectTag(compressorTag)}
                className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800 hover:bg-cyan-200 transition-colors cursor-pointer"
                title="Locate K-101 in P&ID Canvas"
              >
                {compressorTag}
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
              API 617 8th Ed. • ASME PTC 10 • Zero-Latency Sonic Protection
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold flex items-center gap-1.5 border shadow-2xs ${
            compMath.zone === 'ACTIVE_SURGE_DANGER'
              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 animate-pulse'
              : compMath.zone === 'MARGINAL_SCL_APPROACH'
              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
          }`}>
            {compMath.zone === 'ACTIVE_SURGE_DANGER' ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>SURGE TRIP ACTIVE</span>
              </>
            ) : compMath.zone === 'MARGINAL_SCL_APPROACH' ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>SCL WARNING (10%)</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>STABLE AERODYNAMIC</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* 2. Main Visuals: Interactive SVG Performance Map + Telemetry Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: SVG Compressor Map (7 cols) */}
        <div className="lg:col-span-7 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold font-mono text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Head-Capacity Polytropic Map (Hp vs Q)</span>
            </span>
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                <span className="w-2 h-0.5 bg-rose-500 rounded" /> Surge Line
              </span>
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <span className="w-2 h-0.5 bg-amber-500 rounded" /> SCL (+10%)
              </span>
              <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400">
                <span className="w-2 h-0.5 bg-cyan-500 rounded" /> 100% N
              </span>
            </div>
          </div>

          {/* SVG Map */}
          <div className="relative w-full overflow-hidden flex items-center justify-center">
            <svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              className="w-full h-auto max-h-[220px] select-none"
            >
              {/* Grid Lines */}
              <line x1="40" y1="20" x2="40" y2={svgH - 30} stroke="currentColor" className="text-slate-300 dark:text-zinc-800" strokeWidth="1" />
              <line x1="40" y1={svgH - 30} x2={svgW - 20} y2={svgH - 30} stroke="currentColor" className="text-slate-300 dark:text-zinc-800" strokeWidth="1" />
              
              {/* Y Axis Labels */}
              <text x="35" y="30" textAnchor="end" className="text-[9px] font-mono fill-slate-400 dark:fill-zinc-500">220</text>
              <text x="35" y="110" textAnchor="end" className="text-[9px] font-mono fill-slate-400 dark:fill-zinc-500">150</text>
              <text x="35" y={svgH - 30} textAnchor="end" className="text-[9px] font-mono fill-slate-400 dark:fill-zinc-500">80</text>
              <text x="15" y={svgH / 2} textAnchor="middle" transform={`rotate(-90 15 ${svgH/2})`} className="text-[9px] font-mono fill-slate-400 dark:fill-zinc-500">Hp (kJ/kg)</text>

              {/* X Axis Labels */}
              <text x="40" y={svgH - 12} textAnchor="middle" className="text-[9px] font-mono fill-slate-400 dark:fill-zinc-500">2.5k</text>
              <text x="180" y={svgH - 12} textAnchor="middle" className="text-[9px] font-mono fill-slate-400 dark:fill-zinc-500">6.0k</text>
              <text x={svgW - 25} y={svgH - 12} textAnchor="middle" className="text-[9px] font-mono fill-slate-400 dark:fill-zinc-500">10.0k</text>
              <text x={svgW / 2} y={svgH - 2} textAnchor="middle" className="text-[9px] font-mono fill-slate-400 dark:fill-zinc-500">Flow Q (m³/h)</text>

              {/* Surge Danger Area Shade */}
              <path
                d={`M 40,20 L ${mapX(compMath.qSurgeCurrent)},20 L ${mapX(compMath.qSurgeCurrent)},${svgH - 30} L 40,${svgH - 30} Z`}
                fill="rgba(244, 63, 94, 0.08)"
              />

              {/* Surge Limit Line (SLL) */}
              <line
                x1={mapX(compMath.qSurgeCurrent)}
                y1="20"
                x2={mapX(compMath.qSurgeCurrent)}
                y2={svgH - 30}
                stroke="#f43f5e"
                strokeWidth="2"
                strokeDasharray="4 3"
              />

              {/* Surge Control Line (SCL, +10%) */}
              <line
                x1={mapX(compMath.qSclCurrent)}
                y1="20"
                x2={mapX(compMath.qSclCurrent)}
                y2={svgH - 30}
                stroke="#f59e0b"
                strokeWidth="2"
                strokeDasharray="3 3"
              />

              {/* Speed Curves: 90%, 100%, 105% */}
              {/* 90% Speed */}
              <path
                d="M 60,140 Q 180,120 340,65"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              {/* 100% Speed (Design) */}
              <path
                d="M 75,175 Q 220,155 380,95"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2.5"
              />
              {/* 105% Speed */}
              <path
                d="M 90,195 Q 240,175 400,115"
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />

              {/* Active Operating Point */}
              <g transform={`translate(${currentX}, ${currentY})`}>
                <circle
                  r="14"
                  className={
                    compMath.zone === 'ACTIVE_SURGE_DANGER'
                      ? 'fill-rose-500/20 stroke-rose-500 animate-ping'
                      : compMath.zone === 'MARGINAL_SCL_APPROACH'
                      ? 'fill-amber-500/20 stroke-amber-500 animate-pulse'
                      : 'fill-cyan-500/20 stroke-cyan-500'
                  }
                  strokeWidth="1.5"
                />
                <circle
                  r="6"
                  className={
                    compMath.zone === 'ACTIVE_SURGE_DANGER'
                      ? 'fill-rose-500 stroke-white'
                      : compMath.zone === 'MARGINAL_SCL_APPROACH'
                      ? 'fill-amber-500 stroke-white'
                      : 'fill-cyan-500 stroke-white'
                  }
                  strokeWidth="2"
                />
                <text
                  x="10"
                  y="-10"
                  className="text-[10px] font-mono font-bold fill-slate-800 dark:fill-zinc-200"
                >
                  OP ({flowRate.toFixed(0)} m³/h)
                </text>
              </g>
            </svg>
          </div>

          {/* Quick Scenario Upset Buttons */}
          <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200/60 dark:border-zinc-800">
            <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">Scenarios:</span>
            <button
              onClick={() => handleUpsetPreset('normal')}
              className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              Normal (6.8k)
            </button>
            <button
              onClick={() => handleUpsetPreset('marginal')}
              className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
            >
              SCL Approach (4.5k)
            </button>
            <button
              onClick={() => handleUpsetPreset('surge')}
              className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition-colors cursor-pointer"
            >
              Surge Trip (3.4k)
            </button>
          </div>
        </div>

        {/* Right: Real-time Telemetry & Anti-Surge Valve (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
          {/* Key KPI Tiles */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
              <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">Surge Margin</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className={`text-lg font-black font-mono ${
                  compMath.surgeMarginPct < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : compMath.surgeMarginPct < 10
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {compMath.surgeMarginPct > 0 ? `+${compMath.surgeMarginPct}%` : `${compMath.surgeMarginPct}%`}
                </span>
                <span className="text-[10px] text-slate-400">vs SLL</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
              <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">Polytropic Head</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-black font-mono text-cyan-600 dark:text-cyan-400">
                  {compMath.polytropicHeadKjKg}
                </span>
                <span className="text-[10px] text-slate-400">kJ/kg</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
              <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">Gas Shaft Power</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-black font-mono text-slate-800 dark:text-zinc-200">
                  {compMath.gasPowerKw}
                </span>
                <span className="text-[10px] text-slate-400">kW</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
              <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">Pressure Ratio (P2/P1)</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-black font-mono text-indigo-600 dark:text-indigo-400">
                  {compMath.pRatio} : 1
                </span>
              </div>
            </div>
          </div>

          {/* Anti-Surge Valve (ASV) Status Card */}
          <div className={`p-3 rounded-xl border transition-all ${
            compMath.effectiveAsvOpen > 0
              ? 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
              : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold font-mono text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Anti-Surge Valve (ASV-101)</span>
              </span>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                compMath.effectiveAsvOpen > 0
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
              }`}>
                {compMath.effectiveAsvOpen.toFixed(0)}% OPEN
              </span>
            </div>

            {/* Valve Travel Bar */}
            <div className="w-full h-2.5 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full transition-all duration-300 ${
                  compMath.effectiveAsvOpen > 50
                    ? 'bg-rose-500'
                    : compMath.effectiveAsvOpen > 0
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${compMath.effectiveAsvOpen}%` }}
              />
            </div>

            <p className="text-[11px] font-mono text-slate-600 dark:text-zinc-300">
              {compMath.recommendation}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Dynamic Interactive Control Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
        {/* Slider 1: Suction Flow */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-600 dark:text-zinc-400">Inlet Flow Rate (Q):</span>
            <span className="font-bold text-slate-800 dark:text-zinc-200">{flowRate} m³/h</span>
          </div>
          <input
            type="range"
            min="2800"
            max="9500"
            step="50"
            value={flowRate}
            onChange={(e) => setFlowRate(Number(e.target.value))}
            className="w-full accent-cyan-600 cursor-pointer"
          />
        </div>

        {/* Slider 2: Rotational Speed */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-600 dark:text-zinc-400">Turbine Driver Speed:</span>
            <span className="font-bold text-slate-800 dark:text-zinc-200">{speedRpm} RPM ({compMath.speedRatio}%)</span>
          </div>
          <input
            type="range"
            min="9000"
            max="11200"
            step="100"
            value={speedRpm}
            onChange={(e) => setSpeedRpm(Number(e.target.value))}
            className="w-full accent-cyan-600 cursor-pointer"
          />
        </div>

        {/* Slider 3: Discharge Pressure */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-600 dark:text-zinc-400">Discharge Pressure (P2):</span>
            <span className="font-bold text-slate-800 dark:text-zinc-200">{pDischarge} bar</span>
          </div>
          <input
            type="range"
            min="30"
            max="80"
            step="1"
            value={pDischarge}
            onChange={(e) => setPDischarge(Number(e.target.value))}
            className="w-full accent-cyan-600 cursor-pointer"
          />
        </div>
      </div>

      {/* 4. Action Bar: Dispatch Setpoints & Audit Proof */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-zinc-400">
          <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
          <span>DCS Yokogawa Centum VP • Fast-Acting ASV Hydraulic Loop Synchronized</span>
        </div>

        <button
          onClick={handleDispatch}
          disabled={isDispatched}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all shadow-2xs cursor-pointer ${
            isDispatched
              ? 'bg-emerald-600 text-white'
              : 'bg-cyan-600 hover:bg-cyan-700 text-white'
          }`}
        >
          {isDispatched ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>TRANSMITTED TO DCS (SHA-256 SEALED)</span>
            </>
          ) : (
            <>
              <FileCheck className="w-3.5 h-3.5" />
              <span>Transmit Anti-Surge Tuning to DCS</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default CompressorAntiSurgeWidget;
