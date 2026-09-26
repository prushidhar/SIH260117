'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck, Crosshair, Wrench, Clock, Activity,
  AlertCircle, CheckCircle, Sparkles, AlertTriangle, TrendingDown,
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import type { EquipmentHealthCardProps } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────
const RING_DIAMETER = 140;
const RING_STROKE = 10;
const RING_RADIUS = (RING_DIAMETER - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getHealthColor(score: number): string {
  if (score >= 80) return 'hsl(142,71%,45%)';  // green
  if (score >= 50) return 'hsl(38,92%,50%)';   // amber
  return 'hsl(4,86%,58%)';                      // red
}

function getISOZone(score: number): { label: string; color: string } {
  if (score >= 85) return { label: 'ZONE A', color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30 dark:text-emerald-400' };
  if (score >= 70) return { label: 'ZONE B', color: 'text-sky-600 bg-sky-500/10 border-sky-500/30 dark:text-sky-400' };
  if (score >= 50) return { label: 'ZONE C', color: 'text-amber-600 bg-amber-500/10 border-amber-500/30 dark:text-amber-400' };
  return { label: 'ZONE D', color: 'text-rose-600 bg-rose-500/10 border-rose-500/30 dark:text-rose-400' };
}

// ─── Animated Ring Component ──────────────────────────────────────────────────
function HealthRing({ score }: { score: number }) {
  const [animated, setAnimated] = useState(false);
  const color = getHealthColor(score);
  const targetOffset = RING_CIRCUMFERENCE - (score / 100) * RING_CIRCUMFERENCE;

  useEffect(() => {
    // Trigger animation after mount
    const t = setTimeout(() => setAnimated(true), 50);
    return () => clearTimeout(t);
  }, [score]);

  const cx = RING_DIAMETER / 2;
  const cy = RING_DIAMETER / 2;

  return (
    <svg width={RING_DIAMETER} height={RING_DIAMETER} className="shrink-0">
      <defs>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(142,71%,45%)" />
          <stop offset="100%" stopColor="hsl(38,92%,50%)" />
        </linearGradient>
      </defs>
      {/* Track (background ring) */}
      <circle
        cx={cx} cy={cy}
        r={RING_RADIUS}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={RING_STROKE}
        className="dark:stroke-zinc-800"
      />
      {/* Progress ring */}
      <circle
        cx={cx} cy={cy}
        r={RING_RADIUS}
        fill="none"
        stroke="url(#ringGrad)"
        strokeWidth={RING_STROKE}
        strokeLinecap="round"
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={animated ? targetOffset : RING_CIRCUMFERENCE}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{
          transition: 'stroke-dashoffset 1.5s ease-out',
          filter: `drop-shadow(0 0 4px ${color}55)`,
        }}
      />
      {/* Center text */}
      <text x={cx} y={cy - 8} textAnchor="middle"
        fontSize="28" fontWeight="bold" fontFamily="monospace"
        fill={color}>
        {score}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle"
        fontSize="10" fontFamily="monospace" fill="#94a3b8" fontWeight="bold">
        HEALTH
      </text>
      <text x={cx} y={cy + 24} textAnchor="middle"
        fontSize="8" fontFamily="monospace" fill="#94a3b8">
        / 100
      </text>
    </svg>
  );
}

// ─── Animated Subsystem Bar ───────────────────────────────────────────────────
function SubsystemBar({ sub }: {
  sub: { name: string; health: number; status: string; metric?: string };
}) {
  const [width, setWidth] = useState(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setWidth(sub.health), 100);
    return () => clearTimeout(t);
  }, [sub.health]);

  const barColor =
    sub.health >= 85 ? 'bg-emerald-500' :
    sub.health >= 70 ? 'bg-amber-500' :
    'bg-rose-500';

  const statusIcon =
    sub.health >= 85 ? <CheckCircle className="w-3 h-3 text-emerald-500" /> :
    sub.health >= 70 ? <AlertCircle className="w-3 h-3 text-amber-500" /> :
    <AlertTriangle className="w-3 h-3 text-rose-500" />;

  return (
    <div
      className="p-2 rounded-xl bg-slate-50/70 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs relative group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Tooltip */}
      {hovered && sub.metric && (
        <div className="absolute bottom-full left-0 mb-1.5 z-10 px-2.5 py-1.5 rounded-lg bg-slate-950/95 text-white text-[10px] font-mono shadow-lg border border-slate-800 whitespace-nowrap pointer-events-none">
          {sub.name}: <span className="text-violet-400 font-bold">{sub.metric}</span>
        </div>
      )}

      <div className="flex items-center gap-1.5 min-w-0">
        {statusIcon}
        <div className="space-y-0.5 min-w-0">
          <div className="font-semibold text-slate-800 dark:text-zinc-200 truncate">{sub.name}</div>
          {sub.metric && (
            <div className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">{sub.metric}</div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 font-mono shrink-0 ml-2">
        <div className="w-20 h-1.5 bg-slate-200 dark:bg-zinc-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${barColor}`}
            style={{
              width: `${width}%`,
              transition: 'width 0.8s ease',
            }}
          />
        </div>
        <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 w-8 text-right">
          {sub.health}%
        </span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EquipmentHealthCard({
  tag = 'P-101',
  name = 'Crude Distillation Slurry Feed Pump A',
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

  const subsystems = initialSubsystems && initialSubsystems.length > 0 ? initialSubsystems : [
    { name: 'Drive End Bearings (SKF 7314)', health: 96, status: 'good' as const, metric: '1.8 mm/s RMS' },
    { name: 'Mechanical Tandem Seal',        health: 78, status: 'fair' as const, metric: '0.42 barg barrier ΔP' },
    { name: 'Semi-Open Chrome Impeller',     health: 89, status: 'good' as const, metric: '0.012 in wear clearance' },
    { name: 'Induction Motor Stator',        health: 98, status: 'good' as const, metric: '48.2 MΩ insulation' },
  ];

  // ── Derived values ───────────────────────────────────────────────────────
  const hasCritical = subsystems.some(s => s.health < 60) || (criticalAlerts && criticalAlerts.length > 0);
  const isAnomalyBadge = score < 70;
  const isoZone = getISOZone(score);

  // Maintenance countdown
  const daysToNextPM = Math.max(0, Math.floor((mtbfHours - operatingHours) / 24));
  const pmFraction = Math.min(1, operatingHours / mtbfHours);

  // Predictive RUL & failure probability (simulated from health score)
  const estimatedRUL = Math.round((score / 100) * (mtbfHours - operatingHours));
  const failureProbability = parseFloat(Math.max(0.1, (100 - score) * 0.9).toFixed(1));

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleLocateTag = () => {
    if (tag) {
      selectTag(tag);
      broadcastSyncEvent({
        type: 'TAG_SELECTED',
        tag,
        metadata: { source: 'EquipmentHealthCard', healthScore: score },
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
    }, 1200);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm text-slate-800 dark:text-zinc-200 overflow-hidden">

      {/* ── Critical Alert Banner ── */}
      {hasCritical && (
        <div className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white text-[11px] font-mono font-bold animate-pulse">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>⚠ CRITICAL ALERT — Subsystem health below threshold. Immediate inspection required.</span>
          {criticalAlerts && criticalAlerts.map((alert, i) => (
            <span key={i} className="ml-2 text-rose-100">• {alert}</span>
          ))}
        </div>
      )}

      <div className="p-4">
        {/* ── Header ── */}
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

            {/* ISO Zone badge */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${isoZone.color}`}>
              <ShieldCheck className="w-3 h-3" />
              {isoZone.label}
            </span>

            {/* AI Anomaly badge */}
            {isAnomalyBadge && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/10 border border-rose-500/40 text-rose-600 dark:text-rose-400 animate-pulse">
                <Activity className="w-3 h-3" />
                AI ANOMALY DETECTED
              </span>
            )}

            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100">{name}</h4>
              <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">{type}</div>
            </div>
          </div>
        </div>

        {/* ── Health Ring + Info ── */}
        <div className="flex items-center gap-5 mt-4">
          {/* Animated SVG ring */}
          <HealthRing score={score} />

          {/* Right-side info */}
          <div className="flex-1 space-y-3">
            {/* Primary KPI Grid */}
            <div className="grid grid-cols-3 gap-2 font-mono text-xs">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800">
                <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Op. Hours</span>
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-zinc-100 mt-0.5">
                  {operatingHours.toLocaleString()}{' '}
                  <span className="text-[10px] font-normal text-slate-500">hrs</span>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800">
                <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  <span>MTBF</span>
                </div>
                <div className="text-sm font-bold text-violet-600 dark:text-violet-400 mt-0.5">
                  {mtbfHours.toLocaleString()}{' '}
                  <span className="text-[10px] font-normal text-slate-500">hrs</span>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800">
                <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase flex items-center gap-1">
                  <Wrench className="w-3 h-3" />
                  <span>Last Survey</span>
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-zinc-100 mt-0.5">
                  {lastInspectionDate}
                </div>
              </div>
            </div>

            {/* Maintenance Countdown */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800 font-mono">
              <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-zinc-500 uppercase mb-1.5">
                <span className="flex items-center gap-1">
                  <Wrench className="w-3 h-3" />
                  Next PM in
                </span>
                <span className={`font-bold text-[11px] ${
                  daysToNextPM < 30 ? 'text-rose-500' :
                  daysToNextPM < 90 ? 'text-amber-500' :
                  'text-emerald-500'
                }`}>
                  {daysToNextPM} days
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    pmFraction > 0.9 ? 'bg-rose-500' :
                    pmFraction > 0.7 ? 'bg-amber-500' :
                    'bg-emerald-500'
                  }`}
                  style={{ width: `${pmFraction * 100}%` }}
                />
              </div>
              <div className="text-[9px] text-slate-400 mt-1">
                {operatingHours.toLocaleString()} / {mtbfHours.toLocaleString()} hrs used
              </div>
            </div>
          </div>
        </div>

        {/* ── Predictive Failure Section ── */}
        <div className="mt-3 p-3 rounded-xl border border-violet-200 dark:border-violet-800/60 bg-violet-50 dark:bg-violet-950/20 font-mono">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider mb-2">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Predictive Failure Analytics</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[9px] text-violet-500 dark:text-violet-400 uppercase mb-0.5">Estimated RUL</div>
              <div className="text-sm font-bold text-violet-800 dark:text-violet-200">
                {estimatedRUL.toLocaleString()}{' '}
                <span className="text-[10px] font-normal text-violet-500">hours</span>
              </div>
            </div>
            <div>
              <div className="text-[9px] text-violet-500 dark:text-violet-400 uppercase mb-0.5">Failure Probability</div>
              <div className={`text-sm font-bold ${
                failureProbability > 30 ? 'text-rose-600 dark:text-rose-400' :
                failureProbability > 15 ? 'text-amber-600 dark:text-amber-400' :
                'text-emerald-600 dark:text-emerald-400'
              }`}>
                {failureProbability}%
              </div>
            </div>
          </div>
        </div>

        {/* ── Subsystem Reliability Matrix ── */}
        <div className="space-y-2 mt-3">
          <div className="text-[10px] font-bold uppercase font-mono text-slate-400 dark:text-zinc-500 tracking-wider">
            Subsystem Reliability Matrix
          </div>
          {subsystems.map((sub, i) => (
            <SubsystemBar key={i} sub={sub} />
          ))}
        </div>

        {/* ── Action Footer ── */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-zinc-800/80">
          <div className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
            API 610 11th Edition Qualified
          </div>
          <button
            onClick={handlePredictiveScan}
            disabled={isScanning}
            className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shadow-violet-500/20"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning Acoustics...' : 'Predictive Scan'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
