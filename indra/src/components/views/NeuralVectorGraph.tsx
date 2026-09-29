'use client';

import React, { useState, useMemo } from 'react';
import { 
  Network, 
  Sparkles, 
  FileText, 
  Search, 
  Layers, 
  Compass, 
  Cpu, 
  Zap, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';

interface KnowledgeNode {
  id: string;
  cluster: 'ASME_PIPING' | 'API_PUMPS' | 'ISO_VIBRATION' | 'API_570_NDT' | 'TEMA_THERMAL' | 'HYDRAULICS';
  title: string;
  standard: string;
  section: string;
  x: number;
  y: number;
  relevance: number; // 0..100
  snippet: string;
  vectorSummary: string; // e.g. "768-dim float32 [0.142, -0.891, ...]"
  connections: string[]; // ids of connected nodes
}

const KNOWLEDGE_NODES: KnowledgeNode[] = [
  // 1. ASME Piping Cluster (Emerald)
  {
    id: 'asme-304',
    cluster: 'ASME_PIPING',
    title: 'Straight Pipe Wall Thickness (Eq. 3a)',
    standard: 'ASME B31.3-2022',
    section: 'Section 304.1.2',
    x: 280,
    y: 220,
    relevance: 98,
    snippet: 'tm = (P * D) / (2 * (S * E * W + P * Y)) + c. Design factor Y=0.4 for ferritic steels below 900°F. Thickness must satisfy hoop stress integrity under maximum internal design pressure.',
    vectorSummary: 'dim:768 • norm:1.000 • top_features: [pressure, hoop_stress, pipe_wall, asme_b31_3]',
    connections: ['asme-stress', 'api-570-thin', 'crane-dp'],
  },
  {
    id: 'asme-stress',
    cluster: 'ASME_PIPING',
    title: 'Basic Allowable Stresses (ASTM A106 B)',
    standard: 'ASME B31.3-2022',
    section: 'Table A-1',
    x: 200,
    y: 180,
    relevance: 95,
    snippet: 'Carbon Steel ASTM A106 Grade B: Specified Minimum Tensile Strength = 60 ksi (415 MPa), Yield = 35 ksi (240 MPa). Allowable stress S = 20.0 ksi at -29°C to 100°C.',
    vectorSummary: 'dim:768 • norm:0.998 • top_features: [yield_strength, allowable_stress, a106_b, material_spec]',
    connections: ['asme-304', 'api-570-thin'],
  },
  {
    id: 'asme-weld',
    cluster: 'ASME_PIPING',
    title: 'Longitudinal Weld Quality Factor (E=1.0)',
    standard: 'ASME B31.3-2022',
    section: 'Section 302.3.5',
    x: 230,
    y: 300,
    relevance: 92,
    snippet: 'Quality factor E = 1.00 for seamless pipe, E = 0.85 for electric resistance welded (ERW), and E = 0.60 for furnace butt welded piping spools.',
    vectorSummary: 'dim:768 • norm:0.995 • top_features: [weld_efficiency, joint_quality, seamless_factor]',
    connections: ['asme-304'],
  },

  // 2. API 570 NDT & Corrosion Cluster (Amber)
  {
    id: 'api-570-thin',
    cluster: 'API_570_NDT',
    title: 'Corrosion Rate & Remaining Service Life',
    standard: 'API 570 4th Ed.',
    section: 'Section 7.1.1',
    x: 390,
    y: 180,
    relevance: 96,
    snippet: 'Remaining Life = (t_actual - t_required) / Corrosion_Rate. Long-term vs short-term corrosion monitoring must trigger plant inspection intervals at half-life.',
    vectorSummary: 'dim:768 • norm:0.999 • top_features: [corrosion_rate, remaining_life, ultrasonic_ndt, wall_loss]',
    connections: ['asme-304', 'asme-stress'],
  },
  {
    id: 'api-570-table',
    cluster: 'API_570_NDT',
    title: 'Minimum Alert Structural Thickness',
    standard: 'API 570 4th Ed.',
    section: 'Table 1',
    x: 460,
    y: 240,
    relevance: 93,
    snippet: 'Structural minimum thickness criteria for carbon and low-alloy steel piping to resist external collapse, sagging between pipe supports, and wind/seismic loads.',
    vectorSummary: 'dim:768 • norm:0.997 • top_features: [structural_thickness, external_load, support_span]',
    connections: ['api-570-thin', 'crane-dp'],
  },

  // 3. API 610 Centrifugal Pumps Cluster (Cyan)
  {
    id: 'api-610-npsh',
    cluster: 'API_PUMPS',
    title: 'Net Positive Suction Head Margin (NPSHa)',
    standard: 'API 610 12th Ed.',
    section: 'Section 6.1.10',
    x: 620,
    y: 200,
    relevance: 99,
    snippet: 'NPSHa must exceed NPSHr by a minimum margin of 1.0 m (3.3 ft) or 1.10 times NPSHr across operating range (from minimum continuous stable flow to 120% BEP).',
    vectorSummary: 'dim:768 • norm:1.000 • top_features: [npsh_available, cavitation_margin, vapor_pressure, suction_head]',
    connections: ['api-610-flow', 'iso-vibe-rms'],
  },
  {
    id: 'api-610-flow',
    cluster: 'API_PUMPS',
    title: 'Minimum Continuous Stable Flow (MCSF)',
    standard: 'API 610 12th Ed.',
    section: 'Clause 6.1.14',
    x: 710,
    y: 160,
    relevance: 94,
    snippet: 'Pumps in hydrocarbon slurry service must operate above MCSF (typically 35-40% of Best Efficiency Point) to prevent suction recirculation and low-flow cavitation damage.',
    vectorSummary: 'dim:768 • norm:0.996 • top_features: [min_flow, spillback_recirculation, thermal_rise, bep]',
    connections: ['api-610-npsh', 'iso-vibe-harmonics'],
  },

  // 4. ISO 10816-3 Vibration Cluster (Violet)
  {
    id: 'iso-vibe-rms',
    cluster: 'ISO_VIBRATION',
    title: 'Tri-Axial Velocity Severity Zones',
    standard: 'ISO 10816-3:2009',
    section: 'Clause 4 / Table 1',
    x: 640,
    y: 350,
    relevance: 98,
    snippet: 'Class II Industrial Machines on Rigid Foundations: Zone A < 1.4 mm/s RMS (Commissioned); Zone B 1.4 - 2.8 mm/s RMS (Nominal); Zone C 2.8 - 4.5 mm/s (Restricted); Zone D > 4.5 mm/s (Trip).',
    vectorSummary: 'dim:768 • norm:1.000 • top_features: [vibration_rms, velocity_spectrum, zone_classification, rigid_foundation]',
    connections: ['iso-vibe-harmonics', 'api-610-npsh', 'api-670-temp'],
  },
  {
    id: 'iso-vibe-harmonics',
    cluster: 'ISO_VIBRATION',
    title: 'FFT Harmonics & Rotor Unbalance',
    standard: 'ISO 10816-3:2009',
    section: 'Annex B',
    x: 740,
    y: 300,
    relevance: 95,
    snippet: '1X running speed peak indicates dynamic rotor unbalance. 2X harmonic indicates angular or parallel shaft misalignment. High-frequency non-synchronous peaks indicate bearing race flaking.',
    vectorSummary: 'dim:768 • norm:0.998 • top_features: [fft_harmonics, rotor_unbalance, shaft_misalignment, bearing_defect]',
    connections: ['iso-vibe-rms', 'api-610-flow'],
  },
  {
    id: 'api-670-temp',
    cluster: 'ISO_VIBRATION',
    title: 'Bearing RTD Temperature Limits',
    standard: 'API 670 5th Ed.',
    section: 'Section 4.3',
    x: 720,
    y: 420,
    relevance: 91,
    snippet: 'Hydrodynamic sleeve and rolling-element bearing metal temperatures must remain below 93°C (200°F) alarm setpoint and 105°C (221°F) emergency trip threshold.',
    vectorSummary: 'dim:768 • norm:0.994 • top_features: [bearing_rtd, lube_temperature, emergency_trip, hydrodynamic_thrust]',
    connections: ['iso-vibe-rms'],
  },

  // 5. TEMA Thermal Exchanger Cluster (Rose)
  {
    id: 'tema-duty',
    cluster: 'TEMA_THERMAL',
    title: 'Thermal Duty & Log Mean Temp Difference (LMTD)',
    standard: 'TEMA 10th Ed. (Class R)',
    section: 'Section 5 / R-1.2',
    x: 480,
    y: 480,
    relevance: 97,
    snippet: 'Heat duty Q = m * Cp * (Tout - Tin). Counter-current LMTD = (dT2 - dT1) / ln(dT2/dT1). Correction factor F applies to multi-pass shell and tube configurations.',
    vectorSummary: 'dim:768 • norm:0.999 • top_features: [thermal_duty, lmtd, heat_transfer, counter_current, tema_r]',
    connections: ['tema-fouling'],
  },
  {
    id: 'tema-fouling',
    cluster: 'TEMA_THERMAL',
    title: 'Crude Oil Fouling Resistance Factor (Rf)',
    standard: 'TEMA 10th Ed. (Class R)',
    section: 'Table T-5.2',
    x: 370,
    y: 450,
    relevance: 94,
    snippet: 'Standard petroleum refinery fouling resistance: crude oil below 150°C specifies Rf = 0.00035 m²·K/W. Clean overall coefficient U_clean vs service coefficient U_service indicates bundle fouling.',
    vectorSummary: 'dim:768 • norm:0.997 • top_features: [fouling_factor, crud_oil_deposit, overall_heat_transfer, bundle_cleanliness]',
    connections: ['tema-duty', 'crane-dp'],
  },

  // 6. Hydraulics & Pipeline Dynamics (Blue)
  {
    id: 'crane-dp',
    cluster: 'HYDRAULICS',
    title: 'Darcy-Weisbach Friction Factor & Pressure Drop',
    standard: 'Crane TP-410 / API 14E',
    section: 'Chapter 1 / Eq. 1-4',
    x: 300,
    y: 400,
    relevance: 99,
    snippet: 'Frictional head loss delta_h = f * (L/D) * (v^2 / 2g). Friction factor f evaluated via Colebrook-White equation for turbulent transition (Re > 4000) with pipe roughness eps = 0.0457 mm.',
    vectorSummary: 'dim:768 • norm:1.000 • top_features: [darcy_weisbach, friction_factor, reynolds_number, head_loss, api_14e]',
    connections: ['asme-304', 'api-570-table', 'tema-fouling'],
  },
  {
    id: 'api-14e-vel',
    cluster: 'HYDRAULICS',
    title: 'Erosional Velocity Threshold (v_e)',
    standard: 'API RP 14E',
    section: 'Section 2.3',
    x: 200,
    y: 450,
    relevance: 93,
    snippet: 'Fluid erosional velocity limit v_e = c / sqrt(rho_m). For continuous non-corrosive service c=100 (FPS) or 122 (SI). Pumping velocity must remain 15% below threshold to prevent pipe wall erosion.',
    vectorSummary: 'dim:768 • norm:0.995 • top_features: [erosional_velocity, particulate_erosion, pipe_protection, api_14e]',
    connections: ['crane-dp'],
  },
];

const CLUSTER_METADATA: Record<string, { label: string; color: string; border: string; bg: string }> = {
  ASME_PIPING: { label: 'ASME B31.3 Piping', color: '#10b981', border: 'border-emerald-500', bg: 'bg-emerald-500/10' },
  API_570_NDT: { label: 'API 570 NDT Inspection', color: '#f59e0b', border: 'border-amber-500', bg: 'bg-amber-500/10' },
  API_PUMPS: { label: 'API 610 Centrifugal Pumps', color: '#06b6d4', border: 'border-cyan-500', bg: 'bg-cyan-500/10' },
  ISO_VIBRATION: { label: 'ISO 10816 Vibration', color: '#8b5cf6', border: 'border-violet-500', bg: 'bg-violet-500/10' },
  TEMA_THERMAL: { label: 'TEMA Class R Exchangers', color: '#f43f5e', border: 'border-rose-500', bg: 'bg-rose-500/10' },
  HYDRAULICS: { label: 'API 14E / Crane TP-410', color: '#3b82f6', border: 'border-blue-500', bg: 'bg-blue-500/10' },
};

export default function NeuralVectorGraph() {
  const { setInputValue, setActiveNav } = useIndraStore();
  const [selectedNodeId, setSelectedNodeId] = useState<string>('asme-304');
  const [filterCluster, setFilterCluster] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const selectedNode = useMemo(
    () => KNOWLEDGE_NODES.find((n) => n.id === selectedNodeId) || KNOWLEDGE_NODES[0],
    [selectedNodeId]
  );

  const filteredNodes = useMemo(() => {
    return KNOWLEDGE_NODES.filter((n) => {
      const matchCluster = filterCluster === 'ALL' || n.cluster === filterCluster;
      const matchSearch =
        !searchQuery.trim() ||
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.standard.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.snippet.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCluster && matchSearch;
    });
  }, [filterCluster, searchQuery]);

  const handleQueryNode = (node: KnowledgeNode) => {
    setInputValue(`Evaluate compliance against ${node.standard} (${node.title}): ${node.snippet.slice(0, 120)}...`);
    setActiveNav('workbench');
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 overflow-hidden shadow-xs">
      {/* Top Filter & Search Bar */}
      <div className="p-3.5 border-b border-slate-200/80 dark:border-zinc-800/80 bg-slate-50/70 dark:bg-zinc-900/50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-zinc-100 font-mono uppercase tracking-wide">
              Neural Vector Knowledge Graph (768-Dim RAG Space)
            </h3>
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
              On-Premise all-MiniLM-L6-v2 Embeddings • Zero-WAN Vector Clustering
            </span>
          </div>
        </div>

        {/* Cluster Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1 text-[11px] font-mono">
          <button
            onClick={() => setFilterCluster('ALL')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              filterCluster === 'ALL'
                ? 'bg-violet-600 text-white font-bold shadow-xs'
                : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100'
            }`}
          >
            All (15 Nodes)
          </button>
          {Object.entries(CLUSTER_METADATA).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => setFilterCluster(key)}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                filterCluster === key
                  ? 'text-white font-bold shadow-xs'
                  : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100'
              }`}
              style={{
                backgroundColor: filterCluster === key ? meta.color : undefined,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
              <span>{meta.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Graph & Inspector Grid */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-200/80 dark:divide-zinc-800/80">
        {/* Left: Interactive SVG Vector Cluster Viewport */}
        <div className="flex-1 relative bg-slate-900/95 dark:bg-black/95 overflow-hidden flex items-center justify-center select-none min-h-[380px]">
          {/* Subtle Radar Cosine Distance Rings */}
          <svg className="w-full h-full max-h-[580px] max-w-[850px] pointer-events-auto" viewBox="0 0 900 600">
            {/* Concentric Rings */}
            <circle cx="450" cy="300" r="120" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
            <circle cx="450" cy="300" r="220" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
            <circle cx="450" cy="300" r="320" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.2" />

            {/* Crosshairs */}
            <line x1="450" y1="20" x2="450" y2="580" stroke="#1e293b" strokeWidth="1" opacity="0.5" />
            <line x1="40" y1="300" x2="860" y2="300" stroke="#1e293b" strokeWidth="1" opacity="0.5" />

            {/* Ring Labels */}
            <text x="455" y="185" fill="#64748b" fontSize="9" fontFamily="monospace">cos_sim &gt; 0.95 (Exact)</text>
            <text x="455" y="85" fill="#475569" fontSize="9" fontFamily="monospace">cos_sim &gt; 0.85 (High Context)</text>
            <text x="455" y="585" fill="#334155" fontSize="8" fontFamily="monospace">768-Dim Latent Projector</text>

            {/* Inter-Node Semantic Connection Lines */}
            {KNOWLEDGE_NODES.map((node) =>
              node.connections.map((targetId) => {
                const target = KNOWLEDGE_NODES.find((n) => n.id === targetId);
                if (!target) return null;
                const isSelected = selectedNode.id === node.id || selectedNode.id === target.id;
                return (
                  <line
                    key={`${node.id}-${target.id}`}
                    x1={node.x}
                    y1={node.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={isSelected ? '#a855f7' : '#334155'}
                    strokeWidth={isSelected ? 2 : 1}
                    strokeDasharray={isSelected ? 'none' : '3 3'}
                    opacity={isSelected ? 0.9 : 0.4}
                  />
                );
              })
            )}

            {/* Render Nodes */}
            {filteredNodes.map((node) => {
              const meta = CLUSTER_METADATA[node.cluster];
              const isSelected = selectedNode.id === node.id;
              return (
                <g
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className="cursor-pointer transition-transform hover:scale-110"
                >
                  {/* Outer Glow Halo for Selected Node */}
                  {isSelected && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="26"
                      fill={meta.color}
                      opacity="0.25"
                      className="animate-pulse"
                    />
                  )}

                  {/* Node Circle */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isSelected ? 16 : 12}
                    fill={meta.color}
                    stroke="#ffffff"
                    strokeWidth={isSelected ? 2.5 : 1}
                    opacity={isSelected ? 1.0 : 0.85}
                  />

                  {/* Label Text */}
                  <text
                    x={node.x}
                    y={node.y + 24}
                    fill="#e2e8f0"
                    fontSize="9.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="select-none pointer-events-none drop-shadow-md"
                  >
                    {node.standard.split(' ')[0]} {node.section.split(' ')[0]}
                  </text>
                  <text
                    x={node.x}
                    y={node.y + 34}
                    fill="#94a3b8"
                    fontSize="8"
                    fontFamily="sans-serif"
                    textAnchor="middle"
                    className="select-none pointer-events-none"
                  >
                    {node.title.slice(0, 16)}...
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Floating Instructions */}
          <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-400 pointer-events-none">
            Click any standard node to inspect RAG chunk &amp; cosine similarity vector
          </div>
        </div>

        {/* Right: Selected Node Detail & Vector Inspector */}
        <div className="w-full lg:w-96 p-4 bg-slate-50/50 dark:bg-zinc-900/40 flex flex-col justify-between overflow-y-auto space-y-4">
          <div className="space-y-3">
            {/* Header with Cluster Badge */}
            <div className="flex items-center justify-between">
              <span
                className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: CLUSTER_METADATA[selectedNode.cluster].bg,
                  color: CLUSTER_METADATA[selectedNode.cluster].color,
                  border: `1px solid ${CLUSTER_METADATA[selectedNode.cluster].color}40`,
                }}
              >
                {CLUSTER_METADATA[selectedNode.cluster].label}
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/40">
                {selectedNode.relevance}% SIMILARITY
              </span>
            </div>

            {/* Standard & Title */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100 font-mono">
                {selectedNode.title}
              </h4>
              <div className="text-xs font-semibold text-violet-700 dark:text-violet-400 font-mono mt-0.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>{selectedNode.standard} • {selectedNode.section}</span>
              </div>
            </div>

            {/* Chunk Snippet Box */}
            <div className="p-3 rounded-xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 shadow-2xs space-y-1.5">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 dark:text-zinc-500">
                Indexed SOP &amp; Standard Chunk Text
              </span>
              <p className="text-xs text-slate-700 dark:text-zinc-300 font-sans leading-relaxed">
                {selectedNode.snippet}
              </p>
            </div>

            {/* Vector Embedding Footprint */}
            <div className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[10px] border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-violet-400 font-bold">
                <span className="flex items-center gap-1">
                  <Cpu className="w-3 h-3" />
                  <span>Dense Vector Embedding</span>
                </span>
                <span className="text-slate-400 text-[9px]">all-MiniLM-L6-v2</span>
              </div>
              <div className="text-slate-400 truncate">
                {selectedNode.vectorSummary}
              </div>
              {/* Simulated Embedding Vector Bar Spectrum */}
              <div className="flex items-end gap-0.5 h-6 pt-1">
                {[45, 80, 20, 65, 90, 40, 75, 30, 85, 55, 70, 95, 25, 60, 80, 50, 65, 35, 90, 40].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-violet-500/70 hover:bg-violet-400 transition-colors rounded-t-xs"
                    style={{ height: `${h}%` }}
                    title={`dim_${i * 38}: ${(h / 100 - 0.5).toFixed(3)}`}
                  />
                ))}
              </div>
            </div>

            {/* Connected Nodes */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-zinc-400">
                Connected Semantic Standards
              </span>
              <div className="flex flex-wrap gap-1">
                {selectedNode.connections.map((targetId) => {
                  const target = KNOWLEDGE_NODES.find((n) => n.id === targetId);
                  if (!target) return null;
                  return (
                    <button
                      key={target.id}
                      onClick={() => setSelectedNodeId(target.id)}
                      className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-[10px] font-mono text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
                    >
                      {target.standard.split(' ')[0]} {target.section.split(' ')[0]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Button: Query in Workbench */}
          <button
            onClick={() => handleQueryNode(selectedNode)}
            className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-mono font-bold transition-all shadow-xs cursor-pointer"
            title="Send this standard and formula to the AI agent workbench for evaluation"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-200" />
            <span>Query Standard in Workbench</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
