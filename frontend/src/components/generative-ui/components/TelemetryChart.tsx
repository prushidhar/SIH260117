'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Play, Pause, Activity, Crosshair, RefreshCw, Layers, Camera, Download, Clock } from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import type { TelemetryChartProps, TelemetryDataPoint } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────
const FFT_BARS = 15;
const HISTORY_SECONDS = 60;
const ANIMATION_HZ = 30; // target fps via rAF
const MS_PER_FRAME = 1000 / ANIMATION_HZ;

// ─── Channel Configurations ───────────────────────────────────────────────────
const CHANNEL_CONFIGS = {
  vibration: {
    label: 'Vibration Velocity',
    unit: 'mm/s RMS',
    min: 0,
    max: 10,
    color: '#8b5cf6',
    stroke: '#8b5cf6',
    zoneA: 2.3,
    zoneB: 4.5,
    zoneC: 7.1,
    baseVal: 3.2,
    clampMin: 1.0,
    clampMax: 8.5,
    drift: 0.4,
  },
  temperature: {
    label: 'Inboard Bearing Temp',
    unit: '°C',
    min: 20,
    max: 120,
    color: '#f59e0b',
    stroke: '#f59e0b',
    zoneA: 55,
    zoneB: 75,
    zoneC: 90,
    baseVal: 62,
    clampMin: 40.0,
    clampMax: 95.0,
    drift: 1.2,
  },
  current: {
    label: 'Motor Stator Current',
    unit: 'Amps',
    min: 0,
    max: 100,
    color: '#06b6d4',
    stroke: '#06b6d4',
    zoneA: 45,
    zoneB: 68,
    zoneC: 85,
    baseVal: 48,
    clampMin: 20.0,
    clampMax: 80.0,
    drift: 2.0,
  },
} as const;

type ChannelKey = keyof typeof CHANNEL_CONFIGS;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildInitialSeries(ch: ChannelKey, count = 25): TelemetryDataPoint[] {
  const cfg = CHANNEL_CONFIGS[ch];
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const time = new Date(now - (count - 1 - i) * 1500).toLocaleTimeString([], {
      hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    const noise = Math.sin(i * 0.4) * 0.8 + (Math.random() * 0.4 - 0.2);
    return {
      timestamp: time,
      value: Math.max(cfg.clampMin, parseFloat((cfg.baseVal + noise).toFixed(2))),
      threshold: cfg.zoneB,
    };
  });
}

