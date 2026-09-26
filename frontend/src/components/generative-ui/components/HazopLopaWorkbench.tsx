import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertOctagon,
  CheckCircle2,
  FileCheck,
  Sliders,
  Activity,
  Layers,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
  TrendingDown,
  Info,
  Flame,
  ArrowRight
} from 'lucide-react';
import { sovereignAudio } from '../../../lib/sound/sovereign-audio';
import { useIndraStore } from '../../../store/indra-store';

export interface HazopLopaProps {
  initialNodeId?: string;
  initialDeviation?: string;
  initialSeverity?: string;
  initialInitiatingFreq?: number;
}

interface NodeOption {
  id: string;
  name: string;
  service: string;
  designPressure: string;
  designTemp: string;
}

const PROCESS_NODES: NodeOption[] = [
  { id: 'NODE-01_CDU_FEED', name: 'Node 01: Crude Feed to Charge Furnace F-101', service: 'Crude Oil', designPressure: '450 psig', designTemp: '280 °C' },
  { id: 'NODE-02_COL_FLASH', name: 'Node 02: Atmospheric Column T-101 Flash Zone', service: 'Two-Phase Hydrocarbon', designPressure: '75 psig', designTemp: '375 °C' },
  { id: 'NODE-03_RECYCLE_GAS', name: 'Node 03: Compressor K-101 Recycle Suction', service: 'Hydrogen-Rich Gas', designPressure: '3500 psig', designTemp: '65 °C' },
  { id: 'NODE-04_RESIDUE_LINE', name: 'Node 04: Bottoms Atmospheric Residue to VDU', service: 'Heavy Reduced Crude', designPressure: '150 psig', designTemp: '360 °C' },
];

interface IPLDef {
  id: string;
  name: string;
  type: string;
  pfd: number;
  rrf: number;
  standardRef: string;
}

const BASE_IPLS: IPLDef[] = [
  { id: 'IPL-01', name: 'Basic Process Control System (BPCS) High-Pressure Loop Trip', type: 'BPCS Control Action', pfd: 0.10, rrf: 10, standardRef: 'IEC 61511-1 §9.4' },
  { id: 'IPL-02', name: 'Operator Response to Independent Alarm (PAH-104)', type: 'Human Response (10 min rule)', pfd: 0.10, rrf: 10, standardRef: 'EEMUA 191 / ISA-18.2' },
  { id: 'IPL-03', name: 'Certified ASME Sec VIII Safety Relief Valve (PSV-101)', type: 'Mechanical Relief Device', pfd: 0.01, rrf: 100, standardRef: 'API 520 / 526' },
  { id: 'IPL-04', name: 'Safety Instrumented System (SIS) SIL-2 ESD Interlock', type: 'Safety Instrumented Function (SIF)', pfd: 0.005, rrf: 200, standardRef: 'IEC 61508 / 61511 SIL-2' },
];

