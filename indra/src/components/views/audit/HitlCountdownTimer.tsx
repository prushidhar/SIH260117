'use client';

import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Clock, AlertTriangle, ShieldAlert } from 'lucide-react';

interface AutoRefreshRingProps {
  intervalSeconds?: number;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

/**
 * 30-second circular countdown badge with auto-revalidation against local audit stores
 */
export function AutoRefreshRing({
  intervalSeconds = 30,
  onRefresh,
  isRefreshing = false,
}: AutoRefreshRingProps) {
  const [secondsLeft, setSecondsLeft] = useState(intervalSeconds);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          onRefreshRef.current();
          return intervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [intervalSeconds]);

  const radius = 13;
  const circumference = 2 * Math.PI * radius;
  const progress = (secondsLeft / intervalSeconds) * circumference;

  const handleManualClick = () => {
    setSecondsLeft(intervalSeconds);
    onRefresh();
  };

  return (
    <button
      onClick={handleManualClick}
      className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 text-xs font-mono text-zinc-300 transition-all cursor-pointer shadow-sm"
      title="Click to force immediate audit ledger re-validation"
    >
      {/* Circular SVG Ring */}
      <div className="relative w-7 h-7 flex items-center justify-center">
        <svg className="w-7 h-7 -rotate-90">
          <circle
            cx="14"
            cy="14"
            r={radius}
            stroke="#27272a"
            strokeWidth="2.5"
            fill="transparent"
          />
          <circle
            cx="14"
            cy="14"
            r={radius}
            stroke="#10b981"
            strokeWidth="2.5"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-linear"
          />
        </svg>

        <span className="absolute text-[9px] font-bold text-zinc-200">
          {isRefreshing ? '..' : secondsLeft}
        </span>
      </div>

      <div className="flex flex-col text-left">
        <span className="text-[9px] text-zinc-500 uppercase tracking-tight">AUTO-REVALIDATE</span>
        <span className="text-[11px] font-bold text-zinc-200 group-hover:text-emerald-400 transition-colors flex items-center gap-1">
          <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          {secondsLeft}s SQLite sync
        </span>
      </div>
    </button>
  );
}

interface HitlAutoHoldClockProps {
  initialSeconds?: number;
  expiresAt?: string;
  onExpire?: () => void;
  label?: string;
}

/**
 * Per-item HITL countdown clock (5-minute auto-hold on critical setpoint overrides)
 */
export function HitlAutoHoldClock({
  initialSeconds = 300,
  expiresAt,
  onExpire,
  label = '5-MIN CRITICAL OVERRIDE AUTO-HOLD',
}: HitlAutoHoldClockProps) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    if (expiresAt) {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      return diff;
    }
    return initialSeconds;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onExpire]);

  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const isExpired = secondsRemaining === 0;
  const isCritical = secondsRemaining <= 60 && !isExpired;
  const isWarning = secondsRemaining > 60 && secondsRemaining <= 180;

  const clockColor = isExpired
    ? 'text-zinc-500 bg-zinc-900 border-zinc-800'
    : isCritical
    ? 'text-rose-400 bg-rose-950/70 border-rose-800/80 animate-pulse'
    : isWarning
    ? 'text-amber-400 bg-amber-950/70 border-amber-800/80'
    : 'text-emerald-400 bg-emerald-950/70 border-emerald-800/80';

  return (
    <div className={`flex items-center justify-between px-2.5 py-1 rounded-lg border font-mono text-[10px] ${clockColor}`}>
      <div className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" />
        <span className="font-bold">{label}:</span>
      </div>

      <div className="flex items-center gap-1">
        <span className="font-bold tracking-wider text-xs">{timeFormatted}</span>
        <span className="text-[9px] opacity-75">
          {isExpired ? '(EXPIRED - AUTO REVERTED)' : 'REMAINING'}
        </span>
      </div>
    </div>
  );
}
