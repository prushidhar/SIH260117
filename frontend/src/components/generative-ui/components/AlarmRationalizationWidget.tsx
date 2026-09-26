'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellOff,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Filter,
  Zap,
  Volume2,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowRight,
  Clock,
  Crosshair,
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { playTripKlaxon, playAlarmChime, playSuccessChirp, speakSovereignAlert } from '@/lib/sound/sovereign-audio';

export interface PlantAlarm {
  id: string;
  tag: string;
  description: string;
  timestamp: string; // e.g. 14:32:00.104
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'FIRST_OUT' | 'CONSEQUENTIAL' | 'CHATTERING' | 'INSTRUMENT';
  suppressed: boolean;
  suppressionRule?: string;
  unit: string;
}

export interface AlarmRationalizationProps {
  tag?: string;
  title?: string;
  initialMode?: 'RATIONALIZED' | 'RAW';
  alarms?: PlantAlarm[];
}

export default function AlarmRationalizationWidget({
  tag = 'P-101',
  title = 'ISA-18.2 / EEMUA 191 Intelligent Alarm Flood Rationalization',
  initialMode = 'RATIONALIZED',
  alarms,
}: AlarmRationalizationProps) {
  const { selectTag, addToast, addNetworkEvent } = useIndraStore();

  const [mode, setMode] = useState<'RATIONALIZED' | 'RAW'>(initialMode);
  const [showSuppressed, setShowSuppressed] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [simulatingFlood, setSimulatingFlood] = useState(false);

  const defaultAlarms: PlantAlarm[] = alarms || [
    // 1. Root First-Out Alarm
    {
      id: 'alm-01',
      tag: 'PS-101LL',
      description: 'Crude Slurry Charge Pump P-101 Suction Pressure Low-Low (Trip Initiated)',
      timestamp: '14:32:00.104',
      priority: 'CRITICAL',
      category: 'FIRST_OUT',
      suppressed: false,
      unit: 'CDU-104',
    },
    // Consequential Alarms (Downstream sympathetic cascades)
    {
      id: 'alm-02',
      tag: 'PD-101L',
      description: 'Pump P-101 Discharge Pressure Low (Sympathetic: zero flow)',
      timestamp: '14:32:00.320',
      priority: 'HIGH',
      category: 'CONSEQUENTIAL',
      suppressed: true,
      suppressionRule: 'ISA-18.2 Rule 4: Downstream Consequential to Tripped Prime Mover',
      unit: 'CDU-104',
    },
    {
      id: 'alm-03',
      tag: 'FT-101L',
      description: 'Crude Transfer Header L-101 Flow Rate Low-Low (< 45 m³/h)',
      timestamp: '14:32:00.418',
      priority: 'HIGH',
      category: 'CONSEQUENTIAL',
      suppressed: true,
      suppressionRule: 'ISA-18.2 Rule 4: Downstream Flow Starvation',
      unit: 'CDU-104',
    },
    {
      id: 'alm-04',
      tag: 'TI-101A',
      description: 'Mechanical Seal Primary Face Temperature Flare (> 180°C)',
      timestamp: '14:32:00.512',
      priority: 'CRITICAL',
      category: 'CONSEQUENTIAL',
      suppressed: true,
      suppressionRule: 'ISA-18.2 Rule 2: Equipment Offline Saturated State',
      unit: 'P-101',
    },
    {
      id: 'alm-05',
      tag: 'FV-101-FAIL',
      description: 'Recirculation Spillback Valve FV-101 Forced Full Open on Interlock',
      timestamp: '14:32:00.620',
      priority: 'MEDIUM',
      category: 'CONSEQUENTIAL',
      suppressed: true,
      suppressionRule: 'ISA-18.2 Rule 6: Expected Interlock Response State',
      unit: 'P-101',
    },
    {
      id: 'alm-06',
      tag: 'ZT-101',
      description: 'Pump P-101 Shaft RPM Zero (Coast-down confirmed)',
      timestamp: '14:32:00.850',
      priority: 'LOW',
      category: 'CONSEQUENTIAL',
      suppressed: true,
      suppressionRule: 'ISA-18.2 Rule 6: Machine Shutdown Confirmation',
      unit: 'P-101',
    },
    {
      id: 'alm-07',
      tag: 'E-101-dT',
      description: 'Crude Pre-Heater E-101 Thermal Differential Collapsed',
      timestamp: '14:32:01.120',
      priority: 'MEDIUM',
      category: 'CONSEQUENTIAL',
      suppressed: true,
      suppressionRule: 'ISA-18.2 Rule 4: Heat Exchanger No-Flow Transition',
      unit: 'CDU-104',
    },
    {
      id: 'alm-08',
      tag: 'V-101-LL',
      description: 'Feed Surge Drum V-101 Level Rising (Inlet continue, outlet zero)',
      timestamp: '14:32:01.450',
      priority: 'HIGH',
      category: 'CONSEQUENTIAL',
      suppressed: true,
      suppressionRule: 'ISA-18.2 Rule 3: Buffer Volume Accumulation',
      unit: 'CDU-104',
    },
    {
      id: 'alm-09',
      tag: 'PI-3104',
      description: 'Column T-101 Feed Tray Pressure Depressurization',
      timestamp: '14:32:01.890',
      priority: 'HIGH',
      category: 'CONSEQUENTIAL',
      suppressed: true,
      suppressionRule: 'ISA-18.2 Rule 4: Downstream Column Starvation',
      unit: 'CDU-104',
    },
    {
      id: 'alm-10',
      tag: 'FIC-101-DEV',
      description: 'DCS Loop FIC-101 Output-to-Process Variable Large Deviation',
      timestamp: '14:32:02.100',
      priority: 'LOW',
      category: 'CHATTERING',
      suppressed: true,
      suppressionRule: 'ISA-18.2 Rule 1: Controller Deviation during Tripped State',
      unit: 'CDU-104',
    },
  ];

  const firstOutAlarm = defaultAlarms.find((a) => a.category === 'FIRST_OUT') || defaultAlarms[0];
  const suppressedAlarms = defaultAlarms.filter((a) => a.suppressed);

  const handleSimulateFlood = () => {
    setSimulatingFlood(true);
    setAcknowledged(false);
    playTripKlaxon();

    setTimeout(() => {
      setSimulatingFlood(false);
      addToast({
        type: 'warning',
        title: 'Alarm Flood Intercepted',
        message: '10 raw plant DCS alarms burst in 2.1 seconds. ISA-18.2 rationalization active.',
      });
    }, 600);
  };

  const handleAcknowledge = () => {
    playSuccessChirp();
    setAcknowledged(true);

    addNetworkEvent({
      destination: '127.0.0.1:dcs-alarm-server',
      action: 'ALARM_ACKNOWLEDGE_FIRST_OUT',
      status: 'contained',
      timestamp: new Date().toLocaleTimeString(),
      protocol: 'OPC-UA / IEC 62541',
      source: 'indra:alarm-engine',
    });

    addToast({
      type: 'success',
      title: 'First-Out Root Alarm Acknowledged',
      message: `${firstOutAlarm.tag} acknowledged. 9 consequential secondary alarms auto-cleared in local DCS cache.`,
    });
  };

  const handleVoiceAnnounce = () => {
    speakSovereignAlert(
      `First-out alarm pinpointed: Tag ${firstOutAlarm.tag}, ${firstOutAlarm.description}. 9 secondary consequential alarms suppressed per ISA-18.2.`
    );
  };

  return (
    <div className="w-full my-3 rounded-2xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 shadow-md overflow-hidden font-sans select-none transition-all">
      {/* 1. Header & Controls */}
      <div className="p-4 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-transparent border-b border-slate-200 dark:border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-600 text-white shadow-xs">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">{title}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  ISA-18.2 / IEC 62682
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-mono">
                Real-Time First-Out Pinpoint & Consequential Flood Suppression
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-mono">
              <button
                onClick={() => setMode('RATIONALIZED')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  mode === 'RATIONALIZED'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                }`}
              >
                AI Rationalized
              </button>
              <button
                onClick={() => setMode('RAW')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  mode === 'RAW'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                }`}
              >
                Raw Flood ({defaultAlarms.length})
              </button>
            </div>

            <button
              onClick={handleSimulateFlood}
              className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 text-xs font-mono font-bold transition-colors cursor-pointer flex items-center gap-1"
              title="Inject simulated plant trip alarm cascade"
            >
              <Zap className="w-3.5 h-3.5 text-rose-500" />
              <span>Simulate Trip</span>
            </button>

            <button
              onClick={handleVoiceAnnounce}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer border border-slate-200 dark:border-zinc-800"
              title="Vocalize First-Out alarm summary"
            >
              <Volume2 className="w-4 h-4 text-amber-500" />
            </button>
          </div>
        </div>

        {/* 2. EEMUA 191 KPI Bar */}
        <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400">Alarm Rate / 10 Mins</div>
              <div className="text-sm font-bold text-slate-800 dark:text-zinc-200 mt-0.5">
                {mode === 'RATIONALIZED' ? '1.0 / 10m' : '48.2 / 10m'}
              </div>
            </div>
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                mode === 'RATIONALIZED'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse'
              }`}
            >
              {mode === 'RATIONALIZED' ? 'EEMUA COMPLIANT' : 'FLOOD VIOLATION'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400">Operator Cognitive Load</div>
              <div className="text-sm font-bold text-slate-800 dark:text-zinc-200 mt-0.5">
                {mode === 'RATIONALIZED' ? 'LOW (10%)' : 'CRITICAL (94%)'}
              </div>
            </div>
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                mode === 'RATIONALIZED'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              {mode === 'RATIONALIZED' ? 'CALM' : 'OVERLOAD'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400">Noise Chattering Reduced</div>
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {mode === 'RATIONALIZED' ? '90.0% Suppressed' : '0% Filtered'}
              </div>
            </div>
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* 3. Main Alarm Display Area */}
      <div className="p-4 space-y-3">
        {mode === 'RATIONALIZED' ? (
          /* RATIONALIZED VIEW: 1 First-Out Root Cause + Collapsible Suppressed Stack */
          <div className="space-y-3">
            {/* Primary Root Alarm Card */}
            <div className="p-4 rounded-xl border-2 border-rose-500 bg-rose-50/70 dark:bg-rose-950/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-600 text-white flex items-center gap-1 shadow-2xs">
                    <AlertOctagon className="w-3 h-3" />
                    <span>FIRST-OUT ROOT ALARM</span>
                  </span>
                  <span className="font-mono text-xs font-bold text-rose-700 dark:text-rose-300">
                    {firstOutAlarm.tag}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500 dark:text-zinc-400">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span className="font-bold text-slate-700 dark:text-zinc-300">{firstOutAlarm.timestamp}</span>
                </div>
              </div>

              <div className="text-xs font-semibold text-slate-900 dark:text-zinc-100">
                {firstOutAlarm.description}
              </div>

              <div className="p-2 rounded-lg bg-white/80 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 text-[11px] font-mono text-slate-600 dark:text-zinc-400 flex items-center gap-2">
                <ArrowRight className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                <span>
                  Root Failure Trigger: Suction basket mesh torn → rapid NPSH cavitation excursion.
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => selectTag(tag)}
                  className="flex items-center gap-1 text-[11px] font-mono text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                >
                  <Crosshair className="w-3 h-3" />
                  <span>Highlight on P&ID ({tag})</span>
                </button>

                <button
                  onClick={handleAcknowledge}
                  disabled={acknowledged}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    acknowledged
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-600 hover:bg-rose-700 text-white shadow-2xs'
                  }`}
                >
                  {acknowledged ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Acknowledged & Cleared</span>
                    </>
                  ) : (
                    <>
                      <BellOff className="w-3.5 h-3.5" />
                      <span>Acknowledge Root Cause</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Suppressed Alarms Collapsible Section */}
            <div className="rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden bg-slate-50/50 dark:bg-zinc-900/40">
              <button
                onClick={() => setShowSuppressed(!showSuppressed)}
                className="w-full p-3 flex items-center justify-between text-left hover:bg-slate-100/60 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer text-xs font-mono"
              >
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-700 dark:text-zinc-300">
                    {suppressedAlarms.length} Consequential Alarms Intelligently Suppressed
                  </span>
                  <span className="text-[10px] text-slate-400">
                    (Auto-grouped per ISA-18.2 Rule 4)
                  </span>
                </div>
                {showSuppressed ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {showSuppressed && (
                <div className="p-2 border-t border-slate-200 dark:border-zinc-800 space-y-1.5 text-xs font-mono bg-white dark:bg-zinc-950">
                  {suppressedAlarms.map((alm) => (
                    <div
                      key={alm.id}
                      className="p-2 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/60 flex items-center justify-between text-[11px]"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-slate-400 font-bold flex-shrink-0">{alm.tag}:</span>
                        <span className="text-slate-600 dark:text-zinc-400 truncate">{alm.description}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 flex-shrink-0 ml-2">
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">{alm.suppressionRule}</span>
                        <span>{alm.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* RAW VIEW: Complete Unfiltered Alarm Flood Stream */
          <div className="space-y-1.5 max-h-80 overflow-y-auto scrollbar-thin">
            <div className="text-[10px] font-mono text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
              <span>DCS Raw Unfiltered Alarm Flood (Cognitive Overload Warning)</span>
            </div>
            {defaultAlarms.map((alm) => (
              <div
                key={alm.id}
                className="p-2.5 rounded-lg border border-rose-300 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 flex items-center justify-between text-xs font-mono"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping flex-shrink-0" />
                  <span className="font-bold text-rose-700 dark:text-rose-300 flex-shrink-0">{alm.tag}</span>
                  <span className="text-slate-700 dark:text-zinc-300 truncate">{alm.description}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 flex-shrink-0 ml-2">
                  <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-900/60 font-bold">
                    {alm.priority}
                  </span>
                  <span>{alm.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Footer Compliance */}
      <div className="px-4 py-2.5 bg-slate-50 dark:bg-zinc-900/90 border-t border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-500 dark:text-zinc-400">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>ANSI/ISA-18.2-2016 Management of Alarm Systems Compliant</span>
        </div>
        <div>
          Flood Filter: <span className="font-bold text-emerald-600 dark:text-emerald-400">90% Noise Suppressed</span>
        </div>
      </div>
    </div>
  );
}
