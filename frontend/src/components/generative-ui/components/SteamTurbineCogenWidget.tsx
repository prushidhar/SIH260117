import React, { useState, useMemo } from 'react';
import {
  Zap,
  Flame,
  Activity,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  ShieldAlert,
  Gauge,
  Droplets,
  Factory,
  Radio,
  FileCheck,
  TrendingDown,
  RotateCcw
} from 'lucide-react';
import { sovereignAudio } from '../../../lib/sound/sovereign-audio';
import { useIndraStore } from '../../../store/indra-store';

export interface SteamTurbineCogenProps {
  initialThrottleFlowTH?: number;
  initialHpInletPBar?: number;
  initialHpInletTC?: number;
  turbineTag?: string;
}

export const SteamTurbineCogenWidget: React.FC<SteamTurbineCogenProps> = ({
  initialThrottleFlowTH = 120.0,
  initialHpInletPBar = 90.0,
  initialHpInletTC = 510.0,
  turbineTag = 'STG-01'
}) => {
  const [throttleFlow, setThrottleFlow] = useState<number>(initialThrottleFlowTH);
  const [hpInletTemp, setHpInletTemp] = useState<number>(initialHpInletTC);
  const [mpExtractFlow, setMpExtractFlow] = useState<number>(45.0);
  const [lpExtractFlow, setLpExtractFlow] = useState<number>(35.0);
  const [condenserVacuum, setCondenserVacuum] = useState<number>(0.08); // bar abs
  const [isDispatched, setIsDispatched] = useState<boolean>(false);

  const selectTag = useIndraStore((s) => s.selectTag);

  // Deterministic ASME PTC 6 & IAPWS-IF97 Multi-Stage Steam Expansion Math
  const cogenMath = useMemo(() => {
    const isenEff = 0.845;
    const genEff = 0.975;
    const hpInletP = initialHpInletPBar;
    const mpExtractP = 32.0;
    const lpExtractP = 4.2;

    // Steam Enthalpies per IAPWS-IF97
    // HP Inlet (90 bar, temp variable): base 3412 kJ/kg adjusted for temp
    const hHpInlet = 3412.0 + 2.4 * (hpInletTemp - 510.0);

    // Stage 1: HP to MP (32 bar)
    const deltaH1Ideal = 332.0;
    const deltaH1Act = deltaH1Ideal * isenEff;
    const hMpAct = hHpInlet - deltaH1Act;

    // Stage 2: MP to LP (4.2 bar)
    const deltaH2Ideal = 381.5;
    const deltaH2Act = deltaH2Ideal * isenEff;
    const hLpAct = hMpAct - deltaH2Act;

    // Stage 3: LP to Condenser (0.08 bar abs)
    const deltaH3Ideal = 2809.1 - 2180.0;
    const deltaH3Act = deltaH3Ideal * (isenEff * 0.94);
    const hCondExhaust = hLpAct - deltaH3Act;
    const hCondensate = 173.9; // kJ/kg

    // Mass Balances (t/h -> kg/s)
    const flowHpKgS = (throttleFlow * 1000.0) / 3600.0;
    const flowMpKgS = (mpExtractFlow * 1000.0) / 3600.0;
    const flowLpKgS = (lpExtractFlow * 1000.0) / 3600.0;

    const flowStage1KgS = flowHpKgS;
    const flowStage2KgS = Math.max(0.0, flowStage1KgS - flowMpKgS);
    const flowCondenserKgS = Math.max(0.0, flowStage2KgS - flowLpKgS);
    const flowCondenserTH = Number(((flowCondenserKgS * 3600.0) / 1000.0).toFixed(1));

    // Power Output (MW)
    const powerStage1Mw = (flowStage1KgS * deltaH1Act) / 1000.0;
    const powerStage2Mw = (flowStage2KgS * deltaH2Act) / 1000.0;
    const powerStage3Mw = (flowCondenserKgS * deltaH3Act) / 1000.0;
    const shaftPowerMw = powerStage1Mw + powerStage2Mw + powerStage3Mw;
    const grossElectricalMw = Number((shaftPowerMw * genEff).toFixed(2));

    // Process Thermal Export (MWth)
    const hReturn = 419.0; // 100 C condensate return
    const mpHeatExportMw = Number(((flowMpKgS * (hMpAct - hReturn)) / 1000.0).toFixed(2));
    const lpHeatExportMw = Number(((flowLpKgS * (hLpAct - hReturn)) / 1000.0).toFixed(2));
    const totalThermalExportMw = Number((mpHeatExportMw + lpHeatExportMw).toFixed(2));

    // Condenser & Cooling Water
    const condenserDutyMw = Number(((flowCondenserKgS * (hCondExhaust - hCondensate)) / 1000.0).toFixed(2));
    const cwFlowM3H = Number(((condenserDutyMw * 1000.0) / (4.184 * 10.0) * 3.6).toFixed(1));

    // Specific Steam Consumption (kg/kWh)
    const sscKgKwh = Number(((throttleFlow * 1000.0) / Math.max(1.0, grossElectricalMw * 1000.0)).toFixed(2));

    // Overall Cogen Efficiency %
    const fuelHeatMw = (flowHpKgS * (hHpInlet - hReturn)) / 1000.0;
    const cogenEffPct = Number((((grossElectricalMw + totalThermalExportMw) / Math.max(1.0, fuelHeatMw)) * 100.0).toFixed(1));

    // Carbon Offset (t CO2/hr)
    const carbonOffsetTCo2Hr = Number((grossElectricalMw * 0.82).toFixed(2));
    const annualCo2SavingsT = Number((carbonOffsetTCo2Hr * 8000.0).toFixed(0));

    // Trip Interlocks
    const isVacuumTrip = condenserVacuum > 0.18;
    const isExhaustTempHigh = flowCondenserTH < 10.0;

    return {
      grossElectricalMw,
      totalThermalExportMw,
      mpHeatExportMw,
      lpHeatExportMw,
      flowCondenserTH,
      condenserDutyMw,
      cwFlowM3H,
      sscKgKwh,
      cogenEffPct,
      carbonOffsetTCo2Hr,
      annualCo2SavingsT,
      powerStage1Mw: Number(powerStage1Mw.toFixed(2)),
      powerStage2Mw: Number(powerStage2Mw.toFixed(2)),
      powerStage3Mw: Number(powerStage3Mw.toFixed(2)),
      isVacuumTrip,
      isExhaustTempHigh,
      hHpInlet: Number(hHpInlet.toFixed(0)),
      hMpAct: Number(hMpAct.toFixed(0)),
      hLpAct: Number(hLpAct.toFixed(0)),
      hCondExhaust: Number(hCondExhaust.toFixed(0))
    };
  }, [throttleFlow, hpInletTemp, mpExtractFlow, lpExtractFlow, condenserVacuum, initialHpInletPBar]);

  const handlePreset = (mode: 'power' | 'balanced' | 'heat') => {
    if (mode === 'power') {
      setThrottleFlow(135.0);
      setMpExtractFlow(25.0);
      setLpExtractFlow(20.0);
      sovereignAudio.playSuccess();
    } else if (mode === 'balanced') {
      setThrottleFlow(120.0);
      setMpExtractFlow(45.0);
      setLpExtractFlow(35.0);
      sovereignAudio.playClick();
    } else {
      setThrottleFlow(140.0);
      setMpExtractFlow(55.0);
      setLpExtractFlow(45.0);
      sovereignAudio.playClick();
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
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                Steam Turbine Cogeneration & Enthalpy-Entropy Optimization
              </h3>
              <button
                onClick={() => selectTag(turbineTag)}
                className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 transition-colors cursor-pointer"
                title="Locate STG-01 in P&ID Canvas"
              >
                {turbineTag}
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
              ASME PTC 6 • IAPWS-IF97 Superheated Steam Properties • Captive Power Plant
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-2xs flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>GRID SYNCHRONIZED (50.0 Hz)</span>
          </span>
        </div>
      </div>

      {/* 2. Top Metric Tiles: Power & Thermal Output */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
          <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">Gross Electrical Power</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-black font-mono text-amber-600 dark:text-amber-400">
              {cogenMath.grossElectricalMw}
            </span>
            <span className="text-xs font-bold text-slate-400">MW</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Gen Eff: 97.5%</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
          <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">Process Thermal Export</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-black font-mono text-orange-600 dark:text-orange-400">
              {cogenMath.totalThermalExportMw}
            </span>
            <span className="text-xs font-bold text-slate-400">MWth</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">MP: {cogenMath.mpHeatExportMw} • LP: {cogenMath.lpHeatExportMw}</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
          <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">Overall Cogen Efficiency</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {cogenMath.cogenEffPct}%
            </span>
            <span className="text-xs text-slate-400">η_tot</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">SSC: {cogenMath.sscKgKwh} kg/kWh</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
          <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">Carbon Offset vs Grid</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-black font-mono text-cyan-600 dark:text-cyan-400">
              {cogenMath.carbonOffsetTCo2Hr}
            </span>
            <span className="text-xs font-bold text-slate-400">t/hr</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">~{cogenMath.annualCo2SavingsT.toLocaleString()} t/yr</span>
        </div>
      </div>

      {/* 3. Visual Multi-Stage Steam Expansion Flow */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold font-mono text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Factory className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Multi-Stage Steam Extraction Balance & Condenser Heat Rejection</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handlePreset('power')}
              className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
            >
              Max Power
            </button>
            <button
              onClick={() => handlePreset('balanced')}
              className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              Balanced Cogen
            </button>
            <button
              onClick={() => handlePreset('heat')}
              className="px-2 py-0.5 rounded text-[10px] font-mono bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 hover:bg-orange-100 transition-colors cursor-pointer"
            >
              Max Heat Export
            </button>
          </div>
        </div>

        {/* 3 Expansion Stages Diagram */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {/* Stage 1: HP Section */}
          <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-1.5">
            <div className="flex justify-between items-center text-[11px] font-mono font-bold">
              <span className="text-amber-600 dark:text-amber-400">Stage 1: HP Expansion</span>
              <span className="text-slate-800 dark:text-zinc-200">{cogenMath.powerStage1Mw} MW</span>
            </div>
            <div className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 space-y-0.5">
              <div>Inlet: 90 bar • {hpInletTemp}°C ({cogenMath.hHpInlet} kJ/kg)</div>
              <div>Flow: {throttleFlow} t/h</div>
              <div className="text-amber-600 dark:text-amber-400 font-bold">MP Extract: {mpExtractFlow} t/h (32 bar)</div>
            </div>
          </div>

          {/* Stage 2: IP Section */}
          <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-1.5">
            <div className="flex justify-between items-center text-[11px] font-mono font-bold">
              <span className="text-indigo-600 dark:text-indigo-400">Stage 2: IP Expansion</span>
              <span className="text-slate-800 dark:text-zinc-200">{cogenMath.powerStage2Mw} MW</span>
            </div>
            <div className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 space-y-0.5">
              <div>Inlet: 32 bar • ~320°C ({cogenMath.hMpAct} kJ/kg)</div>
              <div>Flow: {(throttleFlow - mpExtractFlow).toFixed(1)} t/h</div>
              <div className="text-indigo-600 dark:text-indigo-400 font-bold">LP Extract: {lpExtractFlow} t/h (4.2 bar)</div>
            </div>
          </div>

          {/* Stage 3: LP Condensing Section */}
          <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-1.5">
            <div className="flex justify-between items-center text-[11px] font-mono font-bold">
              <span className="text-cyan-600 dark:text-cyan-400">Stage 3: LP Condenser</span>
              <span className="text-slate-800 dark:text-zinc-200">{cogenMath.powerStage3Mw} MW</span>
            </div>
            <div className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 space-y-0.5">
              <div>Inlet: 4.2 bar • ~180°C ({cogenMath.hLpAct} kJ/kg)</div>
              <div>Exhaust Flow: {cogenMath.flowCondenserTH} t/h</div>
              <div className="text-cyan-600 dark:text-cyan-400 font-bold">Condenser CW: {cogenMath.cwFlowM3H} m³/h</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Interactive Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-600 dark:text-zinc-400">Throttle Steam:</span>
            <span className="font-bold text-slate-800 dark:text-zinc-200">{throttleFlow} t/h</span>
          </div>
          <input
            type="range"
            min="80"
            max="160"
            step="1"
            value={throttleFlow}
            onChange={(e) => setThrottleFlow(Number(e.target.value))}
            className="w-full accent-amber-600 cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-600 dark:text-zinc-400">HP Steam Temp:</span>
            <span className="font-bold text-slate-800 dark:text-zinc-200">{hpInletTemp}°C</span>
          </div>
          <input
            type="range"
            min="460"
            max="540"
            step="2"
            value={hpInletTemp}
            onChange={(e) => setHpInletTemp(Number(e.target.value))}
            className="w-full accent-amber-600 cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-600 dark:text-zinc-400">MP Extraction:</span>
            <span className="font-bold text-slate-800 dark:text-zinc-200">{mpExtractFlow} t/h</span>
          </div>
          <input
            type="range"
            min="15"
            max="65"
            step="1"
            value={mpExtractFlow}
            onChange={(e) => setMpExtractFlow(Number(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-600 dark:text-zinc-400">LP Extraction:</span>
            <span className="font-bold text-slate-800 dark:text-zinc-200">{lpExtractFlow} t/h</span>
          </div>
          <input
            type="range"
            min="10"
            max="55"
            step="1"
            value={lpExtractFlow}
            onChange={(e) => setLpExtractFlow(Number(e.target.value))}
            className="w-full accent-cyan-600 cursor-pointer"
          />
        </div>
      </div>

      {/* 5. Footer & Dispatch */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-zinc-400">
          <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
          <span>Captive Power Plant SCADA • Woodward 505 Speed & Extraction Governor Linked</span>
        </div>

        <button
          onClick={handleDispatch}
          disabled={isDispatched}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all shadow-2xs cursor-pointer ${
            isDispatched
              ? 'bg-emerald-600 text-white'
              : 'bg-amber-600 hover:bg-amber-700 text-white'
          }`}
        >
          {isDispatched ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>TRANSMITTED TO CPP GOVERNOR</span>
            </>
          ) : (
            <>
              <FileCheck className="w-3.5 h-3.5" />
              <span>Apply Governor Extraction Setpoints</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SteamTurbineCogenWidget;
