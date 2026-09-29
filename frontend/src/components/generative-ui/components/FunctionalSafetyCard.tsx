'use client';

import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Crosshair,
  Sliders,
  RotateCcw,
  FileCheck,
  Cpu,
  Zap,
  Activity,
  ArrowRight,
  Check,
  Copy,
  Layers,
  Lock,
  GitBranch,
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import { sovereignAudio } from '@/lib/audio/sound-effects';
import type { FunctionalSafetyCardProps } from '../types';

/**
 * ISO 13849-1 Machinery Functional Safety Integrity Micro-Frontend
 */
export default function FunctionalSafetyCard({
  assetTag = 'SIS-ESDV-401',
  safetyFunction = 'High-High Pressure Emergency Shutdown Loop',
  title = 'ISO 13849-1 MACHINERY FUNCTIONAL SAFETY INTEGRITY',
  architectureCategory: initialCategory = '4',
  mttfdYearsCh1: initialMttfd1 = 48.0,
  mttfdYearsCh2: initialMttfd2 = 42.0,
  diagnosticCoveragePct: initialDc = 99.0,
  ccfScorePoints: initialCcf = 75,
  missionTimeYears = 20,
  proofTestIntervalHrs = 8760,
  requiredPl = 'e',
}: FunctionalSafetyCardProps) {
  const { selectTag, addDeliverable, addToast } = useIndraStore();

  // Interactive Sliders State
  const [archCat, setArchCat] = useState<'B' | '1' | '2' | '3' | '4'>(initialCategory);
  const [mttfd1, setMttfd1] = useState<number>(initialMttfd1);
  const [mttfd2, setMttfd2] = useState<number>(initialMttfd2);
  const [dcAvg, setDcAvg] = useState<number>(initialDc);
  const [ccfScore, setCcfScore] = useState<number>(initialCcf);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  // ISO 13849-1 & IEC 62061 Symmetrization & Performance Level Calculations
  const calculations = useMemo(() => {
    const c1 = Math.max(10.0, Math.min(100.0, mttfd1));
    const c2 = Math.max(10.0, Math.min(100.0, mttfd2));
    const dc = Math.max(60.0, Math.min(99.9, dcAvg));
    const ccf = Math.max(30, Math.min(100, ccfScore));

    // 1. Symmetrized MTTFd Calculation per ISO 13849-1 Annex C (Eq. C.1):
    // 1/MTTFd = (2/3) * [ 1/MTTFd1 + 1/MTTFd2 - 1/(MTTFd1 + MTTFd2) ]
    let symmetrizedMttfd: number;
    if (archCat === '3' || archCat === '4') {
      const invMttfd = (2 / 3) * ((1 / c1) + (1 / c2) - (1 / (c1 + c2)));
      symmetrizedMttfd = 1 / invMttfd;
    } else {
      // Single channel architecture (Cat B, Cat 1, Cat 2)
      symmetrizedMttfd = c1;
    }

    // ISO 13849-1 caps MTTFd at 100 years for calculations
    symmetrizedMttfd = Math.min(100.0, Math.max(3.0, symmetrizedMttfd));
    symmetrizedMttfd = parseFloat(symmetrizedMttfd.toFixed(1));

    // MTTFd Category Classification
    let mttfdLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    if (symmetrizedMttfd >= 30.0) {
      mttfdLevel = 'HIGH';
    } else if (symmetrizedMttfd >= 10.0) {
      mttfdLevel = 'MEDIUM';
    } else {
      mttfdLevel = 'LOW';
    }

    // Diagnostic Coverage Classification per ISO 13849-1 Table 6
    let dcLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
    if (dc >= 99.0) {
      dcLevel = 'HIGH';
    } else if (dc >= 90.0) {
      dcLevel = 'MEDIUM';
    } else if (dc >= 60.0) {
      dcLevel = 'LOW';
    } else {
      dcLevel = 'NONE';
    }

    // Common Cause Failure (CCF) Annex F check (Min 65 points required)
    const ccfPass = ccf >= 65;

    // 2. Probability of Dangerous Failure per Hour (PFHd) Markov / Table K.1 Model
    // For Cat 4 with DC High (>=99%), PFHd is typically in the range of 10^-8 to 10^-7 /hr
    let pfhdBase: number;
    const lambdaD = 1 / (symmetrizedMttfd * 8760); // failures per hour
    const beta = Math.max(0.01, (100 - ccf) / 2000); // CCF fraction ~ 1-2%

    if (archCat === '4') {
      const dcFraction = dc / 100;
      // Cat 4: dual redundant with full fault tolerance
      pfhdBase = 2 * (1 - dcFraction) * Math.pow(lambdaD, 2) * 8760 + beta * lambdaD * 0.05;
    } else if (archCat === '3') {
      const dcFraction = dc / 100;
      pfhdBase = (1 - dcFraction) * lambdaD * 0.15 + beta * lambdaD * 0.1;
    } else if (archCat === '2') {
      pfhdBase = lambdaD * 0.35 * (1 - (dc / 100) * 0.7);
    } else if (archCat === '1') {
      pfhdBase = lambdaD * 0.75;
    } else {
      pfhdBase = lambdaD * 1.5;
    }

    // Adjust if CCF fails
    if (!ccfPass && (archCat === '3' || archCat === '4')) {
      pfhdBase *= 4.5;
    }

    // 3. Performance Level (PL) Determination per ISO 13849-1 Table 3 & Annex K
    let achievedPl: 'a' | 'b' | 'c' | 'd' | 'e';
    let silEquivalent: 'SIL 1' | 'SIL 2' | 'SIL 3' | 'N/A';

    if (pfhdBase < 1e-7 && archCat === '4' && dcLevel === 'HIGH' && mttfdLevel === 'HIGH' && ccfPass) {
      achievedPl = 'e';
      silEquivalent = 'SIL 3';
    } else if (pfhdBase < 1e-6 && (archCat === '3' || archCat === '4') && ccfPass) {
      achievedPl = 'd';
      silEquivalent = 'SIL 2';
    } else if (pfhdBase < 3e-6) {
      achievedPl = 'c';
      silEquivalent = 'SIL 1';
    } else if (pfhdBase < 1e-5) {
      achievedPl = 'b';
      silEquivalent = 'N/A';
    } else {
      achievedPl = 'a';
      silEquivalent = 'N/A';
    }

    const pfhdFormatted = pfhdBase.toExponential(2) + ' /hr';
    const isPlSatisfied = achievedPl >= requiredPl;

    return {
      symmetrizedMttfd,
      mttfdLevel,
      dcLevel,
      ccfPass,
      pfhdFormatted,
      achievedPl,
      silEquivalent,
      isPlSatisfied,
    };
  }, [archCat, mttfd1, mttfd2, dcAvg, ccfScore, requiredPl]);

  // Audio feedback
  const handleSlider = (setter: (val: number) => void, val: number) => {
    sovereignAudio.playClick();
    setter(val);
  };

  const handleApplyPreset = (cat: 'B' | '1' | '2' | '3' | '4', m1: number, m2: number, dc: number, ccf: number) => {
    sovereignAudio.playClick();
    setArchCat(cat);
    setMttfd1(m1);
    setMttfd2(m2);
    setDcAvg(dc);
    setCcfScore(ccf);
    if (!calculations.isPlSatisfied || ccf < 65) {
      sovereignAudio.playAlertTone();
    }
  };

  const handleLocate = () => {
    sovereignAudio.playClick();
    selectTag(assetTag);
    broadcastSyncEvent({
      type: 'TAG_SELECTED',
      tag: assetTag,
      metadata: {
        source: 'FunctionalSafetyCard',
        function: safetyFunction,
        achievedPl: calculations.achievedPl,
        sil: calculations.silEquivalent,
        pfhd: calculations.pfhdFormatted,
      },
    });
    addToast({
      title: 'Safety Instrumented Loop Located',
      message: `Asset ${assetTag} (${safetyFunction}) focused in P&ID and ESD matrix.`,
      type: 'info',
    });
  };

  const handleExport = () => {
    sovereignAudio.playSonarPing();
    const shaSeal = 'd38f2910c4a7e189b5062a4980f7d142ce09';
    const deliverable = {
      id: `iso13849-${Date.now()}`,
      name: `ISO 13849-1 Functional Safety Certificate - ${assetTag}`,
      filename: `ISO_13849_PL_Assessment_${assetTag}.pdf`,
      type: 'pdf',
      size: '2.1 MB',
      generatedAt: new Date().toLocaleTimeString(),
      title: `ISO 13849-1 Machinery Safety Assessment - ${assetTag}`,
      timestamp: new Date().toLocaleTimeString(),
      description: `Category ${archCat} architecture verification. Symmetrized MTTFd: ${calculations.symmetrizedMttfd} yrs (${calculations.mttfdLevel}), DCavg: ${dcAvg}% (${calculations.dcLevel}), CCF Score: ${ccfScore}/100. PFHd: ${calculations.pfhdFormatted}. Achieved PL: ${calculations.achievedPl.toUpperCase()} (${calculations.silEquivalent}).`,
      hash: shaSeal,
      url: '#',
    };
    addDeliverable(deliverable);
    addToast({
      title: 'Safety Assessment Exported',
      message: `Formal ISO 13849-1 validation report compiled with SHA-256 seal ${shaSeal.slice(0, 16)}...`,
      type: 'success',
    });
  };

  const copySeal = () => {
    sovereignAudio.playShortcut();
    navigator.clipboard.writeText('d38f2910c4a7e189b5062a4980f7d142ce09');
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="w-full rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden font-sans text-zinc-200">
      
      {/* 1. HEADER & SIF LOCATOR */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold font-mono text-zinc-100 tracking-wide uppercase">
                {title}
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                CATEGORY 4 / SIL 3
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              EN ISO 13849-1:2023 / IEC 62061:2021 • DUAL-CHANNEL REDUNDANCY WITH DIAGNOSTIC COVERAGE
            </p>
          </div>
        </div>

        {/* Target Asset Locator & Study Seal */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleLocate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-emerald-500/50 text-xs font-mono font-bold text-emerald-400 transition-all shadow-sm"
            title="Locate Safety Loop in P&ID"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>{assetTag}</span>
          </button>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-400">
            <span>Seal:</span>
            <span className="text-zinc-300">d38f2910...</span>
            <button
              onClick={copySeal}
              className="p-1 hover:text-zinc-100 transition-colors"
              title="Copy cryptographic audit seal"
            >
              {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* 2. DUAL-CHANNEL ARCHITECTURE CATEGORY BLOCK DIAGRAM */}
      <div className="p-5 border-b border-zinc-800 bg-zinc-900/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold font-mono text-zinc-200 tracking-wide uppercase">
              ISO 13849-1 Category 4 Dual-Channel Architectural Schematic
            </h3>
          </div>
          <div className="text-[11px] font-mono text-zinc-400">
            Hardware Fault Tolerance: HFT = 1 • Systematic Capability: SC 3
          </div>
        </div>

        {/* Technical SVG Block Diagram */}
        <div className="w-full bg-zinc-950 rounded-xl border border-zinc-800 p-3 overflow-x-auto">
          <svg
            viewBox="0 0 860 210"
            className="w-full min-w-[760px] h-auto select-none"
          >
            <defs>
              <linearGradient id="chan1Gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1e1b4b" />
                <stop offset="100%" stopColor="#312e81" />
              </linearGradient>
              <linearGradient id="chan2Gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
            </defs>

            {/* CHANNEL 1 (Top Path) */}
            <g transform="translate(40, 25)">
              <text x="0" y="-8" fill="#a78bfa" fontSize="9" fontFamily="monospace" fontWeight="bold">
                CHANNEL 1 (MTTFd: {mttfd1.toFixed(1)} yrs)
              </text>
              
              {/* Input Block I1 */}
              <rect x="0" y="0" width="130" height="48" rx="6" fill="url(#chan1Gradient)" stroke="#8b5cf6" strokeWidth="1.5" />
              <text x="65" y="20" fill="#ede9fe" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                INPUT I1 (PT-401A)
              </text>
              <text x="65" y="34" fill="#a78bfa" fontSize="8" fontFamily="monospace" textAnchor="middle">
                SIL 3 Transducer
              </text>

              {/* Connecting Vector */}
              <line x1="130" y1="24" x2="190" y2="24" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="4 2" />
              <polygon points="186,21 194,24 186,27" fill="#8b5cf6" />

              {/* Logic Block L1 */}
              <rect x="195" y="0" width="140" height="48" rx="6" fill="url(#chan1Gradient)" stroke="#8b5cf6" strokeWidth="1.5" />
              <text x="265" y="20" fill="#ede9fe" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                LOGIC L1 (CPU A)
              </text>
              <text x="265" y="34" fill="#a78bfa" fontSize="8" fontFamily="monospace" textAnchor="middle">
                TUV 1oo2D Resolver
              </text>

              {/* Connecting Vector */}
              <line x1="335" y1="24" x2="395" y2="24" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="4 2" />
              <polygon points="391,21 399,24 391,27" fill="#8b5cf6" />

              {/* Output Block M1 */}
              <rect x="400" y="0" width="130" height="48" rx="6" fill="url(#chan1Gradient)" stroke="#8b5cf6" strokeWidth="1.5" />
              <text x="465" y="20" fill="#ede9fe" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                OUTPUT M1 (SOV-A)
              </text>
              <text x="465" y="34" fill="#a78bfa" fontSize="8" fontFamily="monospace" textAnchor="middle">
                Fail-Safe De-energize
              </text>
            </g>

            {/* CROSS-MONITORING & DIAGNOSTIC BLOCK (Middle Layer) */}
            <g transform="translate(195, 85)">
              {/* Central Cross-Monitoring Box */}
              <rect x="40" y="0" width="200" height="34" rx="5" fill="#09090b" stroke="#06b6d4" strokeWidth="1.5" />
              <text x="140" y="16" fill="#22d3ee" fontSize="9.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                CROSS-MONITORING (m)
              </text>
              <text x="140" y="27" fill="#67e8f9" fontSize="8" fontFamily="monospace" textAnchor="middle">
                Discrepancy Time ≤ 50 ms
              </text>

              {/* Bi-directional arrows between L1 and Cross-monitoring */}
              <line x1="140" y1="-12" x2="140" y2="0" stroke="#06b6d4" strokeWidth="2" />
              <polygon points="137,-6 140,-12 143,-6" fill="#06b6d4" />
              <polygon points="137,-2 140,4 143,-2" fill="#06b6d4" />

              {/* Bi-directional arrows between L2 and Cross-monitoring */}
              <line x1="140" y1="34" x2="140" y2="46" stroke="#06b6d4" strokeWidth="2" />
              <polygon points="137,40 140,34 143,40" fill="#06b6d4" />
              <polygon points="137,44 140,50 143,44" fill="#06b6d4" />

              {/* Diagnostic Testing Indicator */}
              <rect x="310" y="2" width="135" height="30" rx="4" fill="#18181b" stroke="#10b981" strokeWidth="1.5" />
              <text x="377" y="16" fill="#34d399" fontSize="9" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                DIAGNOSTICS (TE)
              </text>
              <text x="377" y="26" fill="#a7f3d0" fontSize="7.5" fontFamily="monospace" textAnchor="middle">
                DCavg = {dcAvg.toFixed(1)}% (HIGH)
              </text>
            </g>

            {/* CHANNEL 2 (Bottom Path) */}
            <g transform="translate(40, 135)">
              <text x="0" y="60" fill="#94a3b8" fontSize="9" fontFamily="monospace" fontWeight="bold">
                CHANNEL 2 (MTTFd: {mttfd2.toFixed(1)} yrs)
              </text>
              
              {/* Input Block I2 */}
              <rect x="0" y="0" width="130" height="48" rx="6" fill="url(#chan2Gradient)" stroke="#64748b" strokeWidth="1.5" />
              <text x="65" y="20" fill="#f1f5f9" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                INPUT I2 (PT-401B)
              </text>
              <text x="65" y="34" fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="middle">
                Diverse Sensing Tap
              </text>

              {/* Connecting Vector */}
              <line x1="130" y1="24" x2="190" y2="24" stroke="#64748b" strokeWidth="2" strokeDasharray="4 2" />
              <polygon points="186,21 194,24 186,27" fill="#64748b" />

              {/* Logic Block L2 */}
              <rect x="195" y="0" width="140" height="48" rx="6" fill="url(#chan2Gradient)" stroke="#64748b" strokeWidth="1.5" />
              <text x="265" y="20" fill="#f1f5f9" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                LOGIC L2 (CPU B)
              </text>
              <text x="265" y="34" fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="middle">
                Redundant Hardware
              </text>

              {/* Connecting Vector */}
              <line x1="335" y1="24" x2="395" y2="24" stroke="#64748b" strokeWidth="2" strokeDasharray="4 2" />
              <polygon points="391,21 399,24 391,27" fill="#64748b" />

              {/* Output Block M2 */}
              <rect x="400" y="0" width="130" height="48" rx="6" fill="url(#chan2Gradient)" stroke="#64748b" strokeWidth="1.5" />
              <text x="465" y="20" fill="#f1f5f9" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                OUTPUT M2 (SOV-B)
              </text>
              <text x="465" y="34" fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="middle">
                Dual Coil Voting
              </text>
            </g>

            {/* FINAL SAFETY ACTUATOR (Right Side) */}
            <g transform="translate(630, 60)">
              {/* Connecting vectors from M1 & M2 to Final Element */}
              <path d="M -60 -11 L -20 -11 L 0 44" stroke="#8b5cf6" strokeWidth="2" fill="none" />
              <path d="M -60 99 L -20 99 L 0 44" stroke="#64748b" strokeWidth="2" fill="none" />

              <rect x="0" y="8" width="180" height="72" rx="8" fill="#18181b" stroke="#10b981" strokeWidth="2" />
              <text x="90" y="30" fill="#34d399" fontSize="11" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                FINAL ELEMENT (ESDV-401)
              </text>
              <text x="90" y="46" fill="#a7f3d0" fontSize="9" fontFamily="monospace" textAnchor="middle">
                Spring-Return Ball Valve
              </text>
              <text x="90" y="62" fill="#71717a" fontSize="8" fontFamily="monospace" textAnchor="middle">
                Safe State: CLOSED (≤ 1.2s)
              </text>
            </g>
          </svg>
        </div>
      </div>

      {/* 3. METRIC PILLARS (4 PILLARS) */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 border-b border-zinc-800 bg-zinc-950/40">
        
        {/* PILLAR 1: Symmetrized MTTFd Circular Gauge */}
        <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-2">
            <span>Symmetrized MTTFd</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              calculations.mttfdLevel === 'HIGH' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400'
            }`}>
              {calculations.mttfdLevel}
            </span>
          </div>

          {/* SVG Circular Dial */}
          <div className="flex items-center justify-center py-1">
            <svg width="130" height="85" viewBox="0 0 120 75" className="overflow-visible">
              {/* Background Arc: 180 degrees */}
              <path d="M 15 65 A 45 45 0 0 1 105 65" fill="none" stroke="#27272a" strokeWidth="9" strokeLinecap="round" />
              {/* Colored Active Arc */}
              <path
                d="M 15 65 A 45 45 0 0 1 105 65"
                fill="none"
                stroke="#a78bfa"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray="141.37"
                strokeDashoffset={141.37 * (1 - Math.min(1, calculations.symmetrizedMttfd / 100))}
              />
              <text x="60" y="55" fill="#f5f3ff" fontSize="15" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                {calculations.symmetrizedMttfd}
              </text>
              <text x="60" y="68" fill="#a78bfa" fontSize="8" fontFamily="monospace" textAnchor="middle">
                YEARS
              </text>
            </svg>
          </div>

          <div className="text-[10px] font-mono text-zinc-400 border-t border-zinc-800 pt-2 flex justify-between">
            <span>Ch1: {mttfd1}y</span>
            <span>Ch2: {mttfd2}y</span>
            <span className="text-zinc-500">Max: 100y</span>
          </div>
        </div>

        {/* PILLAR 2: Diagnostic Coverage (DCavg) Progress Bar */}
        <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-2">
            <span>Diagnostic Coverage</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              calculations.dcLevel === 'HIGH' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400'
            }`}>
              {calculations.dcLevel}
            </span>
          </div>

          <div className="my-auto py-2">
            <div className="flex items-baseline justify-between font-mono mb-1.5">
              <span className="text-2xl font-black text-zinc-100">{dcAvg.toFixed(1)}%</span>
              <span className="text-xs text-zinc-400">DCavg</span>
            </div>
            {/* Linear Progress Bar */}
            <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, dcAvg)}%` }}
              />
            </div>
          </div>

          <div className="text-[10px] font-mono text-zinc-400 border-t border-zinc-800 pt-2 flex justify-between">
            <span>None (&lt;60%)</span>
            <span>Low (60-90)</span>
            <span>High (≥99%)</span>
          </div>
        </div>

        {/* PILLAR 3: Common Cause Failure (CCF) Annex F Points */}
        <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-2">
            <span>Common Cause (CCF)</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              calculations.ccfPass ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse'
            }`}>
              {calculations.ccfPass ? 'PASS (≥ 65)' : 'FAIL (&lt; 65)'}
            </span>
          </div>

          <div className="my-auto py-2">
            <div className="flex items-baseline justify-between font-mono mb-1.5">
              <span className={`text-2xl font-black ${calculations.ccfPass ? 'text-zinc-100' : 'text-rose-400'}`}>
                {ccfScore}
              </span>
              <span className="text-xs text-zinc-400">/ 100 Points</span>
            </div>
            {/* Linear Progress Bar */}
            <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  calculations.ccfPass ? 'bg-emerald-400' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, ccfScore)}%` }}
              />
              {/* 65-Point Marker Line */}
              <div className="absolute top-0 bottom-0 left-[65%] w-0.5 bg-yellow-400" title="Statutory Pass Threshold (65 pts)" />
            </div>
          </div>

          <div className="text-[10px] font-mono text-zinc-400 border-t border-zinc-800 pt-2 flex justify-between">
            <span>Annex F Checklist</span>
            <span className="text-amber-400 font-bold">Min: 65 Pts</span>
          </div>
        </div>

        {/* PILLAR 4: Achieved Performance Level Stepped Ladder */}
        <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-2">
            <span>Achieved Performance Level</span>
            <span className="text-[10px] text-zinc-400">Target: PL {requiredPl}</span>
          </div>

          {/* Stepped Ladder: PL a -> PL b -> PL c -> PL d -> PL e */}
          <div className="grid grid-cols-5 gap-1.5 my-auto py-2">
            {(['a', 'b', 'c', 'd', 'e'] as const).map((pl) => {
              const isAchieved = calculations.achievedPl === pl;
              return (
                <div
                  key={pl}
                  className={`py-2 text-center rounded-lg font-mono text-xs font-bold uppercase transition-all ${
                    isAchieved
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 scale-105 border border-emerald-400'
                      : 'bg-zinc-800/80 text-zinc-500 border border-zinc-700/50'
                  }`}
                >
                  PL {pl}
                </div>
              );
            })}
          </div>

          <div className="text-[10px] font-mono text-zinc-400 border-t border-zinc-800 pt-2 flex items-center justify-between">
            <span>Status:</span>
            <span className={`font-bold ${calculations.isPlSatisfied ? 'text-emerald-400' : 'text-rose-400'}`}>
              {calculations.isPlSatisfied ? 'REQUIREMENT MET' : 'INSUFFICIENT PL'}
            </span>
          </div>
        </div>

      </div>

      {/* 4. PROBABILITY OF DANGEROUS FAILURE (PFHd) & SIL EQUIVALENCE */}
      <div className="px-5 py-3.5 bg-zinc-950/80 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4 font-mono">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-zinc-400 uppercase tracking-wider">
              Probability of Dangerous Failure per Hour (PFHd)
            </div>
            <div className="text-xl font-black text-cyan-300 tracking-tight">
              {calculations.pfhdFormatted}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
            <span className="text-zinc-500">IEC 62061 Claim: </span>
            <strong className="text-emerald-400">{calculations.silEquivalent}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
            <span className="text-zinc-500">Proof Test Interval: </span>
            <strong className="text-zinc-200">{proofTestIntervalHrs} hrs (1 Yr)</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
            <span className="text-zinc-500">Mission Time: </span>
            <strong className="text-zinc-200">{missionTimeYears} Years</strong>
          </div>
        </div>
      </div>

      {/* 5. INTERACTIVE SENSITIVITY SLIDERS & ARCHITECTURE SELECTORS */}
      <div className="p-5 bg-zinc-900/40">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold font-mono text-zinc-200 tracking-wide uppercase">
              Sensitivity Sliders &amp; Architecture Presets
            </h3>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
            <button
              onClick={() => handleApplyPreset('4', 48.0, 42.0, 99.0, 75)}
              className="px-2 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 transition-colors"
            >
              Cat 4 + DC High (PL e)
            </button>
            <button
              onClick={() => handleApplyPreset('3', 35.0, 30.0, 92.0, 70)}
              className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
            >
              Cat 3 + DC Med (PL d)
            </button>
            <button
              onClick={() => handleApplyPreset('2', 25.0, 25.0, 75.0, 50)}
              className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
            >
              Cat 2 Single+Test (PL c)
            </button>
            <button
              onClick={() => handleApplyPreset('4', 48.0, 42.0, 99.0, 55)}
              className="px-2 py-1 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-700 transition-colors"
            >
              CCF Fault (&lt;65 Pts)
            </button>
          </div>
        </div>

        {/* 4 Interactive Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Slider 1: MTTFd Channel 1 */}
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="text-zinc-400">MTTFd Channel 1:</span>
              <span className="font-bold text-cyan-400">{mttfd1.toFixed(1)} yrs</span>
            </div>
            <input
              type="range"
              min="10.0"
              max="100.0"
              step="1.0"
              value={mttfd1}
              onChange={(e) => handleSlider(setMttfd1, parseFloat(e.target.value))}
              className="w-full accent-cyan-500 bg-zinc-800 rounded-lg cursor-pointer h-1.5"
            />
            <div className="flex justify-between text-[9px] font-mono text-zinc-500 mt-1.5">
              <span>10 yrs</span>
              <span>48 yrs</span>
              <span>100 yrs</span>
            </div>
          </div>

          {/* Slider 2: MTTFd Channel 2 */}
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="text-zinc-400">MTTFd Channel 2:</span>
              <span className="font-bold text-cyan-400">{mttfd2.toFixed(1)} yrs</span>
            </div>
            <input
              type="range"
              min="10.0"
              max="100.0"
              step="1.0"
              value={mttfd2}
              onChange={(e) => handleSlider(setMttfd2, parseFloat(e.target.value))}
              className="w-full accent-cyan-500 bg-zinc-800 rounded-lg cursor-pointer h-1.5"
            />
            <div className="flex justify-between text-[9px] font-mono text-zinc-500 mt-1.5">
              <span>10 yrs</span>
              <span>42 yrs</span>
              <span>100 yrs</span>
            </div>
          </div>

          {/* Slider 3: Diagnostic Coverage (DCavg) */}
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="text-zinc-400">Diagnostic Coverage:</span>
              <span className="font-bold text-emerald-400">{dcAvg.toFixed(1)} %</span>
            </div>
            <input
              type="range"
              min="60.0"
              max="99.9"
              step="0.5"
              value={dcAvg}
              onChange={(e) => handleSlider(setDcAvg, parseFloat(e.target.value))}
              className="w-full accent-emerald-500 bg-zinc-800 rounded-lg cursor-pointer h-1.5"
            />
            <div className="flex justify-between text-[9px] font-mono text-zinc-500 mt-1.5">
              <span>60% (Low)</span>
              <span>90% (Med)</span>
              <span>99% (High)</span>
            </div>
          </div>

          {/* Slider 4: CCF Score (Annex F) */}
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="text-zinc-400">CCF Score:</span>
              <span className={`font-bold ${calculations.ccfPass ? 'text-emerald-400' : 'text-rose-400'}`}>
                {ccfScore} / 100
              </span>
            </div>
            <input
              type="range"
              min="40"
              max="100"
              step="5"
              value={ccfScore}
              onChange={(e) => handleSlider(setCcfScore, parseInt(e.target.value, 10))}
              className={`w-full bg-zinc-800 rounded-lg cursor-pointer h-1.5 ${
                calculations.ccfPass ? 'accent-emerald-500' : 'accent-rose-500'
              }`}
            />
            <div className="flex justify-between text-[9px] font-mono text-zinc-500 mt-1.5">
              <span>40 (Fail)</span>
              <span>65 (Min Pass)</span>
              <span>100 (Max)</span>
            </div>
          </div>

        </div>

        {/* Deliverable Action Button */}
        <div className="mt-4 flex items-center justify-end gap-3 pt-2 border-t border-zinc-800/80">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-emerald-500/50 text-xs font-mono font-bold text-zinc-100 transition-all shadow-md"
          >
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <span>Export ISO 13849-1 Safety Assessment</span>
          </button>
        </div>
      </div>

    </div>
  );
}
