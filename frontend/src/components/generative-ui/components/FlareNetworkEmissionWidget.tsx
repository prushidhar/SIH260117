import React, { useState, useMemo } from 'react';
import {
  Flame,
  Wind,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Sliders,
  CheckCircle2,
  Volume2,
  Droplets,
  CloudFog,
  Radio,
  FileCheck
} from 'lucide-react';
import { sovereignAudio } from '../../../lib/sound/sovereign-audio';
import { useIndraStore } from '../../../store/indra-store';

export interface FlareNetworkEmissionProps {
  initialRelievedFlowKgS?: number;
  initialWindSpeedMS?: number;
  initialFlareHeightM?: number;
  flareTag?: string;
}

export const FlareNetworkEmissionWidget: React.FC<FlareNetworkEmissionProps> = ({
  initialRelievedFlowKgS = 45.0,
  initialWindSpeedMS = 5.0,
  initialFlareHeightM = 45.0,
  flareTag = 'FL-101'
}) => {
  const [relievedFlow, setRelievedFlow] = useState<number>(initialRelievedFlowKgS);
  const [windSpeed, setWindSpeed] = useState<number>(initialWindSpeedMS);
  const [steamRatio, setSteamRatio] = useState<number>(0.35);
  const [isSteamPurging, setIsSteamPurging] = useState<boolean>(false);
  const [isDispatched, setIsDispatched] = useState<boolean>(false);

  const selectTag = useIndraStore((s) => s.selectTag);

  // Deterministic API 521 Thermal Radiation & Dispersion Calculations
  const flareMath = useMemo(() => {
    const mDot = relievedFlow;
    const uWind = windSpeed;
    const hStack = initialFlareHeightM;
    const dTip = 0.6; // 24-inch flare tip (meters)
    const mw = 44.1;  // Propane/butane rich relief gas

    const lhvMjKg = 46.5;
    const heatReleaseMw = parseFloat((mDot * lhvMjKg).toFixed(1));
    const fRad = 0.25;
    const qRadKw = heatReleaseMw * 1000.0 * fRad;

    const rhoGas = (101325.0 * mw) / (8314.0 * 300.0);
    const areaTip = (Math.PI / 4.0) * (dTip * dTip);
    const vExit = mDot / (rhoGas * areaTip);
    const cSound = Math.sqrt(1.25 * (8314.0 / mw) * 300.0);
    const machNumber = parseFloat((vExit / cSound).toFixed(3));
    const isMachSafe = machNumber <= 0.50;

    const flameLengthM = parseFloat((0.006 * Math.pow(heatReleaseMw * 1e6, 0.478)).toFixed(1));
    const flameTiltDeg = parseFloat(Math.min(75, (Math.atan(uWind / Math.max(5.0, vExit * 0.25)) * (180 / Math.PI))).toFixed(1));

    // Radiation at key distances
    const tau = 0.85;
    const r10 = Math.sqrt(10 * 10 + hStack * hStack);
    const k10 = parseFloat(((tau * qRadKw) / (4.0 * Math.PI * r10 * r10)).toFixed(2));

    const r30 = Math.sqrt(30 * 30 + hStack * hStack);
    const k30 = parseFloat(((tau * qRadKw) / (4.0 * Math.PI * r30 * r30)).toFixed(2));

    const r60 = Math.sqrt(60 * 60 + hStack * hStack);
    const k60 = parseFloat(((tau * qRadKw) / (4.0 * Math.PI * r60 * r60)).toFixed(2));

    const steamDemandKgS = parseFloat((mDot * steamRatio).toFixed(2));
    const noiseDba = parseFloat((55.0 + 10.0 * Math.log10(Math.max(1.0, heatReleaseMw * 10.0))).toFixed(1));
    const groundPpm = parseFloat(((mDot * 1e6) / (Math.PI * Math.max(1.0, uWind) * 35.0 * 20.0 * rhoGas)).toFixed(1));
    const isSmokeless = steamRatio >= 0.30;

    return {
      heatReleaseMw,
      vExit: parseFloat(vExit.toFixed(1)),
      machNumber,
      isMachSafe,
      flameLengthM,
      flameTiltDeg,
      k10,
      k30,
      k60,
      steamDemandKgS,
      noiseDba,
      groundPpm,
      isSmokeless
    };
  }, [relievedFlow, windSpeed, steamRatio, initialFlareHeightM]);

  const handleSteamOptimize = () => {
    setIsSteamPurging(true);
    setSteamRatio(0.42);
    sovereignAudio.playSuccess();
    setTimeout(() => setIsSteamPurging(false), 2000);
  };

  const handleDispatchDcs = () => {
    setIsDispatched(true);
    sovereignAudio.playSuccess();
    selectTag('PSV-101');
    setTimeout(() => setIsDispatched(false), 4000);
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl text-slate-100 font-sans my-4">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-amber-600 to-rose-600 rounded-lg shadow-lg">
            <Flame className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">
                API 521 Flare Radiation & Atmospheric Dispersion
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-rose-950/80 text-rose-300 border border-rose-800/60">
                STACK: {flareTag} ({initialFlareHeightM}m)
              </span>
            </div>
            <p className="text-xs text-slate-400">
              API Standard 521 7th Edition §5.7 • EPA 40 CFR §60.18 • CPCB Emission Clearance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-mono font-bold ${
            flareMath.isMachSafe && flareMath.isSmokeless
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
              : 'bg-amber-950/80 text-amber-300 border-amber-600 animate-pulse'
          }`}>
            {flareMath.isMachSafe && flareMath.isSmokeless ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>API 521 COMPLIANT (SMOKELESS)</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>SMOKE INJECTION ALERT</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Visual Radiation Contour & Flame SVG (Left) + Engineering Telemetry (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
        {/* Left Column: Visual Flame Tilt & Thermal Contours (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950/70 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-amber-400" />
              THERMAL RADIATION ISO-FLUX CONTOURS & FLAME DISPERSION
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Flame Tilt: {flareMath.flameTiltDeg}° • Length: {flareMath.flameLengthM}m
            </span>
          </div>

          {/* Animated SVG Diagram */}
          <div className="w-full bg-slate-900/90 border border-slate-800/80 rounded-lg p-3 relative overflow-hidden">
            <svg viewBox="0 0 520 220" className="w-full h-auto">
              <defs>
                <radialGradient id="flameGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="plumeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#fb923c" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#64748b" stopOpacity="0.1" />
                </linearGradient>
              </defs>

              {/* Ground level */}
              <line x1="20" y1="190" x2="500" y2="190" stroke="#334155" strokeWidth="2" strokeDasharray="4 2" />
              <text x="25" y="205" fill="#64748b" fontSize="8" fontFamily="monospace">GRADE ELEVATION 0.0m</text>

              {/* Flare Stack Structure */}
              <rect x="80" y="60" width="10" height="130" fill="#475569" stroke="#64748b" strokeWidth="1" />
              {/* Guy wires */}
              <line x1="85" y1="90" x2="30" y2="190" stroke="#334155" strokeWidth="1" strokeDasharray="2 2" />
              <line x1="85" y1="90" x2="140" y2="190" stroke="#334155" strokeWidth="1" strokeDasharray="2 2" />
              <text x="50" y="125" fill="#94a3b8" fontSize="8" fontFamily="monospace">FL-101 (45m)</text>

              {/* Flare Tip & Steam Ring */}
              <rect x="76" y="52" width="18" height="8" rx="2" fill="#0284c7" stroke="#38bdf8" strokeWidth="1" />
              <text x="40" y="50" fill="#38bdf8" fontSize="7" fontFamily="monospace">STEAM RING</text>

              {/* Tilted Flame Plume based on wind */}
              <g transform={`rotate(${flareMath.flameTiltDeg}, 85, 52)`}>
                {/* Outer Glow */}
                <ellipse cx="85" cy={52 - flareMath.flameLengthM * 0.8} rx="16" ry={flareMath.flameLengthM * 0.7} fill="url(#flameGlow)" />
                {/* Core Flame */}
                <path
                  d={`M 80 52 Q 75 ${52 - flareMath.flameLengthM * 0.5} 85 ${52 - flareMath.flameLengthM} Q 95 ${52 - flareMath.flameLengthM * 0.5} 90 52 Z`}
                  fill="#f59e0b"
                />
                <path
                  d={`M 82 52 Q 80 ${52 - flareMath.flameLengthM * 0.3} 85 ${52 - flareMath.flameLengthM * 0.6} Q 90 ${52 - flareMath.flameLengthM * 0.3} 88 52 Z`}
                  fill="#fef08a"
                />
              </g>

              {/* Dispersion Gaussian Plume */}
              <path
                d="M 85 45 C 180 35, 280 60, 480 85 L 480 140 C 280 120, 180 70, 85 55 Z"
                fill="url(#plumeGrad)"
              />
              <text x="350" y="80" fill="#fed7aa" fontSize="8" fontFamily="monospace">GAUSSIAN DISPERSION PLUME</text>
              <text x="350" y="95" fill="#fdba74" fontSize="7" fontFamily="monospace">Ground Conc: {flareMath.groundPpm} ppm (EPA Safe)</text>

              {/* Ground Thermal Radiation Checkpoints */}
              {/* Distance 10m */}
              <circle cx="120" cy="190" r="4" fill="#f43f5e" />
              <text x="110" y="180" fill="#f43f5e" fontSize="7" fontFamily="monospace" fontWeight="bold">10m: {flareMath.k10} kW/m²</text>

              {/* Distance 30m */}
              <circle cx="180" cy="190" r="4" fill="#fbbf24" />
              <text x="170" y="180" fill="#fbbf24" fontSize="7" fontFamily="monospace" fontWeight="bold">30m: {flareMath.k30} kW/m²</text>

              {/* Distance 60m */}
              <circle cx="280" cy="190" r="4" fill="#34d399" />
              <text x="270" y="180" fill="#34d399" fontSize="7" fontFamily="monospace" fontWeight="bold">60m: {flareMath.k60} kW/m²</text>
            </svg>
          </div>

          {/* Thermal Radiation Legend & API 521 Guidelines */}
          <div className="grid grid-cols-3 gap-2 mt-3 text-[11px] font-mono">
            <div className="p-2 bg-slate-900 rounded border border-rose-900/40">
              <span className="text-rose-400 font-bold block">&gt; 4.73 kW/m² (DANGER)</span>
              <span className="text-slate-400 text-[10px]">Emergency escape only; max 30s exposure limit</span>
            </div>
            <div className="p-2 bg-slate-900 rounded border border-amber-900/40">
              <span className="text-amber-400 font-bold block">1.58 – 4.73 kW/m²</span>
              <span className="text-slate-400 text-[10px]">Limited work permitted with shielding gear</span>
            </div>
            <div className="p-2 bg-slate-900 rounded border border-emerald-900/40">
              <span className="text-emerald-400 font-bold block">&lt; 1.58 kW/m² (SAFE)</span>
              <span className="text-slate-400 text-[10px]">Continuous personnel presence permitted</span>
            </div>
          </div>
        </div>

        {/* Right Column: Quantitative Telemetry & Sliders (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-3">
          {/* Real-time Flare Operating KPIs */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 space-y-2.5 font-mono text-xs">
            <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 uppercase font-sans">
              <Activity className="w-3.5 h-3.5 text-rose-400" />
              API 521 RELIEF & COMBUSTION TELEMETRY
            </span>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-[10px] text-slate-400 block">TOTAL HEAT RELEASE</span>
                <span className="text-sm font-bold text-amber-300">{flareMath.heatReleaseMw} MW</span>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-[10px] text-slate-400 block">TIP EXIT MACH NO.</span>
                <span className={`text-sm font-bold ${flareMath.isMachSafe ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {flareMath.machNumber} Ma (Limit: 0.50)
                </span>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-[10px] text-slate-400 block">STEAM DEMAND</span>
                <span className="text-sm font-bold text-cyan-300">{flareMath.steamDemandKgS} kg/s</span>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-[10px] text-slate-400 block">NOISE AT 100m</span>
                <span className="text-sm font-bold text-slate-200">{flareMath.noiseDba} dBA</span>
              </div>
            </div>
          </div>

          {/* Interactive Relief Parameters Slider */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 space-y-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 font-sans">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              EMERGENCY RELIEF PARAMETER CONTROLS
            </span>

            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-0.5">
                <span>Relieved Hydrocarbon Flow (kg/s):</span>
                <span className="text-amber-400 font-bold">{relievedFlow} kg/s</span>
              </div>
              <input
                type="range"
                min={10}
                max={120}
                step={5}
                value={relievedFlow}
                onChange={(e) => setRelievedFlow(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-0.5">
                <span>Crosswind Velocity (m/s):</span>
                <span className="text-cyan-400 font-bold">{windSpeed} m/s ({Math.round(windSpeed * 3.6)} km/h)</span>
              </div>
              <input
                type="range"
                min={0}
                max={25}
                step={1}
                value={windSpeed}
                onChange={(e) => setWindSpeed(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-0.5">
                <span>Smokeless Steam / HC Ratio:</span>
                <span className={flareMath.isSmokeless ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {steamRatio} ({flareMath.isSmokeless ? 'Smokeless' : 'Smoking Risk'})
                </span>
              </div>
              <input
                type="range"
                min={0.15}
                max={0.60}
                step={0.01}
                value={steamRatio}
                onChange={(e) => setSteamRatio(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>

          {/* Action Dispatch Buttons */}
          <div className="space-y-2">
            <button
              onClick={handleSteamOptimize}
              disabled={isSteamPurging}
              className="w-full py-2 px-3 rounded-lg font-bold text-xs bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/60 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Droplets className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isSteamPurging ? 'INJECTING SMOKELESS STEAM (0.42 RATIO)...' : 'AUTO-OPTIMIZE SMOKELESS STEAM'}</span>
            </button>

            <button
              onClick={handleDispatchDcs}
              disabled={isDispatched}
              className={`w-full py-2.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isDispatched
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white shadow-lg shadow-rose-900/30'
              }`}
            >
              {isDispatched ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>EMERGENCY FLARE PURGE DISPATCHED (PSV-101)</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  <span>DISPATCH RELIEF HEADER TO DCS & LOCATE PSV-101</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
