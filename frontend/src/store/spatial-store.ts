import { create } from 'zustand';
import {
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  MarkerType,
} from '@xyflow/react';
import type { EquipmentAsset } from '@/lib/canvas/equipment-catalog';

export type SpatialNodeType =
  | 'chatNode'
  | 'pidNode'
  | 'tableNode'
  | 'gaugeNode'
  | 'telemetryNode'
  | 'controlNode'
  | 'documentNode'
  | 'auditNode'
  | 'equipmentNode';

export interface SpatialNodeData {
  title?: string;
  subtitle?: string;
  tag?: string;
  name?: string;
  category?: string;
  standard?: string;
  subType?: string;
  symbol?: string;
  color?: string;
  specs?: { label: string; value: string }[];
  status?: 'RUNNING' | 'STANDBY' | 'ALARM' | 'MAINTENANCE';
  [key: string]: any;
}

export interface SpatialState {
  nodes: Node<SpatialNodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;

  // Grid & ANSI Format State
  gridSnap: boolean;
  gridSize: 10 | 20;
  paperFormat: 'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'NONE';
  activeLineSpec: string;
  activeLineColor: string;

  setGridSnap: (enabled: boolean) => void;
  setGridSize: (size: 10 | 20) => void;
  setPaperFormat: (format: 'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'NONE') => void;
  setActiveLineSpec: (spec: string, color?: string) => void;

  onNodesChange: OnNodesChange<Node<SpatialNodeData>>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  addNode: (type: SpatialNodeType, position?: { x: number; y: number }, data?: SpatialNodeData) => string;
  addEquipmentNode: (asset: EquipmentAsset, position?: { x: number; y: number }) => string;
  removeNode: (id: string) => void;
  updateNodeData: (id: string, data: Partial<SpatialNodeData>) => void;
  setSelectedNodeId: (id: string | null) => void;

  autoLayout: () => void;
  resetToDefaultLayout: () => void;
}

// Default P&ID Loop with equipment nodes and orthogonal process lines (Framed in ANSI A1 1682×1188)
const DEFAULT_NODES: Node<SpatialNodeData>[] = [
  // Equipment Asset 1: Centrifugal Feed Pump P-101A
  {
    id: 'node-eq-p101',
    type: 'equipmentNode',
    position: { x: 140, y: 440 },
    data: {
      tag: 'P-101A',
      name: 'High-Pressure Process Feed Pump',
      category: 'pumps',
      standard: 'API 610 OH2 / ISO 13709',
      subType: 'Overhung End-Suction Process Pump',
      symbol: 'pump-centrifugal',
      color: '#10b981',
      status: 'RUNNING',
      specs: [
        { label: 'Flow Rate', value: '450 m³/h' },
        { label: 'Head', value: '115 m' },
      ],
    },
  },
  // Equipment Asset 2: Pneumatic Flow Control Valve FV-101
  {
    id: 'node-eq-fv101',
    type: 'equipmentNode',
    position: { x: 440, y: 430 },
    data: {
      tag: 'FV-101',
      name: 'Feed Flow Control Valve (FC)',
      category: 'valves',
      standard: 'ISA 75.01 / IEC 60534',
      subType: 'Air-to-Open Fail-Closed Control Valve',
      symbol: 'valve-control',
      color: '#f59e0b',
      status: 'RUNNING',
      specs: [
        { label: 'Cv Rating', value: '240 gpm/psi' },
        { label: 'Signal', value: '14.2 mA (64%)' },
      ],
    },
  },
  // Equipment Asset 3: Shell & Tube Heat Exchanger E-201
  {
    id: 'node-eq-e201',
    type: 'equipmentNode',
    position: { x: 740, y: 420 },
    data: {
      tag: 'E-201',
      name: 'Process Feed Heat Exchanger',
      category: 'exchangers',
      standard: 'TEMA Type BEM / ASME Sec VIII',
      subType: 'Fixed Tubesheet Heat Exchanger',
      symbol: 'hx-shell-tube',
      color: '#06b6d4',
      status: 'RUNNING',
      specs: [
        { label: 'Heat Duty', value: '14.8 MW' },
        { label: 'Area', value: '1,240 m²' },
      ],
    },
  },
  // Equipment Asset 4: Heavy Industrial Process Column C-301
  {
    id: 'node-eq-c301',
    type: 'equipmentNode',
    position: { x: 1060, y: 280 },
    data: {
      tag: 'C-301',
      name: 'Atmospheric Distillation Column',
      category: 'columns',
      standard: 'ASME Sec VIII Div 2 / API 510',
      subType: '54 Valve Trays Multi-Draw Column',
      symbol: 'column-trayed',
      color: '#06b6d4',
      status: 'RUNNING',
      specs: [
        { label: 'Diameter', value: '4.8 m' },
        { label: 'Height (T/T)', value: '48.5 m' },
      ],
    },
  },
  // Equipment Asset 5: Overhead Vapor Reflux Drum V-304
  {
    id: 'node-eq-v304',
    type: 'equipmentNode',
    position: { x: 1380, y: 160 },
    data: {
      tag: 'V-304',
      name: 'Overhead Reflux Separator Drum',
      category: 'columns',
      standard: 'ASME Sec VIII Div 1 / API 521',
      subType: 'Vertical Vapor-Liquid Knock-Out Drum',
      symbol: 'vessel-vertical',
      color: '#06b6d4',
      status: 'RUNNING',
      specs: [
        { label: 'Holdup', value: '5.0 min (NLL)' },
        { label: 'Pressure', value: '2.4 bar g' },
      ],
    },
  },
  // Equipment Asset 6: Sour Gas Compressor K-102
  {
    id: 'node-eq-k102',
    type: 'equipmentNode',
    position: { x: 1380, y: 560 },
    data: {
      tag: 'K-102',
      name: 'Centrifugal Sour Off-Gas Compressor',
      category: 'compressors',
      standard: 'API 617 8th Ed / ISO 10439',
      subType: 'Barrel Centrifugal Gas Compressor',
      symbol: 'comp-centrifugal',
      color: '#f43f5e',
      status: 'RUNNING',
      specs: [
        { label: 'Shaft Speed', value: '11,200 RPM' },
        { label: 'Ratio', value: '4.25 : 1' },
      ],
    },
  },

  // Sovereign Resident AI Reasoning & Calculation Nodes
  {
    id: 'node-chat-1',
    type: 'chatNode',
    position: { x: 140, y: 820 },
    data: {
      title: 'INDRA Sovereign Reasoning Core',
      subtitle: 'Air-Gapped Process Co-Pilot (Qwen2.5-Coder)',
    },
  },
  {
    id: 'node-table-1',
    type: 'tableNode',
    position: { x: 680, y: 820 },
    data: {
      title: 'ASME B31.3 Line Thickness Calculation Matrix',
      subtitle: 'Straight Pipe Verification (§304.1.2)',
      tag: 'P-101A',
    },
  },
  {
    id: 'node-audit-1',
    type: 'auditNode',
    position: { x: 1240, y: 860 },
    data: {
      title: 'Merkle Audit Proof Block #4',
      subtitle: 'Cryptographic SHA-256 Ledger Node',
      merkleRoot: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    },
  },
];

const DEFAULT_EDGES: Edge[] = [
  // 1. Pump P-101A Discharge -> Control Valve FV-101
  {
    id: 'edge-p101-fv101',
    source: 'node-eq-p101',
    target: 'node-eq-fv101',
    sourceHandle: 'outlet',
    targetHandle: 'inlet',
    type: 'processLine',
    data: {
      lineSpec: '16"-P-101-A1A',
      service: 'Process Feed Service',
      serviceCode: 'P',
      color: '#10b981',
      flowRate: '450 m³/h',
    },
  },
  // 2. Control Valve FV-101 -> Pre-Heater E-201
  {
    id: 'edge-fv101-e201',
    source: 'node-eq-fv101',
    target: 'node-eq-e201',
    sourceHandle: 'outlet',
    targetHandle: 'inlet',
    type: 'processLine',
    data: {
      lineSpec: '12"-P-102-A1A',
      service: 'Metered Feed Stream',
      serviceCode: 'P',
      color: '#10b981',
      flowRate: '450 m³/h',
    },
  },
  // 3. Pre-Heater E-201 -> Column C-301 Flash Zone
  {
    id: 'edge-e201-c301',
    source: 'node-eq-e201',
    target: 'node-eq-c301',
    sourceHandle: 'outlet',
    targetHandle: 'inlet',
    type: 'processLine',
    data: {
      lineSpec: '16"-HC-201-B3B',
      service: 'Pre-Heated Process Stream (185 deg C)',
      serviceCode: 'HC',
      color: '#f59e0b',
      flowRate: '450 m³/h',
    },
  },
  // 4. Column C-301 Overhead Vapor -> Reflux Drum V-304
  {
    id: 'edge-c301-v304',
    source: 'node-eq-c301',
    target: 'node-eq-v304',
    sourceHandle: 'vent',
    targetHandle: 'inlet',
    type: 'processLine',
    data: {
      lineSpec: '20"-HC-202-B3B',
      service: 'Naphtha Overhead Vapor',
      serviceCode: 'HC',
      color: '#f59e0b',
      flowRate: '120 t/h',
    },
  },
  // 5. Reflux Drum Offgas -> Gas Compressor K-102
  {
    id: 'edge-v304-k102',
    source: 'node-eq-v304',
    target: 'node-eq-k102',
    sourceHandle: 'vent',
    targetHandle: 'inlet',
    type: 'processLine',
    data: {
      lineSpec: '12"-HC-203-B3B',
      service: 'Sour Flash Vapor',
      serviceCode: 'HC',
      color: '#f59e0b',
      flowRate: '28,500 m³/h',
    },
  },
];

export const useSpatialStore = create<SpatialState>((set, get) => ({
  nodes: DEFAULT_NODES,
  edges: DEFAULT_EDGES,
  selectedNodeId: null,

  gridSnap: true,
  gridSize: 20,
  paperFormat: 'A1',
  activeLineSpec: '16"-P-101-A1A',
  activeLineColor: '#10b981',

  setGridSnap: (enabled) => set({ gridSnap: enabled }),
  setGridSize: (size) => set({ gridSize: size }),
  setPaperFormat: (format) => set({ paperFormat: format }),
  setActiveLineSpec: (spec, color) =>
    set({
      activeLineSpec: spec,
      ...(color ? { activeLineColor: color } : {}),
    }),

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection) => {
    const { activeLineSpec, activeLineColor } = get();
    set({
      edges: addEdge(
        {
          ...connection,
          type: 'processLine',
          data: {
            lineSpec: activeLineSpec,
            color: activeLineColor,
          },
        },
        get().edges
      ),
    });
  },

  addNode: (type, position, data = {}) => {
    const id = `node-${type}-${Date.now()}`;
    const defaultPosition = position || {
      x: 300 + Math.random() * 200,
      y: 200 + Math.random() * 200,
    };

    const titles: Record<SpatialNodeType, string> = {
      chatNode: 'Agent Reasoning Stream',
      pidNode: 'P&ID Schematic View',
      tableNode: 'Calculation Matrix',
      gaugeNode: 'Live Equipment Gauge',
      telemetryNode: 'Real-Time Telemetry',
      controlNode: 'DCS Parameter Faceplate',
      documentNode: 'Knowledge Base Document',
      auditNode: 'Merkle Proof Block',
      equipmentNode: 'Process Equipment Unit',
    };

    const newNode: Node<SpatialNodeData> = {
      id,
      type,
      position: defaultPosition,
      data: {
        title: titles[type] || 'Spatial Node',
        ...data,
      },
    };

    set((state) => ({
      nodes: [...state.nodes, newNode],
      selectedNodeId: id,
    }));

    return id;
  },

  addEquipmentNode: (asset: EquipmentAsset, position?: { x: number; y: number }) => {
    const id = `node-eq-${asset.tag.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}`;
    const { gridSize, gridSnap } = get();

    let targetX = position?.x ?? (300 + Math.random() * 200);
    let targetY = position?.y ?? (300 + Math.random() * 200);

    if (gridSnap) {
      targetX = Math.round(targetX / gridSize) * gridSize;
      targetY = Math.round(targetY / gridSize) * gridSize;
    }

    const newNode: Node<SpatialNodeData> = {
      id,
      type: 'equipmentNode',
      position: { x: targetX, y: targetY },
      data: {
        tag: asset.tag,
        name: asset.name,
        category: asset.category,
        standard: asset.standard,
        subType: asset.subType,
        symbol: asset.symbol,
        color: asset.color,
        specs: asset.specs,
        status: 'RUNNING',
      },
    };

    set((state) => ({
      nodes: [...state.nodes, newNode],
      selectedNodeId: id,
    }));

    return id;
  },

  removeNode: (id) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    }));
  },

  updateNodeData: (id, partialData) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...partialData } } : node
      ),
    }));
  },

  setSelectedNodeId: (id) => {
    set({ selectedNodeId: id });
  },

  autoLayout: () => {
    const { nodes } = get();
    // Clean industrial column arrangement
    const colWidth = 320;
    const rowHeight = 360;

    let col = 0;
    let row = 0;
    const maxCols = 5;

    const layoutedNodes = nodes.map((node) => {
      const posX = 120 + col * colWidth;
      const posY = 180 + row * rowHeight;

      col++;
      if (col >= maxCols) {
        col = 0;
        row++;
      }

      return {
        ...node,
        position: { x: posX, y: posY },
      };
    });

    set({ nodes: layoutedNodes });
  },

  resetToDefaultLayout: () => {
    set({
      nodes: DEFAULT_NODES,
      edges: DEFAULT_EDGES,
      selectedNodeId: null,
      paperFormat: 'A1',
      gridSnap: true,
      gridSize: 20,
    });
  },
}));

export default useSpatialStore;
