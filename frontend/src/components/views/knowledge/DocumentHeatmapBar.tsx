'use client';

import React from 'react';

interface DocumentHeatmapBarProps {
  score: number; // 0.0 to 1.0 (cosine similarity)
  showLabel?: boolean;
}

export default function DocumentHeatmapBar({
  score,
  showLabel = true,
}: DocumentHeatmapBarProps) {
  const clampedScore = Math.max(0, Math.min(1.0, score));
  const percent = Math.round(clampedScore * 100);

  // Exact prompt requirement:
  // Green > 0.85
  // Amber 0.65–0.85
  // Slate < 0.65
  const isGreen = clampedScore > 0.85;
  const isAmber = clampedScore >= 0.65 && clampedScore <= 0.85;

  const barColor = isGreen
    ? 'bg-emerald-500 shadow-xs shadow-emerald-500/30'
    : isAmber
    ? 'bg-amber-500 shadow-xs shadow-amber-500/30'
    : 'bg-slate-500';

  const textColor = isGreen
    ? 'text-emerald-400 font-bold'
    : isAmber
    ? 'text-amber-400 font-bold'
    : 'text-slate-400';

  const zoneBadge = isGreen
    ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300'
    : isAmber
    ? 'bg-amber-950/60 border-amber-800/60 text-amber-300'
    : 'bg-zinc-800/80 border-zinc-700 text-zinc-400';

  const zoneLabel = isGreen ? 'HIGH' : isAmber ? 'MODERATE' : 'BASELINE';

  return (
    <div className="flex items-center gap-2 font-mono text-[10px] select-none min-w-[140px]">
      {/* Mini Color Bar Progress Indicator */}
      <div className="flex-1 bg-zinc-800 h-2 rounded-full overflow-hidden p-0.5 border border-zinc-700/60">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {showLabel && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`px-1.5 py-0.2 rounded border text-[9px] font-bold ${zoneBadge}`}>
            {zoneLabel}
          </span>
          <span className={textColor}>
            {clampedScore.toFixed(3)}
          </span>
        </div>
      )}
    </div>
  );
}
