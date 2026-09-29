'use client';

import React, { useState } from 'react';
import { Sliders, Send, ShieldAlert, CheckCircle2, RotateCcw, AlertTriangle, FileSignature, Crosshair, Lock } from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import type { ParameterControlFormProps, ControlParameter } from '../types';

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
  const [emergencyTripActive, setEmergencyTripActive] = useState<boolean>(false);

  const { selectTag, setApprovalsModalOpen, addToast } = useIndraStore();

  const handleSliderChange = (id: string, newVal: number) => {
    setParams((prev) =>
      prev.map((p) => (p.id === id ? { ...p, value: newVal } : p))
    );
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

  const handleTransmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitSuccess(true);
      addToast({
        type: 'success',
        title: 'PLC Setpoint Transmitted',
        message: `${tag} parameters dispatched to field controller station successfully.`,
      });
      setTimeout(() => setSubmitSuccess(false), 4000);
    }, 700);
  };

  const handleRequestHITL = () => {
    // Open the HITL approval modal so the operator or supervisor can formally sign off
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
      broadcastSyncEvent({
        type: 'TAG_SELECTED',
        tag,
      });
    }
  };

  const handleEmergencyTrip = () => {
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
  };

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
            <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100">
              {title}
            </h4>
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
              {subtitle}
            </div>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800/80 p-0.5 rounded-lg text-[10px] font-mono font-bold">
          {(['MANUAL', 'AUTO', 'CASCADE', 'STANDBY'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setActiveMode(mode)}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                activeMode === mode
                  ? 'bg-white dark:bg-zinc-700 text-violet-700 dark:text-violet-300 shadow-xs'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Emergency Alert Banner if Tripped */}
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
                  <div className="flex items-center gap-1 font-mono font-bold text-violet-600 dark:text-violet-400">
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
                  <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
                    {param.description}
                  </div>
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
    </div>
  );
}
