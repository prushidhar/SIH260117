'use client';

import React, { useState } from 'react';
import { Layers, Crosshair, ExternalLink, ShieldCheck, CheckCircle2, AlertTriangle, Activity } from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';

interface PIDComponent {
  tag: string;
  name: string;
  type: 'pump' | 'valve' | 'psv' | 'transmitter';
  status: 'normal' | 'warning' | 'critical';
  reading: string;
  standard: string;
  details: string;
}

const PID_ITEMS: Record<string, PIDComponent> = {
  'P-101': {
    tag: 'P-101',
    name: 'Slurry Feed Charge Pump',
    type: 'pump',
    status: 'normal',
    reading: '78.4 psig | 450 GPM',
    standard: 'API 610 12th Ed.',
    details: 'BB2 Heavy duty centrifugal pump. NPSH margin: +1.3m (Compliant).',
  },
  'PT-101': {
    tag: 'PT-101',
    name: 'Discharge Pressure Transmitter',
    type: 'transmitter',
    status: 'normal',
    reading: '3.20 MPa (464.1 psig)',
    standard: 'ISA-5.1 Section 4',
    details: 'Smart differential HART transmitter. Calibration: Valid (Verified).',
  },
  'FCV-204': {
    tag: 'FCV-204',
    name: 'Feed Rate Flow Control Valve',
    type: 'valve',
    status: 'normal',
    reading: '68% Travel (Cv: 42.5)',
    standard: 'ANSI/ISA-75.01.01',
    details: 'Equal-percentage trim globe valve with double-acting pneumatic actuator.',
  },
  'PSV-301': {
    tag: 'PSV-301',
    name: 'High-Pressure Safety Relief Valve',
    type: 'psv',
    status: 'normal',
    reading: 'Set: 4.80 MPa (696.2 psig)',
    standard: 'API 520 / ASME VIII',
    details: 'Dual-bellows balanced relief valve discharging to closed flare header.',
  },
  'TT-105': {
    tag: 'TT-105',
    name: 'Suction Temperature Transmitter',
    type: 'transmitter',
    status: 'normal',
    reading: '180.0 °C (356.0 °F)',
    standard: 'ISA-5.1 Standard',
    details: 'Dual-element RTD Pt100 in thermowell. Margin to vaporization: +42°C.',
  },
};

