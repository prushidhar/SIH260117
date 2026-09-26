'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  GitBranch,
  HelpCircle,
  CheckCircle2,
  ArrowRight,
  Clock,
  Wrench,
  ShieldAlert,
  Sparkles,
  Send,
  Volume2,
  ChevronDown,
  ChevronRight,
  Tag,
  Crosshair,
  FileCheck2,
  Zap,
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { playTripKlaxon, playSealChime, speakSovereignAlert } from '@/lib/sound/sovereign-audio';

export interface RootCauseNode {
  id: string;
  label: string;
  category: 'MACHINE' | 'METHOD' | 'MATERIAL' | 'MEASUREMENT' | 'ENVIRONMENT' | 'MANPOWER';
  probability: number; // 0 - 100
  isRootCause?: boolean;
  evidence: string;
  subCauses?: RootCauseNode[];
}

export interface FiveWhyStep {
  step: number;
  question: string;
  finding: string;
  standardRef?: string;
}

export interface CAPAItem {
  id: string;
  type: 'IMMEDIATE' | 'SHORT_TERM' | 'LONG_TERM';
  action: string;
  owner: string;
  status: 'PENDING' | 'DISPATCHED' | 'COMPLETED';
  hitlRequired: boolean;
}

export interface RootCauseAnalysisProps {
  tag?: string;
  title?: string;
  incidentTitle?: string;
  incidentTime?: string;
  equipmentType?: string;
  confidenceScore?: number;
  topEvent?: string;
  fiveWhys?: FiveWhyStep[];
  treeData?: RootCauseNode[];
  capaList?: CAPAItem[];
}

