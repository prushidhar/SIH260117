/**
 * Detached Spatial Canvas Window (Designed for Multi-Monitor Workstations)
 * 
 * Standalone, full-screen infinite 2D spatial workspace allowing operators
 * to spread engineering nodes across multi-monitor or ultra-wide setups.
 */

'use client';

import React from 'react';
import { Monitor, Network, ExternalLink } from 'lucide-react';
import SpatialCanvasView from '@/components/spatial-canvas/SpatialCanvasView';

export default function DetachedCanvasPage() {
  return (
    <div className="flex flex-col h-screen w-screen bg-[#09090b] text-zinc-100 select-none overflow-hidden font-sans">
      {/* Detached Popout Header Bar */}
      <header className="h-12 bg-zinc-950/95 border-b border-zinc-800 flex items-center justify-between px-4 z-20 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-950/60 border border-violet-800/50 flex items-center justify-center">
              <Network className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs tracking-wider text-zinc-100">
                  MONITOR: INFINITE SPATIAL CANVAS WORKSPACE
                </span>
                <span className="px-2 py-0.5 rounded-full bg-violet-950/50 text-violet-400 border border-violet-800/60 text-[9px] font-mono font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                  SPATIAL REASONING ACTIVE
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <span>NON-LINEAR ENGINEERING GRAPH</span>
        </div>
      </header>

      {/* Main Full-Screen Canvas */}
      <main className="flex-1 w-full h-full min-h-0 relative">
        <SpatialCanvasView />
      </main>
    </div>
  );
}
