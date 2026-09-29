'use client';

import React, { useState } from 'react';
import {
  GitCommit,
  GitBranch,
  ShieldAlert,
  ShieldCheck,
  Crosshair,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Layers,
  ArrowRight,
  Fish,
  Eye,
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import type {
  RootCauseAnalysisWidgetProps,
  FaultTreeNode,
  FiveWhyStep,
  BowTieBarrier,
  IshikawaCategory,
} from '../types';

export default function RootCauseAnalysisWidget({
  assetTag = 'K-102',
  title = 'INDUSTRIAL ROOT CAUSE ANALYSIS (RCA) MULTI-METHODOLOGY SUITE',
  incidentId = 'INC-2026-0928-01',
  incidentDate = '2026-09-28 04:35 UTC',
  topEventDescription = 'Unplanned Emergency Trip on High-High 2X Rotor Vibration & Seal Flush Loss',
  defaultTab = 'fta',
  faultTreeNodes: propFaultTree,
  fiveWhySteps: propFiveWhy,
  barriers: propBarriers,
  ishikawaCategories: propIshikawa,
}: RootCauseAnalysisWidgetProps) {
  const { selectTag, addDeliverable, addToast } = useIndraStore();
  const [activeTab, setActiveTab] = useState<'fta' | '5why' | 'bowtie' | 'fishbone'>(defaultTab);

  // Default Fault Tree Data
  const faultTree: FaultTreeNode[] = propFaultTree || [
    { id: 'TE', label: 'Top Event: K-102 High-High Vibration Trip (7.8 mm/s RMS)', type: 'TOP_EVENT' },
    { id: 'G1', label: 'OR Gate: Excessive Dynamic Unbalance OR Shaft Misalignment', type: 'OR_GATE' },
    { id: 'BE1', label: 'Basic Event 1: Impeller Vane Polymer Build-up (P = 0.042)', type: 'BASIC_EVENT', probability: 0.042 },
    { id: 'G2', label: 'AND Gate: Thermal Growth AND Coupling Shim Deflection', type: 'AND_GATE' },
    { id: 'BE2', label: 'Basic Event 2: Lube Oil Cooler Fouling (P = 0.085)', type: 'BASIC_EVENT', probability: 0.085 },
    { id: 'BE3', label: 'Basic Event 3: Missing Expansion Spool Bolting (P = 0.018)', type: 'BASIC_EVENT', probability: 0.018 },
  ];

  // Default 5-Why Chain
  const fiveWhys: FiveWhyStep[] = propFiveWhy || [
    {
      step: 1,
      why: 'Why did Compressor K-102 trip on high-high vibration?',
      finding: 'Radial vibration at drive-end journal bearing reached 7.82 mm/s RMS (Zone D trip limit 7.1 mm/s).',
      evidence: 'Online 30Hz FFT vibration telemetry captured 2X harmonic spike of 4.8 mm/s.',
    },
    {
      step: 2,
      why: 'Why did the 2X vibration harmonic suddenly spike to 4.8 mm/s?',
      finding: 'Severe angular coupling misalignment developed across flexible diaphragm coupling.',
      evidence: 'Laser alignment verification recorded 0.42 mm vertical offset versus 0.05 mm tolerance.',
    },
    {
      step: 3,
      why: 'Why did 0.42 mm coupling misalignment develop while running?',
      finding: 'Compressor discharge casing experienced uncompensated thermal pipe strain.',
      evidence: 'Spring hanger SH-104 on 16" discharge line was bottomed out with cracked load indicator.',
    },
    {
      step: 4,
      why: 'Why was spring hanger SH-104 bottomed out?',
      finding: 'Piping insulation was removed during turnaround and re-installed with heavier waterlogged calcium silicate.',
      evidence: 'Moisture density testing revealed 42% water absorption due to missing weather-jacketing seal.',
    },
    {
      step: 5,
      why: 'Why was wet calcium silicate installed without statutory weather jacketing?',
      finding: 'Root Management Cause: MOC (Management of Change) and QA inspection sign-off were bypassed for insulation re-jacketing.',
      evidence: 'MOC-2026-4412 lacked mandatory mechanical engineering field inspection sign-off.',
    },
  ];

  // Default Bow-Tie Barriers
  const bowTieBarriers: BowTieBarrier[] = propBarriers || [
    { id: 'PB1', type: 'PREVENTIVE', name: 'Spring Hanger Annual Cold/Hot Load Verification', status: 'FAILED', verificationDate: '2026-02-10' },
    { id: 'PB2', type: 'PREVENTIVE', name: 'Laser Optical Alignment Verification Post-Overhaul', status: 'DEGRADED', verificationDate: '2026-08-14' },
    { id: 'PB3', type: 'PREVENTIVE', name: 'Online 1X/2X FFT Vibration Alarm (Alert 4.5 mm/s)', status: 'EFFECTIVE', verificationDate: '2026-09-28' },
    { id: 'MB1', type: 'MITIGATIVE', name: 'API 670 Machinery Protection System Rapid Trip (< 50ms)', status: 'EFFECTIVE', verificationDate: '2026-09-28' },
    { id: 'MB2', type: 'MITIGATIVE', name: 'Automatic Anti-Surge Valve Fast Opening (Dump Recycle)', status: 'EFFECTIVE', verificationDate: '2026-09-28' },
    { id: 'MB3', type: 'MITIGATIVE', name: 'Dry Gas Seal N2 Backup Purge Auto-Injection', status: 'EFFECTIVE', verificationDate: '2026-09-28' },
  ];

  // Default Ishikawa 6M
  const ishikawa: IshikawaCategory[] = propIshikawa || [
    { category: 'Machine', causes: ['Flexible diaphragm coupling angular deflection', 'Drive-end tilt-pad bearing clearance wear'] },
    { category: 'Method', causes: ['MOC-2026-4412 bypassed for insulation jacket sign-off', 'Inadequate cold-alignment thermal growth calculation'] },
    { category: 'Material', causes: ['Waterlogged calcium silicate insulation (42% water weight)', 'Missing silicone sealant on aluminium cladding lap joints'] },
    { category: 'Measurement', causes: ['Spring hanger scale obscured by process dust', 'Offline vibration route interval set too wide (30 days)'] },
    { category: 'Man', causes: ['Contractor lagging team unfamiliar with weather-proofing spec', 'Shift handover missed 2X alarm advisory note'] },
    { category: 'Environment', causes: ['Monsoon driving rain preceding incident', 'High ambient humidity elevating piping condensation'] },
  ];

  const handleLocateTag = () => {
    selectTag(assetTag);
    broadcastSyncEvent({
      type: 'TAG_SELECTED',
      tag: assetTag,
      metadata: {
        source: 'RootCauseAnalysisWidget',
        incidentId,
        activeTab,
      },
    });
  };

  const handleExportRcaReport = () => {
    const now = new Date().toLocaleTimeString();
    addDeliverable({
      id: `del-rca-${Date.now()}`,
      name: `RCA_Investigation_${incidentId}.docx`,
      filename: `RCA_Investigation_${incidentId}.docx`,
      type: 'docx',
      size: '3.4 MB',
      generatedAt: now,
      timestamp: now,
      description: `Comprehensive 4-Methodology Root Cause Investigation for ${incidentId} (${assetTag})`,
      url: '#',
      hash: 'a7182901a87b1c09841829e71290384712093847109283741928374918237491',
    });

    addToast({
      type: 'success',
      title: 'RCA Investigation Exported',
      message: `Statutory incident investigation package compiled for ${assetTag}.`,
    });
  };

  return (
    <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl font-mono text-xs text-zinc-200 select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-zinc-800/80 gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handleLocateTag}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900/90 border border-rose-700/80 text-rose-300 font-bold transition-all cursor-pointer group"
            title="Locate asset on P&ID"
          >
            <Crosshair className="w-3.5 h-3.5 text-rose-400 group-hover:rotate-45 transition-transform" />
            <span>{assetTag}</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-zinc-100 tracking-wider">{title}</h4>
              <span className="px-2 py-0.5 rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800 text-[9px] font-bold">
                {incidentId}
              </span>
            </div>
            <div className="text-[10px] text-zinc-400">
              {incidentDate} • {topEventDescription}
            </div>
          </div>
        </div>

        {/* RCA Status & Export */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold border bg-rose-950/80 border-rose-700 text-rose-300">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>ROOT CAUSE CONFIRMED</span>
          </div>

          <button
            onClick={handleExportRcaReport}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-rose-400 transition-colors cursor-pointer"
            title="Export statutory RCA report"
          >
            <FileCheck className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4 Methodology Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 mb-3 overflow-x-auto text-[11px] font-bold">
        <button
          onClick={() => setActiveTab('fta')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
            activeTab === 'fta'
              ? 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-sm'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <GitBranch className="w-3.5 h-3.5 text-rose-400" />
          <span>1. Fault Tree Analysis (FTA)</span>
        </button>

        <button
          onClick={() => setActiveTab('5why')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
            activeTab === '5why'
              ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-sm'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>2. 5-Why Causality Chain</span>
        </button>

        <button
          onClick={() => setActiveTab('bowtie')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
            activeTab === 'bowtie'
              ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-sm'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
          <span>3. Bow-Tie Barrier Model</span>
        </button>

        <button
          onClick={() => setActiveTab('fishbone')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
            activeTab === 'fishbone'
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-sm'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          <span>4. Ishikawa (6M Fishbone)</span>
        </button>
      </div>

      {/* TAB 1: FAULT TREE ANALYSIS (FTA) */}
      {activeTab === 'fta' && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center space-y-2">
            {/* Top Event */}
            <div className="inline-block p-2.5 rounded-xl bg-rose-950 border border-rose-600 shadow-md">
              <div className="text-[9px] uppercase font-bold text-rose-400">TOP FAILURE EVENT</div>
              <div className="text-xs font-bold text-zinc-100">{faultTree[0].label}</div>
            </div>

            <div className="w-0.5 h-4 bg-zinc-700 mx-auto" />

            {/* OR Gate Symbol */}
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-zinc-900 border border-zinc-700 text-[10px] font-bold text-amber-400">
              <span>OR LOGIC GATE</span>
            </div>

            {/* Sub-Branches */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-left space-y-1">
                <span className="text-[9px] uppercase font-bold text-zinc-400">PRIMARY DYNAMIC PATH</span>
                <div className="font-bold text-zinc-200 text-xs">{faultTree[1].label}</div>
                <div className="text-[10px] text-rose-400 pt-1">
                  &bull; {faultTree[2].label}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-left space-y-1">
                <span className="text-[9px] uppercase font-bold text-zinc-400">THERMAL GROWTH & STRAIN PATH</span>
                <div className="font-bold text-zinc-200 text-xs">{faultTree[3].label}</div>
                <div className="text-[10px] text-amber-400 pt-1 space-y-0.5">
                  <div>&bull; {faultTree[4].label}</div>
                  <div>&bull; {faultTree[5].label}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 5-WHY CAUSALITY CHAIN */}
      {activeTab === '5why' && (
        <div className="space-y-2">
          {fiveWhys.map((step) => {
            const isRoot = step.step === 5;
            return (
              <div
                key={step.step}
                className={`p-3 rounded-xl border transition-all ${
                  isRoot
                    ? 'bg-rose-950/60 border-rose-500 shadow-md ring-1 ring-rose-500/50'
                    : 'bg-zinc-900/80 border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isRoot ? 'bg-rose-500 text-black' : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {step.step}
                    </span>
                    <span className="font-bold text-xs text-zinc-100">{step.why}</span>
                  </div>
                  {isRoot && (
                    <span className="px-2 py-0.5 rounded bg-rose-500 text-black text-[9px] font-bold">
                      ROOT MANAGEMENT DEFICIENCY
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-zinc-300 pl-7 mt-0.5">
                  <strong className="text-zinc-400">Finding:</strong> {step.finding}
                </div>
                <div className="text-[10px] text-zinc-500 pl-7 mt-0.5 font-normal">
                  <em>Evidence: {step.evidence}</em>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: BOW-TIE BARRIER MODEL */}
      {activeTab === 'bowtie' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
            {/* Left: Preventive Barriers */}
            <div className="space-y-2">
              <div className="text-[10px] uppercase font-bold text-cyan-400 pb-1 border-b border-zinc-800">
                &larr; PREVENTIVE BARRIERS (THREATS &rarr; TOP EVENT)
              </div>
              {bowTieBarriers
                .filter((b) => b.type === 'PREVENTIVE')
                .map((b) => (
                  <div key={b.id} className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-200">{b.name}</span>
                      <span
                        className={`text-[8px] font-bold px-1.5 py-0.2 rounded border ${
                          b.status === 'FAILED'
                            ? 'bg-rose-950 text-rose-300 border-rose-700'
                            : b.status === 'DEGRADED'
                            ? 'bg-amber-950 text-amber-300 border-amber-700'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>
                    <div className="text-[9px] text-zinc-500 mt-1">Verified: {b.verificationDate}</div>
                  </div>
                ))}
            </div>

            {/* Center: Top Loss Event */}
            <div className="p-3 rounded-xl bg-rose-950/80 border-2 border-rose-500 text-center shadow-lg">
              <div className="text-[9px] uppercase font-bold text-rose-300">CENTRAL TOP EVENT</div>
              <div className="text-xs font-bold text-white mt-1">
                K-102 ROTOR MISALIGNMENT & BEARING TRIP
              </div>
              <div className="text-[9px] text-zinc-300 mt-1">
                Loss of machinery containment / shaft deflection
              </div>
            </div>

            {/* Right: Mitigative Barriers */}
            <div className="space-y-2">
              <div className="text-[10px] uppercase font-bold text-emerald-400 pb-1 border-b border-zinc-800 text-right">
                MITIGATIVE BARRIERS (CONSEQUENCES) &rarr;
              </div>
              {bowTieBarriers
                .filter((b) => b.type === 'MITIGATIVE')
                .map((b) => (
                  <div key={b.id} className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-200">{b.name}</span>
                      <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
                        {b.status}
                      </span>
                    </div>
                    <div className="text-[9px] text-zinc-500 mt-1">Verified: {b.verificationDate}</div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ISHIKAWA (6M FISHBONE) */}
      {activeTab === 'fishbone' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {ishikawa.map((item) => (
            <div key={item.category} className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1.5">
              <div className="text-[10px] uppercase font-bold text-emerald-400 pb-1 border-b border-zinc-800 flex items-center justify-between">
                <span>6M: {item.category}</span>
                <span className="text-zinc-500">{item.causes.length} causes</span>
              </div>
              <ul className="space-y-1 text-[10px] text-zinc-300">
                {item.causes.map((c, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-zinc-500">&bull;</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Statutory Corrective Actions Footer */}
      <div className="mt-3 pt-3 border-t border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10px] text-zinc-400">
        <div>
          <strong>Mandatory Corrective Action (CAPA-2026-081):</strong> Enforce MOC field sign-off gate before spring hanger lagging release.
        </div>
        <div className="text-emerald-400 font-bold flex-shrink-0">
          OSHA 1910.119 PSM VERIFIED
        </div>
      </div>
    </div>
  );
}