function nowTimestamp(): string {
  return new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function downloadCSV(points: TelemetryDataPoint[], channel: string): void {
  const header = 'timestamp,value,threshold,channel\n';
  const rows = points.map(p =>
    `${p.timestamp},${p.value},${p.threshold ?? ''},${channel}`
  ).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `telemetry_${channel}_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TelemetryChart({
  tag = 'P-101',
  title = 'Real-Time Vibration Telemetry (ISO 10816-3)',
  subtitle = 'Tri-Axial Velocity Spectrum & FFT Waveform',
  channels: propChannels,
  series: propSeries,
  unit = 'mm/s RMS',
  isoClass = 'Class II',
  liveUpdate = true,
}: TelemetryChartProps) {
  const { selectTag } = useIndraStore();

  const initialData = useMemo<TelemetryDataPoint[]>(() => {
    if (propSeries && propSeries.length > 0) return propSeries;
    return buildInitialSeries('vibration');
  }, [propSeries]);

  // ── State ──────────────────────────────────────────────────────────────────
  const [dataPoints, setDataPoints] = useState<TelemetryDataPoint[]>(initialData);
  const [isPlaying, setIsPlaying] = useState<boolean>(liveUpdate);
  const [activeChannel, setActiveChannel] = useState<ChannelKey>('vibration');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [frozen, setFrozen] = useState<boolean>(false);
  const [frozenLabel, setFrozenLabel] = useState<string | null>(null);
  const [liveTime, setLiveTime] = useState<string>(nowTimestamp());
  const [startTime] = useState<number>(Date.now());
  const [fftHeights, setFftHeights] = useState<number[]>(() =>
    Array.from({ length: FFT_BARS }, (_, i) =>
      Math.max(10, 80 - i * 3 + Math.random() * 25)
    )
  );
  const [historyBuffer, setHistoryBuffer] = useState<number[]>(() =>
    Array.from({ length: HISTORY_SECONDS }, () => 0.5)
  );

  // ── Refs ───────────────────────────────────────────────────────────────────
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef<TelemetryDataPoint[]>(dataPoints);
  const playingRef = useRef<boolean>(isPlaying);
  const frozenRef = useRef<boolean>(frozen);

  // Keep refs in sync
  useEffect(() => { dataRef.current = dataPoints; }, [dataPoints]);
  useEffect(() => { playingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { frozenRef.current = frozen; }, [frozen]);

  const activeCfg = CHANNEL_CONFIGS[activeChannel];

  // ── rAF animation loop at ~30Hz ────────────────────────────────────────────
  const tick = useCallback((ts: number) => {
    rafRef.current = requestAnimationFrame(tick);

    // Clock update every second regardless of play state
    setLiveTime(nowTimestamp());

    const elapsed = ts - lastTickRef.current;
    if (!playingRef.current || frozenRef.current || elapsed < MS_PER_FRAME * 1.5) {
      return; // skip data update this frame (but keep clock ticking)
    }
    // Only update data every ~1.2 s (1200ms) using elapsed counter
    if (elapsed < 1200) return;
    lastTickRef.current = ts;

    const cfg = CHANNEL_CONFIGS[activeChannel];

    setDataPoints(prev => {
      const last = prev[prev.length - 1];
      const lastVal = last ? last.value : cfg.baseVal;
      const drift = (Math.random() - 0.48) * cfg.drift;
      const nextVal = parseFloat(
        Math.min(cfg.clampMax, Math.max(cfg.clampMin, lastVal + drift)).toFixed(2)
      );
      const nextPoint: TelemetryDataPoint = {
        timestamp: nowTimestamp(),
        value: nextVal,
        threshold: cfg.zoneB,
      };
      return [...prev.slice(1), nextPoint];
    });

    // FFT bar animation — simulate harmonics
    setFftHeights(() =>
      Array.from({ length: FFT_BARS }, (_, i) => {
        const base = Math.max(5, 75 - i * 4);
        const harmonic = i === 0 ? 30 : i === 1 ? 15 : i % 3 === 0 ? 10 : 0;
        return parseFloat((base + harmonic + Math.random() * 20).toFixed(1));
      })
    );

    // History sparkline: append current value to ring buffer
    setHistoryBuffer(prev => {
      const last = dataRef.current[dataRef.current.length - 1]?.value ?? 0;
      return [...prev.slice(1), last];
    });
  }, [activeChannel]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [tick]);

  // ── Chart geometry ─────────────────────────────────────────────────────────
  const width = 520;
  const height = 180;
  const gaugeW = 12; // right-side zone gauge width
  const padding = { top: 20, right: 20 + gaugeW + 6, bottom: 28, left: 36 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const minY = activeCfg.min;
  const maxY = activeCfg.max;
  const range = maxY - minY || 1;

  const getX = (index: number) => padding.left + (index / (dataPoints.length - 1 || 1)) * chartW;
  const getY = (val: number) => padding.top + chartH - ((val - minY) / range) * chartH;

  const linePath = useMemo(() => {
    if (dataPoints.length === 0) return '';
    return dataPoints
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(pt.value).toFixed(1)}`)
      .join(' ');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataPoints, minY, maxY, chartW, chartH]);

  const areaPath = useMemo(() => {
    if (dataPoints.length === 0) return '';
    const bottomY = padding.top + chartH;
    return `${linePath} L ${getX(dataPoints.length - 1).toFixed(1)} ${bottomY} L ${getX(0).toFixed(1)} ${bottomY} Z`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linePath, dataPoints.length]);

  // Zone band geometry
  const zoneRects = useMemo(() => {
    const yMax = padding.top;
    const yZoneC = getY(activeCfg.zoneC);
    const yZoneB = getY(activeCfg.zoneB);
    const yZoneA = getY(activeCfg.zoneA);
    const yBase = padding.top + chartH;
    return [
      { y: yMax, h: yZoneC - yMax, fill: '#ef4444' },       // Zone D (top)
      { y: yZoneC, h: yZoneB - yZoneC, fill: '#f97316' },   // Zone C
      { y: yZoneB, h: yZoneA - yZoneB, fill: '#eab308' },   // Zone B
      { y: yZoneA, h: yBase - yZoneA, fill: '#22c55e' },    // Zone A (bottom)
    ];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCfg, minY, maxY, chartH, padding]);

  // History sparkline geometry
  const sparkW = 500;
  const sparkH = 50;
  const sparkPath = useMemo(() => {
    const hMin = Math.min(...historyBuffer);
    const hMax = Math.max(...historyBuffer) || 1;
    const hRange = hMax - hMin || 1;
    return historyBuffer
      .map((v, i) => {
        const x = (i / (historyBuffer.length - 1)) * sparkW;
        const y = sparkH - ((v - hMin) / hRange) * (sparkH - 4) - 2;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [historyBuffer]);

  // Latest value & severity
  const latestVal = dataPoints[dataPoints.length - 1]?.value ?? 0;
  const isAlarm = latestVal >= activeCfg.zoneC;

  let severity = 'ZONE A (GOOD)';
  let severityColor = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
  if (latestVal >= activeCfg.zoneC) {
    severity = 'ZONE D (UNACCEPTABLE)';
    severityColor = 'text-rose-500 bg-rose-500/10 border-rose-500/40';
  } else if (latestVal >= activeCfg.zoneB) {
    severity = 'ZONE C (UNSATISFACTORY)';
    severityColor = 'text-amber-500 bg-amber-500/10 border-amber-500/40';
  } else if (latestVal >= activeCfg.zoneA) {
    severity = 'ZONE B (SATISFACTORY)';
    severityColor = 'text-sky-500 bg-sky-500/10 border-sky-500/30';
  }

  // Right-side zone gauge segment positions (for the 8px gauge bar)
  const gaugeSegments = useMemo(() => {
    const totalH = chartH;
    const zCFrac = (activeCfg.zoneC - minY) / range;
    const zBFrac = (activeCfg.zoneB - minY) / range;
    const zAFrac = (activeCfg.zoneA - minY) / range;
    // Segments go bottom (min) to top (max) in SVG coords: top is low y
    const dH = (1 - zCFrac) * totalH;  // Zone D height
    const cH = (zCFrac - zBFrac) * totalH;
    const bH = (zBFrac - zAFrac) * totalH;
    const aH = zAFrac * totalH;
    const gx = padding.left + chartW + 6;
    return [
      { y: padding.top, h: dH, fill: '#ef4444', label: 'D' },
      { y: padding.top + dH, h: cH, fill: '#f97316', label: 'C' },
      { y: padding.top + dH + cH, h: bH, fill: '#eab308', label: 'B' },
      { y: padding.top + dH + cH + bH, h: aH, fill: '#22c55e', label: 'A' },
    ].map(s => ({ ...s, gx }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCfg, minY, maxY, chartH, chartW, padding]);

  // Current zone indicator on the gauge
  const currentFrac = Math.min(1, Math.max(0, (latestVal - minY) / range));
  const gaugeIndicatorY = padding.top + chartH - currentFrac * chartH;

  // FFT dominant freq simulation
  const fftDomFreq = useMemo(() => {
    const base = 24.3 + (latestVal / activeCfg.max) * 24;
    return `${base.toFixed(1)} Hz (2X running speed)`;
  }, [latestVal, activeCfg.max]);

  // Elapsed time
  const elapsedMs = Date.now() - startTime;

  // ── Event handlers ─────────────────────────────────────────────────────────
  const handleLocateTag = () => {
    if (tag) {
      selectTag(tag);
      broadcastSyncEvent({
        type: 'TAG_SELECTED',
        tag,
        metadata: { source: 'TelemetryChart', value: latestVal, unit: activeCfg.unit },
      });
    }
  };

  const handleChannelSwitch = (ch: ChannelKey) => {
    setActiveChannel(ch);
    setDataPoints(buildInitialSeries(ch));
    setHistoryBuffer(Array.from({ length: HISTORY_SECONDS }, () => CHANNEL_CONFIGS[ch].baseVal));
    setFrozen(false);
    setFrozenLabel(null);
  };

  const handleFreezeFrame = () => {
    if (frozen) {
      setFrozen(false);
      setFrozenLabel(null);
    } else {
      setFrozen(true);
      setFrozenLabel(`Frozen @ ${nowTimestamp()}`);
    }
  };

  const handleExportCSV = () => {
    downloadCSV(dataPoints, activeChannel);
  };

  const hoveredPoint = hoverIndex !== null ? dataPoints[hoverIndex] : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className={`p-4 rounded-2xl bg-white dark:bg-zinc-900 border shadow-sm transition-all text-slate-800 dark:text-zinc-200 ${
        isAlarm
          ? 'border-rose-500 ring-2 ring-rose-500 animate-pulse'
          : 'border-slate-200 dark:border-zinc-800'
      }`}
    >
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800/80 gap-2">
        <div className="flex items-center gap-2">
          {tag && (
            <button
              onClick={handleLocateTag}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 dark:hover:bg-violet-900/50 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 font-mono text-xs font-bold transition-all cursor-pointer group"
              title="Center camera on P&ID schematic"
            >
              <Crosshair className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 group-hover:rotate-45 transition-transform" />
              <span>{tag}</span>
            </button>
          )}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span>{title}</span>
            </h4>
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
              {subtitle} • {isoClass}
            </div>
          </div>
        </div>

        {/* Live badge + clock + controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${severityColor}`}>
            <Activity className="w-3 h-3 animate-pulse" />
            <span>{severity}</span>
          </span>

          {/* Live clock */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[10px] font-mono text-slate-600 dark:text-zinc-300">
            <Clock className="w-3 h-3" />
            <span>{liveTime}</span>
            {isPlaying && !frozen && (
              <span className="text-emerald-500 font-bold ml-1">+{fmtElapsed(elapsedMs)}</span>
            )}
          </div>

          {/* Freeze Frame */}
          <button
            onClick={handleFreezeFrame}
            className={`p-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
              frozen
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
            }`}
            title={frozen ? 'Unfreeze chart' : 'Freeze current frame'}
          >
            <Camera className="w-3 h-3" />
            <span className="text-[10px] hidden sm:inline">{frozen ? 'FROZEN' : 'FREEZE'}</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="p-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-400"
            title="Download current data as CSV"
          >
            <Download className="w-3 h-3" />
            <span className="text-[10px] hidden sm:inline">CSV</span>
          </button>

          {/* Play/Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
              isPlaying
                ? 'bg-violet-600 text-white shadow-xs shadow-violet-500/20'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
            }`}
            title={isPlaying ? 'Pause live stream' : 'Resume live stream'}
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span className="text-[10px] hidden sm:inline">{isPlaying ? 'LIVE' : 'PAUSED'}</span>
          </button>
        </div>
      </div>

      {/* Frozen timestamp label */}
      {frozenLabel && (
        <div className="mt-1.5 px-3 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-[10px] font-mono font-bold">
          📸 {frozenLabel}
        </div>
      )}

      {/* ── Channel Switcher ── */}
      <div className="flex items-center gap-1.5 mt-3 text-xs font-mono">
        <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1">
          <Layers className="w-3 h-3" />
          <span>Channel:</span>
        </span>
        {(Object.keys(CHANNEL_CONFIGS) as ChannelKey[]).map((ch) => {
          const cfg = CHANNEL_CONFIGS[ch];
          const isActive = activeChannel === ch;
          return (
            <button
              key={ch}
              onClick={() => handleChannelSwitch(ch)}
              className={`px-2.5 py-1 rounded-lg text-[11px] transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold shadow-xs'
                  : 'bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* ── Main SVG Chart ── */}
      <div
        ref={containerRef}
        className="relative mt-2 w-full select-none"
        onMouseLeave={() => setHoverIndex(null)}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-44 overflow-visible"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = e.clientX - rect.left;
            const frac = Math.max(0, Math.min(1,
              (relX - (padding.left / width) * rect.width) / ((chartW / width) * rect.width)
            ));
            const index = Math.round(frac * (dataPoints.length - 1));
            setHoverIndex(index);
          }}
        >
          <defs>
            {/* Area gradient */}
            <linearGradient id={`areaGrad-${activeChannel}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={activeCfg.stroke} stopOpacity="0.35" />
              <stop offset="100%" stopColor={activeCfg.stroke} stopOpacity="0.0" />
            </linearGradient>
            {/* Clip to chart area */}
            <clipPath id="chartClip">
              <rect x={padding.left} y={padding.top} width={chartW} height={chartH} />
            </clipPath>
          </defs>

          {/* ── Zone band fills ── */}
          {zoneRects.map((z, i) => (
            <rect
              key={i}
              x={padding.left}
              y={z.y}
              width={chartW}
              height={Math.max(0, z.h)}
              fill={z.fill}
              fillOpacity={0.08}
            />
          ))}

          {/* Zone threshold lines */}
          {([activeCfg.zoneA, activeCfg.zoneB, activeCfg.zoneC] as const).map((val, i) => {
            const colors = ['#22c55e', '#eab308', '#f97316'];
            const labels = ['Zone A/B', 'Zone B/C', 'Zone C/D'];
            return (
              <g key={i}>
                <line
                  x1={padding.left} y1={getY(val)}
                  x2={padding.left + chartW} y2={getY(val)}
                  stroke={colors[i]} strokeWidth="1" strokeDasharray="4 3"
                  opacity={0.7}
                />
                <text
                  x={padding.left + chartW - 2} y={getY(val) - 3}
                  textAnchor="end"
                  fontSize="7" fontFamily="monospace" fill={colors[i]} fontWeight="bold"
                >
                  {labels[i]} ({val} {activeCfg.unit})
                </text>
              </g>
            );
          })}

          {/* Grid axes */}
          <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + chartH}
            stroke="#e2e8f0" strokeWidth="1" className="dark:stroke-zinc-800" />
          <line x1={padding.left} y1={padding.top + chartH} x2={padding.left + chartW} y2={padding.top + chartH}
            stroke="#e2e8f0" strokeWidth="1" className="dark:stroke-zinc-800" />

          {/* Y Axis labels */}
          <text x={padding.left - 6} y={padding.top + 6} textAnchor="end"
            fontSize="9" fontFamily="monospace" fill="#94a3b8" fontWeight="bold">{maxY}</text>
          <text x={padding.left - 6} y={padding.top + chartH / 2} textAnchor="end"
            fontSize="9" fontFamily="monospace" fill="#94a3b8">{((maxY + minY) / 2).toFixed(0)}</text>
          <text x={padding.left - 6} y={padding.top + chartH} textAnchor="end"
            fontSize="9" fontFamily="monospace" fill="#94a3b8">{minY}</text>

          {/* Area fill */}
          <path d={areaPath} fill={`url(#areaGrad-${activeChannel})`} clipPath="url(#chartClip)" />

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke={activeCfg.stroke}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            clipPath="url(#chartClip)"
            className="drop-shadow-xs"
          />

          {/* Latest pulsing dot */}
          {dataPoints.length > 0 && (
            <g>
              <circle
                cx={getX(dataPoints.length - 1)} cy={getY(latestVal)}
                r="7" fill={activeCfg.stroke} className="animate-ping opacity-40"
              />
              <circle
                cx={getX(dataPoints.length - 1)} cy={getY(latestVal)}
                r="4.5" fill={activeCfg.stroke} className="drop-shadow-sm"
              />
            </g>
          )}

          {/* Hover crosshair */}
          {hoverIndex !== null && hoveredPoint && (
            <g>
              <line
                x1={getX(hoverIndex)} y1={padding.top}
                x2={getX(hoverIndex)} y2={padding.top + chartH}
                stroke="#a855f7" strokeWidth="1.5" strokeDasharray="2 2"
              />
              <circle
                cx={getX(hoverIndex)} cy={getY(hoveredPoint.value)}
                r="5" fill="#ffffff" stroke={activeCfg.stroke} strokeWidth="2"
              />
            </g>
          )}

          {/* ── ISO 10816-3 vertical zone gauge (right side, 8px wide) ── */}
          {gaugeSegments.map((seg, i) => (
            <rect
              key={i}
              x={seg.gx}
              y={seg.y}
              width={8}
              height={Math.max(0, seg.h)}
              fill={seg.fill}
              rx="1"
            />
          ))}
          {/* Current value indicator on gauge */}
          <polygon
            points={`${gaugeSegments[0]?.gx ?? 0},${gaugeIndicatorY} ${(gaugeSegments[0]?.gx ?? 0) - 5},${gaugeIndicatorY - 4} ${(gaugeSegments[0]?.gx ?? 0) - 5},${gaugeIndicatorY + 4}`}
            fill="white"
            stroke="#334155"
            strokeWidth="1"
          />
          {/* Gauge label */}
          <text
            x={(gaugeSegments[0]?.gx ?? 0) + 10}
            y={padding.top + chartH / 2}
            fontSize="7" fontFamily="monospace" fill="#94a3b8"
            writingMode="tb"
            transform={`rotate(90, ${(gaugeSegments[0]?.gx ?? 0) + 10}, ${padding.top + chartH / 2})`}
          >
            ISO ZONE
          </text>
        </svg>

        {/* Hover Tooltip */}
        {hoverIndex !== null && hoveredPoint && (
          <div
            className="absolute top-2 pointer-events-none px-2.5 py-1.5 rounded-lg bg-slate-950/90 text-white text-[11px] font-mono shadow-md border border-slate-800 flex items-center gap-2"
            style={{
              left: `${Math.min(Math.max(10, (getX(hoverIndex) / width) * 100 - 15), 70)}%`,
            }}
          >
            <span className="text-slate-400">{hoveredPoint.timestamp}</span>
            <span className="font-bold text-violet-400">
              {hoveredPoint.value.toFixed(2)} {activeCfg.unit}
            </span>
          </div>
        )}
      </div>

      {/* ── FFT Frequency Spectrum ── */}
      <div className="mt-2">
        <div className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
          FFT Frequency Spectrum (Vibration Harmonics)
        </div>
        <svg viewBox={`0 0 ${sparkW} 70`} className="w-full h-16 overflow-visible">
          <defs>
            <linearGradient id="fftBarGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={activeCfg.stroke} stopOpacity="1" />
              <stop offset="100%" stopColor={activeCfg.stroke} stopOpacity="0.4" />
            </linearGradient>
          </defs>
          {/* Baseline */}
          <line x1="0" y1="65" x2={sparkW} y2="65" stroke="#e2e8f0" strokeWidth="1" className="dark:stroke-zinc-800" />
          {fftHeights.map((h, i) => {
            const barW = sparkW / FFT_BARS - 4;
            const x = i * (sparkW / FFT_BARS) + 2;
            const barH = Math.min(h, 60);
            const freq = ((i + 1) * 24.3).toFixed(0);
            return (
              <g key={i}>
                <rect
                  x={x} y={65 - barH}
                  width={barW} height={barH}
                  fill="url(#fftBarGrad)"
                  rx="2"
                  style={{ transition: 'y 0.15s ease, height 0.15s ease' }}
                />
                {i % 3 === 0 && (
                  <text x={x + barW / 2} y="69" textAnchor="middle"
                    fontSize="6" fontFamily="monospace" fill="#94a3b8">
                    {freq}Hz
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── History Sparkline (60s) ── */}
      <div className="mt-2">
        <div className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1 flex items-center justify-between">
          <span>60s History</span>
          <span className="text-[9px]">← 60 sec ago &nbsp;&nbsp; now →</span>
        </div>
        <svg viewBox={`0 0 ${sparkW} ${sparkH}`} className="w-full h-12 overflow-visible">
          <defs>
            <linearGradient id="sparkAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={activeCfg.stroke} stopOpacity="0.3" />
              <stop offset="100%" stopColor={activeCfg.stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`${sparkPath} L ${sparkW} ${sparkH} L 0 ${sparkH} Z`}
            fill="url(#sparkAreaGrad)"
          />
          <path
            d={sparkPath}
            fill="none"
            stroke={activeCfg.stroke}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* ── Footer KPI Row (4 metrics) ── */}
      <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80 text-xs font-mono">
        <div className="p-2 rounded-xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800">
          <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase">Current Reading</div>
          <div className="text-sm font-bold text-slate-900 dark:text-zinc-100">
            {latestVal.toFixed(2)}{' '}
            <span className="text-[10px] font-normal text-slate-500">{activeCfg.unit}</span>
          </div>
        </div>

        <div className="p-2 rounded-xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800">
          <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase">Peak-Peak (24h)</div>
          <div className="text-sm font-bold text-amber-600 dark:text-amber-400">
            {(latestVal * 1.25).toFixed(2)}{' '}
            <span className="text-[10px] font-normal text-slate-500">{activeCfg.unit}</span>
          </div>
        </div>

        <div className="p-2 rounded-xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800">
          <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase">ISO Limit Margin</div>
          <div className={`text-sm font-bold ${activeCfg.zoneB - latestVal < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {activeCfg.zoneB - latestVal >= 0 ? '+' : ''}{(activeCfg.zoneB - latestVal).toFixed(2)}{' '}
            <span className="text-[10px] font-normal text-slate-500">{activeCfg.unit}</span>
          </div>
        </div>

        <div className="p-2 rounded-xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800">
          <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase">FFT Dominant Freq</div>
          <div className="text-[11px] font-bold text-violet-600 dark:text-violet-400 leading-tight mt-0.5">
            {fftDomFreq}
          </div>
        </div>
      </div>
    </div>
  );
}