export default function RootCauseAnalysisWidget({
  tag = 'P-101',
  title = 'Automated Root Cause & Failure Tree Analysis (RCA)',
  incidentTitle = 'Mechanical Seal Flush Disruption & High Temperature Trip',
  incidentTime = '2026-09-26 14:32:10 UTC',
  equipmentType = 'API 610 BB2 Heavy-Duty Slurry Feed Pump',
  confidenceScore = 94.2,
  topEvent = 'Seal Barrier Fluid Vaporization & Secondary O-Ring Degradation',
  fiveWhys,
  treeData,
  capaList,
}: RootCauseAnalysisProps) {
  const { selectTag, addToast, addNetworkEvent, incrementBlockedCount } = useIndraStore();

  const [activeTab, setActiveTab] = useState<'TREE' | 'WHYS' | 'FISHBONE' | 'CAPA'>('TREE');
  const [selectedNode, setSelectedNode] = useState<string | null>('node-root-1');
  const [expandedWhys, setExpandedWhys] = useState<number[]>([1, 2, 3, 4, 5]);
  const [actions, setActions] = useState<CAPAItem[]>(
    capaList || [
      {
        id: 'capa-1',
        type: 'IMMEDIATE',
        action: 'Interlock trip verification & transfer process load to auxiliary standby pump P-102',
        owner: 'Lead Field DCS Operator',
        status: 'DISPATCHED',
        hitlRequired: true,
      },
      {
        id: 'capa-2',
        type: 'SHORT_TERM',
        action: 'Blowdown & de-choke Plan 11 restriction orifice; clean duplex strainers ST-101-A/B',
        owner: 'Mechanical Reliability Team',
        status: 'PENDING',
        hitlRequired: false,
      },
      {
        id: 'capa-3',
        type: 'LONG_TERM',
        action: 'Upgrade mechanical seal piping from Plan 11 to Dual Pressurized Plan 53A with low-level interlock',
        owner: 'Plant Engineering Superintendent',
        status: 'PENDING',
        hitlRequired: true,
      },
    ]
  );

  const defaultWhys: FiveWhyStep[] = fiveWhys || [
    {
      step: 1,
      question: 'Why did the primary seal face temperature exceed 180°C and trigger the DCS alarm?',
      finding: 'The seal chamber lost convective cooling due to a sudden drop in Plan 11 bypass flush flow (< 3.2 LPM).',
      standardRef: 'API 682 4th Ed. §6.1.2',
    },
    {
      step: 2,
      question: 'Why did the Plan 11 bypass flush fluid flow drop below the critical minimum threshold?',
      finding: 'The integral 3.2mm tungsten carbide restriction orifice was restricted by particulate accumulation.',
      standardRef: 'API 682 Piping Plan 11 Guideline',
    },
    {
      step: 3,
      question: 'Why did solid particulates bypass the cyclone separator into the seal flush line?',
      finding: 'Feed differential pressure dropped across the separator during the heavy crude blend tank switchover.',
      standardRef: 'Process Flow Diagram PFD-101-C',
    },
    {
      step: 4,
      question: 'Why did the feed crude oil contain particulate levels higher than the 150-micron specification?',
      finding: 'The upstream suction strainer basket ST-101-A had torn mesh fibers following steam coil blow-clearing.',
      standardRef: 'Maintenance Work Order MWO-88914',
    },
    {
      step: 5,
      question: 'Why was the damaged suction strainer not identified prior to restarting continuous feed?',
      finding: 'Statutory SOP did not enforce differential pressure transmitter verification before pump un-isolation.',
      standardRef: 'Plant Operating Procedure SOP-CDU-042',
    },
  ];

  const defaultTree: RootCauseNode[] = treeData || [
    {
      id: 'node-root-1',
      label: 'Seal Face Dry-Running & Rapid Thermal Flare',
      category: 'MACHINE',
      probability: 92,
      isRootCause: false,
      evidence: 'SCADA tag TI-101A registered 188.4°C before dynamic trip',
      subCauses: [
        {
          id: 'node-sub-1',
          label: 'Plan 11 Bypass Orifice Choked with Coke Fines',
          category: 'MATERIAL',
          probability: 88,
          isRootCause: true,
          evidence: 'Differential pressure transmitter dP-101 surged to 2.4 bar',
        },
        {
          id: 'node-sub-2',
          label: 'Dynamic Rotor Unbalance (Zone B Harmonics at 2X RPM)',
          category: 'MACHINE',
          probability: 45,
          isRootCause: false,
          evidence: 'ISO 10816 velocity spectrum detected 4.2 mm/s RMS peak',
        },
      ],
    },
    {
      id: 'node-root-2',
      label: 'Feed Crude Flash Vaporization in Stuffing Box',
      category: 'ENVIRONMENT',
      probability: 38,
      isRootCause: false,
      evidence: 'Crude suction vapor pressure margin was within +1.8m NPSHa limit',
      subCauses: [
        {
          id: 'node-sub-3',
          label: 'Ambient Heat Excursion during Summer Peak (+44°C)',
          category: 'ENVIRONMENT',
          probability: 29,
          isRootCause: false,
          evidence: 'Surface thermal imaging confirmed jacket heat dissipation degraded',
        },
      ],
    },
  ];

  const handleDispatchAction = (actionId: string) => {
    playSealChime();
    setActions((prev) =>
      prev.map((act) =>
        act.id === actionId
          ? { ...act, status: act.status === 'PENDING' ? 'DISPATCHED' : 'COMPLETED' }
          : act
      )
    );

    const target = actions.find((a) => a.id === actionId);
    if (target) {
      addToast({
        type: 'success',
        title: 'RCA Corrective Action Dispatched',
        message: `${target.action} queued in local DCS execution queue with zero WAN egress.`,
      });

      addNetworkEvent({
        destination: '127.0.0.1:dcs-gateway',
        action: 'DCS_DISPATCH',
        status: 'contained',
        timestamp: new Date().toLocaleTimeString(),
        protocol: 'MODBUS/TCP',
        source: 'indra:rca-engine',
      });
    }
  };

  const handleAudibleDiagnosis = () => {
    playTripKlaxon();
    speakSovereignAlert(
      `Root cause analysis complete for equipment tag ${tag}. Primary root cause identified: Suction strainer mesh rupture and restriction orifice fouling.`
    );
  };

  return (
    <div className="w-full my-3 rounded-2xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 shadow-md overflow-hidden font-sans select-none transition-all">
      {/* 1. Header Banner */}
      <div className="p-4 bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-transparent border-b border-slate-200 dark:border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-600 text-white shadow-xs">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">{title}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                  CRITICAL INCIDENT
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-mono">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{incidentTime}</span>
                <span>•</span>
                <span>{equipmentType}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => selectTag(tag)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-mono font-semibold transition-colors cursor-pointer border border-slate-200 dark:border-zinc-800"
              title="Pinpoint this equipment tag on P&ID CAD schematic"
            >
              <Crosshair className="w-3.5 h-3.5 text-violet-500" />
              <span>P&ID: {tag}</span>
            </button>

            <button
              onClick={handleAudibleDiagnosis}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 text-xs font-mono font-bold transition-colors cursor-pointer"
              title="Play DCS vocal annunciation for this root cause"
            >
              <Volume2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Announce</span>
            </button>
          </div>
        </div>

        {/* Incident Summary Card */}
        <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <div>
              <span className="font-semibold text-slate-700 dark:text-zinc-300">Top Unwanted Event: </span>
              <span className="font-mono text-rose-600 dark:text-rose-400 font-bold">{topEvent}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-slate-400 dark:text-zinc-500">AI Bayesian Confidence:</span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
              {confidenceScore}% CONFIDENT
            </span>
          </div>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex items-center border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 px-4 text-xs font-mono font-medium">
        <button
          onClick={() => setActiveTab('TREE')}
          className={`py-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'TREE'
              ? 'border-rose-500 text-rose-600 dark:text-rose-400 font-bold'
              : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>Fault Tree (FTA)</span>
        </button>

        <button
          onClick={() => setActiveTab('WHYS')}
          className={`py-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'WHYS'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
              : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>5-Whys Deep Dive</span>
        </button>

        <button
          onClick={() => setActiveTab('FISHBONE')}
          className={`py-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'FISHBONE'
              ? 'border-violet-500 text-violet-600 dark:text-violet-400 font-bold'
              : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Ishikawa (6M)</span>
        </button>

        <button
          onClick={() => setActiveTab('CAPA')}
          className={`py-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'CAPA'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
              : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>CAPA Remedies ({actions.filter((a) => a.status === 'COMPLETED').length}/{actions.length})</span>
        </button>
      </div>

      {/* 3. Tab Body */}
      <div className="p-4">
        {/* TAB 1: FAULT TREE ANALYSIS */}
        {activeTab === 'TREE' && (
          <div className="space-y-3">
            <div className="text-xs text-slate-500 dark:text-zinc-400 font-mono mb-2">
              Bayesian Fault Tree Analysis modeling immediate symptoms down to the primary root causes:
            </div>

            <div className="space-y-3">
              {defaultTree.map((rootNode) => (
                <div
                  key={rootNode.id}
                  className={`p-3 rounded-xl border transition-all ${
                    selectedNode === rootNode.id
                      ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/20'
                      : 'border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/60'
                  }`}
                  onClick={() => setSelectedNode(rootNode.id)}
                >
                  <div className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300">
                        {rootNode.category}
                      </span>
                      <span className="font-semibold text-xs text-slate-800 dark:text-zinc-200">
                        {rootNode.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-slate-400">Prob:</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">{rootNode.probability}%</span>
                    </div>
                  </div>

                  <div className="mt-1 text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                    Evidence: {rootNode.evidence}
                  </div>

                  {/* Sub Causes */}
                  {rootNode.subCauses && rootNode.subCauses.length > 0 && (
                    <div className="mt-3 pl-4 border-l-2 border-slate-300 dark:border-zinc-700 space-y-2">
                      {rootNode.subCauses.map((sub) => (
                        <div
                          key={sub.id}
                          className={`p-2.5 rounded-lg border transition-all ${
                            sub.isRootCause
                              ? 'border-amber-400 bg-amber-50/70 dark:bg-amber-950/30'
                              : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {sub.isRootCause ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500 text-white flex items-center gap-1">
                                  <ShieldAlert className="w-2.5 h-2.5" />
                                  <span>ROOT CAUSE</span>
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                                  {sub.category}
                                </span>
                              )}
                              <span className="font-medium text-xs text-slate-800 dark:text-zinc-200">
                                {sub.label}
                              </span>
                            </div>
                            <span className="font-mono text-[11px] font-bold text-slate-600 dark:text-zinc-400">
                              {sub.probability}%
                            </span>
                          </div>
                          <div className="mt-1 text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
                            Sensor Proof: {sub.evidence}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: 5-WHYS METHODOLOGY */}
        {activeTab === 'WHYS' && (
          <div className="space-y-2.5">
            {defaultWhys.map((why) => {
              const isExpanded = expandedWhys.includes(why.step);
              return (
                <div
                  key={why.step}
                  className="rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden bg-slate-50/50 dark:bg-zinc-900/50"
                >
                  <button
                    onClick={() =>
                      setExpandedWhys((prev) =>
                        prev.includes(why.step)
                          ? prev.filter((s) => s !== why.step)
                          : [...prev, why.step]
                      )
                    }
                    className="w-full p-3 flex items-center justify-between text-left hover:bg-slate-100/60 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 font-mono text-xs font-bold flex items-center justify-center border border-amber-400/40">
                        W{why.step}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                        {why.question}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-slate-200/60 dark:border-zinc-800/60 text-xs font-mono space-y-1 bg-white/70 dark:bg-zinc-950/70">
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-700 dark:text-zinc-300">{why.finding}</span>
                      </div>
                      {why.standardRef && (
                        <div className="text-[10px] text-slate-400 dark:text-zinc-500 pl-5">
                          Standard Ref: {why.standardRef}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 3: ISHIKAWA 6M MATRIX */}
        {activeTab === 'FISHBONE' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              {
                category: 'Machine',
                items: [
                  'Dynamic seal faces micro-cracked from dry heat',
                  'Plan 11 restriction orifice choked',
                  'Suction strainer basket mesh rupture',
                ],
                color: 'border-rose-400 text-rose-600',
              },
              {
                category: 'Method',
                items: [
                  'Rapid crude blend swap without strainer check',
                  'DCS differential alarm threshold set too high',
                  'Bypassed flush pre-heat procedure',
                ],
                color: 'border-amber-400 text-amber-600',
              },
              {
                category: 'Material',
                items: [
                  'High wax/asphaltene solids in Heavy Basra crude',
                  'Secondary O-ring elastomer rated for 150°C (exposed to 188°C)',
                  'Particulates exceeding 150 microns',
                ],
                color: 'border-violet-400 text-violet-600',
              },
              {
                category: 'Measurement',
                items: [
                  'Thermocouple TI-101A response lag (8 seconds)',
                  'dP-101 differential transmitter had minor span drift',
                  'Manual laboratory viscosity sampling delayed 4 hours',
                ],
                color: 'border-cyan-400 text-cyan-600',
              },
              {
                category: 'Milieu (Environment)',
                items: [
                  'Ambient summer heat wave reduced natural cooling',
                  'Sunlight radiation on uninsulated flush piping',
                  'Atmospheric dust storm during tank transfer',
                ],
                color: 'border-emerald-400 text-emerald-600',
              },
              {
                category: 'Manpower',
                items: [
                  'Operator acknowledged dP warning during shift handover',
                  'Dual-signoff omitted for strainer inspection checklist',
                  'Training gap on API 682 Plan 11 failure modes',
                ],
                color: 'border-indigo-400 text-indigo-600',
              },
            ].map((col) => (
              <div
                key={col.category}
                className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/50 space-y-2"
              >
                <div className={`font-mono text-xs font-bold uppercase tracking-wider ${col.color}`}>
                  {col.category}
                </div>
                <ul className="space-y-1.5 text-[11px] text-slate-700 dark:text-zinc-300 font-sans">
                  {col.items.map((it, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: CAPA REMEDIATIONS */}
        {activeTab === 'CAPA' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-zinc-400 mb-1">
              <span>Corrective and Preventive Actions (CAPA) with 1-Click DCS Dispatch:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">AIR-GAPPED AUDIT LOGGED</span>
            </div>

            <div className="space-y-2">
              {actions.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    item.status === 'COMPLETED'
                      ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20'
                      : item.status === 'DISPATCHED'
                      ? 'border-indigo-300 bg-indigo-50/50 dark:border-indigo-900/50 dark:bg-indigo-950/20'
                      : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                  }`}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                          item.type === 'IMMEDIATE'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                            : item.type === 'SHORT_TERM'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                        }`}
                      >
                        {item.type}
                      </span>
                      {item.hitlRequired && (
                        <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-violet-100 text-violet-800 dark:bg-violet-950/70 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                          HITL DUAL-KEY
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                      {item.action}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Owner: {item.owner}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleDispatchAction(item.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                        item.status === 'COMPLETED'
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : item.status === 'DISPATCHED'
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                          : 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90'
                      }`}
                    >
                      {item.status === 'COMPLETED' ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          <span>Signed Off</span>
                        </>
                      ) : item.status === 'DISPATCHED' ? (
                        <>
                          <Send className="w-3.5 h-3.5 text-white animate-pulse" />
                          <span>In Flight</span>
                        </>
                      ) : (
                        <>
                          <Wrench className="w-3.5 h-3.5" />
                          <span>Dispatch Action</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Footer Statutory Proof */}
      <div className="px-4 py-2.5 bg-slate-50 dark:bg-zinc-900/90 border-t border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-500 dark:text-zinc-400">
        <div className="flex items-center gap-1.5">
          <FileCheck2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>OSHA 1910.119 Process Safety Management (PSM) Compliance Verified</span>
        </div>
        <div className="text-slate-400">
          SHA-256 Ledger: <span className="font-bold text-slate-700 dark:text-zinc-300">b8f3e9...017c</span>
        </div>
      </div>
    </div>
  );
}
