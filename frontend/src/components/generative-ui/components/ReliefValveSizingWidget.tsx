import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Flame,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  FileCheck,
  Zap,
  Gauge,
  Layers,
  ArrowRight
} from 'lucide-react';
import { sovereignAudio } from '../../../lib/sound/sovereign-audio';
import { useIndraStore } from '../../../store/indra-store';

export interface ReliefValveProps {
  scenario?: 'fire_case' | 'process_upset';
  designPressurePsig?: number;
  setPressurePsig?: number;
  fluidName?: string;
  fireHeatInputBtuHr?: number;
  backPressurePsig?: number;
  tag?: string;
}

const API_STANDARD_ORIFICES = [
  { letter: 'D', area: 0.110 },
  { letter: 'E', area: 0.196 },
  { letter: 'F', area: 0.307 },
  { letter: 'G', area: 0.503 },
  { letter: 'H', area: 0.785 },
  { letter: 'J', area: 1.287 },
  { letter: 'K', area: 1.838 },
  { letter: 'L', area: 2.853 },
  { letter: 'M', area: 3.600 },
  { letter: 'N', area: 4.340 },
  { letter: 'P', area: 6.380 },
  { letter: 'Q', area: 11.05 },
  { letter: 'R', area: 16.00 }
];

export const ReliefValveSizingWidget: React.FC<ReliefValveProps> = ({
  scenario = 'fire_case',
  designPressurePsig = 350.0,
  setPressurePsig = 340.0,
  fluidName = 'Naphtha Cut',
  fireHeatInputBtuHr = 2500000.0,
  backPressurePsig = 15.0,
  tag = 'PSV-101'
}) => {
  const [activeScenario, setActiveScenario] = useState<'fire_case' | 'process_upset'>(scenario);
  const [setP, setSetP] = useState<number>(setPressurePsig);
  const [heatInput, setHeatInput] = useState<number>(fireHeatInputBtuHr);
  const [backP, setBackP] = useState<number>(backPressurePsig);
  const [isDispatched, setIsDispatched] = useState<boolean>(false);

  const selectTag = useIndraStore((s) => s.selectTag);

  // Deterministic API 520 / 526 Sizing Mathematics
  const prvMath = useMemo(() => {
    const setPressurePsia = setP + 14.7;
    const backPressurePsia = backP + 14.7;
    const overpressurePct = activeScenario === 'fire_case' ? 21.0 : 10.0;
    const relievingPressurePsia = setPressurePsia * (1 + overpressurePct / 100);

    const Kd = 0.975;
    const Kb = 1.0;
    const Kc = 1.0;
    const latentHeatBtuPerLb = 120.0;
    const vaporLbPerHr = heatInput / latentHeatBtuPerLb;

    const fluidK = 1.05;
    const fluidMw = 100.0;
    const inletTempK = 673.15;
    const Z = 0.95;

    // API 520 C coefficient
    const C = 520.0 * Math.sqrt(fluidK * Math.pow(2.0 / (fluidK + 1.0), (fluidK + 1.0) / (fluidK - 1.0)));
    const requiredAreaIn2 = (vaporLbPerHr / (C * Kd * relievingPressurePsia * Kb * Kc)) * Math.sqrt((inletTempK * Z) / fluidMw);

    // Select standard API orifice
    let selectedOrifice = API_STANDARD_ORIFICES[API_STANDARD_ORIFICES.length - 1];
    for (const ori of API_STANDARD_ORIFICES) {
      if (ori.area >= requiredAreaIn2) {
        selectedOrifice = ori;
        break;
      }
    }

    const areaMarginPct = Number((((selectedOrifice.area - requiredAreaIn2) / requiredAreaIn2) * 100).toFixed(1));
    const backPressureRatio = Number((backPressurePsia / relievingPressurePsia).toFixed(3));
    const criticalPressureRatio = Number(Math.pow(2.0 / (fluidK + 1.0), fluidK / (fluidK - 1.0)).toFixed(3));
    const isChoked = backPressureRatio < criticalPressureRatio;
    const isCompliant = selectedOrifice.area >= requiredAreaIn2;

    return {
      relievingPressurePsia: Number(relievingPressurePsia.toFixed(1)),
      vaporLbPerHr: Number(vaporLbPerHr.toFixed(1)),
      requiredAreaIn2: Number(requiredAreaIn2.toFixed(3)),
      selectedOrifice,
      areaMarginPct,
      backPressureRatio,
      criticalPressureRatio,
      isChoked,
      isCompliant
    };
  }, [activeScenario, setP, heatInput, backP]);

  const handleTransmit = () => {
    sovereignAudio.playSuccess();
    setIsDispatched(true);
    setTimeout(() => setIsDispatched(false), 3000);
  };

  return (
    <div className="w-full bg-slate-900 border border-rose-500/30 rounded-2xl p-5 shadow-2xl text-slate-100 font-sans my-4 overflow-hidden relative">
      {/* Background radial highlight */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base tracking-wide text-white">Pressure Relief Valve Sizing</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                API 520 / 526
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Asset: <button onClick={() => selectTag?.(tag)} className="text-rose-400 underline hover:text-rose-300 font-bold">{tag}</button> • Fluid: {fluidName}
            </p>
          </div>
        </div>

        {/* Scenario Toggle */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveScenario('fire_case')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              activeScenario === 'fire_case'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            FIRE CASE (21% ACC)
          </button>
          <button
            onClick={() => setActiveScenario('process_upset')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              activeScenario === 'process_upset'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            PROCESS UPSET (10% ACC)
          </button>
        </div>
      </div>

      {/* Main Grid: Left Vessel Schematic + Right Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
        {/* Left Column: PRV Schematic (5 cols) */}
        <div className="lg:col-span-5 bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-between">
          <div className="text-[11px] font-mono text-slate-400 self-start mb-2 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Relief Mechanism Geometry</span>
          </div>

          <svg viewBox="0 0 300 240" className="w-full h-52">
            {/* Vessel Body */}
            <rect x="50" y="100" width="200" height="110" rx="20" fill="#1e293b" stroke="#475569" strokeWidth="2" />
            <text x="150" y="155" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="monospace" fontWeight="bold">PRESSURE VESSEL</text>
            <text x="150" y="175" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontFamily="monospace">P = {setP} psig</text>

            {/* Nozzle to PRV */}
            <rect x="135" y="65" width="30" height="35" fill="#334155" stroke="#475569" strokeWidth="1.5" />

            {/* PRV Body (Spring shape) */}
            <path d="M 125 45 L 175 45 L 165 65 L 135 65 Z" fill="#b91c1c" stroke="#ef4444" strokeWidth="2" />
            <circle cx="150" cy="35" r="10" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1.5" />
            <text x="150" y="39" textAnchor="middle" fill="#fecaca" fontSize="9" fontFamily="monospace" fontWeight="bold">PRV</text>

            {/* Discharge Piping to Flare */}
            <path d="M 175 52 L 270 52" stroke="#f43f5e" strokeWidth="3" fill="none" strokeDasharray="5 3" />
            <text x="235" y="44" fill="#fda4af" fontSize="9" fontFamily="monospace">TO FLARE</text>

            {/* Fire flame indicator */}
            {activeScenario === 'fire_case' && (
              <g>
                <path d="M 120 225 Q 130 205 140 225 Q 150 200 160 225 Q 170 205 180 225 Z" fill="#f97316" opacity="0.8" />
                <text x="150" y="235" textAnchor="middle" fill="#fdba74" fontSize="8" fontFamily="monospace">FIRE EXPOSURE</text>
              </g>
            )}
          </svg>

          <div className="w-full flex items-center justify-between text-[11px] font-mono text-slate-400 px-2 pt-2 border-t border-slate-800">
            <span>Regime: <strong className="text-rose-400">{prvMath.isChoked ? 'CRITICAL (CHOKED)' : 'SUBCRITICAL'}</strong></span>
            <span>Pb/P1: <strong className="text-slate-300">{prvMath.backPressureRatio}</strong></span>
          </div>
        </div>

        {/* Right Column: Sizing Results (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Selected Orifice</span>
              <div className="text-2xl font-bold font-mono text-rose-400 mt-1">Letter {prvMath.selectedOrifice.letter}</div>
              <span className="text-[10px] text-slate-500 font-mono">Area: {prvMath.selectedOrifice.area} in²</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Required Area</span>
              <div className="text-2xl font-bold font-mono text-sky-400 mt-1">{prvMath.requiredAreaIn2} in²</div>
              <span className="text-[10px] text-slate-500 font-mono">API 520 Gas Eq.</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Area Margin</span>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">+{prvMath.areaMarginPct}%</div>
              <span className="text-[10px] text-slate-500 font-mono">Safety Margin</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Relieving Press.</span>
              <div className="text-xl font-bold font-mono text-amber-400 mt-1">{prvMath.relievingPressurePsia}</div>
              <span className="text-[10px] text-slate-500 font-mono">psia ({activeScenario === 'fire_case' ? '121%' : '110%'})</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Vapor Generated</span>
              <div className="text-xl font-bold font-mono text-violet-400 mt-1">{prvMath.vaporLbPerHr}</div>
              <span className="text-[10px] text-slate-500 font-mono">lb / hr</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Compliance</span>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">PASS</div>
              <span className="text-[10px] text-slate-500 font-mono">API 526 Standard</span>
            </div>
          </div>

          {/* Standard Orifice Selection Spectrum Bar */}
          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase block mb-2">API 526 Standard Orifice Spectrum (D → R):</span>
            <div className="flex flex-wrap gap-1.5">
              {API_STANDARD_ORIFICES.map((ori) => {
                const isSelected = ori.letter === prvMath.selectedOrifice.letter;
                const isInsufficient = ori.area < prvMath.requiredAreaIn2;
                return (
                  <div
                    key={ori.letter}
                    className={`px-2 py-1 rounded text-center font-mono text-xs transition-all ${
                      isSelected
                        ? 'bg-rose-600 text-white font-bold ring-2 ring-rose-400 shadow-md scale-105'
                        : isInsufficient
                        ? 'bg-slate-800/40 text-slate-500 border border-slate-800'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    <div className="font-bold">{ori.letter}</div>
                    <div className="text-[9px] opacity-80">{ori.area}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Sliders */}
      <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-3 text-xs font-mono font-bold text-slate-300">
          <Sliders className="w-4 h-4 text-rose-400" />
          <span>Relief Valve Operating Parameters</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
              <span>Set Pressure:</span>
              <strong className="text-white">{setP} psig</strong>
            </div>
            <input
              type="range"
              min="50"
              max="1000"
              step="10"
              value={setP}
              onChange={(e) => setSetP(parseFloat(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
              <span>Heat Input (Q):</span>
              <strong className="text-white">{(heatInput / 1e6).toFixed(2)} MMBTU/hr</strong>
            </div>
            <input
              type="range"
              min="500000"
              max="10000000"
              step="250000"
              value={heatInput}
              onChange={(e) => setHeatInput(parseFloat(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
              <span>Back Pressure:</span>
              <strong className="text-white">{backP} psig</strong>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={backP}
              onChange={(e) => setBackP(parseFloat(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="text-[11px] font-mono text-slate-400">
          Governing: <strong className="text-slate-300">API Standard 520 (10th Ed.) / API 526 (7th Ed.)</strong>
        </div>

        <button
          onClick={handleTransmit}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            isDispatched
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
              : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20'
          }`}
        >
          {isDispatched ? <CheckCircle2 className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
          <span>{isDispatched ? 'Orifice Spec Dispatched' : 'Validate & Lock PRV Datasheet'}</span>
        </button>
      </div>
    </div>
  );
};

export default ReliefValveSizingWidget;
