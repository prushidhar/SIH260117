'use client';

import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Crosshair, X, ZoomIn, ZoomOut, RotateCcw, Layers } from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import useSpatialStore from '@/store/spatial-store';
import InteractivePIDCanvas from '@/components/canvas/InteractivePIDCanvas';

export default function PIDSchematicNode({ id, data }: { id: string; data: any }) {
  const { selectTag } = useIndraStore();
  const { removeNode } = useSpatialStore();
  const [activeTag, setActiveTag] = useState<string>(data?.tag || 'P-101');

  const tags = ['HX-4201', 'P-101', 'FV-3102', 'PI-3104', 'TI-4201'];

  const handleTagClick = (tag: string) => {
    setActiveTag(tag);
    selectTag(tag);
  };

  return (
    <div className="w-[480px] rounded-2xl bg-white dark:bg-zinc-900 border-2 border-emerald-500/60 shadow-2xl shadow-emerald-500/10 text-slate-800 dark:text-zinc-200 overflow-hidden font-sans">
      <Handle type="target" position={Position.Left} className="w-3.5 h-3.5 bg-emerald-600 border-2 border-white dark:border-zinc-900 -ml-1.5" />
      <Handle type="source" position={Position.Right} className="w-3.5 h-3.5 bg-emerald-600 border-2 border-white dark:border-zinc-900 -mr-1.5" />
      <Handle type="source" position={Position.Bottom} className="w-3.5 h-3.5 bg-emerald-600 border-2 border-white dark:border-zinc-900 -mb-1.5" />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/60 dark:to-teal-950/60 border-b border-emerald-100 dark:border-emerald-900/50">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-zinc-100">
              {data?.title || 'P&ID Engineering Schematic'}
            </div>
            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
              {data?.subtitle || 'Crude Unit Pre-Heat Loop'}
            </div>
          </div>
        </div>

        <button
          onClick={() => removeNode(id)}
          className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Embedded P&ID Vector Canvas Viewport */}
      <div className="h-[280px] bg-slate-950 relative overflow-hidden">
        <InteractivePIDCanvas
          activeTag={activeTag}
          detectedTags={tags}
          onSelectTag={handleTagClick}
        />
      </div>

      {/* Tag Quick Selector Bar */}
      <div className="p-2.5 bg-slate-50 dark:bg-zinc-950 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
          <span className="text-[10px] font-mono text-slate-400 uppercase mr-1">Tags:</span>
          {tags.map((t) => (
            <button
              key={t}
              onClick={() => handleTagClick(t)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                activeTag === t
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 border border-slate-200 dark:border-zinc-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
          Active: {activeTag}
        </span>
      </div>
    </div>
  );
}
