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

export type SpatialNodeType =
  | 'chatNode'
  | 'pidNode'
  | 'tableNode'
  | 'gaugeNode'
  | 'telemetryNode'
  | 'controlNode'
  | 'documentNode'
  | 'auditNode';

export interface SpatialNodeData {
  title?: string;
  subtitle?: string;
  tag?: string;
  [key: string]: any;
}

export interface SpatialState {
  nodes: Node<SpatialNodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;

  onNodesChange: OnNodesChange<Node<SpatialNodeData>>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  addNode: (type: SpatialNodeType, position?: { x: number; y: number }, data?: SpatialNodeData) => string;
  removeNode: (id: string) => void;
  updateNodeData: (id: string, data: Partial<SpatialNodeData>) => void;
  setSelectedNodeId: (id: string | null) => void;

  autoLayout: () => void;
  resetToDefaultLayout: () => void;
}

const DEFAULT_NODES: Node<SpatialNodeData>[] = [
  {
    id: 'node-pid-1',
    type: 'pidNode',
    position: { x: -220, y: 80 },
    data: {
      title: 'P&ID Schematic: Crude Pre-Heat Train',
      subtitle: 'Drawing # PID-001-CRUD (Rev 4)',
      tag: 'P-101',
    },
  },
  {
    id: 'node-chat-1',
    type: 'chatNode',
    position: { x: 380, y: 40 },
    data: {
      title: 'INDRA Sovereign Reasoning Core',
      subtitle: 'Qwen2.5-Coder-32B (Air-Gapped Resident)',
    },
  },
  {
    id: 'node-table-1',
    type: 'tableNode',
    position: { x: 960, y: 40 },
    data: {
      title: 'ASME B31.3 Deterministic Calculation Matrix',
      subtitle: 'Straight Pipe Wall Thickness Verification (§304.1.2)',
      tag: 'HX-4201',
    },
  },
  {
    id: 'node-control-1',
    type: 'controlNode',
    position: { x: -220, y: 640 },
    data: {
      title: 'P-101 DCS Faceplate & Interlocks',
      subtitle: 'Variable Frequency Drive Setpoints',
      tag: 'P-101',
    },
  },
  {
    id: 'node-gauge-1',
    type: 'gaugeNode',
    position: { x: 380, y: 640 },
    data: {
      title: 'Slurry Feed Pump Discharge Pressure',
      subtitle: 'Design Limit 100 psig',
      tag: 'P-101',
      value: 78.4,
      unit: 'psig',
    },
  },
  {
    id: 'node-telemetry-1',
    type: 'telemetryNode',
    position: { x: 960, y: 580 },
    data: {
      title: 'P-101 Vibration Telemetry',
      subtitle: 'Tri-Axial Velocity Spectrum (ISO 10816-3)',
      tag: 'P-101',
    },
  },
  {
    id: 'node-audit-1',
    type: 'auditNode',
    position: { x: 1540, y: 160 },
    data: {
      title: 'Merkle Audit Proof Block #4',
      subtitle: 'Cryptographic SHA-256 Ledger Node',
      merkleRoot: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    },
  },
];

const DEFAULT_EDGES: Edge[] = [
  {
    id: 'edge-pid-chat',
    source: 'node-pid-1',
    target: 'node-chat-1',
    animated: true,
    label: 'Telemetry & OCR Tags',
    style: { stroke: '#8b5cf6', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
  },
  {
    id: 'edge-chat-table',
    source: 'node-chat-1',
    target: 'node-table-1',
    animated: true,
    label: 'ASME Math Eq. 3a',
    style: { stroke: '#10b981', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
  },
  {
    id: 'edge-control-pid',
    source: 'node-control-1',
    target: 'node-pid-1',
    animated: true,
    label: 'Spillback Valve FV-101',
    style: { stroke: '#f59e0b', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
  },
  {
    id: 'edge-chat-gauge',
    source: 'node-chat-1',
    target: 'node-gauge-1',
    animated: true,
    label: 'Live SCADA Stream',
    style: { stroke: '#8b5cf6', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
  },
  {
    id: 'edge-table-telemetry',
    source: 'node-table-1',
    target: 'node-telemetry-1',
    animated: true,
    label: 'NDT Dynamic Correlation',
    style: { stroke: '#06b6d4', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#06b6d4' },
  },
  {
    id: 'edge-table-audit',
    source: 'node-table-1',
    target: 'node-audit-1',
    animated: true,
    label: 'Cryptographic Proof',
    style: { stroke: '#10b981', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
  },
];

export const useSpatialStore = create<SpatialState>((set, get) => ({
  nodes: DEFAULT_NODES,
  edges: DEFAULT_EDGES,
  selectedNodeId: null,

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
    set({
      edges: addEdge(
        {
          ...connection,
          animated: true,
          style: { stroke: '#8b5cf6', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
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
    // Clean 3-tier horizontal column flow:
    // Left: P&ID / Controls
    // Center: Reasoning Chat / Gauges
    // Right: Data Tables / Telemetry
    // Far Right: Audit / Deliverables
    const colWidth = 560;
    const rowHeight = 520;

    const columnAssignments: Record<string, { col: number; row: number }> = {
      pidNode: { col: 0, row: 0 },
      controlNode: { col: 0, row: 1 },
      documentNode: { col: 0, row: 2 },
      chatNode: { col: 1, row: 0 },
      gaugeNode: { col: 1, row: 1 },
      tableNode: { col: 2, row: 0 },
      telemetryNode: { col: 2, row: 1 },
      auditNode: { col: 3, row: 0 },
    };

    const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };

    const layoutedNodes = nodes.map((node) => {
      const pref = columnAssignments[node.type || ''] || { col: 1, row: 0 };
      const col = pref.col;
      const row = counts[col] || 0;
      counts[col] = (counts[col] || 0) + 1;

      return {
        ...node,
        position: {
          x: -200 + col * colWidth,
          y: 60 + row * rowHeight,
        },
      };
    });

    set({ nodes: layoutedNodes });
  },

  resetToDefaultLayout: () => {
    set({
      nodes: DEFAULT_NODES,
      edges: DEFAULT_EDGES,
      selectedNodeId: null,
    });
  },
}));

export default useSpatialStore;
