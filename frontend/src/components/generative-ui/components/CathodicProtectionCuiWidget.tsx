import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Sliders,
  CheckCircle2,
  Volume2,
  FileCheck,
  Radio,
  Layers,
  Thermometer,
  Zap
} from 'lucide-react';
import { sovereignAudio } from '../../../lib/sound/sovereign-audio';
import { useIndraStore } from '../../../store/indra-store';

export interface CathodicProtectionCuiProps {
  pipeTag?: string;
  initialPotentialMv?: number;
  initialTempC?: number;
  initialAnodeMassKg?: number;
}

export const CathodicProtectionCuiWidget: React.FC<CathodicProtectionCuiProps> = ({
  pipeTag = 'L-101',
  initialPotentialMv = -920.0,
  initialTempC = 85.0,
  initialAnodeMassKg = 45.0
}) => {
  const [potentialMv, setPotentialMv] = useState<number>(initialPotentialMv);
  const [operatingTempC, setOperatingTempC] = useState<number>(initialTempC);
  const [anodeType, setAnodeType] = useState<'Zinc' | 'Magnesium' | 'Aluminium'>('Zinc');
  const [anodeMassKg, setAnodeMassKg] = useState<number>(initialAnodeMassKg);
  const [insulationType, setInsulationType] = useState<string>('Calcium Silicate');
  const [coatingCondition, setCoatingCondition] = useState<'GOOD' | 'FAIR' | 'POOR'>('FAIR');
  const [operatingYears, setOperatingYears] = useState<number>(7.5);
  const [isDispatched, setIsDispatched] = useState<boolean>(false);

  const selectTag = useIndraStore((s) => s.selectTag);

  // Deterministic NACE SP0169 & API 581 RBI Calculations
  const rbiMath = useMemo(() => {
    // 1. NACE Criterion
    const isProtected = potentialMv <= -850.0 && potentialMv >= -1200.0;
    let cpStatus: 'ADEQUATE' | 'UNDER_PROTECTED' | 'OVER_PROTECTED' = 'ADEQUATE';
    if (potentialMv > -850.0) cpStatus = 'UNDER_PROTECTED';
    else if (potentialMv < -1200.0) cpStatus = 'OVER_PROTECTED';

    // 2. Anode consumption
    const capLookup: Record<string, number> = { Zinc: 820.0, Magnesium: 1100.0, Aluminium: 2000.0 };
    const capAHrKg = capLookup[anodeType] || 820.0;
    const currentDrawA = (12.5 * 85.0) / 1000.0; // 1.0625 A
    const annualConsumptionKg = (currentDrawA * 8760.0) / capAHrKg;
    const consumedMass = Math.min(anodeMassKg, annualConsumptionKg * operatingYears);
    const residualMassKg = Number(Math.max(0.0, anodeMassKg - consumedMass).toFixed(1));
    const residualPct = Number(((residualMassKg / anodeMassKg) * 100.0).toFixed(1));
    const remainingYears = Number((residualMassKg / Math.max(0.1, annualConsumptionKg)).toFixed(1));

    // 3. CUI Sweating Zone (50 - 175 C)
    const isCuiSweating = operatingTempC >= 50.0 && operatingTempC <= 175.0;
    let tempScore = isCuiSweating ? 4 : operatingTempC < 50.0 ? 2 : 1;
    let insScore = insulationType === 'Calcium Silicate' ? 3 : insulationType === 'Aerogel' ? 1 : 2;
    let coatScore = coatingCondition === 'GOOD' ? 1 : coatingCondition === 'FAIR' ? 3 : 5;

    const pofScore = Math.min(5, Math.max(1, Math.round(tempScore * 0.4 + insScore * 0.3 + coatScore * 0.3)));
    const cofCategory = 'D'; // Flammable crude oil header

    let riskRank: 'LOW' | 'MEDIUM_HIGH' | 'HIGH' = 'LOW';
    if (pofScore >= 4 && (cofCategory === 'D' || cofCategory === 'E')) {
      riskRank = 'HIGH';
    } else if (pofScore >= 3 || !isProtected) {
      riskRank = 'MEDIUM_HIGH';
    }

    return {
      isProtected,
      cpStatus,
      residualMassKg,
      residualPct,
      remainingYears,
      isCuiSweating,
      pofScore,
      cofCategory,
      riskRank,
      annualConsumptionKg: Number(annualConsumptionKg.toFixed(2))
    };
  }, [potentialMv, operatingTempC, anodeType, anodeMassKg, insulationType, coatingCondition, operatingYears]);

  const handlePreset = (preset: 'healthy' | 'sweating' | 'depleted') => {
    if (preset === 'healthy') {
      setPotentialMv(-950.0);
      setOperatingTempC(40.0);
      setCoatingCondition('GOOD');
      setOperatingYears(2.0);
      sovereignAudio.playSuccess();
    } else if (preset === 'sweating') {
      setPotentialMv(-810.0); // Under-protected
      setOperatingTempC(85.0); // CUI sweating
      setCoatingCondition('POOR');
      sovereignAudio.playWarning();
    } else {
      setOperatingYears(18.0);
      setPotentialMv(-760.0);
      sovereignAudio.playWarning();
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
          <div className={`p-2 rounded-xl border ${
            rbiMath.riskRank === 'HIGH'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 animate-pulse'
              : rbiMath.riskRank === 'MEDIUM_HIGH'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
          }`}>
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                Cathodic Protection (CP) & CUI Risk-Based Inspection Matrix
              </h3>
              <button
                onClick={() => selectTag(pipeTag)}
                className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 hover:bg-indigo-200 transition-colors cursor-pointer"
                title="Locate L-101 in P&ID Canvas"
              >
                {pipeTag}
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
              NACE SP0169 • API 581 3rd Ed. (RBI) • API 570 Piping Inspection
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border shadow-2xs flex items-center gap-1.5 ${
            rbiMath.riskRank === 'HIGH'
              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 animate-pulse'
              : rbiMath.riskRank === 'MEDIUM_HIGH'
              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
          }`}>
            {rbiMath.riskRank === 'HIGH' ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>HIGH CUI RISK (PRIORITY 1)</span>
              </>
            ) : rbiMath.riskRank === 'MEDIUM_HIGH' ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>MEDIUM-HIGH RBI RANK</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>NACE CRITERIA SATISFIED</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* 2. Top Metric Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Metric 1: Pipe-to-Soil Potential */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
          <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">Pipe-to-Soil Potential</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className={`text-xl font-black font-mono ${
              rbiMath.isProtected ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {potentialMv}
            </span>
            <span className="text-xs text-slate-400">mV CSE</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Limit: -850 to -1200 mV</span>
        </div>

        {/* Metric 2: Sacrificial Anode Residual */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
          <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">Residual {anodeType} Anode</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className={`text-xl font-black font-mono ${
              rbiMath.residualPct < 20 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-zinc-200'
            }`}>
              {rbiMath.residualPct}%
            </span>
            <span className="text-xs text-slate-400">({rbiMath.residualMassKg} kg)</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Remaining: {rbiMath.remainingYears} yrs</span>
        </div>

        {/* Metric 3: CUI Thermal Sweating */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
          <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">Operating Temperature</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-black font-mono text-amber-600 dark:text-amber-400">
              {operatingTempC}°C
            </span>
          </div>
          <span className={`text-[10px] font-mono font-bold ${
            rbiMath.isCuiSweating ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
          }`}>
            {rbiMath.isCuiSweating ? '• IN SWEATING RANGE (50-175°C)' : '• OUTSIDE SWEATING RANGE'}
          </span>
        </div>

        {/* Metric 4: API 581 Matrix Rank */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
          <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">API 581 Risk Level</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className={`text-xl font-black font-mono ${
              rbiMath.riskRank === 'HIGH' ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400'
            }`}>
              {rbiMath.pofScore}{rbiMath.cofCategory}
            </span>
            <span className="text-xs text-slate-400">POF {rbiMath.pofScore} × COF {rbiMath.cofCategory}</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Rank: {rbiMath.riskRank}</span>
        </div>
      </div>

      {/* 3. API 581 5x5 Risk Matrix & Anode Depletion Graphic */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: 5x5 Matrix (7 cols) */}
        <div className="lg:col-span-7 p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold font-mono text-slate-700 dark:text-zinc-300">
              API 581 Risk-Based Inspection (RBI) 5×5 Heatmap
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handlePreset('healthy')}
                className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                Healthy CP
              </button>
              <button
                onClick={() => handlePreset('sweating')}
                className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition-colors cursor-pointer"
              >
                CUI Sweating
              </button>
              <button
                onClick={() => handlePreset('depleted')}
                className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
              >
                Anode Depleted
              </button>
            </div>
          </div>

          {/* Matrix Grid */}
          <div className="overflow-x-auto">
            <table className="w-full text-center text-[10px] font-mono border-collapse">
              <thead>
                <tr>
                  <th className="p-1 text-slate-400 font-normal">POF \ COF</th>
                  <th className="p-1 font-bold text-slate-600 dark:text-zinc-300">A</th>
                  <th className="p-1 font-bold text-slate-600 dark:text-zinc-300">B</th>
                  <th className="p-1 font-bold text-slate-600 dark:text-zinc-300">C</th>
                  <th className="p-1 font-bold text-slate-600 dark:text-zinc-300">D</th>
                  <th className="p-1 font-bold text-slate-600 dark:text-zinc-300">E</th>
                </tr>
              </thead>
              <tbody>
                {[5, 4, 3, 2, 1].map((pVal) => (
                  <tr key={pVal}>
                    <td className="p-1 font-bold text-slate-600 dark:text-zinc-400 text-left">Level {pVal}</td>
                    {['A', 'B', 'C', 'D', 'E'].map((cVal) => {
                      const isCurrent = pVal === rbiMath.pofScore && cVal === rbiMath.cofCategory;
                      const score = pVal * (cVal === 'A' ? 1 : cVal === 'B' ? 2 : cVal === 'C' ? 3 : cVal === 'D' ? 4 : 5);
                      const bgClass = score >= 16 ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                        : score >= 9 ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                        : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';

                      return (
                        <td
                          key={cVal}
                          className={`p-1.5 border relative ${bgClass} ${isCurrent ? 'ring-2 ring-indigo-500 font-black' : ''}`}
                        >
                          {isCurrent ? (
                            <span className="flex items-center justify-center gap-0.5">
                              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping inline-block" />
                              <span>{pVal}{cVal}</span>
                            </span>
                          ) : (
                            <span>{pVal}{cVal}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Sacrificial Anode & NDT Recommendation (5 cols) */}
        <div className="lg:col-span-5 p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold font-mono text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Sacrificial Anode Bed ({anodeType})</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                Rate: {rbiMath.annualConsumptionKg} kg/yr
              </span>
            </div>

            {/* Anode Depletion Bar */}
            <div className="w-full h-3 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden mb-1.5">
              <div
                className={`h-full transition-all duration-300 ${
                  rbiMath.residualPct < 25 ? 'bg-rose-500' : rbiMath.residualPct < 50 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${rbiMath.residualPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>0 kg (Depleted)</span>
              <span>{rbiMath.residualMassKg} / {anodeMassKg} kg remaining</span>
            </div>
          </div>

          {/* Action Box */}
          <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-mono space-y-1">
            <span className="text-slate-500 dark:text-zinc-400 font-bold">API 570 Mandatory Action:</span>
            <p className="text-slate-700 dark:text-zinc-300 text-[11px] leading-relaxed">
              {rbiMath.riskRank === 'HIGH'
                ? 'High CUI vulnerability detected in 50-175°C thermal sweating zone. Execute Phased Array Ultrasonic Testing (PAUT) grid scanning within 30 days.'
                : rbiMath.riskRank === 'MEDIUM_HIGH'
                ? 'Elevated CUI susceptibility. Conduct Pulsed Eddy Current (PEC) screening through insulation cladding at next routine maintenance.'
                : 'Cathodic protection and pipe-to-soil potential satisfy NACE SP0169 criteria. Maintain routine annual test station logging.'}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Interactive Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-600 dark:text-zinc-400">Pipe-to-Soil Potential:</span>
            <span className="font-bold text-slate-800 dark:text-zinc-200">{potentialMv} mV</span>
          </div>
          <input
            type="range"
            min="-1400"
            max="-650"
            step="10"
            value={potentialMv}
            onChange={(e) => setPotentialMv(Number(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-600 dark:text-zinc-400">Process Temperature:</span>
            <span className="font-bold text-slate-800 dark:text-zinc-200">{operatingTempC}°C</span>
          </div>
          <input
            type="range"
            min="20"
            max="220"
            step="5"
            value={operatingTempC}
            onChange={(e) => setOperatingTempC(Number(e.target.value))}
            className="w-full accent-amber-600 cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-600 dark:text-zinc-400">Operating Service Life:</span>
            <span className="font-bold text-slate-800 dark:text-zinc-200">{operatingYears} years</span>
          </div>
          <input
            type="range"
            min="1"
            max="25"
            step="0.5"
            value={operatingYears}
            onChange={(e) => setOperatingYears(Number(e.target.value))}
            className="w-full accent-cyan-600 cursor-pointer"
          />
        </div>
      </div>

      {/* 5. Footer & Dispatch */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-zinc-400">
          <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
          <span>Corrosion Coupon Data & Soil Resistivity Telemetry Linked</span>
        </div>

        <button
          onClick={handleDispatch}
          disabled={isDispatched}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all shadow-2xs cursor-pointer ${
            isDispatched
              ? 'bg-emerald-600 text-white'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {isDispatched ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>DISPATCHED TO CORROSION CONTROL SYSTEM</span>
            </>
          ) : (
            <>
              <FileCheck className="w-3.5 h-3.5" />
              <span>Issue PAUT NDT Inspection Work Order</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default CathodicProtectionCuiWidget;
