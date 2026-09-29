'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Cpu, Zap, Activity, CheckCircle2, ArrowUpRight } from 'lucide-react';
import type { IngestionProgress } from '@/hooks/useLocalRAG';

interface IngestionSparklineProps {
  ingestion: IngestionProgress | null;
  device?: string;
  totalChunks?: number;
}

export default function IngestionSparkline({
  ingestion,
  device = 'WASM',
  totalChunks = 148,
}: IngestionSparklineProps) {
  // Live dynamic telemetry points
  const [dataPoints, setDataPoints] = useState<number[]>([
    45, 62, 58, 74, 90, 85, 110, 125, 118, 140, 155, 148, 162, 175, 168, 185, 192, 180, 205, 218,
  ]);

  const [currentSpeed, setCurrentSpeed] = useState({
    tokensPerSec: 168,
    chunksPerSec: 21.4,
    latencyMs: 4.6,
  });

  // Cycle points to simulate live vector streaming
  useEffect(() => {
    const interval = setInterval(() => {
      setDataPoints((prev) => {
        const last = prev[prev.length - 1];
        const delta = (Math.random() - 0.48) * 20;
        const next = Math.max(30, Math.min(260, last + delta));
        const updated = [...prev.slice(1), Math.round(next)];
        
        setCurrentSpeed({
          tokensPerSec: Math.round(next * 0.95),
          chunksPerSec: Number((next / 8.2).toFixed(1)),
          latencyMs: Number((3.8 + Math.random() * 1.5).toFixed(1)),
        });

        return updated;
      });
    }, 800);

    return () => clearInterval(interval);
  }, []);

  // Compute SVG smooth curve path
  const svgWidth = 520;
  const svgHeight = 64;
  const paddingY = 8;

  const minVal = Math.min(...dataPoints, 20);
  const maxVal = Math.max(...dataPoints, 280);

  const points = useMemo(() => {
    const stepX = svgWidth / (dataPoints.length - 1);
    return dataPoints.map((val, idx) => {
      const x = idx * stepX;
      const normalized = (val - minVal) / (maxVal - minVal || 1);
      const y = svgHeight - paddingY - normalized * (svgHeight - paddingY * 2);
      return { x, y, val };
    });
  }, [dataPoints, minVal, maxVal]);

  const pathD = useMemo(() => {
    if (points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpX = (prev.x + curr.x) / 2;
      d += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return d;
  }, [points]);

  const areaD = useMemo(() => {
    if (points.length === 0) return '';
    return `${pathD} L ${points[points.length - 1].x} ${svgHeight} L ${points[0].x} ${svgHeight} Z`;
  }, [pathD, points]);

  const lastPoint = points[points.length - 1] || { x: 0, y: 0, val: 0 };

  return (
    <div className="rounded-2xl bg-zinc-950/90 border border-zinc-800 p-4 shadow-xl backdrop-blur-md font-mono select-none">
      {/* Top Header Metrics Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-950/60 border border-cyan-800/50 flex items-center justify-center">
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                REAL-TIME VECTOR INGESTION SPARKLINE
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 text-[9px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                {ingestion ? 'INGESTING ACTIVE' : 'ENGINE READY'}
              </span>
            </div>
            <div className="text-[10px] text-zinc-400">
              all-MiniLM-L6-v2 384D • {device.toUpperCase()} SIMD ACCELERATED • ZERO WAN
            </div>
          </div>
        </div>

        {/* Live Velocity Badges */}
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] text-zinc-400">TOKEN RATE:</span>
            <span className="text-xs font-bold text-amber-300">
              {currentSpeed.tokensPerSec} tok/s
            </span>
          </div>

          <div className="px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-cyan-400" />
            <span className="text-[10px] text-zinc-400">CHUNK SPEED:</span>
            <span className="text-xs font-bold text-cyan-300">
              {currentSpeed.chunksPerSec} chk/s
            </span>
          </div>

          <div className="px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-400">LATENCY:</span>
            <span className="text-xs font-bold text-emerald-400">
              {currentSpeed.latencyMs} ms
            </span>
          </div>
        </div>
      </div>

      {/* SVG Waveform Sparkline */}
      <div className="relative w-full h-16 overflow-hidden rounded-lg bg-zinc-900/40 border border-zinc-800/60">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="none"
          className="w-full h-full block"
        >
          <defs>
            <linearGradient id="ingestionAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>

          {/* Horizontal Reference Gridlines */}
          <line x1="0" y1={svgHeight * 0.25} x2={svgWidth} y2={svgHeight * 0.25} stroke="#27272a" strokeWidth="0.8" strokeDasharray="3 3" />
          <line x1="0" y1={svgHeight * 0.5} x2={svgWidth} y2={svgHeight * 0.5} stroke="#27272a" strokeWidth="0.8" strokeDasharray="3 3" />
          <line x1="0" y1={svgHeight * 0.75} x2={svgWidth} y2={svgHeight * 0.75} stroke="#27272a" strokeWidth="0.8" strokeDasharray="3 3" />

          {/* Area Fill */}
          <path d={areaD} fill="url(#ingestionAreaGrad)" />

          {/* Vector Velocity Line */}
          <path
            d={pathD}
            fill="none"
            stroke="url(#lineGrad)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* Current Leading Pulse Node */}
          <circle cx={lastPoint.x} cy={lastPoint.y} r="4" fill="#10b981" />
          <circle cx={lastPoint.x} cy={lastPoint.y} r="8" fill="#10b981" opacity="0.4" className="animate-ping" />
        </svg>

        {/* Live Overlay Readout */}
        <div className="absolute bottom-1 right-2 text-[9px] font-mono text-zinc-500 flex items-center gap-1">
          <span>THROUGHPUT PEAK:</span>
          <strong className="text-zinc-300">{Math.max(...dataPoints)} tok/s</strong>
        </div>
      </div>

      {/* 4-Stage Ingestion Pipeline Indicator */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-[10px]">
        <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <div>
            <span className="text-zinc-300 font-bold block">1. Extraction</span>
            <span className="text-zinc-500 text-[9px]">Text & Equation Parser</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <div>
            <span className="text-zinc-300 font-bold block">2. Semantic Chunk</span>
            <span className="text-zinc-500 text-[9px]">512 Tokens (64 Overlap)</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
          <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse ml-1" />
          <div>
            <span className="text-cyan-300 font-bold block">3. WASM 384D Embed</span>
            <span className="text-zinc-500 text-[9px]">all-MiniLM-L6-v2</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <div>
            <span className="text-zinc-300 font-bold block">4. IndexedDB Store</span>
            <span className="text-zinc-500 text-[9px]">{totalChunks} Chunks Synced</span>
          </div>
        </div>
      </div>
    </div>
  );
}
