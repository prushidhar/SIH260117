/**
 * Detached P&ID Engineering Schematic Window (Designed for Monitor 2)
 * 
 * Standalone, full-screen interactive vector canvas with real-time bidirectional
 * state synchronization with the Main Workbench window.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Scan, 
  Monitor, 
  Layers, 
  Activity, 
  ShieldCheck, 
  ArrowLeft,
  XCircle,
  ExternalLink,
  Cpu
} from 'lucide-react';
import InteractivePIDCanvas from '@/components/canvas/InteractivePIDCanvas';
import { multiWindowSync, type CrossWindowEvent } from '@/lib/sync/multi-window-sync';
import useIndraStore, { API_BASE, type EquipmentData } from '@/store/indra-store';

export default function DetachedPIDPage() {
  const { theme, detectedTags } = useIndraStore();
  const [selectedTag, setSelectedTag] = useState<EquipmentData | null>(null);
  const [activeTagString, setActiveTagString] = useState<string | null>('P-101');
  const [tagsList, setTagsList] = useState<string[]>(
    detectedTags.length > 0 ? detectedTags : ['P-101', 'E-101', 'FV-101', 'TI-101', 'HX-4201', 'RV-204']
  );

  // Listen for equipment selections made in Window 1 (Main Workbench)
  useEffect(() => {
    const unsubscribe = multiWindowSync.subscribe((event: CrossWindowEvent) => {
      if (event.type === 'TAG_SELECTED') {
        setActiveTagString(event.tag);
        fetchEquipmentData(event.tag);
      } else if (event.type === 'TAGS_DETECTED' && event.tags) {
        setTagsList((prev) => Array.from(new Set([...prev, ...event.tags])));
      }
    });

    return unsubscribe;
  }, []);

  const fetchEquipmentData = async (tag: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/equipment/${encodeURIComponent(tag)}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTag(data);
      } else {
        setSelectedTag({
          tag,
          name: `Equipment ${tag}`,
          type: 'Unit Node',
          status: 'IDENTIFIED',
        });
      }
    } catch {
      setSelectedTag({
        tag,
        name: `Equipment ${tag}`,
        type: 'Unit Node',
        status: 'IDENTIFIED',
      });
    }
  };

  const handleSelectOnCanvas = (tag: string) => {
    setActiveTagString(tag);
    fetchEquipmentData(tag);

    // Broadcast selection back to Window 1 (Main Workbench)
    multiWindowSync.broadcast({
      type: 'TAG_SELECTED',
      tag,
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#09090b] text-zinc-100 select-none overflow-hidden font-sans">
      {/* Popout Engineering Header Bar */}
      <header className="h-12 bg-zinc-950/90 border-b border-zinc-800 flex items-center justify-between px-4 z-20 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-950/60 border border-violet-800/50 flex items-center justify-center">
              <Monitor className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs tracking-wider text-zinc-100">
                  MONITOR 2: P&ID SCHEMATIC WORKBENCH
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950/50 text-emerald-400 border border-emerald-800/60 text-[9px] font-mono font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  IPC SYNC ACTIVE
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Equipment Pill */}
        {activeTagString && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono">
            <span className="text-zinc-500 text-[10px]">FOCUSED UNIT:</span>
            <strong className="text-emerald-400 font-bold">{activeTagString}</strong>
            {selectedTag?.name && (
              <span className="text-zinc-400 text-[11px] truncate max-w-[200px]">
                ({selectedTag.name})
              </span>
            )}
          </div>
        )}

        {/* Right Status */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-zinc-500 text-[10px]">REFINERY UNIT:</span>
          <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] font-bold">
            CRUDE PRE-HEAT (ASME B31.3)
          </span>
        </div>
      </header>

      {/* Main Workspace Area */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Full-Screen Interactive Canvas */}
        <main className="flex-1 h-full relative">
          <InteractivePIDCanvas
            activeTag={activeTagString}
            detectedTags={tagsList}
            onSelectTag={handleSelectOnCanvas}
            theme="dark"
            isExpanded={true}
            className="rounded-none"
          />
        </main>

        {/* Floating Equipment Telemetry Drawer (Top-Left overlay) */}
        {selectedTag && (
          <aside className="absolute top-4 left-4 w-72 bg-zinc-950/92 backdrop-blur-xl border border-zinc-800 rounded-2xl p-4 shadow-xl z-20 space-y-2.5 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
              <div className="flex items-center gap-1.5">
                <Scan className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-bold text-emerald-400">{selectedTag.tag}</span>
              </div>
              <span className="text-[8px] px-2 py-0.5 rounded-full bg-emerald-950/50 text-emerald-300 border border-emerald-800/60 font-bold">
                {selectedTag.status || 'ACTIVE'}
              </span>
            </div>

            <div className="text-[11px] font-sans font-bold text-zinc-200">
              {selectedTag.name}
            </div>

            <div className="space-y-1.5 text-[10px] pt-1 text-zinc-400 border-t border-zinc-900">
              {selectedTag.design_pressure && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Design Pressure:</span>
                  <span className="text-zinc-200 font-medium">{selectedTag.design_pressure}</span>
                </div>
              )}
              {selectedTag.design_temperature && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Design Temp:</span>
                  <span className="text-zinc-200 font-medium">{selectedTag.design_temperature}</span>
                </div>
              )}
              {(selectedTag.rating || selectedTag.asme_rating) && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">ASME Rating:</span>
                  <span className="text-emerald-400 font-bold">{selectedTag.rating || selectedTag.asme_rating}</span>
                </div>
              )}
              {selectedTag.material && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Material Spec:</span>
                  <span className="text-zinc-300 font-medium truncate">{selectedTag.material}</span>
                </div>
              )}
            </div>

            {/* Quick Equipment Switcher */}
            <div className="pt-2 border-t border-zinc-800">
              <div className="text-[9px] text-zinc-500 mb-1 font-bold">MONITORED TAGS:</div>
              <div className="flex flex-wrap gap-1">
                {tagsList.slice(0, 6).map((t) => (
                  <button
                    key={t}
                    onClick={() => handleSelectOnCanvas(t)}
                    className={`px-1.5 py-0.5 rounded text-[9px] transition-all cursor-pointer ${
                      activeTagString === t
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
