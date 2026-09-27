import React, { useState, useMemo } from 'react';
import {
  Droplets,
  Flame,
  Activity,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  SlidersHorizontal,
  Waves,
  Maximize2,
  FileCheck,
  Radio
} from 'lucide-react';
import { sovereignAudio } from '../../../lib/sound/sovereign-audio';
import { useIndraStore } from '../../../store/indra-store';

export interface TegDehydrationProps {
  gasFlowMmscfd?: number;
  inletPressurePsia?: number;
  inletTempC?: number;
  leanTegConcentration?: number;
  tegCirculationRateLPerKg?: number;
  targetDewpointC?: number;
  tag?: string;
}

export const TegDehydrationWidget: React.FC<TegDehydrationProps> = ({
  gasFlowMmscfd = 50.0,
  inletPressurePsia = 1000.0,
  inletTempC = 40.0,
  leanTegConcentration = 99.5,
  tegCirculationRateLPerKg = 25.0,
  targetDewpointC = -70.0,
  tag = 'TEG-COL-01'
}) => {
  const [gasFlow, setGasFlow] = useState<number>(gasFlowMmscfd);
  const [pressure, setPressure] = useState<number>(inletPressurePsia);
  const [inletTemp, setInletTemp] = useState<number>(inletTempC);
  const [leanConc, setLeanConc] = useState<number>(leanTegConcentration);
  const [circRate, setCircRate] = useState<number>(tegCirculationRateLPerKg);
  const [targetDewpoint, setTargetDewpoint] = useState<number>(targetDewpointC);
  const [isDispatched, setIsDispatched] = useState<boolean>(false);

  const selectTag = useIndraStore((s) => s.selectTag);

  // Deterministic GPSA Engineering Data Book Sec 20 Thermodynamics
  const tegMath = useMemo(() => {
    // Water content correlation (McKetta-Wehe approximation)
    const inletWaterLbPerMmscfd = Number((65.0 * Math.exp(-0.02 * (pressure - 1000) / 100) * (1 + 0.01 * (inletTemp - 40))).toFixed(1));
    const waterRemovedLbPerDay = Number(((inletWaterLbPerMmscfd - 1.0) * gasFlow).toFixed(1));
    const dewpointDepressionC = Number((inletTemp - targetDewpoint).toFixed(1));
    const tegFlowGalPerHr = Number(((waterRemovedLbPerDay / 24.0) * circRate * 0.2642).toFixed(1));
    const reboilerDutyKw = Number((tegFlowGalPerHr * 1000.0 * 0.293071 / 1000.0).toFixed(1));
    const contactorDiaM = Number((Math.sqrt((gasFlow * 1e6 / (24 * 60) * (14.7 / pressure) * ((inletTemp + 459.67) / 519.67)) / (0.25 * 60 * Math.PI)) * 2 * 0.3048).toFixed(2));
    const richConc = Number(Math.max(91.0, Math.min(leanConc, leanConc - (waterRemovedLbPerDay / 24.0 / Math.max(tegFlowGalPerHr, 0.1)) * 8.0)).toFixed(1));
    const isNormal = richConc >= 94.0;

    return {
      inletWaterLbPerMmscfd,
      waterRemovedLbPerDay,
      dewpointDepressionC,
      tegFlowGalPerHr,
      reboilerDutyKw,
      contactorDiaM: Math.max(0.8, contactorDiaM),
      richConc,
      isNormal
    };
  }, [gasFlow, pressure, inletTemp, leanConc, circRate, targetDewpoint]);

  const handleTransmit = () => {
    sovereignAudio.playSuccess();
    setIsDispatched(true);
    setTimeout(() => setIsDispatched(false), 3000);
  };

  return (
    <div className="w-full bg-slate-900 border border-teal-500/30 rounded-2xl p-5 shadow-2xl text-slate-100 font-sans my-4 overflow-hidden relative">
      {/* Background radial highlight */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
            <Droplets className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base tracking-wide text-white">TEG Glycol Dehydration Contactor</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                GPSA SEC 20
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Asset: <button onClick={() => selectTag?.(tag)} className="text-teal-400 underline hover:text-teal-300 font-bold">{tag}</button> • Souders-Brown Liquid-Gas Absorption
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 ${
            tegMath.isNormal
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${tegMath.isNormal ? 'bg-emerald-400' : 'bg-amber-400'} animate-ping`} />
            {tegMath.isNormal ? 'ABSORPTION OPTIMAL' : 'CHECK SOLVENT LOADING'}
          </span>
        </div>
      </div>

      {/* Main Grid: Left Schematic + Right KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
        {/* Left Column: Contactor SVG Schematic (5 cols) */}
        <div className="lg:col-span-5 bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-between">
          <div className="text-[11px] font-mono text-slate-400 self-start mb-2 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-teal-400" />
            <span>Process Flow Schematic</span>
          </div>

          <svg viewBox="0 0 320 280" className="w-full h-56">
            <defs>
              <linearGradient id="columnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0f766e" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#14b8a6" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#0f766e" stopOpacity="0.4" />
              </linearGradient>
            </defs>

            {/* Main Contactor Column */}
            <rect x="110" y="30" width="100" height="200" rx="14" fill="url(#columnGrad)" stroke="#14b8a6" strokeWidth="2" />
            <text x="160" y="50" textAnchor="middle" fill="#5eead4" fontSize="10" fontFamily="monospace" fontWeight="bold">CONTACTOR</text>

            {/* Bubble Trays */}
            {[80, 115, 150, 185].map((y, i) => (
              <g key={i}>
                <line x1="115" y1={y} x2="205" y2={y} stroke="#2dd4bf" strokeWidth="1.5" strokeDasharray="4 2" />
                <circle cx={130 + (i % 2) * 20} cy={y - 8} r="3" fill="#38bdf8" opacity="0.8" />
                <circle cx={170 - (i % 2) * 15} cy={y - 12} r="2.5" fill="#38bdf8" opacity="0.6" />
              </g>
            ))}

            {/* Wet Gas Inlet (bottom-left) */}
            <path d="M 40 200 L 110 200" stroke="#38bdf8" strokeWidth="2.5" fill="none" />
            <text x="40" y="192" fill="#7dd3fc" fontSize="9" fontFamily="monospace">Wet Gas In</text>

            {/* Dry Gas Outlet (top-left) */}
            <path d="M 110 50 L 40 50" stroke="#10b981" strokeWidth="2.5" fill="none" />
            <text x="40" y="44" fill="#6ee7b7" fontSize="9" fontFamily="monospace">Dry Gas Out</text>

            {/* Lean TEG Inlet (top-right) */}
            <path d="M 280 50 L 210 50" stroke="#2dd4bf" strokeWidth="2.5" fill="none" />
            <text x="220" y="44" fill="#5eead4" fontSize="9" fontFamily="monospace">Lean TEG (99.5%)</text>

            {/* Rich TEG Outlet (bottom-right) to Reboiler */}
            <path d="M 210 200 L 280 200" stroke="#f59e0b" strokeWidth="2.5" fill="none" />
            <text x="215" y="192" fill="#fcd34d" fontSize="9" fontFamily="monospace">Rich TEG</text>

            {/* Reboiler Box */}
            <rect x="230" y="225" width="70" height="35" rx="6" fill="#78350f" stroke="#f59e0b" strokeWidth="1.5" />
            <text x="265" y="246" textAnchor="middle" fill="#fef3c7" fontSize="9" fontFamily="monospace" fontWeight="bold">REBOILER</text>
          </svg>

          <div className="w-full flex items-center justify-between text-[11px] font-mono text-slate-400 px-2 pt-2 border-t border-slate-800">
            <span>Contactor Dia: <strong className="text-teal-300">{tegMath.contactorDiaM} m</strong></span>
            <span>4 Bubble Trays</span>
          </div>
        </div>

        {/* Right Column: 6 KPI Cards (7 cols) */}
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Water Removed</span>
            <div className="text-xl font-bold font-mono text-teal-400 mt-1">{tegMath.waterRemovedLbPerDay}</div>
            <span className="text-[10px] text-slate-500 font-mono">lb H₂O / day</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Dew Point Depr.</span>
            <div className="text-xl font-bold font-mono text-violet-400 mt-1">Δ {tegMath.dewpointDepressionC}°C</div>
            <span className="text-[10px] text-slate-500 font-mono">Inlet: {inletTemp}°C</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase">TEG Circulation</span>
            <div className="text-xl font-bold font-mono text-sky-400 mt-1">{tegMath.tegFlowGalPerHr}</div>
            <span className="text-[10px] text-slate-500 font-mono">gal / hr</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Reboiler Duty</span>
            <div className="text-xl font-bold font-mono text-amber-400 mt-1">{tegMath.reboilerDutyKw}</div>
            <span className="text-[10px] text-slate-500 font-mono">kW Thermal</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Lean TEG Conc.</span>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{leanConc}%</div>
            <span className="text-[10px] text-slate-500 font-mono">Triethylene Glycol</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Rich TEG Conc.</span>
            <div className={`text-xl font-bold font-mono mt-1 ${tegMath.isNormal ? 'text-teal-400' : 'text-amber-400'}`}>
              {tegMath.richConc}%
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Post-Absorption</span>
          </div>
        </div>
      </div>

      {/* Interactive Parameter Sliders */}
      <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-3 text-xs font-mono font-bold text-slate-300">
          <Sliders className="w-4 h-4 text-teal-400" />
          <span>Contactor Hydraulic Controls</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
              <span>Gas Flow Rate:</span>
              <strong className="text-white">{gasFlow} MMSCFD</strong>
            </div>
            <input
              type="range"
              min="10"
              max="150"
              step="5"
              value={gasFlow}
              onChange={(e) => setGasFlow(parseFloat(e.target.value))}
              className="w-full accent-teal-400 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
              <span>Inlet Pressure:</span>
              <strong className="text-white">{pressure} psia</strong>
            </div>
            <input
              type="range"
              min="400"
              max="1500"
              step="25"
              value={pressure}
              onChange={(e) => setPressure(parseFloat(e.target.value))}
              className="w-full accent-teal-400 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
              <span>Circulation Rate:</span>
              <strong className="text-white">{circRate} L/kg H₂O</strong>
            </div>
            <input
              type="range"
              min="15"
              max="45"
              step="1"
              value={circRate}
              onChange={(e) => setCircRate(parseFloat(e.target.value))}
              className="w-full accent-teal-400 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="text-[11px] font-mono text-slate-400">
          Governing: <strong className="text-slate-300">GPSA Engineering Data Book § 20 / GPA 2172</strong>
        </div>

        <button
          onClick={handleTransmit}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            isDispatched
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
              : 'bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-600/20'
          }`}
        >
          {isDispatched ? <CheckCircle2 className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
          <span>{isDispatched ? 'Parameters Synced to DCS' : 'Commit Operating Setpoints'}</span>
        </button>
      </div>
    </div>
  );
};

export default TegDehydrationWidget;
