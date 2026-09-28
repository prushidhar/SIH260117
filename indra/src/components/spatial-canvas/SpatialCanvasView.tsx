'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  ConnectionLineType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import useSpatialStore, { type SpatialNodeType } from '@/store/spatial-store';
import useIndraStore from '@/store/indra-store';
import {
  PIPING_LINE_SPECS,
  ANSI_PAPER_FORMATS,
  type EquipmentAsset,
} from '@/lib/canvas/equipment-catalog';

// Custom Nodes
import AgentChatNode from './nodes/AgentChatNode';
import PIDSchematicNode from './nodes/PIDSchematicNode';
import DataTableNode from './nodes/DataTableNode';
import { GaugeNode, TelemetryNode, ControlNode } from './nodes/GenerativeUINodes';
import DocumentNode from './nodes/DocumentNode';
import AuditBlockNode from './nodes/AuditBlockNode';
import EquipmentNode from './nodes/EquipmentNode';

// Custom Edges
import ProcessLineEdge from './edges/ProcessLineEdge';

// Components
import AnsiPaperSheet from './AnsiPaperSheet';
import EquipmentSidebar from './EquipmentSidebar';

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
  Grid,
  Magnet,
  FileSpreadsheet,
  MousePointer,
  Hand,
  ZoomIn,
  ZoomOut,
  GitBranch,
  PackagePlus,
  Compass,
} from 'lucide-react';