export const HazopLopaWorkbench: React.FC<HazopLopaProps> = ({
  initialNodeId = 'NODE-01_CDU_FEED',
  initialDeviation = 'HIGH_PRESSURE',
  initialSeverity = 'CATASTROPHIC',
  initialInitiatingFreq = 0.1
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>(initialNodeId);
  const [deviation, setDeviation] = useState<string>(initialDeviation);
  const [severity, setSeverity] = useState<string>(initialSeverity);
  const [initiatingFreq, setInitiatingFreq] = useState<number>(initialInitiatingFreq);
  const [activeIpls, setActiveIpls] = useState<Record<string, boolean>>({
    'IPL-01': true,
    'IPL-02': true,
    'IPL-03': true,
    'IPL-04': true,
  });
  const [isSigned, setIsSigned] = useState<boolean>(false);

  const selectTag = useIndraStore((s) => s.selectTag);

  const selectedNode = useMemo(() => {
    return PROCESS_NODES.find((n) => n.id === selectedNodeId) || PROCESS_NODES[0];
  }, [selectedNodeId]);

  // IEC 61511 LOPA Calculations
  const lopa = useMemo(() => {
    const tmefLookup: Record<string, number> = {
      CATASTROPHIC: 1.0e-5,
      SEVERE: 1.0e-4,
      SERIOUS: 1.0e-3,
      MODERATE: 1.0e-2,
    };
    const tmef = tmefLookup[severity] || 1.0e-4;

    let totalPfd = 1.0;
    BASE_IPLS.forEach((ipl) => {
      if (activeIpls[ipl.id]) {
        totalPfd *= ipl.pfd;
      }
    });

    const fMitigated = initiatingFreq * totalPfd;
    const requiredRrf = initiatingFreq / tmef;
    const achievedRrf = 1.0 / totalPfd;
    const isAcceptable = fMitigated <= tmef;

    let targetSil = 'NO SIL REQUIRED';
    let silBadgeColor = 'bg-slate-700 text-slate-300';
    if (requiredRrf >= 10000) {
      targetSil = 'SIL 4 (Inherently Safe Redesign Required)';
      silBadgeColor = 'bg-rose-950 text-rose-300 border-rose-700';
    } else if (requiredRrf >= 1000) {
      targetSil = 'SIL 3 (High Demand Safety Instrumented Function)';
      silBadgeColor = 'bg-amber-950 text-amber-300 border-amber-700';
    } else if (requiredRrf >= 100) {
      targetSil = 'SIL 2 (Standard Process Sector SIS)';
      silBadgeColor = 'bg-blue-950 text-blue-300 border-blue-700';
    } else if (requiredRrf >= 10) {
      targetSil = 'SIL 1 (Basic Safety Protection)';
      silBadgeColor = 'bg-emerald-950 text-emerald-300 border-emerald-700';
    }

    return {
      tmef,
      totalPfd,
      fMitigated,
      requiredRrf,
      achievedRrf,
      isAcceptable,
      targetSil,
      silBadgeColor
    };
  }, [severity, initiatingFreq, activeIpls]);

  const handleToggleIpl = (iplId: string) => {
    setActiveIpls((prev) => {
      const next = { ...prev, [iplId]: !prev[iplId] };
      if (!next[iplId]) {
        sovereignAudio.playWarning();
      } else {
        sovereignAudio.playClick();
      }
      return next;
    });
  };

  const handleSignSafetyCase = () => {
    setIsSigned(true);
    sovereignAudio.playSuccess();
    selectTag('PSV-101');
    setTimeout(() => setIsSigned(false), 4500);
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl text-slate-100 font-sans my-4">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-amber-600 to-rose-600 rounded-lg shadow-lg">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">
                Automated HAZOP & Layer of Protection Analysis (LOPA)
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-amber-950/80 text-amber-300 border border-amber-800/60">
                IEC 61508 / IEC 61511 SIL ENGINE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              CCPS Guidelines for Initiating Events & IPLs • Quantitative Risk Target Allocation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold border flex items-center gap-1.5 ${
              lopa.isAcceptable
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                : 'bg-rose-950/80 text-rose-300 border-rose-600 animate-pulse'
            }`}
          >
            {lopa.isAcceptable ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>RISK MITIGATED (ALARP TOLERABLE)</span>
              </>
            ) : (
              <>
                <AlertOctagon className="w-4 h-4 text-rose-400" />
                <span>UNACCEPTABLE RISK GAP</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Node & HAZOP Deviation Selector Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
        {/* Node Select */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
          <label className="text-[11px] font-semibold text-slate-400 block mb-1">HAZOP STUDY NODE</label>
          <select
            value={selectedNodeId}
            onChange={(e) => {
              setSelectedNodeId(e.target.value);
              sovereignAudio.playClick();
            }}
            className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
          >
            {PROCESS_NODES.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
          <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1.5">
            <span>Design P: {selectedNode.designPressure}</span>
            <span>Design T: {selectedNode.designTemp}</span>
          </div>
        </div>

        {/* Guide Word Deviation */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
          <label className="text-[11px] font-semibold text-slate-400 block mb-1">GUIDE WORD DEVIATION</label>
          <select
            value={deviation}
            onChange={(e) => {
              setDeviation(e.target.value);
              sovereignAudio.playClick();
            }}
            className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
          >
            <option value="HIGH_PRESSURE">MORE PRESSURE (Overpressure / Blocked Outlet)</option>
            <option value="HIGH_TEMP">MORE TEMPERATURE (Furnace Tube Hotspot / Exotherm)</option>
            <option value="LESS_FLOW">LESS FLOW (Feed Starvation / Cavitation Loss)</option>
            <option value="REVERSE_FLOW">REVERSE FLOW (Compressor Surge / Check Valve Failure)</option>
          </select>
          <span className="text-[10px] text-slate-400 block mt-1.5 font-mono">
            Hazard: Loss of Containment / Flange Blowout
          </span>
        </div>

        {/* Consequence Severity */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
          <label className="text-[11px] font-semibold text-slate-400 block mb-1">CONSEQUENCE SEVERITY</label>
          <select
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value);
              sovereignAudio.playClick();
            }}
            className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
          >
            <option value="CATASTROPHIC">CATASTROPHIC (Target: 10⁻⁵ / yr • Community / Offsite)</option>
            <option value="SEVERE">SEVERE (Target: 10⁻⁴ / yr • Onsite Fatality)</option>
            <option value="SERIOUS">SERIOUS (Target: 10⁻³ / yr • Lost Time Injury / Major Asset)</option>
            <option value="MODERATE">MODERATE (Target: 10⁻² / yr • Minor First Aid / Flaring)</option>
          </select>
          <span className="text-[10px] text-amber-400 font-mono block mt-1.5">
            TMEF: {lopa.tmef.toExponential(0)} events / year
          </span>
        </div>
      </div>

      {/* Main Analysis Section: IPL Matrix (Left) & Risk Calc Gauges (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
        {/* Left Column: Independent Protection Layers (IPL) Table (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950/70 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              INDEPENDENT PROTECTION LAYERS (IPL CREDITS MATRIX)
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Active Layers: {Object.values(activeIpls).filter(Boolean).length} / 4
            </span>
          </div>

          <div className="space-y-2.5">
            {BASE_IPLS.map((ipl) => {
              const isEnabled = activeIpls[ipl.id];
              return (
                <div
                  key={ipl.id}
                  className={`p-3 rounded-lg border transition-all ${
                    isEnabled
                      ? 'bg-slate-900/90 border-slate-700/80 shadow-sm'
                      : 'bg-rose-950/20 border-rose-800/40 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white font-mono">{ipl.id}:</span>
                        <span className="text-xs font-semibold text-slate-200">{ipl.name}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-slate-400 mt-1">
                        <span className="text-cyan-400">{ipl.type}</span>
                        <span>•</span>
                        <span>Ref: {ipl.standardRef}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right font-mono">
                        <span className="text-[10px] text-slate-400 block">PFD / RRF</span>
                        <span className="text-xs font-bold text-amber-300">
                          {ipl.pfd} (1:{ipl.rrf})
                        </span>
                      </div>
                      <button
                        onClick={() => handleToggleIpl(ipl.id)}
                        className={`p-1 rounded cursor-pointer transition-colors ${
                          isEnabled
                            ? 'text-emerald-400 hover:text-emerald-300'
                            : 'text-rose-500 hover:text-rose-400'
                        }`}
                        title={isEnabled ? 'Click to simulate IPL bypass' : 'Click to restore IPL'}
                      >
                        {isEnabled ? (
                          <ToggleRight className="w-6 h-6 text-emerald-400" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-rose-500" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Initiating Frequency Adjustment Slider */}
          <div className="mt-4 p-3 bg-slate-900/80 border border-slate-800/80 rounded-lg">
            <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
              <span>Initiating Event Frequency (IEF):</span>
              <span className="text-amber-400 font-bold">{initiatingFreq} events/yr (1 in {Math.round(1 / initiatingFreq)} yrs)</span>
            </div>
            <input
              type="range"
              min={0.01}
              max={1.0}
              step={0.01}
              value={initiatingFreq}
              onChange={(e) => setInitiatingFreq(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
        </div>

        {/* Right Column: Quantitative Risk Math & SIL Gauge (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-3">
          {/* Target SIL Allocation Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider mb-2">
              IEC 61511 SAFETY INTEGRITY LEVEL (SIL) TARGET
            </span>
            <div className={`p-3 rounded-lg border font-mono ${lopa.silBadgeColor}`}>
              <div className="text-sm font-bold">{lopa.targetSil}</div>
              <div className="text-xs opacity-80 mt-1">
                Required RRF: {lopa.requiredRrf.toLocaleString()} : 1
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 text-xs font-mono">
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-[10px] text-slate-400 block">TOTAL ACTIVE PFD</span>
                <span className="font-bold text-cyan-300">{lopa.totalPfd.toExponential(2)}</span>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-[10px] text-slate-400 block">ACHIEVED RRF</span>
                <span className="font-bold text-emerald-300">{Math.round(lopa.achievedRrf).toLocaleString()} : 1</span>
              </div>
            </div>
          </div>

          {/* Quantitative Risk Frequency Comparison */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 space-y-3 font-mono text-xs">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
              QUANTITATIVE LOPA FREQUENCY BALANCE
            </span>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Initiating Frequency:</span>
                <span className="text-slate-200">{initiatingFreq.toExponential(1)} / yr</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target Frequency (TMEF):</span>
                <span className="text-amber-400">{lopa.tmef.toExponential(1)} / yr</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-800">
                <span className="text-slate-400">Mitigated Frequency:</span>
                <span className={lopa.isAcceptable ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {lopa.fMitigated.toExponential(2)} / yr
                </span>
              </div>
            </div>

            {/* Risk Gap Status Callout */}
            <div
              className={`p-2.5 rounded-lg border text-xs ${
                lopa.isAcceptable
                  ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                  : 'bg-rose-950/50 border-rose-700/60 text-rose-300'
              }`}
            >
              {lopa.isAcceptable
                ? 'Mitigated frequency is below corporate risk tolerability criteria. ALARP demonstration confirmed.'
                : 'CRITICAL GAP: Cumulative PFD insufficient to meet TMEF. Additional SIF or mechanical relief required!'}
            </div>
          </div>

          {/* Action Sign & Seal Safety Case Button */}
          <button
            onClick={handleSignSafetyCase}
            disabled={isSigned || !lopa.isAcceptable}
            className={`w-full py-2.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isSigned
                ? 'bg-emerald-600 text-white'
                : lopa.isAcceptable
                ? 'bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white shadow-lg shadow-amber-900/30'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            {isSigned ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>SAFETY CASE SEALED & QUEUED TO MERKLE AUDIT LEDGER</span>
              </>
            ) : lopa.isAcceptable ? (
              <>
                <FileCheck className="w-4 h-4" />
                <span>SEAL IEC 61511 SAFETY CASE (LOCATE PSV-101)</span>
              </>
            ) : (
              <>
                <AlertOctagon className="w-4 h-4 text-rose-400" />
                <span>CANNOT SEAL — SAFETY INTEGRITY GAP ACTIVE</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
