'use client';

import React from 'react';
import { Sparkles, ArrowRight, BookOpen, Layers } from 'lucide-react';
import {
  calculateTypeAheadScores,
  type StandardDocument,
} from '@/lib/rag/standard-docs-catalog';

interface TypeAheadPreviewProps {
  query: string;
  onSelectDoc: (doc: StandardDocument) => void;
  onApplyQuery: (suggestedText: string) => void;
}

export default function TypeAheadPreview({
  query,
  onSelectDoc,
  onApplyQuery,
}: TypeAheadPreviewProps) {
  if (!query || query.trim().length < 2) return null;

  const top3 = calculateTypeAheadScores(query).slice(0, 3);
  if (top3.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-zinc-950/95 border border-zinc-800 shadow-xl backdrop-blur-md font-mono text-xs animate-in fade-in slide-in-from-top-1 duration-150 select-none">
      <div className="flex items-center justify-between px-1 text-[10px] text-zinc-400">
        <span className="flex items-center gap-1 font-bold text-zinc-300">
          <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
          TYPE-AHEAD TOP-3 COSINE SIMILARITY PREVIEW
        </span>
        <span>CLICK CHIP TO INSPECT</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {top3.map(({ doc, score }) => {
          // Heatmap badge styling
          const isHigh = score > 0.85;
          const isMid = score >= 0.65 && score <= 0.85;

          const badgeClass = isHigh
            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80 ring-1 ring-emerald-500/20'
            : isMid
            ? 'bg-amber-950/80 text-amber-300 border-amber-700/80 ring-1 ring-amber-500/20'
            : 'bg-zinc-900 text-zinc-400 border-zinc-700';

          const dotColor = isHigh ? '#10b981' : isMid ? '#f59e0b' : '#71717a';

          return (
            <button
              key={doc.id}
              onClick={() => onSelectDoc(doc)}
              className="group flex flex-col p-2 rounded-lg bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all text-left cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-[11px] text-zinc-200 group-hover:text-emerald-400 transition-colors truncate max-w-[170px]">
                  {doc.standard}
                </span>

                {/* Cosine Score Chip */}
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold border flex items-center gap-1 ${badgeClass}`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: dotColor }}
                  />
                  {score.toFixed(3)} COS
                </span>
              </div>

              <div className="text-[10px] text-zinc-400 line-clamp-1">
                {doc.title}
              </div>

              <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-zinc-800/80 text-[9px] text-zinc-500">
                <span className="uppercase">{doc.category}</span>
                <span className="text-zinc-400 group-hover:text-emerald-400 flex items-center gap-0.5">
                  View Equations <ArrowRight className="w-2.5 h-2.5" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
