import React, { useState, useMemo } from 'react';
import {
  Droplets,
  Wind,
  Thermometer,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Sliders,
  CheckCircle2,
  FileCheck,
  Radio,
  Gauge,
  Waves
} from 'lucide-react';
import { sovereignAudio } from '../../../lib/sound/sovereign-audio';
import { useIndraStore } from '../../../store/indra-store';

export interface CoolingTowerProps {
  towerTag?: string;
  initialCirculatingFlowM3H?: number;
  initialHotTempC?: number;
  initialColdTempC?: number;
  initialDryBulbC?: number;
  initialRhPct?: number;
}

export const CoolingTowerPsychrometricWidget: React.FC<CoolingTowerProps> = ({
  towerTag = 'CT-101',
  initialCirculatingFlowM3H = 12500.0,
  initialHotTempC = 42.5,
  initialColdTempC = 31.0,
  initialDryBulbC = 36.0,
  initialRhPct = 55.0
}) => {
  const [circulatingFlow, setCirculatingFlow] = useState<number>(initialCirculatingFlowM3H);
  const [hotTempC, setHotTempC] = useState<number>(initialHotTempC);
  const [coldTempC, setColdTempC] = useState<number>(initialColdTempC);
  const [dryBulbC, setDryBulbC] = useState<number>(initialDryBulbC);
  const [relativeHumidity, setRelativeHumidity] = useState<number>(initialRhPct);
  const [coc, setCoc] = useState<number>(4.5);
  const [isDispatched, setIsDispatched] = useState<boolean>(false);

  const selectTag = useIndraStore((s) => s.selectTag);

  // Deterministic CTI ATC-105 & Psychrometric Thermodynamics
  const ctMath = useMemo(() => {
    // Stull Wet-Bulb Equation
    const t = dryBulbC;
    const rh = relativeHumidity;
    const term1 = t * Math.atan(0.151977 * Math.pow(rh + 8.313659, 0.5));
    const term2 = Math.atan(t + rh);
    const term3 = Math.atan(rh - 1.676331);
    const term4 = 0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh);
    const wetBulbC = Number((term1 + term2 - term3 + term4 - 4.686035).toFixed(1));

    const coolingRangeC = Number((hotTempC - coldTempC).toFixed(1));
    const approachC = Number((coldTempC - wetBulbC).toFixed(1));
    const effectivenessPct = Number(((coolingRangeC / Math.max(0.1, coolingRangeC + approachC)) * 100.0).toFixed(1));

    // Thermal Duty MWth (water Cp = 4.184 kJ/kg.K, rho = 995 kg/m3)
    const massFlowKgS = (circulatingFlow * 995.0) / 3600.0;
    const dutyMw = Number(((massFlowKgS * 4.184 * coolingRangeC) / 1000.0).toFixed(2));

    // Water Balance
    const evapRateM3H = Number((0.00153 * circulatingFlow * coolingRangeC).toFixed(1));
    const driftLossM3H = Number((circulatingFlow * 0.00005).toFixed(2));
    const blowdownM3H = Number((evapRateM3H / (Math.max(1.5, coc) - 1.0)).toFixed(1));
    const makeupM3H = Number((evapRateM3H + blowdownM3H + driftLossM3H).toFixed(1));

    // Chemistry Status
    let chemStatus: 'BALANCED' | 'SCALING_RISK' | 'CORROSIVE_RISK' = 'BALANCED';
    if (coc > 5.5) chemStatus = 'SCALING_RISK';
    else if (coc < 2.5) chemStatus = 'CORROSIVE_RISK';

    return {
      wetBulbC,
      coolingRangeC,
      approachC,
      effectivenessPct,
      dutyMw,
      evapRateM3H,
      driftLossM3H,
      blowdownM3H,
      makeupM3H,
      chemStatus
    };
  }, [circulatingFlow, hotTempC, coldTempC, dryBulbC, relativeHumidity, coc]);

  const handlePreset = (mode: 'summer' | 'monsoon' | 'winter') => {
    if (mode === 'summer') {
      setDryBulbC(36.0);
      setRelativeHumidity(55.0);
      setHotTempC(42.5);
      setColdTempC(31.0);
      sovereignAudio.playClick();
    } else if (mode === 'monsoon') {
      setDryBulbC(32.0);
      setRelativeHumidity(85.0);
      setHotTempC(41.0);
      setColdTempC(32.5);
      sovereignAudio.playWarning();
    } else {
      setDryBulbC(22.0);
      setRelativeHumidity(40.0);
      setHotTempC(36.0);
      setColdTempC(25.0);
      sovereignAudio.playSuccess();
    }
  };

  const handleDispatch = () => {
    setIsDispatched(true);
    sovereignAudio.playSuccess();
    setTimeout(() => setIsDispatched(false), 4000);
  };

  return (
    <div className="w-full rounded-2xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 shadow-md p-4 sm:p-5 font-sans space-y-4">
      {/* 1. Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
            <Waves className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                Cooling Tower & Psychrometric Water Balance Optimization
              </h3>
              <button
                onClick={() => selectTag(towerTag)}
                className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800 hover:bg-cyan-200 transition-colors cursor-pointer"
                title="Locate CT-101 in P&ID Canvas"
              >
                {towerTag}
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
              CTI ATC-105 • ASHRAE 90.1 • Wet-Bulb Psychrometric Heat Rejection
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-2xs flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>CTI PERFORMANCE: {ctMath.effectivenessPct}%</span>
          </span>
        </div>
      </div>

      {/* 2. Top Metric Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
          <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">Thermal Heat Rejected</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-black font-mono text-cyan-600 dark:text-cyan-400">
              {ctMath.dutyMw}
            </span>
            <span className="text-xs text-slate-400">MWth</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Flow: {circulatingFlow.toLocaleString()} m³/h</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
          <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">Cooling Approach</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className={`text-xl font-black font-mono ${
              ctMath.approachC > 6.0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {ctMath.approachC}°C
            </span>
            <span className="text-xs text-slate-400">T_cold - T_wb</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Range: {ctMath.coolingRangeC}°C (Hot - Cold)</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
          <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">Ambient Wet-Bulb</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400">
              {ctMath.wetBulbC}°C
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">DB: {dryBulbC}°C • RH: {relativeHumidity}%</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
          <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">Fresh Makeup Demand</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-black font-mono text-slate-800 dark:text-zinc-200">
              {ctMath.makeupM3H}
            </span>
            <span className="text-xs text-slate-400">m³/h</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">COC: {coc} • Blowdown: {ctMath.blowdownM3H} m³/h</span>
        </div>
      </div>

      {/* 3. Water Balance & Psychrometric Breakdown */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold font-mono text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Droplets className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Circulating Water Mass Balance & Evaporation Breakdown</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handlePreset('summer')}
              className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 hover:bg-cyan-100 transition-colors cursor-pointer"
            >
              Summer Design
            </button>
            <button
              onClick={() => handlePreset('monsoon')}
              className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
            >
              Monsoon Humidity
            </button>
            <button
              onClick={() => handlePreset('winter')}
              className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              Winter High-Eff
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
          <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
            <span className="text-[10px] font-mono text-slate-500">Evaporation Loss (E)</span>
            <div className="text-base font-bold font-mono text-cyan-600 dark:text-cyan-400 mt-0.5">
              {ctMath.evapRateM3H} m³/h
            </div>
            <span className="text-[10px] text-slate-400">Heat rejection vehicle</span>
          </div>

          <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
            <span className="text-[10px] font-mono text-slate-500">Continuous Blowdown (B)</span>
            <div className="text-base font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
              {ctMath.blowdownM3H} m³/h
            </div>
            <span className="text-[10px] text-slate-400">Controls dissolved solids</span>
          </div>

          <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
            <span className="text-[10px] font-mono text-slate-500">Drift Loss (D)</span>
            <div className="text-base font-bold font-mono text-slate-800 dark:text-zinc-200 mt-0.5">
              {ctMath.driftLossM3H} m³/h
            </div>
            <span className="text-[10px] text-slate-400">0.005% via eliminators</span>
          </div>

          <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
            <span className="text-[10px] font-mono text-slate-500">Water Chemistry (LSI)</span>
            <div className={`text-base font-bold font-mono mt-0.5 ${
              ctMath.chemStatus === 'BALANCED' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {ctMath.chemStatus === 'BALANCED' ? 'STABLE WATER' : ctMath.chemStatus}
            </div>
            <span className="text-[10px] text-slate-400">Biocide & antiscalant OK</span>
          </div>
        </div>
      </div>

      {/* 4. Interactive Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-600 dark:text-zinc-400">Hot Return Temp (Th):</span>
            <span className="font-bold text-slate-800 dark:text-zinc-200">{hotTempC}°C</span>
          </div>
          <input
            type="range"
            min="35"
            max="50"
            step="0.5"
            value={hotTempC}
            onChange={(e) => setHotTempC(Number(e.target.value))}
            className="w-full accent-cyan-600 cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-600 dark:text-zinc-400">Ambient Dry-Bulb:</span>
            <span className="font-bold text-slate-800 dark:text-zinc-200">{dryBulbC}°C</span>
          </div>
          <input
            type="range"
            min="15"
            max="45"
            step="1"
            value={dryBulbC}
            onChange={(e) => setDryBulbC(Number(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-600 dark:text-zinc-400">Relative Humidity:</span>
            <span className="font-bold text-slate-800 dark:text-zinc-200">{relativeHumidity}%</span>
          </div>
          <input
            type="range"
            min="20"
            max="95"
            step="5"
            value={relativeHumidity}
            onChange={(e) => setRelativeHumidity(Number(e.target.value))}
            className="w-full accent-cyan-600 cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-600 dark:text-zinc-400">Cycles of Concentration:</span>
            <span className="font-bold text-slate-800 dark:text-zinc-200">{coc}</span>
          </div>
          <input
            type="range"
            min="2.0"
            max="7.0"
            step="0.1"
            value={coc}
            onChange={(e) => setCoc(Number(e.target.value))}
            className="w-full accent-amber-600 cursor-pointer"
          />
        </div>
      </div>

      {/* 5. Footer & Dispatch */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-zinc-400">
          <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
          <span>Automated Blowdown Controller & Chemical Dosing Skid Online</span>
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
              <span>TRANSMITTED TO WATER TREATMENT PLC</span>
            </>
          ) : (
            <>
              <FileCheck className="w-3.5 h-3.5" />
              <span>Apply Optimized Blowdown Setpoints</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default CoolingTowerPsychrometricWidget;
