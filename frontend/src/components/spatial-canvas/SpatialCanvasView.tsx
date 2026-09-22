'use client';

import React, { useState, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import useSpatialStore, { type SpatialNodeType } from '@/store/spatial-store';
import useIndraStore from '@/store/indra-store';
import { multiWindowSync } from '@/lib/sync/multi-window-sync';

// Custom Nodes
import AgentChatNode from './nodes/AgentChatNode';
import PIDSchematicNode from './nodes/PIDSchematicNode';
import DataTableNode from './nodes/DataTableNode';
import { GaugeNode, TelemetryNode, ControlNode } from './nodes/GenerativeUINodes';
import DocumentNode from './nodes/DocumentNode';
import AuditBlockNode from './nodes/AuditBlockNode';

import {
  Plus,
  LayoutGrid,
  RotateCcw,
  Maximize2,
  Layers,
  ExternalLink,
  Bot,
  Table,
  Gauge,
  Activity,
  Sliders,
  FileText,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';

function SpatialCanvasInner() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    autoLayout,
    resetToDefaultLayout,
  } = useSpatialStore();

  const theme = useIndraStore((s) => s.theme);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const nodeTypes = useMemo(
    () => ({
      chatNode: AgentChatNode,
      pidNode: PIDSchematicNode,
      tableNode: DataTableNode,
      gaugeNode: GaugeNode,
      telemetryNode: TelemetryNode,
      controlNode: ControlNode,
      documentNode: DocumentNode,
      auditNode: AuditBlockNode,
    }),
    []
  );

  const nodeOptions: { type: SpatialNodeType; label: string; icon: any; color: string }[] = [
    { type: 'chatNode', label: 'Agent Reasoning Core', icon: Bot, color: 'text-violet-500' },
    { type: 'pidNode', label: 'P&ID Engineering Schematic', icon: Layers, color: 'text-emerald-500' },
    { type: 'tableNode', label: 'ASME B31.3 Calculation Table', icon: Table, color: 'text-cyan-500' },
    { type: 'gaugeNode', label: 'Live SCADA Pressure Gauge', icon: Gauge, color: 'text-violet-500' },
    { type: 'telemetryNode', label: 'ISO 10816 Vibration Chart', icon: Activity, color: 'text-purple-500' },
    { type: 'controlNode', label: 'DCS Parameter Faceplate', icon: Sliders, color: 'text-amber-500' },
    { type: 'documentNode', label: 'Knowledge Base Document', icon: FileText, color: 'text-yellow-500' },
    { type: 'auditNode', label: 'Merkle Audit Proof Block', icon: ShieldCheck, color: 'text-emerald-500' },
  ];

  const handleAdd = (type: SpatialNodeType) => {
    addNode(type);
    setShowAddMenu(false);
  };

  const handleTearOff = () => {
    if (typeof window !== 'undefined') {
      window.open('/detach/canvas', 'indra-spatial-canvas', 'width=1600,height=1000,menubar=no,toolbar=no');
    }
  };

  return (
    <div className="w-full h-full relative bg-slate-950 text-slate-100 overflow-hidden select-none">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.15}
        maxZoom={2.5}
        colorMode={theme === 'dark' ? 'dark' : 'light'}
        className="indra-spatial-flow"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color={theme === 'dark' ? '#3f3f46' : '#94a3b8'}
        />

        <Controls
          showInteractive={false}
          className="!bg-white/90 dark:!bg-zinc-900/90 !border-slate-200 dark:!border-zinc-800 !shadow-lg !rounded-xl overflow-hidden"
        />

        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="!bg-white/80 dark:!bg-zinc-900/80 !border-slate-200 dark:!border-zinc-800 !shadow-xl !rounded-2xl overflow-hidden"
          nodeColor={(n) => {
            if (n.type === 'pidNode') return '#10b981';
            if (n.type === 'chatNode') return '#8b5cf6';
            if (n.type === 'tableNode') return '#06b6d4';
            if (n.type === 'controlNode') return '#f59e0b';
            if (n.type === 'auditNode') return '#10b981';
            return '#64748b';
          }}
        />

        {/* Floating Top Spatial Toolbar */}
        <Panel position="top-center" className="mt-4">
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/90 dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 shadow-xl backdrop-blur-md text-xs font-mono">
            {/* Add Node Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold transition-all cursor-pointer shadow-xs shadow-violet-500/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Node</span>
                <ChevronDown className="w-3 h-3 ml-0.5" />
              </button>

              {showAddMenu && (
                <div className="absolute top-full left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl p-1.5 z-50 space-y-0.5">
                  <div className="px-2.5 py-1 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                    Drop Spatial Micro-Frontend
                  </div>
                  {nodeOptions.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.type}
                        onClick={() => handleAdd(opt.type)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-left transition-colors cursor-pointer"
                      >
                        <Icon className={`w-4 h-4 ${opt.color}`} />
                        <span className="text-xs font-medium font-sans">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="h-4 w-[1px] bg-slate-200 dark:bg-zinc-800 mx-0.5" />

            {/* Auto Layout */}
            <button
              onClick={autoLayout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-semibold transition-colors cursor-pointer"
              title="Organize nodes into hierarchical spatial workflow"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-violet-500" />
              <span className="hidden sm:inline">Auto-Arrange</span>
            </button>

            {/* Reset to Default Layout */}
            <button
              onClick={resetToDefaultLayout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              title="Reset to default nominal plant layout"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Reset</span>
            </button>

            {/* Fit View */}
            <button
              onClick={() => fitView({ duration: 600 })}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              title="Fit all nodes to screen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Fit View</span>
            </button>

            <div className="h-4 w-[1px] bg-slate-200 dark:bg-zinc-800 mx-0.5" />

            {/* Tear Off to Monitor */}
            <button
              onClick={handleTearOff}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-bold transition-colors cursor-pointer"
              title="Open full-screen Infinite Spatial Canvas on secondary monitor"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-500" />
              <span>Tear Off Window</span>
            </button>
          </div>
        </Panel>

        {/* Floating Bottom Left Graph Telemetry Badge */}
        <Panel position="bottom-left" className="mb-3 ml-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 text-[11px] font-mono text-slate-500 dark:text-zinc-400 shadow-md backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-bold text-slate-800 dark:text-zinc-200">{nodes.length} Active Nodes</span>
            <span>•</span>
            <span>{edges.length} Spatial Links</span>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export default function SpatialCanvasView() {
  return (
    <ReactFlowProvider>
      <SpatialCanvasInner />
    </ReactFlowProvider>
  );
}
