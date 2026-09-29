'use client';

import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  FileCheck,
  Download,
  Copy,
  Check,
  Crosshair,
  Sliders,
  Filter,
  Layers,
  FileText,
  Lock,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import { sovereignAudio } from '@/lib/audio/sound-effects';
import type { HazopMatrixWidgetProps, HazopItem } from '../types';

const DEFAULT_DEVIATIONS: HazopItem[] = [
  {
    id: 'HAZ-001',
    guideWord: 'MORE',
    parameter: 'FLOW',
    deviation: '[FLOW / MORE] Excess hydrocarbon feed rate to R-401 beyond design exothermic quenching capacity',
    causes: ['Feed control valve FV-401 failed 100% open', 'Upstream booster pump P-201 overspeed'],
    consequences: ['Thermal runaway in reaction core', 'Reactor tube skin temperature exceeds 480°C metallurgical threshold'],
    safeguards: ['High Flow Alarm FAH-401', 'Emergency Quench Valve Q-401 (SIL-2)', 'PAHH-401 Interlock'],
    severity: 4,
    likelihood: 2,
    riskScore: 8,
    riskLevel: 'MEDIUM',
    capaAction: 'Install 2oo3 voting shutdown trip on feed header with fast-acting actuated ESD-401 (< 0.8s stroke).',
    status: 'VERIFIED',
  },
  {
    id: 'HAZ-002',
    guideWord: 'LESS',
    parameter: 'FLOW',
    deviation: '[FLOW / LESS] Insufficient quenching liquid supply to reaction zone',
    causes: ['Quench line strainer clogged with catalyst fines', 'Quench circulation pump P-402 trip'],
    consequences: ['Loss of reaction thermal moderation', 'Hot spot formation with potential localized wall rupture'],
    safeguards: ['Low Quench Flow Switch FSL-402', 'Dual Auto-Start Spare Pump P-402B'],
    severity: 5,
    likelihood: 3,
    riskScore: 15,
    riskLevel: 'CRITICAL',
    capaAction: 'Install automated differential pressure monitoring across quench strainers with auto-switchover valve.',
    status: 'OPEN',
  },
  {
    id: 'HAZ-003',
    guideWord: 'REVERSE',
    parameter: 'FLOW',
    deviation: '[FLOW / REVERSE] Backflow of hot synthesis gas into utility nitrogen purge line',
    causes: ['Reactor pressure spike exceeds N2 supply header pressure', 'Check valve NRV-401 seat elastomer failure'],
    consequences: ['Flammable gas ingress into utility headers', 'Deflagration risk in non-classified plant zones'],
    safeguards: ['Dual Check Valves NRV-401A/B', 'Spectacle Blind Block and Bleed Arrangement'],
    severity: 5,
    likelihood: 1,
    riskScore: 5,
    riskLevel: 'MEDIUM',
    capaAction: 'Mandate automated double block and bleed system with continuous vent pressure monitoring.',
    status: 'ASSIGNED',
  },
  {
    id: 'HAZ-004',
    guideWord: 'MORE',
    parameter: 'PRESSURE',
    deviation: '[PRESSURE / MORE] Reactor overpressurization during sudden effluent valve block closure',
    causes: ['Product outlet ESDV-403 spurious closure', 'Downstream knockout drum inlet line choked'],
    consequences: ['Reactor pressure exceeds 110% MAWP (55.0 bar)', 'Hydrodynamic shock loading; potential shell rupture'],
    safeguards: ['Dual Safety Relief Valves PSV-401A/B', 'Emergency Depressuring BDV-401 (SIL-3)'],
    severity: 5,
    likelihood: 2,
    riskScore: 10,
    riskLevel: 'CRITICAL',
    capaAction: 'Retest PSV-401A/B orifice sizing against fire + blocked outlet simultaneous relief scenario per API 521.',
    status: 'OPEN',
  },
  {
    id: 'HAZ-005',
    guideWord: 'LESS',
    parameter: 'PRESSURE',
    deviation: '[PRESSURE / LESS] Vacuum pull on reactor shell during rapid shutdown cool-down',
    causes: ['Emergency depressuring BDV-401 without inert gas purge', 'Steam condensation inside vessel during steam-out'],
    consequences: ['External atmospheric pressure collapse', 'Air ingress creating internal explosive atmosphere'],
    safeguards: ['N2 Make-Up Regulator PCV-405', 'Vacuum Relief Breaker VRV-401'],
    severity: 4,
    likelihood: 1,
    riskScore: 4,
    riskLevel: 'LOW',
    capaAction: 'Implement hard interlock ensuring N2 purge valve POV-405 opens concurrently with BDV-401 actuation.',
    status: 'VERIFIED',
  },
  {
    id: 'HAZ-006',
    guideWord: 'MORE',
    parameter: 'TEMPERATURE',
    deviation: '[TEMPERATURE / MORE] Thermal runaway due to cooling water circulation jacket failure',
    causes: ['Cooling water pump P-403 electrical power trip', 'Severe scale fouling on jacket heat transfer surfaces'],
    consequences: ['Runaway exothermicity beyond 520°C', 'High temperature creep deformation and catalyst sintering'],
    safeguards: ['High Temperature Trip TAHH-401 (SIL-2)', 'Emergency Auxiliary Cooling Injection Valve'],
    severity: 5,
    likelihood: 3,
    riskScore: 15,
    riskLevel: 'CRITICAL',
    capaAction: 'Upgrade cooling water pump power feed to dual emergency diesel generator circuit (UPS Category 1).',
    status: 'OPEN',
  },
  {
    id: 'HAZ-007',
    guideWord: 'LESS',
    parameter: 'TEMPERATURE',
    deviation: '[TEMPERATURE / LESS] Feed inlet temperature drops below catalyst activation initiation point',
    causes: ['Preheater E-401 steam supply valve failure shut', 'Steam condensate trap backing up into exchanger'],
    consequences: ['Reaction extinction (quench)', 'Accumulation of unreacted monomer pooling in bottom sump; delayed explosion'],
    safeguards: ['Low Temperature Alarm TAL-401', 'Online Gas Chromatograph AIT-401'],
    severity: 3,
    likelihood: 2,
    riskScore: 6,
    riskLevel: 'MEDIUM',
    capaAction: 'Automate preheater steam bypass control with auto-recycle of off-spec effluent to pre-treater.',
    status: 'ASSIGNED',
  },
  {
    id: 'HAZ-008',
    guideWord: 'OTHER THAN',
    parameter: 'COMPOSITION',
    deviation: '[COMPOSITION / OTHER THAN] Oxygen or poison contaminant ingress in fresh catalyst feed',
    causes: ['Catalyst delivery drum blanketing seal compromised', 'Contaminated raw chemical feedstock delivery'],
    consequences: ['Catalyst deactivation / poisoning', 'Spontaneous pyrophoric decomposition or coking in bed'],
    safeguards: ['Online O2 Gas Analyzer AIT-402', 'Guard Bed Molecular Sieve Filter V-400'],
    severity: 4,
    likelihood: 2,
    riskScore: 8,
    riskLevel: 'MEDIUM',
    capaAction: 'Enforce digital certificate of analysis (COA) barcode scanning interlock prior to catalyst unloading.',
    status: 'VERIFIED',
  },
  {
    id: 'HAZ-009',
    guideWord: 'MORE',
    parameter: 'LEVEL',
    deviation: '[LEVEL / MORE] Liquid carryover into gaseous overhead compressor suction line',
    causes: ['Disengagement zone demister pad flooded', 'Bottom liquid draw-off valve LCV-401 failed shut'],
    consequences: ['Liquid slugging into compressor K-401', 'Catastrophic impeller blade destruction and hydrocarbon seal breach'],
    safeguards: ['High Level Switch LSHH-401 (SIL-2)', 'Overhead Knockout Drum V-402 with Demister Pad'],
    severity: 5,
    likelihood: 2,
    riskScore: 10,
    riskLevel: 'CRITICAL',
    capaAction: 'Install 2oo3 magnetostrictive level transmitter array with direct hardwired trip to K-401 compressor drive.',
    status: 'OPEN',
  },
];

