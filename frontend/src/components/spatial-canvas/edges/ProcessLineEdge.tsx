'use client';

import React, { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';

export interface ProcessLineEdgeData {
  lineSpec?: string;
  size?: string;
  service?: string;
  serviceCode?: string;
  color?: string;
  flowRate?: string;
  flowDirection?: 'forward' | 'reverse';
  [key: string]: any;
}

export function ProcessLineEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected,
}: EdgeProps) {
  const edgeData = (data || {}) as ProcessLineEdgeData;
  const lineSpec = edgeData.lineSpec || '16"-P-101-A1A';
  const strokeColor = edgeData.color || '#10b981';

  // Manhattan orthogonal routing with crisp 90-degree corners (borderRadius: 4)
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 4,
  });

  return (
    <>
      {/* Background thicker glow when selected */}
      {selected && (
        <path
          d={edgePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={8}
          strokeOpacity={0.25}
          className="transition-all"
        />
      )}

      {/* SVG Marker Definitions for Directional Flow Arrows */}
      <defs>
        <marker
          id={`arrow-${id}`}
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill={strokeColor} />
        </marker>
        <pattern
          id={`flow-pulse-${id}`}
          width="40"
          height="10"
          patternUnits="userSpaceOnUse"
        >
          <path d="M 0 5 L 10 5" stroke={strokeColor} strokeWidth="2.5" />
          <path d="M 10 2 L 16 5 L 10 8" fill={strokeColor} />
        </pattern>
      </defs>

      {/* Base Solid Process Line */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd || `url(#arrow-${id})`}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth: selected ? 3 : 2.5,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }}
      />

      {/* Animated Flow Vector Stream Overlay */}
      <path
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeDasharray="6 14"
        className="process-flow-stream"
        style={{
          animation: 'processFlowAnimation 1.2s linear infinite',
          opacity: 0.9,
        }}
      />

      {/* Smart Engineering Line Sizing & Service Spec Callout Pill */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div
            className={`group relative flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-mono shadow-lg backdrop-blur-md cursor-pointer transition-all duration-150 ${
              selected
                ? 'bg-zinc-900 border-emerald-400 text-zinc-100 ring-2 ring-emerald-500/20'
                : 'bg-zinc-950/90 border-zinc-700/80 text-zinc-300 hover:border-zinc-500 hover:text-white'
            }`}
            title={`Line Spec: ${lineSpec} | Service: ${edgeData.service || 'Process Piping'}`}
          >
            {/* Fluid Indicator Pulse */}
            <span
              className="w-1.5 h-1.5 rounded-full animate-ping"
              style={{ backgroundColor: strokeColor }}
            />
            <span className="font-bold tracking-tight">{lineSpec}</span>

            {edgeData.flowRate && (
              <span className="hidden group-hover:inline-block text-[9px] text-zinc-400 pl-1 border-l border-zinc-700">
                {edgeData.flowRate}
              </span>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(ProcessLineEdgeComponent);
