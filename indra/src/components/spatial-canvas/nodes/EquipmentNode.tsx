'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Gauge,
  Sliders,
  Settings2,
} from 'lucide-react';
import useSpatialStore from '@/store/spatial-store';
import useIndraStore from '@/store/indra-store';
import type { EquipmentAsset } from '@/lib/canvas/equipment-catalog';

export interface EquipmentNodeData {
  tag: string;
  name: string;
  category: string;
  standard: string;
  subType: string;
  symbol: string;
  color: string;
  specs?: { label: string; value: string }[];
  status?: 'RUNNING' | 'STANDBY' | 'ALARM' | 'MAINTENANCE';
  operatingTelemetry?: {
    flow?: string;
    pressure?: string;
    temperature?: string;
    vibration?: string;
  };
}

/**
 * High-fidelity ISA-5.1 SVG Equipment Stencils
 */
function EquipmentSymbol({ symbol, color }: { symbol: string; color: string }) {
  switch (symbol) {
    case 'pump-centrifugal':
    case 'pump-multistage':
      return (
        <svg viewBox="0 0 80 80" className="w-16 h-16" fill="none">
          <circle cx="40" cy="40" r="26" stroke={color} strokeWidth="3" fill="#18181b" />
          {/* Tangential discharge nozzle */}
          <path d="M 40 14 L 66 14 L 66 40" stroke={color} strokeWidth="2.5" />
          {/* Suction eye */}
          <circle cx="40" cy="40" r="10" stroke={color} strokeWidth="2" strokeDasharray="3 3" />
          <polygon points="40,28 48,46 32,46" fill={color} opacity={0.8} />
          {/* Base plate */}
          <line x1="20" y1="70" x2="60" y2="70" stroke="#71717a" strokeWidth="3" />
          <line x1="26" y1="66" x2="26" y2="70" stroke="#71717a" strokeWidth="2" />
          <line x1="54" y1="66" x2="54" y2="70" stroke="#71717a" strokeWidth="2" />
        </svg>
      );

    case 'hx-shell-tube':
    case 'hx-hairpin':
    case 'hx-kettle':
      return (
        <svg viewBox="0 0 100 60" className="w-20 h-14" fill="none">
          {/* Cylindrical Shell */}
          <rect x="20" y="12" width="60" height="36" rx="6" stroke={color} strokeWidth="2.5" fill="#18181b" />
          {/* Tube bundle lines */}
          <line x1="24" y1="22" x2="76" y2="22" stroke={color} strokeWidth="1.5" strokeDasharray="4 2" />
          <line x1="24" y1="30" x2="76" y2="30" stroke={color} strokeWidth="1.5" strokeDasharray="4 2" />
          <line x1="24" y1="38" x2="76" y2="38" stroke={color} strokeWidth="1.5" strokeDasharray="4 2" />
          {/* Channel heads */}
          <path d="M 20 12 C 12 12, 12 48, 20 48" stroke={color} strokeWidth="2" fill="#27272a" />
          <path d="M 80 12 C 88 12, 88 48, 80 48" stroke={color} strokeWidth="2" fill="#27272a" />
          {/* Baffle markers */}
          <line x1="36" y1="12" x2="36" y2="38" stroke="#71717a" strokeWidth="1.5" />
          <line x1="50" y1="22" x2="50" y2="48" stroke="#71717a" strokeWidth="1.5" />
          <line x1="64" y1="12" x2="64" y2="38" stroke="#71717a" strokeWidth="1.5" />
        </svg>
      );

    case 'hx-plate':
      return (
        <svg viewBox="0 0 80 60" className="w-16 h-14" fill="none">
          <rect x="18" y="8" width="44" height="44" stroke={color} strokeWidth="2.5" fill="#18181b" />
          {/* Corrugated plate layers */}
          <line x1="26" y1="12" x2="26" y2="48" stroke={color} strokeWidth="2" />
          <line x1="34" y1="12" x2="34" y2="48" stroke={color} strokeWidth="2" />
          <line x1="42" y1="12" x2="42" y2="48" stroke={color} strokeWidth="2" />
          <line x1="50" y1="12" x2="50" y2="48" stroke={color} strokeWidth="2" />
          {/* Compression tie rods */}
          <line x1="12" y1="14" x2="68" y2="14" stroke="#71717a" strokeWidth="1.5" />
          <line x1="12" y1="46" x2="68" y2="46" stroke="#71717a" strokeWidth="1.5" />
        </svg>
      );

    case 'column-trayed':
    case 'column-packed':
    case 'column-stripper':
      return (
        <svg viewBox="0 0 60 110" className="w-14 h-24" fill="none">
          {/* Tall Vertical Cylinder */}
          <rect x="14" y="16" width="32" height="78" rx="8" stroke={color} strokeWidth="2.5" fill="#18181b" />
          {/* Top & Bottom Hemispherical heads */}
          <path d="M 14 22 C 14 10, 46 10, 46 22" stroke={color} strokeWidth="2.5" />
          <path d="M 14 88 C 14 100, 46 100, 46 88" stroke={color} strokeWidth="2.5" />
          {/* Trays */}
          <line x1="17" y1="34" x2="43" y2="34" stroke={color} strokeWidth="1.5" strokeDasharray="3 2" />
          <line x1="17" y1="46" x2="43" y2="46" stroke={color} strokeWidth="1.5" strokeDasharray="3 2" />
          <line x1="17" y1="58" x2="43" y2="58" stroke={color} strokeWidth="1.5" strokeDasharray="3 2" />
          <line x1="17" y1="70" x2="43" y2="70" stroke={color} strokeWidth="1.5" strokeDasharray="3 2" />
          {/* Skirt support */}
          <line x1="14" y1="94" x2="10" y2="108" stroke="#71717a" strokeWidth="2" />
          <line x1="46" y1="94" x2="50" y2="108" stroke="#71717a" strokeWidth="2" />
        </svg>
      );

    case 'vessel-vertical':
    case 'vessel-coalescer':
      return (
        <svg viewBox="0 0 60 80" className="w-14 h-18" fill="none">
          <rect x="14" y="12" width="32" height="52" rx="8" stroke={color} strokeWidth="2.5" fill="#18181b" />
          {/* Demister Pad */}
          <rect x="16" y="24" width="28" height="6" fill="#3f3f46" stroke="#71717a" strokeWidth="1" strokeDasharray="2 2" />
          {/* Liquid level */}
          <path d="M 16 48 Q 23 46, 30 48 T 44 48" stroke="#06b6d4" strokeWidth="1.5" />
          {/* Leg supports */}
          <line x1="14" y1="62" x2="10" y2="76" stroke="#71717a" strokeWidth="2" />
          <line x1="46" y1="62" x2="50" y2="76" stroke="#71717a" strokeWidth="2" />
        </svg>
      );

    case 'vessel-horizontal':
    case 'tank-bullet':
      return (
        <svg viewBox="0 0 90 50" className="w-20 h-12" fill="none">
          <rect x="12" y="10" width="66" height="28" rx="8" stroke={color} strokeWidth="2.5" fill="#18181b" />
          {/* Liquid level */}
          <line x1="14" y1="26" x2="76" y2="26" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="4 2" />
          {/* Saddles */}
          <rect x="22" y="38" width="10" height="8" fill="#71717a" />
          <rect x="58" y="38" width="10" height="8" fill="#71717a" />
        </svg>
      );

    case 'valve-gate':
    case 'valve-globe':
    case 'valve-ball':
    case 'valve-butterfly':
      return (
        <svg viewBox="0 0 70 50" className="w-16 h-12" fill="none">
          {/* Opposing Triangles */}
          <polygon points="12,14 35,28 12,42" fill="#27272a" stroke={color} strokeWidth="2" />
          <polygon points="58,14 35,28 58,42" fill="#27272a" stroke={color} strokeWidth="2" />
          {/* Valve Stem & Handwheel */}
          <line x1="35" y1="28" x2="35" y2="10" stroke={color} strokeWidth="2" />
          <line x1="24" y1="10" x2="46" y2="10" stroke={color} strokeWidth="3" />
        </svg>
      );

    case 'valve-control':
      return (
        <svg viewBox="0 0 70 65" className="w-16 h-15" fill="none">
          {/* Valve Body */}
          <polygon points="14,34 35,46 14,58" fill="#27272a" stroke={color} strokeWidth="2" />
          <polygon points="56,34 35,46 56,58" fill="#27272a" stroke={color} strokeWidth="2" />
          {/* Stem */}
          <line x1="35" y1="46" x2="35" y2="24" stroke={color} strokeWidth="2" />
          {/* Pneumatic Diaphragm Dome */}
          <path d="M 20 24 C 20 12, 50 12, 50 24 Z" fill="#27272a" stroke={color} strokeWidth="2" />
          <line x1="20" y1="24" x2="50" y2="24" stroke={color} strokeWidth="2" />
        </svg>
      );

    case 'valve-psv':
    case 'valve-porv':
      return (
        <svg viewBox="0 0 60 70" className="w-14 h-16" fill="none">
          {/* Angle Valve Body */}
          <polygon points="30,42 30,62 14,62" fill="#27272a" stroke={color} strokeWidth="2" />
          <polygon points="30,42 50,42 50,26" fill="#27272a" stroke={color} strokeWidth="2" />
          {/* Spring Bonnet */}
          <rect x="22" y="10" width="16" height="26" fill="#18181b" stroke={color} strokeWidth="2" />
          <path d="M 25 14 L 35 18 L 25 22 L 35 26 L 25 30" stroke={color} strokeWidth="1.5" />
        </svg>
      );

    case 'comp-centrifugal':
    case 'comp-axial':
      return (
        <svg viewBox="0 0 80 60" className="w-18 h-14" fill="none">
          {/* Trapezoidal casing narrowing along flow */}
          <polygon points="16,10 64,18 64,42 16,50" fill="#18181b" stroke={color} strokeWidth="2.5" />
          {/* Impeller shaft */}
          <line x1="8" y1="30" x2="72" y2="30" stroke={color} strokeWidth="2" strokeDasharray="4 2" />
          <line x1="36" y1="16" x2="36" y2="44" stroke="#71717a" strokeWidth="2" />
          <line x1="50" y1="20" x2="50" y2="40" stroke="#71717a" strokeWidth="2" />
        </svg>
      );

    case 'comp-reciprocating':
      return (
        <svg viewBox="0 0 80 60" className="w-18 h-14" fill="none">
          {/* Piston Cylinder */}
          <rect x="18" y="14" width="44" height="32" stroke={color} strokeWidth="2.5" fill="#18181b" />
          <line x1="40" y1="14" x2="40" y2="46" stroke={color} strokeWidth="3" />
          <line x1="40" y1="30" x2="68" y2="30" stroke="#71717a" strokeWidth="3" />
          <circle cx="68" cy="30" r="5" stroke="#71717a" strokeWidth="2" />
        </svg>
      );

    case 'tank-atmospheric':
    case 'tank-floating':
      return (
        <svg viewBox="0 0 80 60" className="w-18 h-14" fill="none">
          {/* Cylindrical Tank */}
          <rect x="14" y="18" width="52" height="34" stroke={color} strokeWidth="2.5" fill="#18181b" />
          {/* Cone Roof */}
          <polygon points="10,18 40,8 70,18" stroke={color} strokeWidth="2.5" fill="#27272a" />
          {/* Liquid level */}
          <line x1="16" y1="34" x2="64" y2="34" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 2" />
        </svg>
      );

    case 'tank-sphere':
      return (
        <svg viewBox="0 0 70 70" className="w-16 h-16" fill="none">
          {/* Horton Sphere */}
          <circle cx="35" cy="32" r="24" stroke={color} strokeWidth="2.5" fill="#18181b" />
          <ellipse cx="35" cy="32" rx="24" ry="8" stroke={color} strokeWidth="1" strokeDasharray="3 3" />
          {/* Column legs */}
          <line x1="16" y1="44" x2="12" y2="64" stroke="#71717a" strokeWidth="2.5" />
          <line x1="54" y1="44" x2="58" y2="64" stroke="#71717a" strokeWidth="2.5" />
          <line x1="35" y1="56" x2="35" y2="64" stroke="#71717a" strokeWidth="2" />
        </svg>
      );

    default:
      // Generic asset stencil
      return (
        <svg viewBox="0 0 70 50" className="w-16 h-12" fill="none">
          <rect x="12" y="10" width="46" height="30" rx="4" stroke={color} strokeWidth="2" fill="#18181b" />
          <circle cx="35" cy="25" r="8" stroke={color} strokeWidth="1.5" />
        </svg>
      );
  }
}

