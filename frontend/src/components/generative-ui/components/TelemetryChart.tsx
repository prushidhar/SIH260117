'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, Activity, Crosshair, RefreshCw, Layers } from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import type { TelemetryChartProps, TelemetryDataPoint } from '../types';

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

  // Initial synthetic telemetry if none provided
  const initialData = useMemo(() => {
    if (propSeries && propSeries.length > 0) return propSeries;
    const pts: TelemetryDataPoint[] = [];
    const baseVal = 3.2;
    const now = Date.now();
    for (let i = 24; i >= 0; i--) {
      const time = new Date(now - i * 1500).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const noise = (Math.sin(i * 0.4) * 0.8) + (Math.random() * 0.4 - 0.2);
      pts.push({
        timestamp: time,
        value: Math.max(0.5, parseFloat((baseVal + noise).toFixed(2))),
        threshold: 4.5,
      });
    }
    return pts;
  }, [propSeries]);

  const [dataPoints, setDataPoints] = useState<TelemetryDataPoint[]>(initialData);
  const [isPlaying, setIsPlaying] = useState<boolean>(liveUpdate);
  const [activeChannel, setActiveChannel] = useState<'vibration' | 'temperature' | 'current'>('vibration');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Channel definitions
  const channelConfigs = {
    vibration: {
      label: 'Vibration Velocity',
      unit: 'mm/s RMS',
      min: 0,
      max: 10,
      color: '#8b5cf6', // Violet
      stroke: '#8b5cf6',
      zoneA: 2.3,
      zoneB: 4.5,
      zoneC: 7.1,
    },
    temperature: {
      label: 'Inboard Bearing Temp',
      unit: '°C',
      min: 20,
      max: 120,
      color: '#f59e0b', // Amber
      stroke: '#f59e0b',
      zoneA: 55,
      zoneB: 75,
      zoneC: 90,
    },
    current: {
      label: 'Motor Stator Current',
      unit: 'Amps',
      min: 0,
      max: 100,
      color: '#06b6d4', // Cyan
      stroke: '#06b6d4',
      zoneA: 45,
      zoneB: 68,
      zoneC: 85,
    },
  };

  const activeCfg = channelConfigs[activeChannel];

  // Dynamic live data generator
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setDataPoints((prev) => {
        const last = prev[prev.length - 1];
        const lastVal = last ? last.value : 3.0;
        const drift = (Math.random() - 0.48) * 0.4;
        let nextVal = parseFloat((lastVal + drift).toFixed(2));

        if (activeChannel === 'vibration') {
          nextVal = Math.min(Math.max(nextVal, 1.0), 8.5);
        } else if (activeChannel === 'temperature') {
          nextVal = Math.min(Math.max(nextVal, 40.0), 95.0);
        } else {
          nextVal = Math.min(Math.max(nextVal, 20.0), 80.0);
        }

        const now = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const nextPoint: TelemetryDataPoint = {
          timestamp: now,
          value: nextVal,
          threshold: activeCfg.zoneB,
        };

        const updated = [...prev.slice(1), nextPoint];
        return updated;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [isPlaying, activeChannel, activeCfg.zoneB]);

  // Chart Dimensions
  const width = 500;
  const height = 180;
  const padding = { top: 20, right: 20, bottom: 28, left: 36 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Coordinate scales
  const minY = activeCfg.min;
  const maxY = activeCfg.max;

  const getX = (index: number) => padding.left + (index / (dataPoints.length - 1 || 1)) * chartW;
  const getY = (val: number) => padding.top + chartH - ((val - minY) / (maxY - minY || 1)) * chartH;

  // Build SVG Path
  const linePath = useMemo(() => {
    if (dataPoints.length === 0) return '';
    return dataPoints
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(pt.value).toFixed(1)}`)
      .join(' ');
  }, [dataPoints, minY, maxY]);

  // Build SVG Area Path for Gradient Fill
  const areaPath = useMemo(() => {
    if (dataPoints.length === 0) return '';
    const bottomY = padding.top + chartH;
    return `${linePath} L ${getX(dataPoints.length - 1)} ${bottomY} L ${getX(0)} ${bottomY} Z`;
  }, [linePath, dataPoints.length]);

  const latestVal = dataPoints[dataPoints.length - 1]?.value ?? 0;

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

  const hoveredPoint = hoverIndex !== null ? dataPoints[hoverIndex] : null;

  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm transition-all text-slate-800 dark:text-zinc-200">
      {/* Header */}
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

        {/* Play/Pause & Live Badge */}
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${severityColor}`}>
            <Activity className="w-3 h-3 animate-pulse" />
            <span>{severity}</span>
          </span>

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

      {/* Channel Switcher */}
      <div className="flex items-center gap-1.5 mt-3 text-xs font-mono">
        <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1">
          <Layers className="w-3 h-3" />
          <span>Channel:</span>
        </span>
        {(['vibration', 'temperature', 'current'] as const).map((ch) => {
          const cfg = channelConfigs[ch];
          const isActive = activeChannel === ch;
          return (
            <button
              key={ch}
              onClick={() => {
                setActiveChannel(ch);
                // regenerate series suited to channel
                const pts: TelemetryDataPoint[] = [];
                const base = ch === 'temperature' ? 62 : ch === 'current' ? 48 : 3.2;
                const now = Date.now();
                for (let i = 24; i >= 0; i--) {
                  const time = new Date(now - i * 1500).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  pts.push({
                    timestamp: time,
                    value: parseFloat((base + (Math.random() * 2 - 1)).toFixed(2)),
                  });
                }
                setDataPoints(pts);
              }}
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

      {/* Main SVG Chart Container */}
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
            const frac = Math.max(0, Math.min(1, (relX - (padding.left / width) * rect.width) / ((chartW / width) * rect.width)));
            const index = Math.round(frac * (dataPoints.length - 1));
            setHoverIndex(index);
          }}
        >
          <defs>
            <linearGradient id={`areaGrad-${activeChannel}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={activeCfg.stroke} stopOpacity="0.35" />
              <stop offset="100%" stopColor={activeCfg.stroke} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Severity Band Threshold Lines */}
          <line
            x1={padding.left}
            y1={getY(activeCfg.zoneB)}
            x2={padding.left + chartW}
            y2={getY(activeCfg.zoneB)}
            stroke="#f59e0b"
            strokeWidth="1"
            strokeDasharray="4 4"
            className="opacity-60"
          />
          <text
            x={padding.left + chartW - 2}
            y={getY(activeCfg.zoneB) - 3}
            textAnchor="end"
            className="text-[8px] font-mono fill-amber-500 font-bold"
          >
            Trip Limit ({activeCfg.zoneB} {activeCfg.unit})
          </text>

          {/* Grid lines & Y Axis */}
          <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + chartH} stroke="currentColor" className="text-slate-200 dark:text-zinc-800" strokeWidth="1" />
          <line x1={padding.left} y1={padding.top + chartH} x2={padding.left + chartW} y2={padding.top + chartH} stroke="currentColor" className="text-slate-200 dark:text-zinc-800" strokeWidth="1" />

          {/* Y Axis Labels */}
          <text x={padding.left - 6} y={padding.top + 6} textAnchor="end" className="text-[9px] font-mono fill-slate-400 dark:fill-zinc-500 font-bold">
            {maxY}
          </text>
          <text x={padding.left - 6} y={padding.top + chartH / 2} textAnchor="end" className="text-[9px] font-mono fill-slate-400 dark:fill-zinc-500">
            {((maxY + minY) / 2).toFixed(0)}
          </text>
          <text x={padding.left - 6} y={padding.top + chartH} textAnchor="end" className="text-[9px] font-mono fill-slate-400 dark:fill-zinc-500">
            {minY}
          </text>

          {/* Area Fill */}
          <path d={areaPath} fill={`url(#areaGrad-${activeChannel})`} />

          {/* Polyline */}
          <path
            d={linePath}
            fill="none"
            stroke={activeCfg.stroke}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-xs"
          />

          {/* Latest Pulsing Point */}
          {dataPoints.length > 0 && (
            <g>
              <circle
                cx={getX(dataPoints.length - 1)}
                cy={getY(latestVal)}
                r="7"
                fill={activeCfg.stroke}
                className="animate-ping opacity-40"
              />
              <circle
                cx={getX(dataPoints.length - 1)}
                cy={getY(latestVal)}
                r="4.5"
                fill={activeCfg.stroke}
                className="drop-shadow-sm"
              />
            </g>
          )}

          {/* Hover Crosshair */}
          {hoverIndex !== null && hoveredPoint && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={padding.top}
                x2={getX(hoverIndex)}
                y2={padding.top + chartH}
                stroke="#a855f7"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getY(hoveredPoint.value)}
                r="5"
                fill="#ffffff"
                stroke={activeCfg.stroke}
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {/* Hover Tooltip Overlay */}
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

      {/* Footer Metrics Row */}
      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80 text-xs font-mono">
        <div className="p-2 rounded-xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800">
          <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase">Current Reading</div>
          <div className="text-sm font-bold text-slate-900 dark:text-zinc-100">
            {latestVal.toFixed(2)} <span className="text-[10px] font-normal text-slate-500">{activeCfg.unit}</span>
          </div>
        </div>

        <div className="p-2 rounded-xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800">
          <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase">Peak Peak (24h)</div>
          <div className="text-sm font-bold text-amber-600 dark:text-amber-400">
            {(latestVal * 1.25).toFixed(2)} <span className="text-[10px] font-normal text-slate-500">{activeCfg.unit}</span>
          </div>
        </div>

        <div className="p-2 rounded-xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800">
          <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase">ISO Limit Margin</div>
          <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
            +{(activeCfg.zoneB - latestVal).toFixed(2)} <span className="text-[10px] font-normal text-slate-500">{activeCfg.unit}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