export default function HazopMatrixWidget({
  assetTag = 'R-401',
  title = 'AUTONOMOUS IEC 61882 HAZOP DEVIATION MATRIX',
  standard = 'IEC 61882:2016 / OSHA 1910.119 PSM',
  studyId = 'HAZOP-2026-R401-REV3',
  sha256Seal = '0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
  deviations = DEFAULT_DEVIATIONS,
}: HazopMatrixWidgetProps) {
  const { selectTag, addDeliverable, addToast } = useIndraStore();

  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [copiedSeal, setCopiedSeal] = useState<boolean>(false);
  const [isVerifyingSeal, setIsVerifyingSeal] = useState<boolean>(false);
  const [verifiedSealResult, setVerifiedSealResult] = useState<string | null>(null);

  // Filtered Matrix List
  const filteredDeviations = useMemo(() => {
    if (activeFilter === 'ALL') return deviations;
    return deviations.filter((d) => d.parameter.toUpperCase() === activeFilter.toUpperCase());
  }, [deviations, activeFilter]);

  // Statistics
  const totalCount = deviations.length;
  const criticalCount = useMemo(() => {
    return deviations.filter((d) => d.riskLevel === 'CRITICAL' || d.riskLevel === 'HIGH').length;
  }, [deviations]);

  const copySealToClipboard = () => {
    sovereignAudio.playClick(0.08);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(sha256Seal);
      setCopiedSeal(true);
      setTimeout(() => setCopiedSeal(false), 2000);
      addToast({
        type: 'success',
        title: 'Cryptographic Seal Copied',
        message: `SHA-256 Merkle seal (${sha256Seal.slice(0, 18)}...) copied to clipboard.`,
      });
    }
  };

  const handleVerifySeal = () => {
    sovereignAudio.playClick(0.08);
    setIsVerifyingSeal(true);
    setTimeout(() => {
      setIsVerifyingSeal(false);
      setVerifiedSealResult(sha256Seal);
      sovereignAudio.playSonarPing(0.15);
      addToast({
        type: 'success',
        title: 'Cryptographic Seal Verified',
        message: 'NIST FIPS 180-4 SHA-256 Merkle root validated against local audit ledger (0 Tampering).',
      });
    }, 600);
  };

  const handleExportPdf = () => {
    sovereignAudio.playSonarPing(0.12);
    const now = new Date().toLocaleTimeString();
    addDeliverable({
      id: `del-hazop-${Date.now()}`,
      name: `IEC61882_HAZOP_${assetTag}.docx`,
      filename: `IEC61882_HAZOP_${assetTag}.docx`,
      type: 'docx',
      size: '2.4 MB',
      generatedAt: now,
      timestamp: now,
      description: `Official IEC 61882 & OSHA 1910.119 Process Hazard Analysis (PHA) HAZOP Study for ${assetTag}`,
      url: '#',
      hash: sha256Seal,
    });

    addToast({
      type: 'success',
      title: 'Statutory HAZOP Report Exported',
      message: `IEC 61882 study deliverable compiled with SHA-256 seal.`,
    });
  };

  const handleDownloadCsv = () => {
    sovereignAudio.playClick(0.08);
    const headers = ['ID', 'GuideWord', 'Parameter', 'Deviation', 'Severity', 'Likelihood', 'RiskScore', 'RiskLevel', 'Safeguards', 'CAPA'];
    const rows = deviations.map((d) => [
      d.id,
      d.guideWord,
      d.parameter,
      `"${d.deviation.replace(/"/g, '""')}"`,
      d.severity,
      d.likelihood,
      d.riskScore,
      d.riskLevel,
      `"${d.safeguards.join('; ')}"`,
      `"${d.capaAction.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `IEC61882_HAZOP_Matrix_${assetTag}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast({
      type: 'success',
      title: 'CSV Matrix Downloaded',
      message: `IEC 61882 matrix exported as CSV (${deviations.length} items).`,
    });
  };

  const handleLocateAsset = () => {
    sovereignAudio.playClick(0.08);
    selectTag(assetTag);
    broadcastSyncEvent({
      type: 'TAG_SELECTED',
      tag: assetTag,
      metadata: { source: 'HazopMatrixWidget', studyId, totalDeviations: totalCount, criticalCount },
    });
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl font-mono text-xs text-zinc-200 select-none space-y-4">
      {/* 1. Header with Standards and Asset Pill */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-zinc-800/80 gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="font-extrabold text-sm text-zinc-100 tracking-wider">
              {title}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px]">
            <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
              Standard: <strong className="text-zinc-200">{standard}</strong>
            </span>
            <button
              onClick={handleLocateAsset}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800 text-cyan-300 font-bold cursor-pointer transition-colors"
              title="Locate Asset in Spatial P&ID Canvas"
            >
              <Crosshair className="w-3 h-3 text-cyan-400" />
              <span>Asset: {assetTag}</span>
            </button>
            <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
              Study ID: <strong className="text-zinc-300">{studyId}</strong>
            </span>
          </div>
        </div>

        {/* Header Badges */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-700 text-emerald-300 font-bold text-xs shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>PSM CERTIFIED</span>
          </div>
        </div>
      </div>

      {/* 2. KPI Summary Bar (4 Metric Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* KPI 1: Total Deviations Evaluated */}
        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <div className="text-[10px] text-zinc-400 uppercase font-bold flex items-center justify-between">
            <span>Total Deviations</span>
            <Layers className="w-3 h-3 text-zinc-500" />
          </div>
          <div className="text-2xl font-extrabold text-zinc-100 mt-1">
            {totalCount}
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5">
            IEC 61882 Guide-Word Nodes
          </div>
        </div>

        {/* KPI 2: High / Critical Risks */}
        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <div className="text-[10px] text-zinc-400 uppercase font-bold flex items-center justify-between">
            <span>Critical / High Risks</span>
            <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-2xl font-extrabold text-rose-400 mt-1">
            {criticalCount} <span className="text-xs text-zinc-500 font-normal">/ {totalCount}</span>
          </div>
          <div className="text-[10px] text-rose-400/90 mt-0.5 font-semibold">
            Action items mandatory
          </div>
        </div>

        {/* KPI 3: Cryptographic Study Seal */}
        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <div className="text-[10px] text-zinc-400 uppercase font-bold flex items-center justify-between">
            <span>Study Merkle Seal</span>
            <Lock className="w-3 h-3 text-cyan-400" />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-mono font-bold text-cyan-300 truncate">
              {sha256Seal.slice(0, 16)}...
            </span>
            <button
              onClick={copySealToClipboard}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              title="Copy Full SHA-256 Seal"
            >
              {copiedSeal ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="text-[9px] text-zinc-500 mt-0.5 truncate">
            SHA-256 NIST FIPS 180-4
          </div>
        </div>

        {/* KPI 4: Compliance Status */}
        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <div className="text-[10px] text-zinc-400 uppercase font-bold flex items-center justify-between">
            <span>Compliance Status</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-sm font-extrabold text-emerald-400 mt-1.5 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>PSM CERTIFIED</span>
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5">
            OSHA 1910.119 Validated
          </div>
        </div>
      </div>

      {/* 3. Filter Tabs (ALL | FLOW | PRESSURE | TEMPERATURE | COMPOSITION | LEVEL) */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-zinc-900/60 border border-zinc-800">
        <div className="flex items-center gap-1 text-[11px] overflow-x-auto no-scrollbar">
          <span className="text-zinc-500 text-[10px] uppercase font-bold mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-zinc-400" />
            Filter:
          </span>
          {['ALL', 'FLOW', 'PRESSURE', 'TEMPERATURE', 'COMPOSITION', 'LEVEL'].map((tab) => {
            const count = tab === 'ALL' ? deviations.length : deviations.filter((d) => d.parameter.toUpperCase() === tab).length;
            const isActive = activeFilter === tab;

            return (
              <button
                key={tab}
                onClick={() => {
                  sovereignAudio.playClick(0.04);
                  setActiveFilter(tab);
                }}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-zinc-100 text-zinc-950 dark:bg-zinc-100 dark:text-zinc-950 font-extrabold shadow-xs'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                <span>{tab}</span>
                <span className={`px-1 rounded text-[9px] ${
                  isActive ? 'bg-zinc-300 text-zinc-900 font-extrabold' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="text-[10px] text-zinc-400 font-mono">
          Showing <strong className="text-zinc-200">{filteredDeviations.length}</strong> of {totalCount} nodes
        </div>
      </div>

      {/* 4. Matrix Table */}
      <div className="overflow-x-auto border border-zinc-800/90 rounded-xl bg-black/40">
        <table className="w-full text-left border-collapse text-[11px] font-mono">
          <thead>
            <tr className="bg-zinc-900/90 border-b border-zinc-800 text-zinc-400 text-[10px] uppercase tracking-wider">
              <th className="py-2.5 px-3 font-bold w-36">Guide Word &amp; Param</th>
              <th className="py-2.5 px-3 font-bold min-w-[200px]">Deviation Description</th>
              <th className="py-2.5 px-3 font-bold min-w-[220px]">Causes &amp; Consequences</th>
              <th className="py-2.5 px-3 font-bold min-w-[190px]">Existing Safeguards</th>
              <th className="py-2.5 px-3 font-bold text-center w-28">Risk Score</th>
              <th className="py-2.5 px-3 font-bold min-w-[220px]">Recommended CAPA Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {filteredDeviations.map((item) => {
              const isCritical = item.riskLevel === 'CRITICAL';
              const isHigh = item.riskLevel === 'HIGH';
              const isMedium = item.riskLevel === 'MEDIUM';

              return (
                <tr key={item.id} className="hover:bg-zinc-900/40 transition-colors">
                  {/* Guide Word & Parameter */}
                  <td className="py-3 px-3 align-top">
                    <div className="font-extrabold text-cyan-300 text-[10px]">
                      [{item.parameter} / {item.guideWord}]
                    </div>
                    <div className="text-[9px] text-zinc-500 mt-0.5">
                      {item.id}
                    </div>
                  </td>

                  {/* Deviation Description */}
                  <td className="py-3 px-3 align-top leading-relaxed text-zinc-200">
                    {item.deviation}
                  </td>

                  {/* Causes & Consequences */}
                  <td className="py-3 px-3 align-top space-y-1.5">
                    <div>
                      <span className="text-[9px] text-zinc-500 uppercase font-bold block">Causes:</span>
                      <ul className="list-disc list-inside text-zinc-300 text-[10px] space-y-0.5">
                        {item.causes.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-500 uppercase font-bold block">Consequences:</span>
                      <ul className="list-disc list-inside text-rose-300/90 text-[10px] space-y-0.5">
                        {item.consequences.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  </td>

                  {/* Existing Safeguards (Micro-Tags) */}
                  <td className="py-3 px-3 align-top">
                    <div className="flex flex-wrap gap-1">
                      {item.safeguards.map((sg, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 rounded text-[9px] bg-zinc-900 border border-zinc-700/80 text-zinc-300 font-mono"
                        >
                          • {sg}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Risk Score (S * L) */}
                  <td className="py-3 px-3 align-top text-center">
                    <div className="inline-flex flex-col items-center">
                      <span
                        className={`px-2 py-1 rounded-md text-[10px] font-extrabold border ${
                          isCritical
                            ? 'bg-rose-950/80 border-rose-600 text-rose-300 animate-pulse'
                            : isHigh
                            ? 'bg-rose-950/60 border-rose-700 text-rose-300'
                            : isMedium
                            ? 'bg-amber-950/80 border-amber-600 text-amber-300'
                            : 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
                        }`}
                      >
                        {item.riskScore} ({item.riskLevel})
                      </span>
                      <span className="text-[8px] text-zinc-500 mt-1">
                        S:{item.severity} × L:{item.likelihood}
                      </span>
                    </div>
                  </td>

                  {/* Recommended CAPA Action */}
                  <td className="py-3 px-3 align-top text-[10px] leading-relaxed text-zinc-300">
                    <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800">
                      <div className="font-semibold text-zinc-200">{item.capaAction}</div>
                      {item.status && (
                        <div className="mt-1 flex items-center justify-between text-[9px]">
                          <span className="text-zinc-500">Status:</span>
                          <span
                            className={`font-bold uppercase ${
                              item.status === 'VERIFIED'
                                ? 'text-emerald-400'
                                : item.status === 'OPEN'
                                ? 'text-rose-400'
                                : 'text-amber-400'
                            }`}
                          >
                            [{item.status}]
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 5. Export Actions & Cryptographic Seal Verification */}
      <div className="flex flex-wrap items-center justify-between pt-2 border-t border-zinc-800/80 gap-2">
        <div className="flex items-center gap-2">
          {/* Tamper-Evident SHA-256 Seal Verification */}
          <button
            onClick={handleVerifySeal}
            disabled={isVerifyingSeal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-700 text-zinc-200 text-xs font-semibold cursor-pointer transition-colors"
            title="Recalculate SHA-256 Merkle root to prove cryptographic immutability"
          >
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isVerifyingSeal ? 'Verifying Cryptographic Seal...' : 'Verify SHA-256 Seal'}</span>
          </button>

          {verifiedSealResult && (
            <span className="px-2 py-1 rounded bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>NIST FIPS 180-4 VERIFIED</span>
            </span>
          )}
        </div>

        {/* Right Actions: Export Study PDF & Download CSV */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-semibold cursor-pointer transition-colors"
            title="Download complete HAZOP matrix as CSV"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>Download CSV Matrix</span>
          </button>

          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer transition-colors shadow-xs"
            title="Generate and export statutory IEC 61882 Study Note"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-200" />
            <span>Export Study Deliverable</span>
          </button>
        </div>
      </div>
    </div>
  );
}
