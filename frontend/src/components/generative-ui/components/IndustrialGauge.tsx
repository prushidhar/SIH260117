'use client';

import React, { useState, useId } from 'react';
import { Crosshair, AlertTriangle, CheckCircle2, ShieldAlert, Sliders, BellOff, Volume2 } from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import type { IndustrialGaugeProps } from '../types';

export default function IndustrialGauge({
  tag = 'P-101',
  title = 'Slurry Feed Pump Discharge Pressure',
  value: initialValue = 78.4,
  min = 0,
  max = 100,
  unit = 'psig',
  thresholds = { normal: 70, warning: 85, critical: 95 },
  status: initialStatus,
  subtitle,
  allowTesting = true,
}: IndustrialGaugeProps) {
  const [currentValue, setCurrentValue] = useState<number>(initialValue);
  const [showTestControls, setShowTestControls] = useState<boolean>(false);
  const [isAcknowledged, setIsAcknowledged] = useState<boolean>(false);
  const clipId = useId();

  const { selectTag } = useIndraStore();

  // Determine threshold status dynamically based on current value
  const normalLimit = thresholds?.normal ?? max * 0.7;
  const warningLimit = thresholds?.warning ?? max * 0.85;

  let currentStatus: 'optimal' | 'warning' | 'critical' = 'optimal';
  if (currentValue >= warningLimit) {
    currentStatus = 'critical';
  } else if (currentValue >= normalLimit) {
    currentStatus = 'warning';
  } else {
    currentStatus = 'optimal';
  }

  // Geometry for 240-degree radial arc
  // Angles in degrees: start at 150 deg (bottom left), end at 390 deg (bottom right, equivalent to 30 deg)
  const radius = 80;
  const cx = 100;
  const cy = 100;
  const strokeWidth = 14;

  const startAngle = 150;
  const endAngle = 390;
  const totalAngle = endAngle - startAngle; // 240 deg

  const clampedVal = Math.min(Math.max(currentValue, min), max);
  const fraction = (clampedVal - min) / (max - min || 1);
  const needleAngle = startAngle + fraction * totalAngle;

  const polarToCartesian = (centerX: number, centerY: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + r * Math.cos(angleInRadians),
      y: centerY + r * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x: number, y: number, r: number, startA: number, endA: number) => {
    const start = polarToCartesian(x, y, r, endA);
    const end = polarToCartesian(x, y, r, startA);
    const largeArcFlag = endA - startA <= 180 ? '0' : '1';
    return ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y].join(' ');
  };

  const bgArcPath = describeArc(cx, cy, radius, startAngle, endAngle);
  const valueArcPath = describeArc(cx, cy, radius, startAngle, Math.max(startAngle + 0.1, needleAngle));

  // Needle tip
  const needleTip = polarToCartesian(cx, cy, radius - 10, needleAngle);
  const needleBaseLeft = polarToCartesian(cx, cy, 6, needleAngle + 90);
  const needleBaseRight = polarToCartesian(cx, cy, 6, needleAngle - 90);
  const needlePath = `M ${needleBaseLeft.x} ${needleBaseLeft.y} L ${needleTip.x} ${needleTip.y} L ${needleBaseRight.x} ${needleBaseRight.y} Z`;

  const handleLocateTag = () => {
    if (tag) {
      selectTag(tag);
      broadcastSyncEvent({
        type: 'TAG_SELECTED',
        tag,
        metadata: { source: 'IndustrialGauge', value: currentValue, unit },
      });
    }
  };

  const statusColors = {
    optimal: {
      border: 'border-emerald-500/30',
      badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      stroke: '#10b981',
      glow: 'rgba(16, 185, 129, 0.4)',
      text: 'text-emerald-600 dark:text-emerald-400',
      label: 'OPTIMAL SERVICE',
      icon: CheckCircle2,
    },
    warning: {
      border: 'border-amber-500/40',
      badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
      stroke: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.45)',
      text: 'text-amber-600 dark:text-amber-400',
      label: 'ELEVATED (WARNING)',
      icon: AlertTriangle,
    },
    critical: {
      border: 'border-rose-500/50',
      badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
      stroke: '#ef4444',
      glow: 'rgba(239, 68, 68, 0.5)',
      text: 'text-rose-600 dark:text-rose-400',
      label: 'CRITICAL THRESHOLD',
      icon: ShieldAlert,
    },
  }[currentStatus];

  const StatusIcon = statusColors.icon;

  return (
    <div className={`p-4 rounded-2xl bg-white dark:bg-zinc-900 border ${statusColors.border} shadow-sm transition-all text-slate-800 dark:text-zinc-200`}>
      {/* Header with Tag, Status, and P&ID Link */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800/80 gap-2">
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
          <h4 className="text-xs font-bold tracking-tight text-slate-900 dark:text-zinc-100">
            {title}
          </h4>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${statusColors.badge}`}>
            <StatusIcon className="w-3 h-3" />
            <span>{statusColors.label}</span>
          </span>

          {allowTesting && (
            <button
              onClick={() => setShowTestControls(!showTestControls)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300 transition-colors"
              title="Toggle Interactive Value Simulation"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Gauge Graphic & Digital Readout */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4">
        {/* SVG Radial Arc */}
        <div className="relative w-44 h-36 flex items-center justify-center">
          <svg viewBox="0 0 200 170" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id={`grad-${clipId}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="60%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
              <filter id={`glow-${clipId}`} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={statusColors.stroke} floodOpacity="0.6" />
              </filter>
            </defs>

            {/* Background Arc Track */}
            <path
              d={bgArcPath}
              fill="none"
              stroke="currentColor"
              className="text-slate-100 dark:text-zinc-800/90"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />

            {/* Threshold Zones Tick Marks */}
            <path
              d={describeArc(cx, cy, radius + 11, startAngle, startAngle + 0.6 * totalAngle)}
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              strokeDasharray="1 5"
              className="opacity-70"
            />
            <path
              d={describeArc(cx, cy, radius + 11, startAngle + 0.6 * totalAngle, startAngle + 0.85 * totalAngle)}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="1 5"
              className="opacity-80"
            />
            <path
              d={describeArc(cx, cy, radius + 11, startAngle + 0.85 * totalAngle, endAngle)}
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              strokeDasharray="1 5"
              className="opacity-90"
            />

            {/* Dynamic Value Arc */}
            <path
              d={valueArcPath}
              fill="none"
              stroke={statusColors.stroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              filter={`url(#glow-${clipId})`}
              className="transition-all duration-300 ease-out"
            />

            {/* Min / Max Labels */}
            <text x="32" y="152" className="text-[9px] fill-slate-400 dark:fill-zinc-500 font-mono font-bold" textAnchor="middle">
              {min}
            </text>
            <text x="168" y="152" className="text-[9px] fill-slate-400 dark:fill-zinc-500 font-mono font-bold" textAnchor="middle">
              {max}
            </text>

            {/* Needle */}
            <path
              d={needlePath}
              fill={statusColors.stroke}
              className="transition-all duration-300 ease-out drop-shadow-sm"
            />

            {/* Center Pivot Hub */}
            <circle cx={cx} cy={cy} r="9" className="fill-slate-900 dark:fill-zinc-100 drop-shadow-sm" />
            <circle cx={cx} cy={cy} r="4" fill={statusColors.stroke} />
          </svg>
        </div>

        {/* Digital Readout & Limits Panel */}
        <div className="flex flex-col items-center sm:items-start space-y-2">
          <div className="flex items-baseline gap-1.5 font-mono">
            <span className={`text-4xl font-black tracking-tight ${statusColors.text}`}>
              {currentValue.toFixed(1)}
            </span>
            <span className="text-sm font-bold text-slate-500 dark:text-zinc-400 uppercase">
              {unit}
            </span>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-zinc-400 flex flex-col gap-1 font-mono">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 dark:text-zinc-500">Design Range:</span>
              <span className="font-semibold text-slate-700 dark:text-zinc-300">{min} – {max} {unit}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 dark:text-zinc-500">Warning Trip:</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">&gt; {warningLimit} {unit}</span>
            </div>
          </div>

          {/* Alarm Ack button if abnormal */}
          {currentStatus !== 'optimal' && (
            <button
              onClick={() => setIsAcknowledged(!isAcknowledged)}
              className={`mt-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                isAcknowledged
                  ? 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700'
                  : 'bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
              }`}
            >
              {isAcknowledged ? (
                <>
                  <BellOff className="w-3 h-3" />
                  <span>ALARM ACKNOWLEDGED</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3 h-3 animate-bounce" />
                  <span>ACKNOWLEDGE ALARM</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Interactive Simulation Drawer */}
      {showTestControls && (
        <div className="mt-3 pt-3 border-t border-dashed border-slate-200 dark:border-zinc-800/80 bg-slate-50/70 dark:bg-zinc-950/40 p-3 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-zinc-400 font-medium">Interactive Dynamic Sweep:</span>
            <span className="font-mono font-bold text-violet-600 dark:text-violet-400">{currentValue.toFixed(1)} {unit}</span>
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={(max - min) / 100 || 1}
            value={currentValue}
            onChange={(e) => {
              setCurrentValue(parseFloat(e.target.value));
              setIsAcknowledged(false);
            }}
            className="w-full h-1.5 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-violet-600"
          />
          <div className="flex justify-between text-[9px] font-mono text-slate-400 dark:text-zinc-500">
            <span>{min} (Low)</span>
            <span>{normalLimit} (Warn)</span>
            <span>{max} (Trip)</span>
          </div>
        </div>
      )}
    </div>
  );
}
