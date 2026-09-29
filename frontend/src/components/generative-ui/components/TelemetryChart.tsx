'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, Activity, Crosshair, RefreshCw, Layers, BarChart2, Radio } from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import type { TelemetryChartProps, TelemetryDataPoint } from '../types';

export default function TelemetryChart({
  tag = 'P-101',
  title = 'Real-Time Vibration Telemetry (ISO 10816-3)',
  subtitle = 'Tri-Axial Velocity Spectrum & 15-Bin FFT Waveform',
  channels: propChannels,
  series: propSeries,
  unit = 'mm/s RMS',
  isoClass = 'Class II',
  liveUpdate = true,
}: TelemetryChartProps) {
  const { selectTag } = useIndraStore();

  const [isPlaying, setIsPlaying] = useState<boolean>(liveUpdate);
  const [viewMode, setViewMode] = useState<'dual' | 'time' | 'fft'>('dual');
  const [activeChannel, setActiveChannel] = useState<'vibration' | 'temperature' | 'current'>('vibration');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timeOffsetRef = useRef<number>(0);

  // 15-Bin FFT Harmonic Frequencies (Hz / Order)
  // 1X Running Speed (29.8 Hz), 2X Misalignment (59.6 Hz), 3X, ... 17X Vane Pass (506.6 Hz)
  const [fftBins, setFftBins] = useState<{ order: string; freqHz: number; amplitude: number; isHarmonic?: boolean }[]>([
    { order: '0.5X', freqHz: 14.9, amplitude: 0.42 },
    { order: '1X', freqHz: 29.8, amplitude: 2.35, isHarmonic: true },
    { order: '1.5X', freqHz: 44.7, amplitude: 0.28 },
    { order: '2X', freqHz: 59.6, amplitude: 4.12, isHarmonic: true }, // Misalignment peak
    { order: '2.5X', freqHz: 74.5, amplitude: 0.35 },
    { order: '3X', freqHz: 89.4, amplitude: 1.45, isHarmonic: true },
    { order: '4X', freqHz: 119.2, amplitude: 0.62 },
    { order: '5X', freqHz: 149.0, amplitude: 0.38 },
    { order: '6X', freqHz: 178.8, amplitude: 0.25 },
    { order: '7X', freqHz: 208.6, amplitude: 0.18 },
    { order: '8X', freqHz: 238.4, amplitude: 0.22 },
    { order: '9X', freqHz: 268.2, amplitude: 0.15 },
    { order: '10X', freqHz: 298.0, amplitude: 0.29 },
    { order: '12X', freqHz: 357.6, amplitude: 0.41 },
    { order: '17X', freqHz: 506.6, amplitude: 2.85, isHarmonic: true }, // Vane pass peak
  ]);

  // Overall RMS vibration calculated from FFT
  const currentRms = useMemo(() => {
    const sumSquares = fftBins.reduce((acc, b) => acc + Math.pow(b.amplitude, 2), 0);
    return parseFloat(Math.sqrt(sumSquares).toFixed(2));
  }, [fftBins]);

  // ISO 10816-3 Severity Evaluation
  // Zone A: <= 2.3 mm/s (Good)
  // Zone B: 2.3 - 4.5 mm/s (Acceptable)
  // Zone C: 4.5 - 7.1 mm/s (Unsatisfactory)
  // Zone D: > 7.1 mm/s (Unacceptable / Trip)
  const severityZone = useMemo(() => {
    if (currentRms <= 2.3) return { zone: 'Zone A', label: 'GOOD', color: 'text-emerald-400', badge: 'bg-emerald-950/80 border-emerald-700 text-emerald-300' };
    if (currentRms <= 4.5) return { zone: 'Zone B', label: 'ACCEPTABLE', color: 'text-cyan-400', badge: 'bg-cyan-950/80 border-cyan-700 text-cyan-300' };
    if (currentRms <= 7.1) return { zone: 'Zone C', label: 'UNSATISFACTORY (ALERT)', color: 'text-amber-400', badge: 'bg-amber-950/80 border-amber-700 text-amber-300' };
    return { zone: 'Zone D', label: 'UNACCEPTABLE (TRIP LIMIT)', color: 'text-rose-400', badge: 'bg-rose-950/80 border-rose-700 text-rose-300 animate-pulse' };
  }, [currentRms]);

  // 30Hz Canvas animation loop using requestAnimationFrame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();
    const targetFps = 30;
    const frameInterval = 1000 / targetFps;

    const render = (now: number) => {
      animFrameRef.current = requestAnimationFrame(render);
      const elapsed = now - lastTime;
      if (elapsed < frameInterval) return;
      lastTime = now - (elapsed % frameInterval);

      if (isPlaying) {
        timeOffsetRef.current += 0.08;
      }

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Background grid
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      // Horizontal grid lines
      for (let y = 30; y < height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Center baseline (0 line)
      const midY = height / 2;
      ctx.strokeStyle = '#3f3f46';
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();

      // Render Time-Domain Waveform:
      // y(t) = A1*sin(w1*t) + A2*sin(w2*t) + noise
      ctx.strokeStyle = '#06b6d4'; // Cyan signal
      ctx.lineWidth = 2;
      ctx.beginPath();

      const t = timeOffsetRef.current;
      for (let x = 0; x < width; x++) {
        const rad = (x * 0.04) + t;
        // Composite 1X fundamental + 2X misalignment harmonic + 17X vane pass ripple
        const val =
          Math.sin(rad) * 24 +
          Math.sin(rad * 2.0) * 16 +
          Math.sin(rad * 5.7) * 5 +
          (Math.sin(x * 0.7) * 2);

        const y = midY - val;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // ISO 10816 Zone Threshold Dashes
      // Zone C Alert (+4.5 mm/s) & Zone D Trip (+7.1 mm/s)
      const alertY = midY - 45;
      const tripY = midY - 68;

      ctx.strokeStyle = '#f59e0b'; // Amber alert
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, alertY);
      ctx.lineTo(width, alertY);
      ctx.stroke();

      ctx.strokeStyle = '#f43f5e'; // Rose trip
      ctx.beginPath();
      ctx.moveTo(0, tripY);
      ctx.lineTo(width, tripY);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying]);

  // Subtle live drift for FFT harmonic bins when playing
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setFftBins((prev) =>
        prev.map((b) => {
          const jitter = (Math.random() - 0.49) * 0.08;
          return {
            ...b,
            amplitude: Math.max(0.1, parseFloat((b.amplitude + jitter).toFixed(2))),
          };
        })
      );
    }, 500);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleLocateTag = () => {
    selectTag(tag);
    broadcastSyncEvent({
      type: 'TAG_SELECTED',
      tag,
      metadata: { source: 'TelemetryChart', currentRms, zone: severityZone.zone },
    });
  };

  return (
    <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl font-mono text-xs text-zinc-200 select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-zinc-800/80 gap-2">
        <div className="flex items-center gap-2">
          {tag && (
            <button
              onClick={handleLocateTag}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900/90 border border-cyan-700/80 text-cyan-300 font-bold transition-all cursor-pointer group"
              title="Locate tag on P&ID"
            >
              <Crosshair className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-45 transition-transform" />
              <span>{tag}</span>
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-zinc-100 tracking-wider">{title}</h4>
              <span className="px-2 py-0.5 rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800 text-[9px] font-bold">
                {isoClass}
              </span>
            </div>
            <div className="text-[10px] text-zinc-400">{subtitle}</div>
          </div>
        </div>

        {/* Real-Time Severity Pill & Controls */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold border ${severityZone.badge}`}>
            <Activity className="w-3.5 h-3.5" />
            <span>{currentRms} {unit} • {severityZone.zone} ({severityZone.label})</span>
          </div>

          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-zinc-800 bg-zinc-900 p-0.5">
            <button
              onClick={() => setViewMode('dual')}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                viewMode === 'dual' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-zinc-400'
              }`}
            >
              Dual
            </button>
            <button
              onClick={() => setViewMode('time')}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                viewMode === 'time' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-zinc-400'
              }`}
            >
              Waveform
            </button>
            <button
              onClick={() => setViewMode('fft')}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                viewMode === 'fft' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-zinc-400'
              }`}
            >
              FFT
            </button>
          </div>

          {/* Pause/Play Stream */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors cursor-pointer"
            title={isPlaying ? 'Pause 30Hz telemetry stream' : 'Resume 30Hz stream'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Main Visualizer Area: Time-Domain Canvas & FFT Spectrum */}
      <div className={`grid gap-3 mb-3 ${viewMode === 'dual' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* VIEW 1: 30Hz requestAnimationFrame Time-Domain Waveform */}
        {(viewMode === 'dual' || viewMode === 'time') && (
          <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 relative">
            <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1.5">
              <span className="font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                30Hz DYNAMIC OSCILLOSCOPE (VELOCITY WAVEFORM)
              </span>
              <div className="flex items-center gap-2 text-[9px]">
                <span className="text-amber-400">--- Alert (4.5)</span>
                <span className="text-rose-400">--- Trip (7.1)</span>
              </div>
            </div>

            <canvas
              ref={canvasRef}
              width={460}
              height={170}
              className="w-full h-40 rounded-lg bg-zinc-950 border border-zinc-850"
            />

            <div className="flex items-center justify-between text-[9px] text-zinc-500 mt-1">
              <span>Time Sweep: 0 to 120 ms</span>
              <span>Sampling: 30 fps (WebCanvas RAF)</span>
              <span>Centerline: 0.0 mm/s</span>
            </div>
          </div>
        )}

        {/* VIEW 2: 15-Bin FFT Harmonic Spectrum */}
        {(viewMode === 'dual' || viewMode === 'fft') && (
          <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
            <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1.5">
              <span className="font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <BarChart2 className="w-3 h-3 text-cyan-400" />
                15-BIN FFT HARMONIC SPECTRUM (0 - 550 Hz)
              </span>
              <span className="text-[9px] text-zinc-400">Resolution: 0.5X Orders</span>
            </div>

            {/* 15 Bar Columns */}
            <div className="h-40 w-full bg-zinc-950 rounded-lg border border-zinc-850 p-2 flex items-end justify-between gap-1">
              {fftBins.map((bin) => {
                const heightPct = Math.min(100, (bin.amplitude / 6.0) * 100);
                const is2X = bin.order === '2X';
                const is17X = bin.order === '17X';

                const barColor = is2X
                  ? 'bg-rose-500'
                  : is17X
                  ? 'bg-amber-400'
                  : bin.isHarmonic
                  ? 'bg-cyan-400'
                  : 'bg-zinc-700';

                return (
                  <div key={bin.order} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <span className="text-[7px] text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      {bin.amplitude}
                    </span>
                    <div
                      className={`w-full rounded-t transition-all duration-300 ${barColor}`}
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className={`text-[8px] mt-1 ${bin.isHarmonic ? 'text-zinc-200 font-bold' : 'text-zinc-500'}`}>
                      {bin.order}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[9px] text-zinc-500 mt-1">
              <span>Fundamental: 1X (29.8 Hz)</span>
              <span className="text-rose-400 font-bold">2X Misalignment Spike: 4.12 mm/s</span>
              <span>17X Vane Pass (506 Hz)</span>
            </div>
          </div>
        )}
      </div>

      {/* ISO 10816 Severity Zone Legend Strip */}
      <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-emerald-400 font-bold uppercase">ZONE A (GOOD)</div>
          <div className="text-zinc-300 mt-0.5">&le; 2.3 mm/s</div>
        </div>

        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-cyan-400 font-bold uppercase">ZONE B (ACCEPTABLE)</div>
          <div className="text-zinc-300 mt-0.5">2.3 - 4.5 mm/s</div>
        </div>

        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-amber-400 font-bold uppercase">ZONE C (UNSATISFACTORY)</div>
          <div className="text-zinc-300 mt-0.5">4.5 - 7.1 mm/s</div>
        </div>

        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="text-[9px] text-rose-400 font-bold uppercase">ZONE D (TRIP / DANGER)</div>
          <div className="text-zinc-300 mt-0.5">&gt; 7.1 mm/s</div>
        </div>
      </div>
    </div>
  );
}
