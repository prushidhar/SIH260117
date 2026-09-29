'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Crosshair,
  Wrench,
  Clock,
  Activity,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  Sparkles,
  Calendar,
  Layers,
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import type { EquipmentHealthCardProps } from '../types';

export default function EquipmentHealthCard({
  tag = 'P-101',
  name = 'Heavy Industrial Process Pump P-101A',
  type = 'Centrifugal Slurry Pump (API 610 BB2)',
  healthScore = 92,
  mtbfHours = 14200,
  operatingHours = 8640,
  lastInspectionDate = '2026-08-14',
  subsystems: initialSubsystems,
  criticalAlerts,
}: EquipmentHealthCardProps) {
  const { selectTag, addToast } = useIndraStore();
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [score, setScore] = useState<number>(healthScore);

  // RUL (Remaining Useful Life) calculation: e.g. 142 days remaining before planned turnaround
  const [rulDays, setRulDays] = useState<number>(142);

  const subsystems = initialSubsystems && initialSubsystems.length > 0 ? initialSubsystems : [
    { name: 'Drive-End Bearings (SKF 7314 Explorer)', health: 96, status: 'good' as const, metric: '1.8 mm/s RMS (Zone A)' },
    { name: 'Mechanical Tandem Cartridge Seal (Plan 53A)', health: 78, status: 'fair' as const, metric: '0.42 barg barrier ΔP' },
    { name: 'Semi-Open Chrome Iron Impeller', health: 89, status: 'good' as const, metric: '0.012 in wear ring clearance' },
    { name: 'Induction Motor Stator & Winding', health: 98, status: 'good' as const, metric: '48.2 MΩ insulation resistance' },
    { name: 'Pressurized Lube Oil Conditioning', health: 91, status: 'good' as const, metric: 'ISO 4406 Cleanliness 16/14/11' },
  ];

  // SVG Circular Gauge Dimensions
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const handleLocateTag = () => {
    if (tag) {
      selectTag(tag);
      broadcastSyncEvent({
        type: 'TAG_SELECTED',
        tag,
        metadata: { source: 'EquipmentHealthCard', healthScore: score, rulDays },
      });
    }
  };

  const handlePredictiveScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setScore((prev) => Math.min(100, prev + 2));
      addToast({
        type: 'success',
        title: 'Neural Predictive Scan Complete',
        message: `${tag} acoustic emission & vibration spectrum matched against ISO 10816-3 nominal profile.`,
      });
    }, 1000);
  };

  return (
    <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl font-mono text-xs text-zinc-200 select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-zinc-800/80 gap-2">
        <div className="flex items-center gap-2">
          {tag && (
            <button
              onClick={handleLocateTag}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900/90 border border-emerald-700/80 text-emerald-300 font-bold transition-all cursor-pointer group"
              title="Center camera on P&ID diagram"
            >
              <Crosshair className="w-3.5 h-3.5 text-emerald-400 group-hover:rotate-45 transition-transform" />
              <span>{tag}</span>
            </button>
          )}
          <div>
            <h4 className="text-xs font-bold text-zinc-100 tracking-wider">{name}</h4>
            <div className="text-[10px] text-zinc-400">{type}</div>
          </div>
        </div>

        {/* Health Status Pill & Rescan */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-700 text-emerald-300 font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{score}/100 HEALTH INDEX</span>
          </div>

          <button
            onClick={handlePredictiveScan}
            disabled={isScanning}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-emerald-400 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{isScanning ? 'Analyzing...' : 'Rescan'}</span>
          </button>
        </div>
      </div>

      {/* Main Section: Dynamic Circular Health Rings & RUL Countdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        {/* SVG Gradient Circular Health Ring */}
        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-around">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-32 h-32 -rotate-90">
              <defs>
                <linearGradient id="healthRingGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>

              {/* Background Ring */}
              <circle
                cx="64"
                cy="64"
                r={radius}
                stroke="#27272a"
                strokeWidth="10"
                fill="transparent"
              />

              {/* Animated Progress Ring */}
              <circle
                cx="64"
                cy="64"
                r={radius}
                stroke="url(#healthRingGrad)"
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
            </svg>

            {/* Inner Center Content */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-extrabold text-zinc-100">{score}%</span>
              <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold">HEALTH</span>
            </div>
          </div>

          {/* Quick Sub-Scores */}
          <div className="space-y-1.5 text-[10px]">
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Mechanical Integrity:</span>
              <strong className="text-emerald-400 font-mono">94%</strong>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Electrical Insulation:</span>
              <strong className="text-cyan-400 font-mono">98%</strong>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Hydrodynamic Flow:</span>
              <strong className="text-zinc-200 font-mono">89%</strong>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Seal Barrier ΔP:</span>
              <strong className="text-amber-400 font-mono">78%</strong>
            </div>
          </div>
        </div>

        {/* RUL (Remaining Useful Life) Countdown Card */}
        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-zinc-400">
            <span className="font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              REMAINING USEFUL LIFE (RUL) COUNTDOWN
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
              WEIBULL &beta;=2.15
            </span>
          </div>

          <div className="my-2">
            <div className="text-2xl font-extrabold text-cyan-400">
              {rulDays} <span className="text-sm font-normal text-zinc-400">Days</span>
              <span className="text-xs text-zinc-500 font-normal ml-2">({(rulDays * 24).toLocaleString()} Hours)</span>
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">
              Projected Turnaround Window: <strong className="text-zinc-200">120 Days (Target Met)</strong>
            </div>
          </div>

          {/* Turnaround Progress Bar */}
          <div className="space-y-1">
            <div className="h-2 w-full bg-zinc-950 rounded-full border border-zinc-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
                style={{ width: `${Math.min(100, (rulDays / 180) * 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[9px] text-zinc-500">
              <span>Next PM: 2026-11-20</span>
              <span>Turnaround Buffer: +22 Days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Subsystem Risk Breakdown Table */}
      <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 mb-3">
        <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-2">
          <span className="font-bold uppercase tracking-wider text-zinc-300">
            SUBSYSTEM INTEGRITY & HEALTH BREAKDOWN
          </span>
          <span>{subsystems.length} Subsystems Monitored</span>
        </div>

        <div className="divide-y divide-zinc-850">
          {subsystems.map((sub, idx) => (
            <div key={idx} className="py-2 flex items-center justify-between gap-3 text-[11px]">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    sub.status === 'good' ? 'bg-emerald-400' : sub.status === 'fair' ? 'bg-amber-400' : 'bg-rose-400'
                  }`}
                />
                <span className="font-bold text-zinc-200 truncate">{sub.name}</span>
                <span className="text-[10px] text-zinc-500 truncate hidden sm:inline">({sub.metric})</span>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0 font-mono text-[10px]">
                <div className="w-24 h-2 bg-zinc-950 rounded-full border border-zinc-800 overflow-hidden hidden sm:block">
                  <div
                    className={`h-full ${
                      sub.health > 85 ? 'bg-emerald-500' : sub.health > 70 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${sub.health}%` }}
                  />
                </div>
                <span className="font-bold text-zinc-200 w-8 text-right">{sub.health}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Auxiliary Operating Hours & MTBF Footer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px]">
        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-zinc-500 uppercase">OPERATING HOURS</div>
          <div className="font-bold text-zinc-200 mt-0.5">{operatingHours.toLocaleString()} hrs</div>
        </div>

        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-zinc-500 uppercase">ESTIMATED MTBF</div>
          <div className="font-bold text-zinc-200 mt-0.5">{mtbfHours.toLocaleString()} hrs</div>
        </div>

        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-zinc-500 uppercase">LAST NDT INSPECTION</div>
          <div className="font-bold text-zinc-200 mt-0.5">{lastInspectionDate}</div>
        </div>

        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-zinc-500 uppercase">ISO 10816 STATUS</div>
          <div className="font-bold text-emerald-400 mt-0.5">Zone A (Optimal)</div>
        </div>
      </div>
    </div>
  );
}
