'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sliders, Send, ShieldAlert, CheckCircle2, RotateCcw, AlertTriangle, FileSignature, Crosshair, Lock, Zap, Activity, Thermometer, Droplets, X } from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import type { ParameterControlFormProps, ControlParameter } from '../types';

// ─── Domain Detection ───────────────────────────────────────────────────────
type Domain = 'HYDRAULIC' | 'VIBRATION' | 'THERMAL' | 'STRUCTURAL' | 'PROCESS';

function detectDomain(title: string, subtitle: string, params: ControlParameter[]): Domain {
  const haystack = [title, subtitle, ...params.map((p) => `${p.label} ${p.description ?? ''}`)].join(' ').toLowerCase();
  if (/pump|valve|pressure|flow/.test(haystack)) return 'HYDRAULIC';
  if (/vibration|rpm|bearing|vfd|motor/.test(haystack)) return 'VIBRATION';
  if (/temperature|heat|furnace|boiler/.test(haystack)) return 'THERMAL';
  if (/stress|thickness|pipe|wall/.test(haystack)) return 'STRUCTURAL';
  return 'PROCESS';
}

const DOMAIN_COLORS: Record<Domain, { accent: string; bg: string; text: string; border: string; label: string }> = {
  HYDRAULIC:  { accent: '#06b6d4', bg: 'bg-cyan-500/10',    text: 'text-cyan-600 dark:text-cyan-400',    border: 'border-cyan-500/30',   label: '💧 HYDRAULIC'  },
  VIBRATION:  { accent: '#8b5cf6', bg: 'bg-violet-500/10',  text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-500/30', label: '⚙️ VIBRATION'  },
  THERMAL:    { accent: '#f59e0b', bg: 'bg-amber-500/10',   text: 'text-amber-600 dark:text-amber-400',  border: 'border-amber-500/30',  label: '🌡️ THERMAL'    },
  STRUCTURAL: { accent: '#10b981', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30', label: '🏗️ STRUCTURAL' },
  PROCESS:    { accent: '#6366f1', bg: 'bg-indigo-500/10',  text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/30', label: '⚗️ PROCESS'     },
};

// ─── Change Log Entry ────────────────────────────────────────────────────────
interface ChangeLogEntry {
  ts: string;
  label: string;
  oldVal: number | boolean;
  newVal: number | boolean;
  unit?: string;
}

function getTimestamp(): string {
  const now = new Date();
  return now.toTimeString().slice(0, 8);
}

// ─── Live Simulation Helpers ─────────────────────────────────────────────────
function computeSimulation(domain: Domain, params: ControlParameter[]): Record<string, string> {
  const rpm   = Number(params.find((p) => p.id === 'vfd_rpm')?.value ?? 2000);
  const valve = Number(params.find((p) => p.id === 'recirc_valve_pct')?.value ?? 35);

  // Generic efficiency (0-100), highest at ~70% valve and mid-RPM
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

// ─── Confidence Calculation ──────────────────────────────────────────────────
function computeConfidence(params: ControlParameter[]): number {
  let score = 100;
  for (const p of params) {
    if (p.type === 'slider') {
      const v   = Number(p.value);
      const lo  = p.min ?? 0;
      const hi  = p.max ?? 100;
      const mid = (lo + hi) / 2;
      const dev = Math.abs(v - mid) / ((hi - lo) / 2 || 1); // 0=center, 1=edge
      score -= dev * 10;
    }
    if (p.type === 'toggle' && p.isHazardous && Boolean(p.value)) score -= 20;
  }
  return Math.min(100, Math.max(0, Math.round(score)));
}

// ─── Mode Indicator Dots ─────────────────────────────────────────────────────
const MODE_DOT: Record<'MANUAL' | 'AUTO' | 'CASCADE' | 'STANDBY', string> = {
  AUTO:    'bg-emerald-500',
  MANUAL:  'bg-amber-500',
  CASCADE: 'bg-blue-500',
  STANDBY: 'bg-slate-400',
};

// ─── Component ───────────────────────────────────────────────────────────────
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
  const [submitTimestamp, setSubmitTimestamp] = useState<string>('');
  const [emergencyTripActive, setEmergencyTripActive] = useState<boolean>(false);
  const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>([]);

  const { selectTag, setApprovalsModalOpen, addToast } = useIndraStore();

  // Derived domain & colors
  const domain = detectDomain(title, subtitle, params);
  const domainStyle = DOMAIN_COLORS[domain];

  // Live simulation values
  const simValues = computeSimulation(domain, params);
  const confidence = computeConfidence(params);

  // Interlock status helpers
  const rpm   = Number(params.find((p) => p.id === 'vfd_rpm')?.value ?? 0);
  const valve  = Number(params.find((p) => p.id === 'recirc_valve_pct')?.value ?? 0);
  const interlockOverride = Boolean(params.find((p) => p.id === 'interlock_override')?.value);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleSliderChange = (id: string, newVal: number) => {
    setParams((prev) => {
      const updated = prev.map((p) => {
        if (p.id !== id) return p;
        // Log the change
        const entry: ChangeLogEntry = {
          ts:     getTimestamp(),
          label:  p.label,
          oldVal: Number(p.value),
          newVal,
          unit:   p.unit,
        };
        setChangeLog((log) => [entry, ...log].slice(0, 4));
        return { ...p, value: newVal };
      });
      return updated;
    });
    setSubmitSuccess(false);
  };

  const handleToggleChange = (id: string) => {
    setParams((prev) =>
      prev.map((p) => (p.id === id ? { ...p, value: !p.value } : p))
    );
    setSubmitSuccess(false);
  };

  const handleReset = () => {
    setParams(defaultParams);
    setSubmitSuccess(false);
    setEmergencyTripActive(false);
  };

  const handleTransmit = useCallback(() => {
    setIsSubmitting(true);
    const ts = new Date().toISOString();
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitSuccess(true);
      setSubmitTimestamp(ts);
      addToast({
        type: 'success',
        title: 'PLC Setpoint Transmitted',
        message: `${tag} parameters dispatched to field controller station successfully. [${ts}]`,
      });
      setTimeout(() => setSubmitSuccess(false), 4000);
    }, 700);
  }, [tag, addToast]);

  const handleRequestHITL = () => {
    setApprovalsModalOpen(true);
    addToast({
      type: 'info',
      title: 'HITL Sign-Off Required',
      message: `Setpoints for ${tag} queued in Merkle Audit sign-off register.`,
    });
  };

  const handleLocateTag = () => {
    if (tag) {
      selectTag(tag);
      broadcastSyncEvent({ type: 'TAG_SELECTED', tag });
    }
  };

  const handleEmergencyTrip = useCallback(() => {
    setEmergencyTripActive(true);
    setParams((prev) =>
      prev.map((p) => {
        if (p.id === 'vfd_rpm') return { ...p, value: 0 };
        if (p.id === 'recirc_valve_pct') return { ...p, value: 100 };
        return p;
      })
    );
    setActiveMode('STANDBY');
    addToast({
      type: 'warning',
      title: 'EMERGENCY SCRAM TRIGGERED',
      message: `${tag} tripped offline. Spillback valve 100% opened.`,
    });
  }, [tag, addToast]);

  // ─── Keyboard Shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleTransmit();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        handleEmergencyTrip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleTransmit, handleEmergencyTrip]);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm text-slate-800 dark:text-zinc-200">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800/80 gap-2">
        <div className="flex items-center gap-2">
          {tag && (
            <button
              onClick={handleLocateTag}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 dark:hover:bg-violet-900/50 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 font-mono text-xs font-bold transition-all cursor-pointer group"
              title="Center camera on P&ID diagram"
            >
              <Crosshair className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 group-hover:rotate-45 transition-transform" />
              <span>{tag}</span>
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100">{title}</h4>
              {/* Domain Badge */}
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold ${domainStyle.bg} ${domainStyle.text} ${domainStyle.border} border`}>
                {domainStyle.label}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">{subtitle}</div>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800/80 p-0.5 rounded-lg text-[10px] font-mono font-bold">
          {(['MANUAL', 'AUTO', 'CASCADE', 'STANDBY'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setActiveMode(mode)}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                activeMode === mode
                  ? 'bg-white dark:bg-zinc-700 text-violet-700 dark:text-violet-300 shadow-xs'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${MODE_DOT[mode]} ${activeMode === mode ? 'opacity-100' : 'opacity-40'}`} />
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Emergency Alert Banner */}
      {emergencyTripActive && (
        <div className="mt-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-between text-xs font-mono font-bold">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 animate-bounce" />
            <span>EQUIPMENT EMERGENCY SCRAM ACTIVE</span>
          </div>
          <button
            onClick={handleReset}
            className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] cursor-pointer"
          >
            Acknowledge & Reset
          </button>
        </div>
      )}

      {/* Parameter Controls Deck */}
      <div className="space-y-3.5 my-3.5">
        {params.map((param) => {
          if (param.type === 'slider') {
            const numVal = Number(param.value);
            return (
              <div key={param.id} className="space-y-1.5 p-2.5 rounded-xl bg-slate-50/70 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">{param.label}</span>
                  <div className="flex items-center gap-1 font-mono font-bold" style={{ color: domainStyle.accent }}>
                    <span>{numVal}</span>
                    <span className="text-[10px] text-slate-400">{param.unit}</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={param.min || 0}
                  max={param.max || 100}
                  step={param.step || 1}
                  value={numVal}
                  onChange={(e) => handleSliderChange(param.id, parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-violet-600"
                />
                <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 dark:text-zinc-500">
                  <span>{param.description}</span>
                  <span>{param.min} – {param.max} {param.unit}</span>
                </div>
              </div>
            );
          }

          if (param.type === 'toggle') {
            const boolVal = Boolean(param.value);
            return (
              <div
                key={param.id}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                  param.isHazardous && boolVal
                    ? 'bg-rose-500/10 border-rose-500/30'
                    : 'bg-slate-50/70 dark:bg-zinc-950/40 border-slate-100 dark:border-zinc-800'
                }`}
              >
                <div>
                  <div className="text-xs font-semibold flex items-center gap-1.5 text-slate-800 dark:text-zinc-200">
                    {param.isHazardous && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                    <span>{param.label}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">{param.description}</div>
                </div>

                <button
                  onClick={() => handleToggleChange(param.id)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                    boolVal
                      ? param.isHazardous ? 'bg-rose-600' : 'bg-emerald-600'
                      : 'bg-slate-300 dark:bg-zinc-700'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      boolVal ? 'translate-x-4.5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            );
          }

          return null;
        })}
      </div>

      {/* ─── INTERLOCK STATUS ──────────────────────────────────────────────── */}
      {(rpm > 3000 || rpm === 0 || valve > 80 || interlockOverride) && (
        <div className="mb-3 p-2.5 rounded-xl bg-slate-50/70 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800">
          <div className="text-[10px] font-mono font-bold text-slate-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
            Interlock Status
          </div>
          <div className="flex flex-wrap gap-1.5">
            {rpm > 3000 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                <AlertTriangle className="w-3 h-3" /> OVERSPEED WARNING
              </span>
            )}
            {rpm === 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-300 dark:border-zinc-700">
                PUMP STOPPED
              </span>
            )}
            {valve > 80 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                <AlertTriangle className="w-3 h-3" /> HIGH RECIRCULATION
              </span>
            )}
            {interlockOverride && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse">
                <Lock className="w-3 h-3" /> BYPASS ACTIVE
              </span>
            )}
          </div>
        </div>
      )}

      {/* ─── LIVE PROCESS SIMULATION ───────────────────────────────────────── */}
      <div className="mb-3 p-2.5 rounded-xl border border-dashed" style={{ borderColor: domainStyle.accent + '40', background: domainStyle.accent + '08' }}>
        <div className="flex items-center gap-1.5 mb-2">
          <Activity className="w-3.5 h-3.5" style={{ color: domainStyle.accent }} />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: domainStyle.accent }}>
            Live Process Simulation
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {Object.entries(simValues).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-500 dark:text-zinc-400">{key}:</span>
              <span className="font-bold" style={{ color: domainStyle.accent }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── CHANGE LOG ────────────────────────────────────────────────────── */}
      {changeLog.length > 0 && (
        <div className="mb-3 p-2.5 rounded-xl bg-slate-50/70 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Change Log</span>
            <button
              onClick={() => setChangeLog([])}
              className="text-[9px] font-mono text-slate-400 hover:text-rose-500 flex items-center gap-0.5 cursor-pointer transition-colors"
            >
              <X className="w-2.5 h-2.5" /> Clear
            </button>
          </div>
          <div className="space-y-0.5 max-h-20 overflow-y-auto">
            {changeLog.map((entry, i) => (
              <div key={i} className="text-[9px] font-mono text-slate-500 dark:text-zinc-400 leading-relaxed">
                <span className="text-slate-400 dark:text-zinc-500">{entry.ts}</span>
                {' — '}
                <span className="text-slate-700 dark:text-zinc-300 font-semibold">{entry.label}</span>
                {': '}
                <span className="text-rose-500">{String(entry.oldVal)}</span>
                {' → '}
                <span className="text-emerald-500">{String(entry.newVal)}</span>
                {entry.unit ? ` ${entry.unit}` : ''}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-100 dark:border-zinc-800/80 gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300 transition-colors"
            title="Reset parameters to nominal plant defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleEmergencyTrip}
            className="px-2.5 py-1 rounded-lg bg-rose-600/10 hover:bg-rose-600/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer"
            title="Emergency Trip equipment offline"
          >
            <ShieldAlert className="w-3 h-3" />
            <span>SCRAM TRIP</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Confidence Badge */}
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border ${
            confidence >= 75
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
              : confidence >= 50
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
          }`}>
            CONFIDENCE: {confidence}%
          </span>

          {requireHITL && (
            <button
              onClick={handleRequestHITL}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileSignature className="w-3.5 h-3.5" />
              <span>Request HITL Sign-Off</span>
            </button>
          )}

          <button
            onClick={handleTransmit}
            disabled={isSubmitting}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              submitSuccess
                ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-500/20'
                : 'bg-violet-600 hover:bg-violet-700 text-white shadow-xs shadow-violet-500/20'
            }`}
          >
            {submitSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Transmitted</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Transmit to PLC</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Transmit timestamp */}
      {submitSuccess && submitTimestamp && (
        <div className="mt-1.5 text-[9px] font-mono text-emerald-600 dark:text-emerald-400 text-right">
          ✓ Dispatched at {submitTimestamp}
        </div>
      )}

      {/* Keyboard shortcut hint */}
      <div className="mt-2 text-[9px] font-mono text-slate-400 dark:text-zinc-500 text-center tracking-wider">
        Ctrl+Enter to transmit • Escape for emergency trip
      </div>
    </div>
  );
}
