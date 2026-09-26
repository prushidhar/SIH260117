'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  Crosshair,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Play,
  RotateCcw,
  Sliders,
  AlertOctagon,
  Flame,
  Gauge,
  Maximize2
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import InteractivePIDCanvas from '@/components/canvas/InteractivePIDCanvas';

interface PIDComponent {
  tag: string;
  name: string;
  type: 'pump' | 'valve' | 'psv' | 'transmitter' | 'exchanger' | 'vessel';
  status: 'normal' | 'warning' | 'critical';
  reading: string;
  standard: string;
  details: string;
  pos: { x: number; y: number };
}

interface ProcessLoop {
  id: string;
  name: string;
  description: string;
  service: string;
  nominalFlowGPM: number;
  nominalPressurePsig: number;
  nominalTempC: number;
  components: Record<string, PIDComponent>;
  streamLines: { id: string; from: { x: number; y: number }; to: { x: number; y: number }; type: 'main' | 'recirc' | 'relief' }[];
}

const PROCESS_LOOPS: Record<string, ProcessLoop> = {
  'loop-101': {
    id: 'loop-101',
    name: 'Loop 101: Atmospheric Crude Charge & Slurry Feed',
    description: 'P-101 High-Pressure Feed Train to Atmospheric Distillation Column',
    service: 'Heavy Crude Slurry (SG: 0.88, Viscosity: 4.2 cSt)',
    nominalFlowGPM: 450,
    nominalPressurePsig: 464.1,
    nominalTempC: 180,
    components: {
      'P-101': {
        tag: 'P-101',
        name: 'Slurry Feed Charge Pump A',
        type: 'pump',
        status: 'normal',
        reading: '78.4 psig | 450 GPM',
        standard: 'API 610 12th Ed. (BB2)',
        details: 'Between-bearings two-stage pump. Head: 125m. NPSH Margin: +1.3m (Compliant).',
        pos: { x: 180, y: 80 }
      },
      'PT-101': {
        tag: 'PT-101',
        name: 'Discharge Pressure Transmitter',
        type: 'transmitter',
        status: 'normal',
        reading: '3.20 MPa (464.1 psig)',
        standard: 'ISA-5.1 Section 4',
        details: 'Smart differential HART transmitter. Calibration: Certified valid.',
        pos: { x: 290, y: 80 }
      },
      'FCV-101': {
        tag: 'FCV-101',
        name: 'Feed Charge Flow Control Valve',
        type: 'valve',
        status: 'normal',
        reading: '68% Travel (Cv: 42.5)',
        standard: 'ANSI/ISA-75.01.01',
        details: 'Equal-percentage trim globe valve with double-acting pneumatic actuator.',
        pos: { x: 420, y: 80 }
      },
      'PSV-101': {
        tag: 'PSV-101',
        name: 'High-Pressure Safety Relief Valve',
        type: 'psv',
        status: 'normal',
        reading: 'Set: 4.80 MPa (696.2 psig)',
        standard: 'API 520 / ASME Section VIII',
        details: 'Balanced bellows safety relief valve discharging to closed flare header.',
        pos: { x: 550, y: 80 }
      },
      'TT-105': {
        tag: 'TT-105',
        name: 'Process Temperature Transmitter',
        type: 'transmitter',
        status: 'normal',
        reading: '180.0 °C (356.0 °F)',
        standard: 'ISA-5.1 Standard',
        details: 'Dual-element RTD Pt100 in thermowell. Margin to vapor pressure: +42°C.',
        pos: { x: 670, y: 80 }
      },
    },
    streamLines: [
      { id: 'feed-main', from: { x: 20, y: 80 }, to: { x: 740, y: 80 }, type: 'main' },
      { id: 'recirc-loop', from: { x: 420, y: 80 }, to: { x: 180, y: 135 }, type: 'recirc' },
      { id: 'relief-flare', from: { x: 550, y: 80 }, to: { x: 550, y: 25 }, type: 'relief' },
    ]
  },
  'loop-201': {
    id: 'loop-201',
    name: 'Loop 201: Column Overhead Vapor & Reflux System',
    description: 'Atmospheric Column T-101 Overhead to Reflux Drum V-201 & Pump P-102',
    service: 'Light Naphtha Vapor & Condensed Reflux (SG: 0.72)',
    nominalFlowGPM: 280,
    nominalPressurePsig: 75.0,
    nominalTempC: 120,
    components: {
      'T-101': {
        tag: 'T-101',
        name: 'Atmospheric Distillation Column',
        type: 'vessel',
        status: 'normal',
        reading: 'Top: 1.5 barg | 120°C',
        standard: 'ASME Section VIII Div 1',
        details: '47-tray fractionator column with wash oil spray section.',
        pos: { x: 120, y: 80 }
      },
      'E-102': {
        tag: 'E-102',
        name: 'Overhead Fin-Fan Condenser',
        type: 'exchanger',
        status: 'normal',
        reading: 'Duty: 12.5 MW | ΔP: 3.2 psi',
        standard: 'API 661 / TEMA Air-Cooled',
        details: 'Forced draft air-cooled heat exchanger with 6 variable-pitch fans.',
        pos: { x: 280, y: 80 }
      },
      'V-201': {
        tag: 'V-201',
        name: 'Reflux Accumulator Drum',
        type: 'vessel',
        status: 'normal',
        reading: 'Level: 58% | 1.2 barg',
        standard: 'ASME Section VIII Div 1',
        details: 'Horizontal 2-phase boot separator for water knockout.',
        pos: { x: 440, y: 80 }
      },
      'P-102': {
        tag: 'P-102',
        name: 'Overhead Reflux Pump',
        type: 'pump',
        status: 'normal',
        reading: '280 GPM | 95m Head',
        standard: 'API 610 BB2',
        details: 'Centrifugal reflux return pump with Plan 11/52 tandem seal.',
        pos: { x: 600, y: 80 }
      },
      'TIC-201': {
        tag: 'TIC-201',
        name: 'Overhead Temperature Controller',
        type: 'transmitter',
        status: 'normal',
        reading: '118.5 °C (Setpoint: 120°C)',
        standard: 'ISA-5.1 DCS Control',
        details: 'Cascaded to reflux flow controller FIC-201.',
        pos: { x: 710, y: 80 }
      }
    },
    streamLines: [
      { id: 'overhead-vapor', from: { x: 20, y: 80 }, to: { x: 740, y: 80 }, type: 'main' },
      { id: 'reflux-return', from: { x: 600, y: 80 }, to: { x: 120, y: 135 }, type: 'recirc' },
      { id: 'offgas-vent', from: { x: 440, y: 80 }, to: { x: 440, y: 25 }, type: 'relief' }
    ]
  },
  'loop-301': {
    id: 'loop-301',
    name: 'Loop 301: High-Pressure Boiler Feed Water (BFW)',
    description: 'High-Pressure Steam Generation & Thermal Economizer Network',
    service: 'Treated Deaerated BFW (SG: 1.0, 140°C)',
    nominalFlowGPM: 1800,
    nominalPressurePsig: 2200,
    nominalTempC: 145,
    components: {
      'P-201': {
        tag: 'P-201',
        name: 'Multi-Stage Boiler Feed Pump',
        type: 'pump',
        status: 'normal',
        reading: '2150 psig | 1800 GPM',
        standard: 'API 610 BB3 / ASME B31.1',
        details: 'Axially-split 9-stage barrel pump driven by 3500 HP induction motor.',
        pos: { x: 180, y: 80 }
      },
      'E-201': {
        tag: 'E-201',
        name: 'High-Pressure BFW Economizer',
        type: 'exchanger',
        status: 'normal',
        reading: '185°C Out | ΔT: +40°C',
        standard: 'ASME Section I Power Boiler',
        details: 'Flue-gas heat recovery coil in furnace convection section.',
        pos: { x: 380, y: 80 }
      },
      'LIC-101': {
        tag: 'LIC-101',
        name: 'Steam Drum 3-Element Level Controller',
        type: 'transmitter',
        status: 'normal',
        reading: 'Drum Level: 0 mm (Normal)',
        standard: 'ISA-77.42 Fossil Fuel',
        details: 'Feedwater-steam mass flow balanced 3-element PID controller.',
        pos: { x: 540, y: 80 }
      },
      'PSV-201': {
        tag: 'PSV-201',
        name: 'Superheater Safety Relief Valve',
        type: 'psv',
        status: 'normal',
        reading: 'Set: 2450 psig',
        standard: 'ASME Section I Part PG-67',
        details: 'Spring-loaded open-bonnet steam relief valve certified by National Board.',
        pos: { x: 670, y: 80 }
      }
    },
    streamLines: [
      { id: 'bfw-main', from: { x: 20, y: 80 }, to: { x: 740, y: 80 }, type: 'main' },
      { id: 'min-flow-recirc', from: { x: 180, y: 80 }, to: { x: 180, y: 135 }, type: 'recirc' },
      { id: 'steam-safety-vent', from: { x: 670, y: 80 }, to: { x: 670, y: 25 }, type: 'relief' }
    ]
  }
};