export default function InteractivePIDWidget({
  title = 'Crude Distillation Unit CDU-104 High-Pressure Feed P&ID',
  tag = 'CDU-104',
}: {
  title?: string;
  tag?: string;
}) {
  const [selectedTag, setSelectedTag] = useState<string>('P-101');
  const { selectTag, addToast } = useIndraStore();

  const activeComp = PID_ITEMS[selectedTag] || PID_ITEMS['P-101'];

  const handleTagClick = (tagId: string) => {
    setSelectedTag(tagId);
    selectTag(tagId);
    broadcastSyncEvent({
      type: 'TAG_SELECTED',
      tag: tagId,
      metadata: { source: 'InteractivePIDWidget', item: PID_ITEMS[tagId] },
    });
  };

  const handleDetach = () => {
    window.open('/detach/pid', 'INDRA_PID_WINDOW', 'width=1280,height=850');
    addToast({
      type: 'info',
      title: 'P&ID Detached',
      message: 'P&ID Schematic detached to secondary monitor.',
    });
  };

  return (
    <div className="w-full my-3 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-sm transition-all text-xs font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-slate-800 dark:text-zinc-100 text-sm flex items-center gap-1.5">
              <span>{title}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 font-mono">
                ISA-5.1 Verified
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
              Asset: {tag} &bull; Deterministic Plant Topology
            </div>
          </div>
        </div>

        <button
          onClick={handleDetach}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-[11px] font-medium transition-colors cursor-pointer"
          title="Open full interactive schematic in secondary monitor window"
        >
          <ExternalLink className="w-3 h-3 text-slate-500" />
          <span>Detach Monitor 2</span>
        </button>
      </div>

      {/* Interactive SVG Schematic Diagram */}
      <div className="my-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 overflow-x-auto">
        <svg viewBox="0 0 760 160" className="w-full h-36 min-w-[500px]">
          <defs>
            <linearGradient id="pipeGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <style>{`
              @keyframes flowAnimation {
                from { stroke-dashoffset: 24; }
                to { stroke-dashoffset: 0; }
              }
              .flow-line {
                stroke-dasharray: 6 6;
                animation: flowAnimation 1.2s linear infinite;
              }
            `}</style>
          </defs>

          {/* Main Process Line */}
          <line x1="20" y1="80" x2="740" y2="80" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
          <line x1="20" y1="80" x2="740" y2="80" stroke="url(#pipeGlow)" strokeWidth="3" className="flow-line" />

          {/* Flow Direction Arrows */}
          <polygon points="120,76 130,80 120,84" fill="#38bdf8" />
          <polygon points="340,76 350,80 340,84" fill="#38bdf8" />
          <polygon points="560,76 570,80 560,84" fill="#38bdf8" />

          {/* Component: P-101 (Pump) */}
          <g
            onClick={() => handleTagClick('P-101')}
            className="cursor-pointer transition-transform hover:scale-105"
            transform="translate(180, 80)"
          >
            <circle
              r="26"
              fill="#090d16"
              stroke={selectedTag === 'P-101' ? '#38bdf8' : '#334155'}
              strokeWidth={selectedTag === 'P-101' ? '2.5' : '1.5'}
            />
            <path d="M-12,-16 L16,0 L-12,16 Z" fill="#38bdf8" opacity="0.85" />
            <rect x="-24" y="-38" width="48" height="14" rx="3" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
            <text x="0" y="-28" textAnchor="middle" fill="#f8fafc" fontSize="9" fontWeight="bold" fontFamily="monospace">
              P-101
            </text>
          </g>

          {/* Component: PT-101 (Pressure Transmitter) */}
          <g
            onClick={() => handleTagClick('PT-101')}
            className="cursor-pointer transition-transform hover:scale-105"
            transform="translate(290, 80)"
          >
            <line x1="0" y1="0" x2="0" y2="-45" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 3" />
            <circle
              cy="-52"
              r="16"
              fill="#090d16"
              stroke={selectedTag === 'PT-101' ? '#38bdf8' : '#475569'}
              strokeWidth={selectedTag === 'PT-101' ? '2.5' : '1.5'}
            />
            <text x="0" y="-49" textAnchor="middle" fill="#38bdf8" fontSize="8" fontWeight="bold" fontFamily="monospace">
              PT-101
            </text>
          </g>

          {/* Component: FCV-204 (Control Valve) */}
          <g
            onClick={() => handleTagClick('FCV-204')}
            className="cursor-pointer transition-transform hover:scale-105"
            transform="translate(420, 80)"
          >
            <path d="M-18,-12 L0,0 L-18,12 Z M18,-12 L0,0 L18,12 Z" fill="#0f172a" stroke={selectedTag === 'FCV-204' ? '#10b981' : '#475569'} strokeWidth="1.5" />
            <line x1="0" y1="0" x2="0" y2="-22" stroke="#475569" strokeWidth="1.5" />
            <circle cx="0" cy="-28" r="7" fill="#090d16" stroke="#10b981" strokeWidth="1.5" />
            <rect x="-26" y="16" width="52" height="14" rx="3" fill="#0f172a" stroke="#10b981" strokeWidth="1" />
            <text x="0" y="26" textAnchor="middle" fill="#10b981" fontSize="8" fontWeight="bold" fontFamily="monospace">
              FCV-204
            </text>
          </g>

          {/* Component: PSV-301 (Safety Relief Valve) */}
          <g
            onClick={() => handleTagClick('PSV-301')}
            className="cursor-pointer transition-transform hover:scale-105"
            transform="translate(540, 80)"
          >
            <line x1="0" y1="0" x2="0" y2="-45" stroke="#f43f5e" strokeWidth="1.5" />
            <path d="M-12,-45 L12,-45 L0,-32 Z" fill="#0f172a" stroke={selectedTag === 'PSV-301' ? '#f43f5e' : '#64748b'} strokeWidth="1.5" />
            <line x1="0" y1="-45" x2="25" y2="-45" stroke="#f43f5e" strokeWidth="1.5" />
            <rect x="-24" y="-66" width="48" height="14" rx="3" fill="#0f172a" stroke="#f43f5e" strokeWidth="1" />
            <text x="0" y="-56" textAnchor="middle" fill="#f43f5e" fontSize="8" fontWeight="bold" fontFamily="monospace">
              PSV-301
            </text>
          </g>

          {/* Component: TT-105 (Temperature Transmitter) */}
          <g
            onClick={() => handleTagClick('TT-105')}
            className="cursor-pointer transition-transform hover:scale-105"
            transform="translate(650, 80)"
          >
            <line x1="0" y1="0" x2="0" y2="40" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" />
            <circle
              cy="48"
              r="16"
              fill="#090d16"
              stroke={selectedTag === 'TT-105' ? '#f59e0b' : '#64748b'}
              strokeWidth={selectedTag === 'TT-105' ? '2.5' : '1.5'}
            />
            <text x="0" y="52" textAnchor="middle" fill="#f59e0b" fontSize="8" fontWeight="bold" fontFamily="monospace">
              TT-105
            </text>
          </g>
        </svg>
      </div>

      {/* Selected Tag Inspector Card */}
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-zinc-100 font-mono text-sm">
              {activeComp.tag}
            </span>
            <span className="text-slate-600 dark:text-zinc-300 font-medium">
              {activeComp.name}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-semibold">
              {activeComp.standard}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-zinc-400">
            {activeComp.details}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-[10px] text-slate-400 font-mono">Live Telemetry</div>
            <div className="font-bold text-slate-800 dark:text-zinc-200 font-mono text-xs">
              {activeComp.reading}
            </div>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-semibold text-[10px]">
            <CheckCircle2 className="w-3 h-3" />
            <span>ISA Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
}