function SpatialCanvasInner() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    addEquipmentNode,
    autoLayout,
    resetToDefaultLayout,
    gridSnap,
    gridSize,
    paperFormat,
    activeLineSpec,
    activeLineColor,
    setGridSnap,
    setGridSize,
    setPaperFormat,
    setActiveLineSpec,
  } = useSpatialStore();

  const theme = useIndraStore((s) => s.theme);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [showLineSpecMenu, setShowLineSpecMenu] = useState(false);
  const [showZoomMenu, setShowZoomMenu] = useState(false);
  const [isPanMode, setIsPanMode] = useState(false);
  const [currentZoomPct, setCurrentZoomPct] = useState(100);

  const { fitView, zoomIn, zoomOut, zoomTo, getZoom, screenToFlowPosition } = useReactFlow();

  // Keep zoom percentage display synchronized
  useEffect(() => {
    const updateZoom = () => {
      try {
        const z = getZoom();
        if (z) setCurrentZoomPct(Math.round(z * 100));
      } catch {
        // viewport not ready
      }
    };
    const interval = setInterval(updateZoom, 200);
    return () => clearInterval(interval);
  }, [getZoom]);

  // Registered Custom Nodes
  const nodeTypes = useMemo(
    () => ({
      equipmentNode: EquipmentNode,
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

  // Registered Custom Orthogonal Process Line Edge
  const edgeTypes = useMemo(
    () => ({
      processLine: ProcessLineEdge,
    }),
    []
  );

  const nodeOptions: { type: SpatialNodeType; label: string; icon: any; color: string }[] = [
    { type: 'equipmentNode', label: 'ISA Equipment Stencil', icon: Layers, color: 'text-emerald-500' },
    { type: 'chatNode', label: 'Agent Reasoning Core', icon: Bot, color: 'text-violet-500' },
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

  // HTML5 Drag-and-Drop from Equipment Sidebar onto Canvas
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const rawData = event.dataTransfer.getData('application/indra-asset');
      if (!rawData) return;

      try {
        const asset: EquipmentAsset = JSON.parse(rawData);
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        addEquipmentNode(asset, position);
      } catch (err) {
        console.error('Failed to parse dropped asset', err);
      }
    },
    [screenToFlowPosition, addEquipmentNode]
  );

  // Zoom to Fit shortcut & handler
  const handleZoomToFit = useCallback(() => {
    fitView({ duration: 500, padding: 0.15 });
  }, [fitView]);

  // Keyboard shortcut listener (Ctrl+0 for fit, Space for pan)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        handleZoomToFit();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        zoomIn({ duration: 300 });
      } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        zoomOut({ duration: 300 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomToFit, zoomIn, zoomOut]);

  // Dynamic ANSI Format Info
  const activeFormatInfo = ANSI_PAPER_FORMATS[paperFormat] || ANSI_PAPER_FORMATS.A1;

  return (
    <div className="w-full h-full flex bg-slate-950 text-slate-100 overflow-hidden select-none font-sans">
      {/* 1. Equipment Drag-and-Drop Sidebar (50+ registered assets) */}
      <EquipmentSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onAddDirect={(asset) => addEquipmentNode(asset)}
      />

      {/* 2. Main Spatial Canvas Workspace */}
      <div
        ref={reactFlowWrapper}
        className="flex-1 h-full relative overflow-hidden"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.25} // 25% minimum zoom
          maxZoom={4.0}  // 400% maximum zoom
          zoomOnScroll={true}
          panOnScroll={false}
          panOnDrag={isPanMode ? [0, 1, 2] : [1, 2]} // Middle mouse button (1) or right button (2) always pans; left button pans in pan mode
          panActivationKeyCode="Space" // Space + drag also pans
          snapToGrid={gridSnap}
          snapGrid={[gridSize, gridSize]}
          connectionLineType={ConnectionLineType.SmoothStep}
          connectionLineStyle={{
            stroke: activeLineColor,
            strokeWidth: 2.5,
            strokeDasharray: '4 4',
          }}
          colorMode={theme === 'dark' ? 'dark' : 'light'}
          className="indra-spatial-flow"
        >
          {/* ANSI Drawing Format Sheet Background with Dimensional Markings & Title Block */}
          <AnsiPaperSheet formatId={paperFormat} />

          {/* Dynamic 10px / 20px Dot Grid */}
          <Background
            variant={BackgroundVariant.Dots}
            gap={gridSize}
            size={gridSize === 10 ? 1.0 : 1.5}
            color={theme === 'dark' ? '#27272a' : '#cbd5e1'}
          />

          {/* Standard Controls in Top-Left */}
          <Controls
            showInteractive={false}
            position="top-left"
            className="!bg-zinc-950/90 !border-zinc-800 !shadow-xl !rounded-xl overflow-hidden !mt-16 !ml-4"
          />

          {/* 3. Interactive Mini-Map Navigator: Exactly 160×100px in Bottom-Right */}
          <Panel position="bottom-right" className="mb-4 mr-4">
            <div className="flex flex-col rounded-xl bg-zinc-950/95 border border-zinc-800 shadow-2xl overflow-hidden backdrop-blur-md">
              {/* Mini-Map Header Bar */}
              <div className="h-6 px-2 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between text-[9px] font-mono text-zinc-400">
                <span className="flex items-center gap-1.5 font-bold text-zinc-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  160×100 NAVIGATOR
                </span>
                <span className="text-zinc-500">{nodes.length} NODES</span>
              </div>

              {/* Exact 160×100px Interactive Viewport with Real-Time Bounding Box */}
              <MiniMap
                style={{ width: 160, height: 100 }}
                nodeStrokeWidth={2}
                zoomable
                pannable
                maskColor="rgba(9, 9, 11, 0.75)"
                maskStrokeColor="#10b981"
                maskStrokeWidth={2}
                className="!w-[160px] !h-[100px] !m-0 !bg-zinc-950/90"
                nodeColor={(n) => {
                  if (n.type === 'equipmentNode') {
                    const cat = (n.data?.category as string) || '';
                    if (cat === 'pumps') return '#10b981'; // emerald
                    if (cat === 'exchangers') return '#06b6d4'; // cyan
                    if (cat === 'columns') return '#8b5cf6'; // violet
                    if (cat === 'valves') return '#f59e0b'; // amber
                    if (cat === 'compressors') return '#f43f5e'; // rose
                    if (cat === 'tanks') return '#3b82f6'; // blue
                    return '#10b981';
                  }
                  if (n.type === 'chatNode') return '#8b5cf6';
                  if (n.type === 'tableNode') return '#06b6d4';
                  if (n.type === 'controlNode') return '#f59e0b';
                  if (n.type === 'auditNode') return '#10b981';
                  return '#71717a';
                }}
              />
            </div>
          </Panel>

          {/* 4. Top Spatial & Engineering Toolbar */}
          <Panel position="top-center" className="mt-3">
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-950/90 border border-zinc-800 shadow-2xl backdrop-blur-md text-xs font-mono text-zinc-300">
              {/* Equipment Library Toggle */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  sidebarOpen
                    ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                    : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
                title="Toggle 50+ Equipment Drag-and-Drop Library"
              >
                <PackagePlus className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Library</span>
              </button>

              <div className="h-4 w-[1px] bg-zinc-800 mx-0.5" />

              {/* Add Node Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowAddMenu(!showAddMenu)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all cursor-pointer shadow-xs shadow-emerald-500/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Node</span>
                  <ChevronDown className="w-3 h-3 ml-0.5" />
                </button>

                {showAddMenu && (
                  <div className="absolute top-full left-0 mt-2 w-64 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-1.5 z-50 space-y-0.5">
                    <div className="px-2.5 py-1 text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
                      Add Spatial Micro-Frontend
                    </div>
                    {nodeOptions.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.type}
                          onClick={() => handleAdd(opt.type)}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-zinc-800 text-zinc-200 text-left transition-colors cursor-pointer"
                        >
                          <Icon className={`w-4 h-4 ${opt.color}`} />
                          <span className="text-xs font-medium font-sans">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="h-4 w-[1px] bg-zinc-800 mx-0.5" />

              {/* Smart Orthogonal Process Line Spec Picker */}
              <div className="relative">
                <button
                  onClick={() => setShowLineSpecMenu(!showLineSpecMenu)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-zinc-800 text-zinc-200 font-semibold transition-colors cursor-pointer"
                  title="Choose active piping process line specification"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: activeLineColor }}
                  />
                  <span className="hidden sm:inline font-mono font-bold text-[11px]">
                    {activeLineSpec}
                  </span>
                  <ChevronDown className="w-3 h-3 ml-0.5" />
                </button>

                {showLineSpecMenu && (
                  <div className="absolute top-full left-0 mt-2 w-72 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-1.5 z-50 space-y-1">
                    <div className="px-2.5 py-1 text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
                      Process Line Service Spec (ISA-5.1)
                    </div>
                    {PIPING_LINE_SPECS.map((spec) => (
                      <button
                        key={spec.id}
                        onClick={() => {
                          setActiveLineSpec(spec.label, spec.color);
                          setShowLineSpecMenu(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-colors cursor-pointer ${
                          activeLineSpec === spec.label
                            ? 'bg-zinc-800 border border-zinc-700'
                            : 'hover:bg-zinc-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: spec.color }}
                          />
                          <div>
                            <div className="text-xs font-mono font-bold text-zinc-200">
                              {spec.label}
                            </div>
                            <div className="text-[10px] text-zinc-400 truncate">
                              {spec.service}
                            </div>
                          </div>
                        </div>
                        <span className="text-[9px] font-mono text-zinc-500">
                          {spec.materialClass}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="h-4 w-[1px] bg-zinc-800 mx-0.5" />

              {/* ANSI Paper Format Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowFormatMenu(!showFormatMenu)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-zinc-800 text-zinc-300 transition-colors cursor-pointer"
                  title="Select ANSI Drawing Format Preset"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
                  <span className="font-bold">{paperFormat}</span>
                  <ChevronDown className="w-3 h-3 ml-0.5" />
                </button>

                {showFormatMenu && (
                  <div className="absolute top-full left-0 mt-2 w-72 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-1.5 z-50 space-y-0.5">
                    <div className="px-2.5 py-1 text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
                      ANSI / ISO Drawing Formats
                    </div>
                    {Object.values(ANSI_PAPER_FORMATS).map((fmt) => (
                      <button
                        key={fmt.id}
                        onClick={() => {
                          setPaperFormat(fmt.id);
                          setShowFormatMenu(false);
                          setTimeout(handleZoomToFit, 100);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-colors cursor-pointer ${
                          paperFormat === fmt.id
                            ? 'bg-zinc-800 border border-zinc-700 text-blue-400 font-bold'
                            : 'hover:bg-zinc-800/60 text-zinc-300'
                        }`}
                      >
                        <span className="text-xs font-mono">{fmt.name}</span>
                        {fmt.mmWidth > 0 && (
                          <span className="text-[10px] font-mono text-zinc-500">
                            {fmt.mmWidth}×{fmt.mmHeight}mm
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Grid Snap & 10px / 20px Switcher */}
              <div className="flex items-center bg-zinc-900 rounded-xl p-0.5 border border-zinc-800">
                <button
                  onClick={() => setGridSnap(!gridSnap)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    gridSnap
                      ? 'bg-emerald-950/80 text-emerald-400 font-bold'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  title={gridSnap ? 'Snap-to-Grid: Enabled' : 'Snap-to-Grid: Disabled'}
                >
                  <Magnet className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setGridSize(gridSize === 10 ? 20 : 10)}
                  className="px-2 py-0.5 text-[10px] font-mono font-bold text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                  title="Toggle Grid Size: 10px or 20px"
                >
                  {gridSize}px
                </button>
              </div>

              {/* Select vs Pan Tool */}
              <div className="flex items-center bg-zinc-900 rounded-xl p-0.5 border border-zinc-800">
                <button
                  onClick={() => setIsPanMode(false)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    !isPanMode
                      ? 'bg-zinc-800 text-zinc-100 font-bold'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  title="Select & Move Tool (Middle-mouse button still pans)"
                >
                  <MousePointer className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsPanMode(true)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isPanMode
                      ? 'bg-zinc-800 text-zinc-100 font-bold'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  title="Hand / Pan Tool (Left-click pans canvas)"
                >
                  <Hand className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="h-4 w-[1px] bg-zinc-800 mx-0.5" />

              {/* Pan / Zoom Engine Controls (25% to 400%) */}
              <div className="flex items-center gap-1 bg-zinc-900 rounded-xl p-0.5 border border-zinc-800">
                <button
                  onClick={() => zoomOut({ duration: 250 })}
                  className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                  title="Zoom Out (Ctrl -)"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>

                {/* Current Zoom Level Readout & Presets */}
                <div className="relative">
                  <button
                    onClick={() => setShowZoomMenu(!showZoomMenu)}
                    className="px-1.5 py-0.5 text-[10px] font-mono font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    title="Click for Zoom Presets"
                  >
                    {currentZoomPct}%
                  </button>

                  {showZoomMenu && (
                    <div className="absolute top-full left-0 mt-2 w-32 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl p-1 z-50 space-y-0.5">
                      {[
                        { label: '25% (Min)', val: 0.25 },
                        { label: '50%', val: 0.5 },
                        { label: '100% (1:1)', val: 1.0 },
                        { label: '200%', val: 2.0 },
                        { label: '400% (Max)', val: 4.0 },
                      ].map((item) => (
                        <button
                          key={item.label}
                          onClick={() => {
                            zoomTo(item.val, { duration: 300 });
                            setShowZoomMenu(false);
                          }}
                          className="w-full text-left px-2 py-1 rounded text-[11px] font-mono hover:bg-zinc-800 text-zinc-300 hover:text-white"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => zoomIn({ duration: 250 })}
                  className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                  title="Zoom In (Ctrl +)"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Zoom to Fit Shortcut Button */}
              <button
                onClick={handleZoomToFit}
                className="flex items-center gap-1 px-2 py-1.5 rounded-xl hover:bg-zinc-800 text-zinc-300 transition-colors cursor-pointer"
                title="Zoom to Fit All Elements (Ctrl + 0)"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden lg:inline text-[11px]">Fit View</span>
              </button>

              <div className="h-4 w-[1px] bg-zinc-800 mx-0.5" />

              {/* Auto Arrange & Reset */}
              <button
                onClick={autoLayout}
                className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                title="Auto-Arrange Layout"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-violet-400" />
              </button>

              <button
                onClick={resetToDefaultLayout}
                className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                title="Reset to Default Nominal Plant P&ID"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Tear Off Window */}
              <button
                onClick={handleTearOff}
                className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer"
                title="Tear Off Window to Secondary Monitor"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </Panel>

          {/* 5. Bottom Left Status HUD Telemetry Badge */}
          <Panel position="bottom-left" className="mb-4 ml-4">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-zinc-950/90 border border-zinc-800 text-[11px] font-mono text-zinc-400 shadow-xl backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-zinc-200">{nodes.length} Plant Assets</span>
              <span className="text-zinc-700">•</span>
              <span>{edges.length} Process Lines</span>
              <span className="text-zinc-700">•</span>
              <span className="text-emerald-400">
                SNAP {gridSnap ? `${gridSize}PX` : 'OFF'}
              </span>
              <span className="text-zinc-700">•</span>
              <span className="text-blue-400">{activeFormatInfo.name}</span>
            </div>
          </Panel>
        </ReactFlow>
      </div>
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