type FaultType = 'NONE' | 'CAVITATION' | 'VALVE_JAM' | 'OVERPRESSURE_TRIP';

export default function InteractivePIDWidget({
  title = 'Crude Distillation Unit High-Pressure P&ID Topology',
  tag = 'CDU-104',
}: {
  title?: string;
  tag?: string;
}) {
  const [activeLoopId, setActiveLoopId] = useState<string>('loop-101');
  const [selectedTag, setSelectedTag] = useState<string>('P-101');
  const [fault, setFault] = useState<FaultType>('NONE');
  const [showEmbeddedCanvas, setShowEmbeddedCanvas] = useState<boolean>(false);
  const [flowMultiplier, setFlowMultiplier] = useState<number>(1.0);

  const { selectTag, addToast } = useIndraStore();
  const currentLoop = PROCESS_LOOPS[activeLoopId] || PROCESS_LOOPS['loop-101'];

  // Switch active tag when loop changes
  useEffect(() => {
    const firstTag = Object.keys(currentLoop.components)[0];
    if (firstTag) {
      setSelectedTag(firstTag);
    }
  }, [activeLoopId, currentLoop]);

  const activeComp = currentLoop.components[selectedTag] || Object.values(currentLoop.components)[0];

  const handleTagClick = (tagId: string) => {
    setSelectedTag(tagId);
    selectTag(tagId);
    broadcastSyncEvent({
      type: 'TAG_SELECTED',
      tag: tagId,
      metadata: { source: 'InteractivePIDWidget', item: currentLoop.components[tagId] },
    });
  };

  const handleDetach = () => {
    window.open('/detach/pid', 'INDRA_PID_WINDOW', 'width=1280,height=850');
    addToast({
      type: 'info',
      title: 'P&ID Detached',
      message: 'P&ID Schematic detached to secondary monitor viewport.',
    });
  };

  const handleTriggerFault = (f: FaultType) => {
    setFault(f);
    if (f === 'CAVITATION') {
      addToast({
        type: 'warning',
        title: 'Cavitation Injected',
        message: 'NPSHa dropped below NPSHr. Suction vapor flashing simulated on P-101.',
      });
    } else if (f === 'VALVE_JAM') {
      addToast({
        type: 'error',
        title: 'Valve Actuator Jammed',
        message: 'FCV-101 travel frozen at 22%. Backpressure spike detected.',
      });
    } else if (f === 'OVERPRESSURE_TRIP') {
      addToast({
        type: 'error',
        title: 'Safety Relief PSV-101 Tripped',
        message: 'Line pressure reached 4.85 MPa. Safety valve lifted to flare header.',
      });
    } else {
      addToast({
        type: 'success',
        title: 'Nominal Operating State Restored',
        message: 'Process loop returned to steady-state baseline.',
      });
    }
  };

  // Compute live readings modified by simulated fault
  const getDynamicReading = (comp: PIDComponent) => {
    if (fault === 'CAVITATION' && comp.type === 'pump') {
      return 'NPSH ALERT: 4.8 mm/s RMS (Cavitation Flashing)';
    }
    if (fault === 'VALVE_JAM' && comp.type === 'valve') {
      return 'JAMMED @ 22% Travel (ΔP: 74 psi HIGH)';
    }
    if (fault === 'OVERPRESSURE_TRIP' && comp.type === 'psv') {
      return 'DISCHARGING: 5.10 MPa to Flare (LIFTED)';
    }
    return comp.reading;
  };

  return (
    <div className="w-full my-3 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-sm transition-all text-xs font-sans">
      {/* Header with Title & Loop Switcher */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800 gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-zinc-100 text-sm flex items-center gap-2">
              <span>{currentLoop.name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 font-mono font-bold">
                ISA-5.1 VERIFIED
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
              {currentLoop.description} &bull; {currentLoop.service}
            </div>
          </div>
        </div>

        {/* Viewport & Monitor Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowEmbeddedCanvas(!showEmbeddedCanvas)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-mono font-bold transition-all cursor-pointer ${
              showEmbeddedCanvas
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-200'
            }`}
            title="Toggle hardware-accelerated pan-zoom canvas engine"
          >
            <Maximize2 className="w-3 h-3" />
            <span>{showEmbeddedCanvas ? 'Schematic SVG' : 'Deep Canvas'}</span>
          </button>

          <button
            onClick={handleDetach}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-[11px] font-mono transition-colors cursor-pointer"
            title="Detach schematic to secondary monitor"
          >
            <ExternalLink className="w-3 h-3 text-slate-500" />
            <span>Detach</span>
          </button>
        </div>
      </div>

      {/* Process Loop Tabs */}
      <div className="flex items-center gap-1.5 my-2.5 overflow-x-auto pb-1 font-mono text-[11px]">
        {Object.values(PROCESS_LOOPS).map((loop) => (
          <button
            key={loop.id}
            onClick={() => {
              setActiveLoopId(loop.id);
              setFault('NONE');
            }}
            className={`px-2.5 py-1 rounded-lg transition-all shrink-0 cursor-pointer ${
              activeLoopId === loop.id
                ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold shadow-xs'
                : 'bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
            }`}
          >
            {loop.id.toUpperCase()}: {loop.name.split(':')[1]?.trim() || loop.name}
          </button>
        ))}
      </div>

      {/* Embedded Deep Canvas View Mode */}
      {showEmbeddedCanvas ? (
        <div className="my-3 h-72 rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
          <InteractivePIDCanvas
            activeTag={selectedTag}
            detectedTags={Object.keys(currentLoop.components)}
            onSelectTag={(t) => handleTagClick(t)}
            theme="dark"
            className="w-full h-full"
          />
        </div>
      ) : (
        /* Crisp Interactive SVG Schematic Diagram */
        <div className="my-2 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 overflow-x-auto">
          <svg viewBox="0 0 760 180" className="w-full h-44 min-w-[580px] select-none">
            <defs>
              <linearGradient id="pipeMainGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0284c7" />
                <stop offset="50%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>

              <linearGradient id="recircGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#d97706" />
                <stop offset="50%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>

              <linearGradient id="reliefGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#fb7185" />
              </linearGradient>

              <style>{`
                @keyframes mainFlow {
                  from { stroke-dashoffset: 24; }
                  to { stroke-dashoffset: 0; }
                }
                @keyframes recircFlow {
                  from { stroke-dashoffset: 20; }
                  to { stroke-dashoffset: 0; }
                }
                .flow-main {
                  stroke-dasharray: 6 6;
                  animation: mainFlow 1.0s linear infinite;
                }
                .flow-recirc {
                  stroke-dasharray: 5 5;
                  animation: recircFlow 1.4s linear infinite;
                }
                .flow-relief {
                  stroke-dasharray: 4 4;
                  animation: mainFlow 0.6s linear infinite;
                }
              `}</style>
            </defs>

            {/* Recirculation Spillback Line */}
            <path
              d="M 420,80 L 420,135 L 180,135 L 180,106"
              fill="none"
              stroke="#78350f"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 420,80 L 420,135 L 180,135 L 180,106"
              fill="none"
              stroke="url(#recircGlow)"
              strokeWidth="2"
              className="flow-recirc"
            />
            <text x="300" y="148" textAnchor="middle" fill="#f59e0b" fontSize="8" fontFamily="monospace" fontWeight="bold">
              Min-Flow Spillback Loop (FIC-101 Recirculation)
            </text>

            {/* Safety Relief Line to Flare */}
            <path
              d="M 550,80 L 550,30 L 730,30"
              fill="none"
              stroke="#881337"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M 550,80 L 550,30 L 730,30"
              fill="none"
              stroke="url(#reliefGlow)"
              strokeWidth={fault === 'OVERPRESSURE_TRIP' ? '3.5' : '1.8'}
              className="flow-relief"
            />
            <text x="640" y="24" textAnchor="middle" fill="#f43f5e" fontSize="8" fontFamily="monospace" fontWeight="bold">
              Closed Flare Header (API 521 Blowdown)
            </text>

            {/* Main Primary Process Pipe */}
            <line x1="20" y1="80" x2="740" y2="80" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
            <line x1="20" y1="80" x2="740" y2="80" stroke="url(#pipeMainGlow)" strokeWidth="3" className="flow-main" />

            {/* Flow Direction Arrows */}
            <polygon points="90,76 100,80 90,84" fill="#38bdf8" />
            <polygon points="350,76 360,80 350,84" fill="#38bdf8" />
            <polygon points="480,76 490,80 480,84" fill="#38bdf8" />
            <polygon points="615,76 625,80 615,84" fill="#38bdf8" />

            {/* Render Components in Active Loop */}
            {Object.entries(currentLoop.components).map(([tagId, comp]) => {
              const isSelected = selectedTag === tagId;
              const isCavitated = fault === 'CAVITATION' && comp.type === 'pump';
              const isJammed = fault === 'VALVE_JAM' && comp.type === 'valve';
              const isTripped = fault === 'OVERPRESSURE_TRIP' && comp.type === 'psv';
              const hasFault = isCavitated || isJammed || isTripped;

              return (
                <g
                  key={tagId}
                  onClick={() => handleTagClick(tagId)}
                  className="cursor-pointer transition-transform hover:scale-105"
                  transform={`translate(${comp.pos.x}, ${comp.pos.y})`}
                >
                  {/* Pump Graphic */}
                  {comp.type === 'pump' && (
                    <g>
                      <circle
                        r="26"
                        fill="#090d16"
                        stroke={hasFault ? '#f43f5e' : isSelected ? '#38bdf8' : '#334155'}
                        strokeWidth={isSelected || hasFault ? '2.5' : '1.5'}
                        className={hasFault ? 'animate-pulse' : ''}
                      />
                      <path d="M-12,-16 L16,0 L-12,16 Z" fill={hasFault ? '#f43f5e' : '#38bdf8'} opacity="0.85" />
                    </g>
                  )}

                  {/* Valve Graphic */}
                  {comp.type === 'valve' && (
                    <g>
                      <path
                        d="M-18,-12 L0,0 L-18,12 Z M18,-12 L0,0 L18,12 Z"
                        fill="#0f172a"
                        stroke={hasFault ? '#f43f5e' : isSelected ? '#10b981' : '#475569'}
                        strokeWidth="1.8"
                      />
                      <line x1="0" y1="0" x2="0" y2="-20" stroke="#475569" strokeWidth="1.5" />
                      <circle cx="0" cy="-26" r="7" fill="#090d16" stroke={hasFault ? '#f43f5e' : '#10b981'} strokeWidth="1.5" />
                    </g>
                  )}

                  {/* PSV Graphic */}
                  {comp.type === 'psv' && (
                    <g>
                      <line x1="0" y1="0" x2="0" y2="-45" stroke={hasFault ? '#f43f5e' : '#64748b'} strokeWidth="1.5" />
                      <path
                        d="M-12,-45 L12,-45 L0,-32 Z"
                        fill="#0f172a"
                        stroke={hasFault ? '#f43f5e' : isSelected ? '#f43f5e' : '#64748b'}
                        strokeWidth="1.8"
                        className={hasFault ? 'animate-bounce' : ''}
                      />
                      <line x1="0" y1="-45" x2="25" y2="-45" stroke={hasFault ? '#f43f5e' : '#64748b'} strokeWidth="1.5" />
                    </g>
                  )}

                  {/* Transmitter Graphic */}
                  {comp.type === 'transmitter' && (
                    <g>
                      <line x1="0" y1="0" x2="0" y2="-45" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 3" />
                      <circle
                        cy="-52"
                        r="16"
                        fill="#090d16"
                        stroke={isSelected ? '#38bdf8' : '#475569'}
                        strokeWidth={isSelected ? '2.5' : '1.5'}
                      />
                    </g>
                  )}

                  {/* Vessel / Column Graphic */}
                  {comp.type === 'vessel' && (
                    <g>
                      <rect
                        x="-20"
                        y="-45"
                        width="40"
                        height="90"
                        rx="12"
                        fill="#090d16"
                        stroke={isSelected ? '#38bdf8' : '#475569'}
                        strokeWidth={isSelected ? '2.5' : '1.5'}
                      />
                      <line x1="-15" y1="-20" x2="15" y2="-20" stroke="#334155" strokeWidth="1" strokeDasharray="2 2" />
                      <line x1="-15" y1="0" x2="15" y2="0" stroke="#334155" strokeWidth="1" strokeDasharray="2 2" />
                      <line x1="-15" y1="20" x2="15" y2="20" stroke="#334155" strokeWidth="1" strokeDasharray="2 2" />
                    </g>
                  )}

                  {/* Exchanger Graphic */}
                  {comp.type === 'exchanger' && (
                    <g>
                      <rect
                        x="-28"
                        y="-22"
                        width="56"
                        height="44"
                        rx="6"
                        fill="#090d16"
                        stroke={isSelected ? '#f59e0b' : '#475569'}
                        strokeWidth={isSelected ? '2.5' : '1.5'}
                      />
                      <path d="M-20,-10 C-10,10 10,-10 20,10" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
                    </g>
                  )}

                  {/* Tag Label Badge */}
                  <rect
                    x="-26"
                    y={comp.type === 'transmitter' ? '-60' : comp.type === 'psv' ? '-68' : comp.type === 'vessel' ? '-58' : '-38'}
                    width="52"
                    height="14"
                    rx="3"
                    fill="#0f172a"
                    stroke={hasFault ? '#f43f5e' : isSelected ? '#38bdf8' : '#334155'}
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y={comp.type === 'transmitter' ? '-50' : comp.type === 'psv' ? '-58' : comp.type === 'vessel' ? '-48' : '-28'}
                    textAnchor="middle"
                    fill={hasFault ? '#f43f5e' : '#f8fafc'}
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {comp.tag}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* Fault Injection Simulation Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800 text-[11px] font-mono">
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-zinc-400">
          <Sliders className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
          <span className="font-bold">Fault Injection Simulator:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => handleTriggerFault('NONE')}
            className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
              fault === 'NONE'
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-300'
            }`}
          >
            Nominal
          </button>
          <button
            onClick={() => handleTriggerFault('CAVITATION')}
            className={`px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer ${
              fault === 'CAVITATION'
                ? 'bg-amber-600 text-white font-bold'
                : 'bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-300'
            }`}
          >
            <Activity className="w-3 h-3" />
            <span>Cavitation</span>
          </button>
          <button
            onClick={() => handleTriggerFault('VALVE_JAM')}
            className={`px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer ${
              fault === 'VALVE_JAM'
                ? 'bg-rose-600 text-white font-bold'
                : 'bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-300'
            }`}
          >
            <AlertOctagon className="w-3 h-3" />
            <span>Valve Jam</span>
          </button>
          <button
            onClick={() => handleTriggerFault('OVERPRESSURE_TRIP')}
            className={`px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer ${
              fault === 'OVERPRESSURE_TRIP'
                ? 'bg-rose-600 text-white font-bold animate-pulse'
                : 'bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-300'
            }`}
          >
            <Flame className="w-3 h-3" />
            <span>PSV Lift</span>
          </button>
        </div>
      </div>

      {/* Selected Tag Inspector Card */}
      {activeComp && (
        <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-zinc-100 font-mono text-sm">
                {activeComp.tag}
              </span>
              <span className="text-slate-700 dark:text-zinc-300 font-medium">
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
              <div className={`font-bold font-mono text-xs ${
                fault !== 'NONE' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-zinc-200'
              }`}>
                {getDynamicReading(activeComp)}
              </div>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-semibold text-[10px]">
              <CheckCircle2 className="w-3 h-3" />
              <span>ISA Verified</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
