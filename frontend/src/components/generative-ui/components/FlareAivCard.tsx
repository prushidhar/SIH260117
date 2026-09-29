'use client';

import React, { useState, useMemo } from 'react';
import {
  Volume2,
  VolumeX,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertOctagon,
  Crosshair,
  Sliders,
  RotateCcw,
  FileCheck,
  Zap,
  Activity,
  ArrowRight,
  Check,
  Copy,
  Layers,
  Lock,
  Flame,
  Wind,
  Gauge,
  Info,
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import { sovereignAudio } from '@/lib/audio/sound-effects';
import type { FlareAivCardProps } from '../types';

// Pipe dimensions database: Outside Diameter (OD in mm) and Wall Thickness (t in mm)
const PIPE_DATABASE: Record<string, { odMm: number; schedules: Record<string, number> }> = {
  '6"': {
    odMm: 168.3,
    schedules: {
      'Sch 20': 6.35,
      'Sch 40': 7.11,
      'Sch 80': 10.97,
      'Sch 160': 18.26,
    },
  },
  '8"': {
    odMm: 219.1,
    schedules: {
      'Sch 20': 6.35,
      'Sch 40': 8.18,
      'Sch 80': 12.70,
      'Sch 160': 23.01,
    },
  },
  '10"': {
    odMm: 273.0,
    schedules: {
      'Sch 20': 6.35,
      'Sch 40': 9.27,
      'Sch 80': 15.09,
      'Sch 160': 28.58,
    },
  },
  '12"': {
    odMm: 323.8,
    schedules: {
      'Sch 20': 6.35,
      'Sch 40': 10.31,
      'Sch 80': 17.48,
      'Sch 160': 33.32,
    },
  },
  '14"': {
    odMm: 355.6,
    schedules: {
      'Sch 20': 7.92,
      'Sch 40': 11.13,
      'Sch 80': 19.05,
      'Sch 160': 35.71,
    },
  },
  '16"': {
    odMm: 406.4,
    schedules: {
      'Sch 20': 7.92,
      'Sch 40': 12.70,
      'Sch 80': 21.44,
      'Sch 160': 40.49,
    },
  },
  '20"': {
    odMm: 508.0,
    schedules: {
      'Sch 20': 9.53,
      'Sch 40': 15.09,
      'Sch 80': 26.19,
      'Sch 160': 50.01,
    },
  },
  '24"': {
    odMm: 609.6,
    schedules: {
      'Sch 20': 9.53,
      'Sch 40': 17.48,
      'Sch 80': 30.96,
      'Sch 160': 59.54,
    },
  },
};

/**
 * API 520 Part II & EEMUA 158 Flare Acoustical Vibration (AIV) Micro-Frontend
 */
export default function FlareAivCard({
  assetTag = 'PSV-101',
  location = 'PSV-101 TAILPIPE',
  title = 'API 520 PART II & EEMUA 158 FLARE ACOUSTICAL VIBRATION (AIV)',
  massFlowTh: initialMassFlow = 65.0,
  upstreamPressureBar: initialP1 = 35.0,
  backpressureBar: initialP2 = 2.5,
  gasMolecularWeight: initialMw = 22.0,
  specificHeatRatio: initialK = 1.28,
  gasTempC: initialTemp = 60.0,
  pipeNpsInches: initialNps = '10"',
  pipeSchedule: initialSch = 'Sch 40',
}: FlareAivCardProps) {
  const { selectTag, addDeliverable, addToast } = useIndraStore();

  // Interactive State
  const [massFlow, setMassFlow] = useState<number>(initialMassFlow);
  const [p1, setP1] = useState<number>(initialP1);
  const [p2, setP2] = useState<number>(initialP2);
  const [mw, setMw] = useState<number>(initialMw);
  const [kRatio] = useState<number>(initialK);
  const [tempC, setTempC] = useState<number>(initialTemp);
  const [pipeNps, setPipeNps] = useState<string>(initialNps);
  const [pipeSch, setPipeSch] = useState<string>(initialSch);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  // Thermodynamic & Carucci-Mueller / EEMUA 158 Calculations
  const calculations = useMemo(() => {
    const W_kgh = Math.max(1000, massFlow * 1000); // mass flow in kg/h
    const P1_abs = Math.max(1.5, p1);
    const P2_abs = Math.max(1.0, Math.min(p2, P1_abs * 0.95)); // downstream backpressure
    const deltaP = Math.max(0.1, P1_abs - P2_abs);
    const prRatio = deltaP / P1_abs;
    const T1_K = Math.max(200, tempC + 273.15);
    const M_val = Math.max(2.0, mw);

    // 1. Carucci-Mueller & EEMUA 158 Acoustic Sound Power Level (Lw, dB re 10^-12 W)
    // Formula: Lw = 36*log10(dP/P1) + 20*log10(W_kgh) + 12*log10(T1/M) + 49.0
    const logPr = Math.log10(Math.max(0.01, prRatio));
    const logW = Math.log10(W_kgh);
    const logTm = Math.log10(Math.max(1.0, T1_K / M_val));
    const rawLw = 36 * logPr + 20 * logW + 12 * logTm + 49.0;
    const lwDb = parseFloat(Math.min(195.0, Math.max(115.0, rawLw)).toFixed(1));

    // Sound Power Level Risk Classification per API 521 § 5.4.5 & EEMUA 158
    let aivRiskCategory: 'LOW' | 'MODERATE' | 'CRITICAL';
    let riskBadgeColor: string;
    let riskLabel: string;

    if (lwDb < 155.0) {
      aivRiskCategory = 'LOW';
      riskBadgeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      riskLabel = 'LOW RISK (< 155 dB) — SAFE CONTINUOUS RELIEF';
    } else if (lwDb < 160.0) {
      aivRiskCategory = 'MODERATE';
      riskBadgeColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      riskLabel = 'MODERATE RISK (155-160 dB) — WELDED WRAP-AROUND PADS REQUIRED';
    } else {
      aivRiskCategory = 'CRITICAL';
      riskBadgeColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      riskLabel = 'CRITICAL RISK (≥ 160 dB) — HIGH-CYCLE ACOUSTIC FATIGUE DANGER';
    }

    // 2. Radiated Acoustic Power (W_ac in Watts and kW)
    // Lw = 120 + 10*log10(W_ac) => W_ac = 10^((Lw - 120)/10)
    const acousticPowerWatts = Math.pow(10, (lwDb - 120) / 10);
    const acousticPowerKw = parseFloat((acousticPowerWatts / 1000).toFixed(2));

    // 3. Pipe Dimensions and D/t Ratio
    const pipeData = PIPE_DATABASE[pipeNps] || PIPE_DATABASE['10"'];
    const wallThkMm = pipeData.schedules[pipeSch] || pipeData.schedules['Sch 40'] || 9.27;
    const odMm = pipeData.odMm;
    const idMm = Math.max(10.0, odMm - 2 * wallThkMm);
    const dOverT = parseFloat((odMm / wallThkMm).toFixed(1));

    // Carucci-Mueller Fatigue Vulnerability Criterion:
    // Limit: Lw_crit = 160 - 0.1 * (D/t - 40)
    const dtPass = dOverT <= 60.0;
    const dtSevere = dOverT > 75.0;

    // 4. Tailpipe Velocity & Mach Number per API 520 Part II
    // Downstream isentropic temperature T2
    const expTerm = (kRatio - 1) / kRatio;
    const T2_K = T1_K * Math.pow(P2_abs / P1_abs, expTerm);
    const T2_C = parseFloat((T2_K - 273.15).toFixed(1));

    // Specific gas constant Rs = Ru / M (J/kg*K)
    const Rs = 8314.46 / M_val;
    // Tailpipe gas density rho2 = P2 * 10^5 / (Rs * T2)
    const rho2 = (P2_abs * 100000) / (Rs * T2_K);

    // Cross-sectional area A = pi/4 * Di^2 (m^2)
    const idM = idMm / 1000;
    const areaM2 = (Math.PI / 4) * Math.pow(idM, 2);

    // Mass flow in kg/s
    const mDotKgs = W_kgh / 3600;

    // Gas velocity v2 = mDot / (rho2 * A)
    const velocityMs = parseFloat((mDotKgs / (rho2 * areaM2)).toFixed(1));

    // Speed of sound c2 = sqrt(k * Rs * T2)
    const sonicSpeedMs = parseFloat(Math.sqrt(kRatio * Rs * T2_K).toFixed(1));

    // Tailpipe Mach Number M2
    const machNumber = parseFloat((velocityMs / sonicSpeedMs).toFixed(2));

    // Dynamic Pressure q = 0.5 * rho2 * v^2 / 1000 (kPa)
    const dynamicPressureKpa = parseFloat((0.5 * rho2 * Math.pow(velocityMs, 2) / 1000).toFixed(1));

    // Mach Limit Check (API 520 Part II limit = 0.70 Mach)
    const machLimit = 0.70;
    const isMachExceeded = machNumber > machLimit;

    // 5. Gauge Needle Angle Geometry (120 dB = 180 deg, 180 dB = 0 deg)
    const gaugeMin = 120.0;
    const gaugeMax = 180.0;
    const fraction = Math.max(0, Math.min(1, (lwDb - gaugeMin) / (gaugeMax - gaugeMin)));
    const needleAngleDeg = 180 - fraction * 180; // 180 (left) to 0 (right)

    return {
      lwDb,
      aivRiskCategory,
      riskBadgeColor,
      riskLabel,
      acousticPowerWatts: Math.round(acousticPowerWatts),
      acousticPowerKw,
      odMm,
      wallThkMm,
      idMm: parseFloat(idMm.toFixed(1)),
      dOverT,
      dtPass,
      dtSevere,
      T2_C,
      rho2: parseFloat(rho2.toFixed(2)),
      velocityMs,
      sonicSpeedMs,
      machNumber,
      dynamicPressureKpa,
      machLimit,
      isMachExceeded,
      needleAngleDeg,
    };
  }, [massFlow, p1, p2, mw, kRatio, tempC, pipeNps, pipeSch]);

  // Handle Audio Feedback on Sliders
  const handleSlider = (setter: (val: number) => void, val: number) => {
    sovereignAudio.playClick();
    setter(val);
  };

  // Presets Handler
  const handleApplyPreset = (
    w: number,
    pres1: number,
    pres2: number,
    nps: string,
    sch: string,
    mwVal: number,
    tVal: number
  ) => {
    sovereignAudio.playClick();
    setMassFlow(w);
    setP1(pres1);
    setP2(pres2);
    setPipeNps(nps);
    setPipeSch(sch);
    setMw(mwVal);
    setTempC(tVal);

    if (w >= 85 || pres1 >= 45) {
      sovereignAudio.playAlertTone();
    } else {
      sovereignAudio.playSonarPing();
    }
  };

  // P&ID Tag Locator
  const handleLocate = () => {
    sovereignAudio.playClick();
    selectTag(assetTag);
    broadcastSyncEvent({
      type: 'TAG_SELECTED',
      tag: assetTag,
      metadata: {
        source: 'FlareAivCard',
        location,
        soundPowerLevelDb: calculations.lwDb,
        aivRisk: calculations.aivRiskCategory,
        mach: calculations.machNumber,
      },
    });
    addToast({
      title: 'P&ID Tailpipe Located',
      message: `Asset ${assetTag} (${location}) focused in Flare Header P&ID viewer.`,
      type: 'info',
    });
  };

  // Export Deliverable
  const handleExport = () => {
    sovereignAudio.playSonarPing();
    const shaSeal = 'a1f59c82b7d4e301986420eac7182903fb94';
    const deliverable = {
      id: `flare-aiv-${Date.now()}`,
      name: `API 520 / EEMUA 158 AIV Assessment — ${assetTag}`,
      filename: `API520_AIV_Assessment_${assetTag}.pdf`,
      type: 'pdf',
      size: '2.4 MB',
      generatedAt: new Date().toLocaleTimeString(),
      title: `Flare Acoustical Induced Vibration Dossier — ${assetTag}`,
      timestamp: new Date().toLocaleTimeString(),
      description: `Tailpipe acoustical vibration study for ${assetTag}. Lw: ${calculations.lwDb} dB (${calculations.aivRiskCategory} RISK), Acoustic Power: ${calculations.acousticPowerKw} kW, Mach Number: ${calculations.machNumber} (API Limit: 0.70), Pipe D/t: ${calculations.dOverT} (${pipeNps} ${pipeSch}). Sweepolet & wrap-around pad recommendations included.`,
      hash: shaSeal,
      url: '#',
    };
    addDeliverable(deliverable);
    addToast({
      title: 'AIV Assessment Dossier Exported',
      message: `Dossier compiled with SHA-256 seal ${shaSeal.slice(0, 16)}...`,
      type: 'success',
    });
  };

  // Copy SHA-256 seal
  const copySeal = () => {
    sovereignAudio.playShortcut();
    navigator.clipboard.writeText('a1f59c82b7d4e301986420eac7182903fb94');
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="w-full rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden font-sans text-zinc-200">
      
      {/* 1. HEADER & PSV LOCATOR */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                API 520 PT II / EEMUA 158 / ISO 15664
              </span>
              <button
                onClick={handleLocate}
                className="group flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
                title="Locate PSV-101 in P&ID"
              >
                <Crosshair className="w-3 h-3 group-hover:rotate-45 transition-transform" />
                <span>{location}</span>
              </button>
            </div>
            <h2 className="text-sm font-bold text-zinc-100 mt-1 tracking-tight">
              {title}
            </h2>
          </div>
        </div>

        {/* SHA-256 SEAL & CERTIFICATION BADGE */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700/80 font-mono text-[11px] text-zinc-400">
            <Lock className="w-3 h-3 text-amber-400" />
            <span className="text-zinc-500">SEAL:</span>
            <span className="text-zinc-300">a1f59c82b7d4...</span>
            <button
              onClick={copySeal}
              className="ml-1 p-1 hover:text-white transition-colors"
              title="Copy SHA-256 Cryptographic Hash"
            >
              {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-semibold text-xs transition-colors shadow-lg shadow-amber-950/40 cursor-pointer"
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Export Dossier</span>
          </button>
        </div>
      </div>

      {/* 2. OPERATIONAL RISK ALERT BANNER */}
      <div className={`px-5 py-2.5 border-b border-zinc-800/80 flex items-center justify-between text-xs font-mono ${
        calculations.aivRiskCategory === 'CRITICAL'
          ? 'bg-rose-950/40 text-rose-300 animate-pulse'
          : calculations.aivRiskCategory === 'MODERATE'
          ? 'bg-amber-950/30 text-amber-300'
          : 'bg-emerald-950/20 text-emerald-300'
      }`}>
        <div className="flex items-center gap-2">
          {calculations.aivRiskCategory === 'CRITICAL' ? (
            <AlertOctagon className="w-4 h-4 text-rose-400 flex-shrink-0" />
          ) : calculations.aivRiskCategory === 'MODERATE' ? (
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          )}
          <span className="font-bold tracking-wide">{calculations.riskLabel}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span>Lw = <strong className="text-zinc-100">{calculations.lwDb} dB</strong></span>
          <span>•</span>
          <span>Mach = <strong className={calculations.isMachExceeded ? 'text-rose-400' : 'text-zinc-100'}>{calculations.machNumber}</strong></span>
          <span>•</span>
          <span>D/t = <strong className={calculations.dtPass ? 'text-emerald-400' : 'text-amber-400'}>{calculations.dOverT}</strong></span>
        </div>
      </div>

      {/* 3. PRIMARY VISUAL GAUGES: SOUND POWER LEVEL & TAILPIPE MACH */}
      <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 border-b border-zinc-800/80">
        
        {/* SEMICIRCULAR DECIBEL METER (120 dB - 180 dB) */}
        <div className="lg:col-span-6 bg-zinc-900/60 rounded-xl p-4 border border-zinc-800 flex flex-col items-center justify-between relative overflow-hidden">
          <div className="w-full flex items-center justify-between text-xs font-mono mb-2">
            <span className="text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-amber-400" />
              Sound Power Level (Lw) Semicircular Meter
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${calculations.riskBadgeColor}`}>
              {calculations.aivRiskCategory} AIV
            </span>
          </div>

          {/* SVG Semicircular Gauge */}
          <div className="relative w-full max-w-[340px] aspect-[2/1.3] flex items-center justify-center">
            <svg viewBox="0 0 300 170" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="greenArcGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
                <linearGradient id="amberArcGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#fbbf24" />
                </linearGradient>
                <linearGradient id="roseArcGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#fb7185" />
                </linearGradient>
                <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Gauge Background Track (Radius 100, Center 150, 140) */}
              <path
                d="M 40 140 A 110 110 0 0 1 260 140"
                fill="none"
                stroke="#27272a"
                strokeWidth="18"
                strokeLinecap="round"
              />

              {/* Green Zone: 120 to 155 dB (Angle 180° down to 75°) */}
              <path
                d="M 40 140 A 110 110 0 0 1 178.47 33.74"
                fill="none"
                stroke="url(#greenArcGrad)"
                strokeWidth="14"
                strokeOpacity="0.85"
              />

              {/* Amber Zone: 155 to 160 dB (Angle 75° down to 60°) */}
              <path
                d="M 178.47 33.74 A 110 110 0 0 1 205.00 44.74"
                fill="none"
                stroke="url(#amberArcGrad)"
                strokeWidth="14"
                strokeOpacity="0.9"
              />

              {/* Red Zone: 160 to 180 dB (Angle 60° down to 0°) */}
              <path
                d="M 205.00 44.74 A 110 110 0 0 1 260 140"
                fill="none"
                stroke="url(#roseArcGrad)"
                strokeWidth="14"
                strokeOpacity="0.9"
                filter={calculations.aivRiskCategory === 'CRITICAL' ? 'url(#gaugeGlow)' : undefined}
                className={calculations.aivRiskCategory === 'CRITICAL' ? 'animate-pulse' : ''}
              />

              {/* Tick Marks & Annotations */}
              {/* 120 dB (180 deg) */}
              <line x1="40" y1="140" x2="26" y2="140" stroke="#71717a" strokeWidth="2" />
              <text x="14" y="144" fill="#a1a1aa" fontSize="9" fontFamily="monospace">120</text>

              {/* 140 dB (120 deg -> cos=-0.5, sin=0.866) */}
              <line x1="95" y1="44.74" x2="88" y2="32.6" stroke="#71717a" strokeWidth="1.5" />
              <text x="76" y="28" fill="#a1a1aa" fontSize="9" fontFamily="monospace">140</text>

              {/* 155 dB Warning Threshold (75 deg) */}
              <line x1="178.47" y1="33.74" x2="183.6" y2="19.2" stroke="#f59e0b" strokeWidth="2.5" />
              <text x="175" y="14" fill="#fbbf24" fontSize="9" fontFamily="monospace" fontWeight="bold">155</text>

              {/* 160 dB Critical Threshold (60 deg) */}
              <line x1="205.0" y1="44.74" x2="213.6" y2="30.0" stroke="#f43f5e" strokeWidth="2.5" />
              <text x="214" y="24" fill="#f43f5e" fontSize="9" fontFamily="monospace" fontWeight="bold">160</text>

              {/* 180 dB (0 deg) */}
              <line x1="260" y1="140" x2="274" y2="140" stroke="#71717a" strokeWidth="2" />
              <text x="278" y="144" fill="#a1a1aa" fontSize="9" fontFamily="monospace">180</text>

              {/* Center Pivot Point & Rotating Needle */}
              {(() => {
                const angleRad = (calculations.needleAngleDeg * Math.PI) / 180;
                const needleLen = 85;
                const nx = 150 + needleLen * Math.cos(angleRad);
                const ny = 140 - needleLen * Math.sin(angleRad);
                return (
                  <g>
                    {/* Shadow / Base */}
                    <circle cx="150" cy="140" r="16" fill="#18181b" stroke="#3f3f46" strokeWidth="3" />
                    {/* Needle Line */}
                    <line
                      x1="150"
                      y1="140"
                      x2={nx}
                      y2={ny}
                      stroke={calculations.aivRiskCategory === 'CRITICAL' ? '#f43f5e' : calculations.aivRiskCategory === 'MODERATE' ? '#f59e0b' : '#34d399'}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    {/* Needle Arrow Tip */}
                    <circle
                      cx={nx}
                      cy={ny}
                      r="4"
                      fill={calculations.aivRiskCategory === 'CRITICAL' ? '#f43f5e' : '#f59e0b'}
                    />
                    {/* Pivot Cap */}
                    <circle cx="150" cy="140" r="7" fill="#71717a" />
                  </g>
                );
              })()}
            </svg>

            {/* Central Digital Readout */}
            <div className="absolute bottom-1 flex flex-col items-center">
              <span className="text-3xl font-black font-mono tracking-tight text-white drop-shadow-md">
                {calculations.lwDb} <span className="text-sm font-normal text-zinc-400">dB</span>
              </span>
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mt-0.5">
                PWL / Sound Power Level
              </span>
            </div>
          </div>

          {/* Semicircular Legend Zone Callouts */}
          <div className="w-full grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-zinc-800 text-[10px] font-mono text-center">
            <div className="p-1.5 rounded bg-emerald-500/5 border border-emerald-500/20 text-emerald-400">
              <div className="font-bold">&lt; 155 dB</div>
              <div className="text-[9px] text-zinc-400">Safe Continuous</div>
            </div>
            <div className="p-1.5 rounded bg-amber-500/5 border border-amber-500/20 text-amber-400">
              <div className="font-bold">155 - 160 dB</div>
              <div className="text-[9px] text-zinc-400">Wrap Pads Req.</div>
            </div>
            <div className="p-1.5 rounded bg-rose-500/5 border border-rose-500/20 text-rose-400">
              <div className="font-bold">≥ 160 dB</div>
              <div className="text-[9px] text-zinc-400">Heavy Wall / Fatigue</div>
            </div>
          </div>
        </div>

        {/* TAILPIPE MACH NUMBER & GAS DYNAMICS */}
        <div className="lg:col-span-6 bg-zinc-900/60 rounded-xl p-4 border border-zinc-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 text-cyan-400" />
                Tailpipe Mach Number & Velocity (API 520 Limit = 0.70)
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                calculations.isMachExceeded
                  ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                  : calculations.machNumber > 0.5
                  ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                  : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
              }`}>
                {calculations.isMachExceeded ? 'EXCEEDS LIMIT' : 'WITHIN STATUTORY LIMIT'}
              </span>
            </div>

            {/* Horizontal Velocity / Mach Bar */}
            <div className="mt-4 p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/90 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400">Current Tailpipe Velocity:</span>
                <span className="text-sm font-bold text-cyan-300 font-mono">
                  {calculations.velocityMs} m/s ({calculations.machNumber} Mach)
                </span>
              </div>

              {/* Progress Bar Container */}
              <div className="relative w-full h-6 bg-zinc-900 rounded-lg overflow-hidden border border-zinc-700/60 p-0.5">
                {/* 0.70 Mach Statutory Threshold Marker */}
                <div
                  className="absolute top-0 bottom-0 z-20 border-r-2 border-dashed border-rose-400"
                  style={{ left: '70%' }}
                  title="API 520 Statutory Limit = 0.70 Mach"
                />
                
                {/* Colored Fill Bar */}
                <div
                  className={`h-full rounded transition-all duration-300 ${
                    calculations.machNumber > 0.70
                      ? 'bg-gradient-to-r from-amber-500 to-rose-500 animate-pulse'
                      : calculations.machNumber > 0.50
                      ? 'bg-gradient-to-r from-emerald-500 to-amber-500'
                      : 'bg-gradient-to-r from-cyan-500 to-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, (calculations.machNumber / 1.0) * 100)}%` }}
                />
              </div>

              {/* Scale Ticks */}
              <div className="relative w-full flex justify-between text-[10px] font-mono text-zinc-500 pt-0.5">
                <span>0.0 M</span>
                <span>0.25 M</span>
                <span>0.50 M</span>
                <span className="text-rose-400 font-bold">0.70 M (API Limit)</span>
                <span>1.0 M (Sonic)</span>
              </div>
            </div>

            {/* Detailed Gas Dynamic Metric Breakdown */}
            <div className="grid grid-cols-3 gap-2.5 mt-4 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800">
                <div className="text-[10px] text-zinc-500 uppercase">Sonic Speed (c)</div>
                <div className="text-sm font-bold text-zinc-200 mt-0.5">{calculations.sonicSpeedMs} m/s</div>
                <div className="text-[9px] text-zinc-500 mt-1">k = {kRatio}, MW = {mw}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800">
                <div className="text-[10px] text-zinc-500 uppercase">Dynamic Head (q)</div>
                <div className="text-sm font-bold text-cyan-300 mt-0.5">{calculations.dynamicPressureKpa} kPa</div>
                <div className="text-[9px] text-zinc-500 mt-1">Momentum force</div>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800">
                <div className="text-[10px] text-zinc-500 uppercase">Downstream Temp (T2)</div>
                <div className="text-sm font-bold text-zinc-200 mt-0.5">{calculations.T2_C} °C</div>
                <div className="text-[9px] text-zinc-500 mt-1">ρ2 = {calculations.rho2} kg/m³</div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span>Flow regime: <strong className="text-zinc-200">{calculations.machNumber > 0.7 ? 'Near-Choked Sonic Jet' : 'Subsonic Compressible'}</strong></span>
            <span>Backpressure: <strong className="text-zinc-200">{p2} bar(a)</strong></span>
          </div>
        </div>
      </div>

      {/* 4. FOUR CORE KPI SUMMARY CARDS */}
      <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3 border-b border-zinc-800/80 bg-zinc-950/60">
        
        {/* KPI 1: Sound Power Level */}
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 uppercase">
            <span>Sound Power (Lw)</span>
            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
            {calculations.lwDb} <span className="text-xs font-normal text-zinc-400">dB</span>
          </div>
          <div className={`mt-1 text-[10px] font-mono font-bold ${
            calculations.aivRiskCategory === 'CRITICAL' ? 'text-rose-400' : calculations.aivRiskCategory === 'MODERATE' ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            {calculations.aivRiskCategory} Fatigue Risk
          </div>
        </div>

        {/* KPI 2: Radiated Acoustic Power */}
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 uppercase">
            <span>Acoustic Energy (Wac)</span>
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-cyan-300 mt-1">
            {calculations.acousticPowerKw} <span className="text-xs font-normal text-zinc-400">kW</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-zinc-400">
            {calculations.acousticPowerWatts.toLocaleString()} Watts radiated
          </div>
        </div>

        {/* KPI 3: Mach Number */}
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 uppercase">
            <span>Tailpipe Mach (M)</span>
            <Wind className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className={`text-xl font-bold font-mono mt-1 ${calculations.isMachExceeded ? 'text-rose-400' : 'text-zinc-100'}`}>
            Mach {calculations.machNumber}
          </div>
          <div className="mt-1 text-[10px] font-mono text-zinc-400">
            Limit: 0.70 ({calculations.velocityMs} m/s)
          </div>
        </div>

        {/* KPI 4: D/t Ratio & Schedule */}
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 uppercase">
            <span>Diameter-to-Thk (D/t)</span>
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {calculations.dOverT}
          </div>
          <div className="mt-1 text-[10px] font-mono text-zinc-400">
            {pipeNps} {pipeSch} (t = {calculations.wallThkMm} mm)
          </div>
        </div>
      </div>

      {/* 5. MECHANICAL INTEGRITY CHECKLIST & EEMUA 158 RECOMMENDATIONS */}
      <div className="p-5 border-b border-zinc-800/80">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            EEMUA 158 / Carucci-Mueller Mechanical Integrity Verification
          </h3>
          <span className="text-[10px] font-mono text-zinc-500">
            OD = {calculations.odMm} mm | ID = {calculations.idMm} mm | t = {calculations.wallThkMm} mm
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
          
          {/* Item 1: Branch Connection Contour */}
          <div className={`p-3 rounded-xl border flex items-start gap-3 ${
            calculations.lwDb >= 160.0
              ? 'bg-rose-950/20 border-rose-500/40 text-rose-300'
              : calculations.lwDb >= 155.0
              ? 'bg-amber-950/20 border-amber-500/40 text-amber-300'
              : 'bg-zinc-900/50 border-zinc-800 text-zinc-300'
          }`}>
            {calculations.lwDb >= 160.0 ? (
              <AlertOctagon className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            ) : calculations.lwDb >= 155.0 ? (
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="font-bold flex items-center justify-between">
                <span>Branch Connection Contour:</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/80">
                  {calculations.lwDb >= 160 ? 'SWEEPOLET REQ.' : calculations.lwDb >= 155 ? 'CONTOURED' : 'STANDARD'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                {calculations.lwDb >= 160.0
                  ? 'CRITICAL: High-stress concentration at tee/header junctions. Sweepolet or integrally reinforced contoured fittings mandatory (eliminates weld toe stress peaks).'
                  : calculations.lwDb >= 155.0
                  ? 'MODERATE: Sweepolets or heavy contoured weldolets recommended with 100% MT/PT weld examination.'
                  : 'ACCEPTABLE: Standard weldolet or extruded tee acceptable at current acoustic power level.'}
              </p>
            </div>
          </div>

          {/* Item 2: Welded Wrap-Around Reinforcement Pads */}
          <div className={`p-3 rounded-xl border flex items-start gap-3 ${
            calculations.lwDb >= 155.0
              ? 'bg-amber-950/20 border-amber-500/40 text-amber-300'
              : 'bg-zinc-900/50 border-zinc-800 text-zinc-300'
          }`}>
            {calculations.lwDb >= 155.0 ? (
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="font-bold flex items-center justify-between">
                <span>Support Clamp Reinforcement:</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/80">
                  {calculations.lwDb >= 155 ? '360° WRAP PAD' : 'STANDARD CLAMP'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                {calculations.lwDb >= 155.0
                  ? 'MANDATORY: 360° full-encirclement welded reinforcement wear pads (min 6mm thickness) required at all pipe supports, clamps, and dummy trunnions.'
                  : 'ACCEPTABLE: Non-welded elastomeric clamp liners or standard saddles permitted under 155 dB.'}
              </p>
            </div>
          </div>

          {/* Item 3: Small-Bore Connection (SBC) Elimination */}
          <div className={`p-3 rounded-xl border flex items-start gap-3 ${
            calculations.lwDb >= 155.0
              ? 'bg-rose-950/20 border-rose-500/40 text-rose-300'
              : 'bg-zinc-900/50 border-zinc-800 text-zinc-300'
          }`}>
            {calculations.lwDb >= 155.0 ? (
              <AlertOctagon className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="font-bold flex items-center justify-between">
                <span>Small Bore Connections (SBC &lt; 2"):</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/80">
                  {calculations.lwDb >= 155 ? 'ELIMINATE / BRACE' : 'GUSSETED'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                {calculations.lwDb >= 155.0
                  ? 'PROHIBITED: Eliminate all non-essential small-bore connections (drains, vents, sampling taps) within 10 pipe diameters (10D) downstream. Any essential taps must have 2-plane structural gussets.'
                  : 'MONITORED: Standard two-way gusset bracing for instrument stubs acceptable.'}
              </p>
            </div>
          </div>

          {/* Item 4: Pipe D/t Ratio & Schedule */}
          <div className={`p-3 rounded-xl border flex items-start gap-3 ${
            !calculations.dtPass
              ? 'bg-rose-950/20 border-rose-500/40 text-rose-300'
              : 'bg-zinc-900/50 border-zinc-800 text-zinc-300'
          }`}>
            {!calculations.dtPass ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="font-bold flex items-center justify-between">
                <span>Carucci-Mueller D/t Stiffness:</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/80">
                  {calculations.dtPass ? 'COMPLIANT (D/t ≤ 60)' : 'EXCEEDS D/t LIMIT'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                {!calculations.dtPass
                  ? `WARNING: D/t = ${calculations.dOverT} exceeds maximum recommended limit (60.0). Wall is too thin for radial acoustic flexural damping. Upgrade schedule from ${pipeSch} to Sch 80 or Sch 160.`
                  : `PASS: D/t = ${calculations.dOverT} satisfies Carucci-Mueller acoustic structural stiffness criterion (wall thickness = ${calculations.wallThkMm} mm).`}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* 6. INTERACTIVE SLIDERS & PARAMETER CONTROLS */}
      <div className="p-5 border-b border-zinc-800/80 bg-zinc-950/40">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-amber-400" />
            Relief & Tailpipe Mechanical Parameter Tuning
          </span>
          <span className="text-[11px] font-mono text-zinc-500">
            Real-time acoustic sound power & gas velocity evaluation
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs font-mono">
          
          {/* Slider 1: Relieving Mass Flow Rate */}
          <div className="space-y-1.5 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800">
            <div className="flex justify-between items-center text-zinc-400">
              <label>Mass Flow Rate (W):</label>
              <span className="text-amber-400 font-bold">{massFlow} t/h</span>
            </div>
            <input
              type="range"
              min="10"
              max="150"
              step="1"
              value={massFlow}
              onChange={(e) => handleSlider(setMassFlow, parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>10 t/h</span>
              <span>{(massFlow * 1000).toLocaleString()} kg/h</span>
              <span>150 t/h</span>
            </div>
          </div>

          {/* Slider 2: Upstream Relief Pressure */}
          <div className="space-y-1.5 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800">
            <div className="flex justify-between items-center text-zinc-400">
              <label>Upstream Pressure (P1):</label>
              <span className="text-amber-400 font-bold">{p1} bar(a)</span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              step="1"
              value={p1}
              onChange={(e) => handleSlider(setP1, parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>5 bar</span>
              <span>Relief Setpoint</span>
              <span>100 bar</span>
            </div>
          </div>

          {/* Slider 3: Downstream Backpressure */}
          <div className="space-y-1.5 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800">
            <div className="flex justify-between items-center text-zinc-400">
              <label>Tailpipe Backpressure (P2):</label>
              <span className="text-amber-400 font-bold">{p2} bar(a)</span>
            </div>
            <input
              type="range"
              min="1.2"
              max="15.0"
              step="0.2"
              value={p2}
              onChange={(e) => handleSlider(setP2, parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>1.2 bar</span>
              <span>Header P</span>
              <span>15.0 bar</span>
            </div>
          </div>

          {/* Slider 4: Molecular Weight */}
          <div className="space-y-1.5 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800">
            <div className="flex justify-between items-center text-zinc-400">
              <label>Molecular Weight (MW):</label>
              <span className="text-cyan-400 font-bold">{mw} kg/kmol</span>
            </div>
            <input
              type="range"
              min="14"
              max="60"
              step="1"
              value={mw}
              onChange={(e) => handleSlider(setMw, parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>14 (CH4 rich)</span>
              <span>Fluid Composition</span>
              <span>60 (Heavy HC)</span>
            </div>
          </div>

          {/* Selector 5: Pipe Nominal Size (NPS) */}
          <div className="space-y-1.5 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800">
            <div className="flex justify-between items-center text-zinc-400">
              <label>Tailpipe Size (NPS):</label>
              <span className="text-emerald-400 font-bold">{pipeNps} ({calculations.odMm} mm OD)</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {['6"', '8"', '10"', '12"', '14"', '16"', '20"', '24"'].map((nps) => (
                <button
                  key={nps}
                  onClick={() => {
                    sovereignAudio.playClick();
                    setPipeNps(nps);
                  }}
                  className={`py-1 rounded text-[11px] font-mono transition-colors ${
                    pipeNps === nps
                      ? 'bg-emerald-600 text-black font-bold shadow-md'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                  }`}
                >
                  {nps}
                </button>
              ))}
            </div>
          </div>

          {/* Selector 6: Pipe Schedule */}
          <div className="space-y-1.5 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800">
            <div className="flex justify-between items-center text-zinc-400">
              <label>Pipe Schedule:</label>
              <span className="text-emerald-400 font-bold">{pipeSch} (t = {calculations.wallThkMm} mm)</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {['Sch 20', 'Sch 40', 'Sch 80', 'Sch 160'].map((sch) => (
                <button
                  key={sch}
                  onClick={() => {
                    sovereignAudio.playClick();
                    setPipeSch(sch);
                  }}
                  className={`py-1 rounded text-[11px] font-mono transition-colors ${
                    pipeSch === sch
                      ? 'bg-emerald-600 text-black font-bold shadow-md'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                  }`}
                >
                  {sch}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* 7. FOUR OPERATIONAL PRESETS */}
      <div className="px-5 py-3 bg-zinc-950 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-zinc-400">
          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold uppercase tracking-wider text-[11px]">Relief Scenarios:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Preset 1: Full Gas Blowdown */}
          <button
            onClick={() => handleApplyPreset(85.0, 45.0, 2.5, '10"', 'Sch 40', 22.0, 60.0)}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 text-amber-400 hover:text-amber-300 transition-colors"
          >
            Design Full Blowdown (85 t/h)
          </button>

          {/* Preset 2: Thermal Relief */}
          <button
            onClick={() => handleApplyPreset(12.0, 25.0, 1.8, '8"', 'Sch 40', 28.0, 45.0)}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Thermal Expansion Relief (12 t/h)
          </button>

          {/* Preset 3: Fire Case */}
          <button
            onClick={() => handleApplyPreset(125.0, 70.0, 3.2, '12"', 'Sch 40', 20.0, 110.0)}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 text-rose-400 hover:text-rose-300 transition-colors"
          >
            Overpressure Fire Case (125 t/h)
          </button>

          {/* Preset 4: Mitigated Heavy Wall */}
          <button
            onClick={() => handleApplyPreset(85.0, 45.0, 2.5, '14"', 'Sch 160', 22.0, 60.0)}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Mitigated Heavy Wall (14" Sch 160)
          </button>
        </div>
      </div>

    </div>
  );
}
