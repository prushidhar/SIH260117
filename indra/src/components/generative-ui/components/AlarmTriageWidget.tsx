'use client';

import React, { useState } from 'react';
import {
  Bell,
  BellRing,
  AlertOctagon,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Filter,
  Crosshair,
  FileSpreadsheet,
  RotateCcw,
  ZapOff,
  Flame,
  Activity
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import type { AlarmTriageWidgetProps, AlarmTriageItem, ChatteringAlarmItem } from '../types';

export default function AlarmTriageWidget({
  title = 'ANSI/ISA-18.2 & EEMUA 191 CONTROL ROOM ALARM RATIONALIZATION',
  currentAlarmRate10Min = 14.0,
  totalReceived = 7,
  actionableRootCauseCount = 1,
  consequentialSuppressedCount = 2,
  chatteringDebouncedCount = 4,
  firstOutTag = 'K-102',
  firstOutDescription = 'Compressor High-High Lube Oil Pressure Trip',
  suppressedAlarms = [
    {
      tag: 'P-101',
      description: 'Discharge Flow Low-Low Alarm',
      parentTag: 'K-102',
      time: '14:22:04.120',
      suppressionType: 'Consequential Cascade (Downstream Interlock)',
    },
    {
      tag: 'V-101',
      description: 'Suction Knockout Drum Level High Alarm',
      parentTag: 'K-102',
      time: '14:22:05.880',
      suppressionType: 'Consequential Pressure Rebalance',
    },
  ],
  chatteringAlarms = [
    {
      tag: 'TIC-201',
      description: 'Column Overhead Vapor Temp Oscillating',
      count: 18,
      deadbandHysteresis: 'Stabilized with 2% Deadband Hysteresis',
      status: 'Auto-Debounced',
    },
    {
      tag: 'PIC-104',
      description: 'Suction Pressure Boundary Chatter',
      count: 9,
      deadbandHysteresis: 'Applied 1.5s On-Delay Filter',
      status: 'Auto-Debounced',
    },
  ],
}: AlarmTriageWidgetProps) {
  const { selectTag, addDeliverable, addToast } = useIndraStore();

  const [isSuppressedOpen, setIsSuppressedOpen] = useState<boolean>(true);
  const [isChatteringOpen, setIsChatteringOpen] = useState<boolean>(true);

  const handleLocateFirstOut = () => {
    selectTag(firstOutTag);
    broadcastSyncEvent({
      type: 'TAG_SELECTED',
      tag: firstOutTag,
      metadata: { source: 'AlarmTriageWidget', firstOutTag, firstOutDescription },
    });
    addToast({
      type: 'info',
      title: 'First-Out Initiator Focused',
      message: `Centered P&ID schematic on root-cause initiator ${firstOutTag}.`,
    });
  };

  const handleExportRationalization = () => {
    const now = new Date().toLocaleTimeString();
    addDeliverable({
      id: `del-alarm-${Date.now()}`,
      name: `ISA_18_2_Alarm_Rationalization_Audit.docx`,
      filename: `ISA_18_2_Alarm_Rationalization_Audit.docx`,
      type: 'docx',
      size: '2.2 MB',
      generatedAt: now,
      timestamp: now,
      description: `ANSI/ISA-18.2 and EEMUA 191 alarm flood rationalization, first-out interlock trace, and chattering mitigation audit.`,
      url: '#',
      hash: 'sha256:66dc91e23f001928abceef77218901ba33908871629817290bc91ff22881a700',
    });
    addToast({
      type: 'success',
      title: 'Alarm Rationalization Exported',
      message: 'Generated ISA-18.2 statutory alarm flood mitigation audit report.',
    });
  };

  return (
    <div className="w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 text-slate-800 dark:text-zinc-100 overflow-hidden shadow-xs font-sans text-xs">
      {/* 1. Header with Standards Badge */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/70 dark:bg-zinc-950/60 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <BellRing className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-zinc-100 tracking-tight text-[13px]">
                {title}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                EEMUA 191 Tier 3
              </span>
            </div>
            <div className="text-[11px] text-slate-600 dark:text-zinc-300 font-mono">
              Real-Time Dynamic Suppression, Cascade De-duplication &amp; First-Out Triage
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLocateFirstOut}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition-colors border border-slate-200 dark:border-zinc-700"
          >
            <Crosshair className="w-3.5 h-3.5 text-rose-500" />
            <span>Focus Root Cause</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 2. Flood Condition Monitor & Triage Funnel */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Rate Gauge */}
          <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-700 dark:text-amber-400 font-bold">
                10-Min Alarm Rate
              </span>
              <Activity className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {currentAlarmRate10Min.toFixed(1)} <span className="text-xs font-normal text-slate-500">/ 10-min</span>
            </div>
            <div className="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              EEMUA 191 ALARM FLOOD WARNING
            </div>
          </div>

          {/* Actionable Root Cause */}
          <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20 space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-rose-600 dark:text-rose-400 font-semibold">
              Actionable Root Cause
            </div>
            <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
              {actionableRootCauseCount}
            </div>
            <div className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">
              100% operator focus priority
            </div>
          </div>

          {/* Consequential Suppressed */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Cascade Suppressed
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-zinc-100">
              {consequentialSuppressedCount}
            </div>
            <div className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">
              Interlock downstream bypass
            </div>
          </div>

          {/* Chattering Debounced */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Chattering Debounced
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-zinc-100">
              {chatteringDebouncedCount}
            </div>
            <div className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">
              Deadband hysteresis filtered
            </div>
          </div>
        </div>

        {/* 3. First-Out Root Cause Flashing Callout */}
        <div className="p-3.5 rounded-lg border border-rose-500/40 bg-rose-500/10 dark:bg-rose-950/30 flex items-start justify-between gap-3 animate-pulse">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-md bg-rose-500 text-white mt-0.5">
              <AlertOctagon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-rose-600 dark:text-rose-400 font-bold">
                FIRST-OUT INITIATOR IDENTIFIED (ROOT CAUSE)
              </div>
              <div className="text-sm font-bold font-mono text-slate-900 dark:text-zinc-100">
                Tag {firstOutTag} — {firstOutDescription}
              </div>
              <div className="text-[10.5px] font-mono text-slate-600 dark:text-zinc-400 pt-0.5">
                Timestamp: 14:22:03.940 | Trip Cause: Main lube pump mechanical seal rupture | Interlock Loop: ESD-01
              </div>
            </div>
          </div>

          <button
            onClick={handleLocateFirstOut}
            className="shrink-0 px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold font-mono shadow-xs transition-colors"
          >
            Locate {firstOutTag}
          </button>
        </div>

        {/* 4. Suppressed Alarms Accordion Drawer */}
        <div className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40 overflow-hidden">
          <button
            onClick={() => setIsSuppressedOpen(!isSuppressedOpen)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-zinc-900/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              {isSuppressedOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
              <span className="font-semibold text-slate-900 dark:text-zinc-100 text-[11px] uppercase tracking-wider">
                Suppressed Downstream Cascade Trips ({suppressedAlarms.length})
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">ISA-18.2 State: Suppressed-by-Design</span>
          </button>

          {isSuppressedOpen && (
            <div className="px-3.5 pb-3 space-y-2 border-t border-slate-200 dark:border-zinc-800/80 pt-2.5">
              {suppressedAlarms.map((alm, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-between text-[11px] font-mono"
                >
                  <div className="flex items-center gap-2.5">
                    <ZapOff className="w-3.5 h-3.5 text-slate-400" />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-zinc-100">{alm.tag}</span>: {alm.description}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span>Initiated by: <strong className="text-rose-500">{alm.parentTag}</strong></span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
                      {alm.suppressionType}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5. Chattering Alarms Accordion Drawer */}
        <div className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40 overflow-hidden">
          <button
            onClick={() => setIsChatteringOpen(!isChatteringOpen)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-zinc-900/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              {isChatteringOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
              <span className="font-semibold text-slate-900 dark:text-zinc-100 text-[11px] uppercase tracking-wider">
                Chattering &amp; Nuisance Alarm Debounce Log ({chatteringAlarms.length})
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">Active Hysteresis Filtered</span>
          </button>

          {isChatteringOpen && (
            <div className="px-3.5 pb-3 space-y-2 border-t border-slate-200 dark:border-zinc-800/80 pt-2.5">
              {chatteringAlarms.map((alm, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-between text-[11px] font-mono"
                >
                  <div className="flex items-center gap-2.5">
                    <Filter className="w-3.5 h-3.5 text-amber-500" />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-zinc-100">{alm.tag}</span>: {alm.description}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-slate-500">Oscillations: {alm.count}</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                      {alm.deadbandHysteresis}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-zinc-800/80">
          <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">
            Control Room Philosophy: <strong className="text-slate-700 dark:text-zinc-300">ANSI/ISA-18.2 Management of Alarm Systems</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportRationalization}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Alarm Rationalization Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
