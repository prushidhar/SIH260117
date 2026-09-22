'use client';

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { X } from 'lucide-react';
import useSpatialStore from '@/store/spatial-store';
import IndustrialGauge from '@/components/generative-ui/components/IndustrialGauge';
import TelemetryChart from '@/components/generative-ui/components/TelemetryChart';
import ParameterControlForm from '@/components/generative-ui/components/ParameterControlForm';

export function GaugeNode({ id, data }: { id: string; data: any }) {
  const { removeNode } = useSpatialStore();

  return (
    <div className="w-[420px] rounded-2xl bg-white dark:bg-zinc-900 border-2 border-violet-500/50 shadow-2xl shadow-violet-500/10 overflow-hidden font-sans relative">
      <Handle type="target" position={Position.Left} className="w-3.5 h-3.5 bg-violet-600 border-2 border-white dark:border-zinc-900 -ml-1.5" />
      <Handle type="source" position={Position.Right} className="w-3.5 h-3.5 bg-violet-600 border-2 border-white dark:border-zinc-900 -mr-1.5" />
      <Handle type="target" position={Position.Top} className="w-3.5 h-3.5 bg-violet-600 border-2 border-white dark:border-zinc-900 -mt-1.5" />

      <button
        onClick={() => removeNode(id)}
        className="absolute top-3 right-3 z-10 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300 transition-colors cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <IndustrialGauge
        tag={data?.tag || 'P-101'}
        title={data?.title || 'Slurry Feed Pump Discharge Pressure'}
        value={data?.value ?? 78.4}
        unit={data?.unit || 'psig'}
        min={0}
        max={100}
        status="warning"
        subtitle={data?.subtitle}
      />
    </div>
  );
}

export function TelemetryNode({ id, data }: { id: string; data: any }) {
  const { removeNode } = useSpatialStore();

  return (
    <div className="w-[520px] rounded-2xl bg-white dark:bg-zinc-900 border-2 border-purple-500/50 shadow-2xl shadow-purple-500/10 overflow-hidden font-sans relative">
      <Handle type="target" position={Position.Left} className="w-3.5 h-3.5 bg-purple-600 border-2 border-white dark:border-zinc-900 -ml-1.5" />
      <Handle type="source" position={Position.Right} className="w-3.5 h-3.5 bg-purple-600 border-2 border-white dark:border-zinc-900 -mr-1.5" />
      <Handle type="target" position={Position.Top} className="w-3.5 h-3.5 bg-purple-600 border-2 border-white dark:border-zinc-900 -mt-1.5" />

      <button
        onClick={() => removeNode(id)}
        className="absolute top-3 right-3 z-10 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300 transition-colors cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <TelemetryChart
        tag={data?.tag || 'P-101'}
        title={data?.title || 'Real-Time Vibration Telemetry'}
        subtitle={data?.subtitle || 'ISO 10816-3 Tri-Axial Spectrum'}
        unit="mm/s RMS"
      />
    </div>
  );
}

export function ControlNode({ id, data }: { id: string; data: any }) {
  const { removeNode } = useSpatialStore();

  return (
    <div className="w-[460px] rounded-2xl bg-white dark:bg-zinc-900 border-2 border-amber-500/50 shadow-2xl shadow-amber-500/10 overflow-hidden font-sans relative">
      <Handle type="target" position={Position.Left} className="w-3.5 h-3.5 bg-amber-600 border-2 border-white dark:border-zinc-900 -ml-1.5" />
      <Handle type="source" position={Position.Right} className="w-3.5 h-3.5 bg-amber-600 border-2 border-white dark:border-zinc-900 -mr-1.5" />
      <Handle type="source" position={Position.Bottom} className="w-3.5 h-3.5 bg-amber-600 border-2 border-white dark:border-zinc-900 -mb-1.5" />

      <button
        onClick={() => removeNode(id)}
        className="absolute top-3 right-3 z-10 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300 transition-colors cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <ParameterControlForm
        tag={data?.tag || 'P-101'}
        title={data?.title || 'P-101 VFD & Recirculation Setpoint Control'}
        subtitle={data?.subtitle || 'Distributed Controller Loop FIC-101'}
        parameters={data?.parameters || []}
      />
    </div>
  );
}
