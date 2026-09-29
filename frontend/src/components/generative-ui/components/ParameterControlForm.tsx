'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sliders,
  Send,
  ShieldAlert,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  FileSignature,
  Crosshair,
  Lock,
  Zap,
  Activity,
  Thermometer,
  Droplets,
  X,
  Gauge,
  Clock,
  Check
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import type { ParameterControlFormProps, ControlParameter } from '../types';

// Domain Detection
type Domain = 'HYDRAULIC' | 'VIBRATION' | 'THERMAL' | 'STRUCTURAL' | 'PROCESS';

function detectDomain(title: string, subtitle: string, params: ControlParameter[]): Domain {
  const haystack = [title, subtitle, ...params.map((p) => `${p.label} ${p.description ?? ''}`)].join(' ').toLowerCase();
  if (/pump|valve|pressure|flow/.test(haystack)) return 'HYDRAULIC';
  if (/vibration|rpm|bearing|vfd|motor/.test(haystack)) return 'VIBRATION';
  if (/temperature|heat|furnace|boiler/.test(haystack)) return 'THERMAL';
  if (/stress|thickness|pipe|wall/.test(haystack)) return 'STRUCTURAL';
  return 'PROCESS';
}

const DOMAIN_CONFIG: Record<Domain, { accent: string; bg: string; text: string; border: string; label: string }> = {
  HYDRAULIC:  { accent: '#06b6d4', bg: 'bg-cyan-500/10',    text: 'text-cyan-600 dark:text-cyan-400',    border: 'border-cyan-500/30',   label: 'HYDRAULIC' },
  VIBRATION:  { accent: '#6366f1', bg: 'bg-indigo-500/10',  text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/30', label: 'VIBRATION' },
  THERMAL:    { accent: '#f59e0b', bg: 'bg-amber-500/10',   text: 'text-amber-600 dark:text-amber-400',  border: 'border-amber-500/30',  label: 'THERMAL' },
  STRUCTURAL: { accent: '#10b981', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30', label: 'STRUCTURAL' },
  PROCESS:    { accent: '#38bdf8', bg: 'bg-sky-500/10',     text: 'text-sky-600 dark:text-sky-400',      border: 'border-sky-500/30',    label: 'PROCESS' },
};

// Change Log Entry
interface ChangeLogEntry {
  ts: string;
  label: string;
  oldVal: string | number | boolean;
  newVal: string | number | boolean;
  unit?: string;
}

function getTimestamp(): string {
  const now = new Date();
  return now.toTimeString().slice(0, 8);
}

// Live Simulation Helpers
function computeSimulation(domain: Domain, params: ControlParameter[]): Record<string, string> {
  const rpm   = Number(params.find((p) => p.id === 'vfd_rpm')?.value ?? 2000);
  const valve = Number(params.find((p) => p.id === 'recirc_valve_pct')?.value ?? 35);

  const effBase = 60 + ((rpm - 600) / 3000) * 25 - Math.abs(valve - 40) * 0.15;
  const efficiency = Math.min(100, Math.max(0, effBase)).toFixed(1);

  if (domain === 'VIBRATION') {
    const bearingLoad = ((rpm / 3600) * 18.5).toFixed(1);
    const powerDraw   = ((rpm / 3600) * 45.2 * (valve / 100 + 0.5)).toFixed(1);
    return { 'Estimated Bearing Load': `${bearingLoad} kN`, 'Power Draw': `${powerDraw} kW`, 'Operating Efficiency': `${efficiency}%` };
  }
  if (domain === 'HYDRAULIC') {
    const flowRate   = ((rpm / 3600) * 120 * (1 - valve / 200)).toFixed(1);
    const headPressure = ((rpm / 3600) * 8.5).toFixed(2);
    return { 'Estimated Flow Rate': `${flowRate} m³/h`, 'Head Pressure': `${headPressure} bar`, 'Operating Efficiency': `${efficiency}%` };
  }
  if (domain === 'THERMAL') {
    const heatFlux = ((rpm / 3600) * 65.0 * (valve / 100 + 0.3)).toFixed(1);
    return { 'Estimated Heat Flux': `${heatFlux} kW/m²`, 'Operating Efficiency': `${efficiency}%` };
  }
  return { 'Operating Efficiency': `${efficiency}%` };
}

// Confidence Calculation
function computeConfidence(params: ControlParameter[]): number {
  let score = 100;
  for (const p of params) {
    if (p.type === 'slider') {
      const v   = Number(p.value);
      const lo  = p.min ?? 0;
      const hi  = p.max ?? 100;
      const mid = (lo + hi) / 2;
      const dev = Math.abs(v - mid) / ((hi - lo) / 2 || 1);
      score -= dev * 10;
    }
    if (p.type === 'toggle' && p.isHazardous && Boolean(p.value)) score -= 20;
  }
  return Math.min(100, Math.max(0, Math.round(score)));
}

// Mode Indicator Dots
const MODE_DOT: Record<'MANUAL' | 'AUTO' | 'CASCADE' | 'STANDBY', string> = {
  AUTO:    'bg-emerald-500',
  MANUAL:  'bg-amber-500',
  CASCADE: 'bg-blue-500',
  STANDBY: 'bg-slate-400',
};

export default function ParameterControlForm({
  tag = 'P-101',
  title = 'P-101 VFD & Recirculation Setpoint Control',
  subtitle = 'DCS Loop FIC-101 • Distributed Controller Station #4',
  parameters: initialParams,
  equipmentMode = 'AUTO',
  requireHITL = true,
}: ParameterControlFormProps) {
  const defaultParams: ControlParameter[] = initialParams && initialParams.length > 0 ? initialParams : [
    {
      id: 'vfd_rpm',
      label: 'Motor VFD Speed',
      type: 'slider',
      min: 600,
      max: 3600,
      step: 50,
      value: 2450,
      unit: 'RPM',
      description: 'Variable frequency motor shaft rotation setpoint',
    },
    {
      id: 'recirc_valve_pct',
      label: 'Recirculation Valve (FV-101)',
      type: 'slider',
      min: 0,
      max: 100,
      step: 1,
      value: 35,
      unit: '%',
      description: 'Minimum flow spillback protection loop',
    },
    {
      id: 'interlock_override',
      label: 'Vibration Trip Interlock Override',
      type: 'toggle',
      value: false,
      isHazardous: true,
      description: 'Bypasses ISO 10816 auto-trip (Requires Level-3 Authorization)',
    },
    {
      id: 'lube_oil_pump',
      label: 'Auxiliary Lube Oil Skid',
      type: 'toggle',
      value: true,
      description: 'Auxiliary bearing pressurized lube circuit',
    },
  ];

  const [params, setParams] = useState<ControlParameter[]>(defaultParams);
  const [activeMode, setActiveMode] = useState<'MANUAL' | 'AUTO' | 'CASCADE' | 'STANDBY'>(equipmentMode);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [transmitTimestamp, setTransmitTimestamp] = useState<string | null>(null);
  const [emergencyTripActive, setEmergencyTripActive] = useState<boolean>(false);
  const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>([]);

  const { selectTag, setApprovalsModalOpen, addToast } = useIndraStore();

  const domain = detectDomain(title, subtitle ?? '', params);
  const domainCfg = DOMAIN_CONFIG[domain];
  const simOutputs = computeSimulation(domain, params);
  const confidence = computeConfidence(params);

  // Interlock condition checks
  const rpmParam   = params.find((p) => p.id === 'vfd_rpm');
  const valveParam = params.find((p) => p.id === 'recirc_valve_pct');
  const bypassParam = params.find((p) => p.id === 'interlock_override');

  const rpmVal     = Number(rpmParam?.value ?? 0);
  const valveVal   = Number(valveParam?.value ?? 0);
  const isBypassed = Boolean(bypassParam?.value);

  const handleSliderChange = (id: string, newVal: number) => {
    const oldParam = params.find((p) => p.id === id);
    if (oldParam && oldParam.value !== newVal) {
      setChangeLog((prev) => [
        { ts: getTimestamp(), label: oldParam.label, oldVal: oldParam.value, newVal, unit: oldParam.unit },
        ...prev.slice(0, 3),
      ]);
    }
    setParams((prev) =>
      prev.map((p) => (p.id === id ? { ...p, value: newVal } : p))
    );
    setSubmitSuccess(false);
  };

  const handleToggleChange = (id: string) => {
    const oldParam = params.find((p) => p.id === id);
    if (oldParam) {
      setChangeLog((prev) => [
        { ts: getTimestamp(), label: oldParam.label, oldVal: oldParam.value, newVal: !oldParam.value },
        ...prev.slice(0, 3),
      ]);
    }
    setParams((prev) =>
      prev.map((p) => (p.id === id ? { ...p, value: !p.value } : p))
    );
    setSubmitSuccess(false);
  };

  const handleReset = () => {
    setParams(defaultParams);
    setSubmitSuccess(false);
    setEmergencyTripActive(false);
    setChangeLog([]);
    setTransmitTimestamp(null);
  };

  const handleTransmit = useCallback(() => {
    setIsSubmitting(true);
    const ts = new Date().toISOString();
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitSuccess(true);
      setTransmitTimestamp(ts);
      addToast({
        type: 'success',
        title: 'PLC Setpoint Transmitted',
        message: `${tag} parameters dispatched to field controller station at ${ts.slice(11, 19)} UTC.`,
      });
      setTimeout(() => setSubmitSuccess(false), 5000);
    }, 700);
  }, [addToast, tag]);

  const handleEmergencyTrip = useCallback(() => {
    setEmergencyTripActive(true);
    setParams((prev) =>
      prev.map((p) => {
        if (p.id === 'vfd_rpm') return { ...p, value: p.min ?? 0 };
        if (p.id === 'recirc_valve_pct') return { ...p, value: 100 };
        return p;
      })
    );
    addToast({
      type: 'warning',
      title: 'EMERGENCY TRIP INITIATED',
      message: `${tag} tripped to safe idle. VFD throttled to minimum, recirculation valve opened 100%.`,
    });
  }, [addToast, tag]);

  // Keyboard shortcut handler: Ctrl+Enter to transmit, Escape to emergency trip
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleTransmit();
      }
      if (e.key === 'Escape' && !emergencyTripActive) {
        handleEmergencyTrip();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleTransmit, handleEmergencyTrip, emergencyTripActive]);

  const handleLocateTag = () => {
    if (tag) {
      selectTag(tag);
      broadcastSyncEvent({
        type: 'TAG_SELECTED',
        tag,
        metadata: { source: 'ParameterControlForm', parameters: params },
      });
    }
  };

  const handleRequestHITL = () => {
    setApprovalsModalOpen(true);
    addToast({
      type: 'info',
      title: 'HITL Escalation Initiated',
      message: `Setpoint modification for ${tag} routed to Plant Operations Supervisor for cryptographically signed authorization.`,
    });
  };

  return (
    <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm transition-all text-slate-800 dark:text-zinc-200 text-xs font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800/80 gap-2">
        <div className="flex items-center gap-2">
          {tag && (
            <button
              onClick={handleLocateTag}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 font-mono text-xs font-bold transition-all cursor-pointer group"
              title="Center camera on P&ID diagram"
            >
              <Crosshair className="w-3.5 h-3.5 text-slate-500 group-hover:rotate-45 transition-transform" />
              <span>{tag}</span>
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100">{title}</h4>
              <span className={`px-2 py-0.5 rounded-md font-mono text-[9px] font-bold border ${domainCfg.bg} ${domainCfg.text} ${domainCfg.border}`}>
                {domainCfg.label}
              </span>
            </div>
            {subtitle && (
              <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono mt-0.5">
                {subtitle}
              </div>
            )}
          </div>
        </div>

        {/* Mode Selector & Reset */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800/80 p-0.5 rounded-md font-mono text-[10px]">
          {(['AUTO', 'MANUAL', 'CASCADE', 'STANDBY'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setActiveMode(mode)}
              className={`px-2 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                activeMode === mode
                  ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-zinc-100 font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${MODE_DOT[mode]}`} />
              <span>{mode}</span>
            </button>
          ))}
          <button
            onClick={handleReset}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors ml-0.5"
            title="Reset parameters to baseline nominal"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Interlock Status Badges */}
      <div className="flex flex-wrap items-center gap-1.5 my-2.5">
        {rpmVal > 3000 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-2.5 h-2.5" /> OVERSPEED WARNING ({rpmVal} RPM)
          </span>
        )}
        {rpmVal === 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/30">
            PUMP STOPPED
          </span>
        )}
        {valveVal > 80 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-2.5 h-2.5" /> HIGH RECIRCULATION ({valveVal}%)
          </span>
        )}
        {isBypassed && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse">
            <ShieldAlert className="w-2.5 h-2.5" /> BYPASS ACTIVE (SAFETY INTERLOCK OVERRIDDEN)
          </span>
        )}
        {!isBypassed && rpmVal <= 3000 && rpmVal > 0 && valveVal <= 80 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-2.5 h-2.5" /> INTERLOCKS HEALTHY
          </span>
        )}
      </div>

      {/* Parameter Sliders & Toggles */}
      <div className="space-y-3.5 my-3">
        {params.map((param) => {
          if (param.type === 'slider') {
            const numVal = Number(param.value);
            const min = param.min ?? 0;
            const max = param.max ?? 100;
            const pct = ((numVal - min) / (max - min || 1)) * 100;

            return (
              <div key={param.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-semibold text-slate-700 dark:text-zinc-300">{param.label}</span>
                  <span className="font-bold text-slate-900 dark:text-zinc-100 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-zinc-700">
                    {numVal} {param.unit}
                  </span>
                </div>
                {param.description && (
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500">{param.description}</p>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-slate-400">{min}</span>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={param.step ?? 1}
                    value={numVal}
                    onChange={(e) => handleSliderChange(param.id, parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-400"
                  />
                  <span className="text-[10px] font-mono text-slate-400">{max}</span>
                </div>
              </div>
            );
          }

          if (param.type === 'toggle') {
            const isChecked = Boolean(param.value);
            return (
              <div
                key={param.id}
                className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                  param.isHazardous && isChecked
                    ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
                    : 'bg-slate-50/50 dark:bg-zinc-800/40 border-slate-200 dark:border-zinc-800'
                }`}
              >
                <div className="space-y-0.5 pr-2">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-zinc-300 text-xs">
                    {param.isHazardous && <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                    <span>{param.label}</span>
                  </div>
                  {param.description && (
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500">{param.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleChange(param.id)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isChecked
                      ? param.isHazardous ? 'bg-rose-600' : 'bg-indigo-600'
                      : 'bg-slate-300 dark:bg-zinc-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isChecked ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            );
          }
          return null;
        })}
      </div>

      {/* Live Process Simulation Outputs */}
      <div className="my-3 p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 font-mono text-[10px]">
        <div className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-zinc-500 font-bold mb-1.5 flex items-center gap-1">
          <Activity className="w-3 h-3 text-indigo-500" />
          <span>Live Process Simulation Response</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(simOutputs).map(([key, val]) => (
            <div key={key} className="p-1.5 rounded bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800">
              <div className="text-[9px] text-slate-400 truncate">{key}</div>
              <div className="font-bold text-slate-800 dark:text-zinc-200 text-xs mt-0.5">{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Change Log (Collapsible if non-empty) */}
      {changeLog.length > 0 && (
        <div className="my-2 p-2 rounded-lg bg-slate-50 dark:bg-zinc-800/30 border border-slate-200 dark:border-zinc-800 font-mono text-[10px]">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="flex items-center gap-1 font-bold">
              <Clock className="w-2.5 h-2.5" /> Recent Modifications ({changeLog.length})
            </span>
            <button onClick={() => setChangeLog([])} className="hover:text-slate-600 dark:hover:text-zinc-300">
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
          <div className="space-y-0.5 text-slate-600 dark:text-zinc-400">
            {changeLog.map((c, i) => (
              <div key={i} className="truncate">
                <span className="text-slate-400">{c.ts}</span> : {c.label}:{' '}
                <span className="text-amber-500">{String(c.oldVal)}</span> to{' '}
                <span className="text-emerald-500 font-bold">{String(c.newVal)}</span> {c.unit ?? ''}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emergency Trip Banner */}
      {emergencyTripActive && (
        <div className="my-2 p-2 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[10px] font-mono flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold">
            <ShieldAlert className="w-3.5 h-3.5" /> EMERGENCY TRIP ACTIVE : EQUIPMENT THROTTLED
          </div>
          <button
            onClick={() => setEmergencyTripActive(false)}
            className="px-2 py-0.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
          >
            Clear Trip
          </button>
        </div>
      )}

      {/* Transmit Timestamp Notice */}
      {transmitTimestamp && (
        <div className="my-2 p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono flex items-center gap-1.5">
          <Check className="w-3 h-3" /> Transmitted at {transmitTimestamp.slice(11, 19)} UTC : Field Handshake Confirmed
        </div>
      )}

      {/* Actions & Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between pt-3 border-t border-slate-100 dark:border-zinc-800/80 gap-2">
        <div className="flex items-center gap-2 w-full sm:w-auto font-mono text-[10px] text-slate-400 dark:text-zinc-500">
          <span>Confidence: <strong className="text-slate-700 dark:text-zinc-300">{confidence}%</strong></span>
          <span>•</span>
          <span className="hidden sm:inline">Ctrl+Enter to transmit</span>
          <span>•</span>
          <span className="hidden sm:inline">Esc to trip</span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {requireHITL && (
            <button
              onClick={handleRequestHITL}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-semibold text-xs transition-colors cursor-pointer"
              title="Escalate to Human-In-The-Loop Approval Ledger"
            >
              <FileSignature className="w-3.5 h-3.5 text-indigo-500" />
              <span>Request Sign-off</span>
            </button>
          )}

          <button
            onClick={handleTransmit}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
            ) : submitSuccess ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>{isSubmitting ? 'Transmitting...' : submitSuccess ? 'Confirmed' : 'Transmit to Field'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