export function EquipmentNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as EquipmentNodeData;
  const { removeNode } = useSpatialStore();
  const { selectTag } = useIndraStore();

  const status = nodeData.status || 'RUNNING';
  const color = nodeData.color || '#10b981';

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nodeData.tag) {
      selectTag(nodeData.tag);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeNode(id);
  };

  return (
    <div
      onClick={handleSelect}
      className={`group relative rounded-xl bg-zinc-950/95 border-2 text-zinc-100 shadow-2xl transition-all duration-200 select-none min-w-[210px] max-w-[250px] font-sans ${
        selected
          ? 'border-emerald-500 shadow-emerald-500/20 ring-2 ring-emerald-500/30'
          : 'border-zinc-800 hover:border-zinc-700 hover:shadow-zinc-900/50'
      }`}
    >
      {/* 4 Connection Ports (ISA Standard: Left In, Right Out, Top Vent, Bottom Drain) */}
      <Handle
        type="target"
        position={Position.Left}
        id="inlet"
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-zinc-950 hover:!scale-125 transition-transform cursor-crosshair -ml-1.5"
        title="Process Inlet (Suction)"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="outlet"
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-zinc-950 hover:!scale-125 transition-transform cursor-crosshair -mr-1.5"
        title="Process Outlet (Discharge)"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="vent"
        className="!w-2.5 !h-2.5 !bg-amber-500 !border-2 !border-zinc-950 hover:!scale-125 transition-transform cursor-crosshair -mt-1.5"
        title="Vent / Relief Port"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="drain"
        className="!w-2.5 !h-2.5 !bg-rose-500 !border-2 !border-zinc-950 hover:!scale-125 transition-transform cursor-crosshair -mb-1.5"
        title="Drain / Cleanout Port"
      />

      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800/80 bg-zinc-900/60 rounded-t-xl">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: color }}
          />
          <span className="font-mono font-bold text-xs tracking-wider text-zinc-100">
            {nodeData.tag || 'EQUIP'}
          </span>
          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-zinc-800 text-zinc-400 uppercase">
            {nodeData.category}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 rounded transition-opacity cursor-pointer"
            title="Delete Equipment"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Body: ISA-5.1 Stencil Illustration & Details */}
      <div className="p-3 flex flex-col items-center justify-center gap-2">
        <div className="flex items-center justify-center w-full py-1">
          <EquipmentSymbol symbol={nodeData.symbol} color={color} />
        </div>

        {/* Equipment Name & Subtitle */}
        <div className="text-center w-full">
          <div className="text-xs font-semibold text-zinc-200 line-clamp-1" title={nodeData.name}>
            {nodeData.name}
          </div>
          <div className="text-[10px] font-mono text-zinc-400 truncate">
            {nodeData.standard}
          </div>
        </div>

        {/* Operating Status Badge */}
        <div className="w-full flex items-center justify-between px-2 py-1 rounded bg-zinc-900/90 border border-zinc-800 text-[10px] font-mono">
          <div className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            <span className="font-bold">{status}</span>
          </div>
          <span className="text-zinc-500">ISA-5.1</span>
        </div>

        {/* Key Specs Pills */}
        {nodeData.specs && nodeData.specs.length > 0 && (
          <div className="w-full grid grid-cols-2 gap-1 pt-1 border-t border-zinc-800/80 text-[10px] font-mono">
            {nodeData.specs.slice(0, 2).map((spec, i) => (
              <div key={i} className="flex flex-col bg-zinc-900/50 p-1 rounded">
                <span className="text-zinc-500 text-[9px] uppercase truncate">{spec.label}</span>
                <span className="text-zinc-300 font-semibold truncate">{spec.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(EquipmentNodeComponent);
