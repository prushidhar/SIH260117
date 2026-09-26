'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  Cpu,
  Flame,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Send,
  Lock,
  MessageSquare,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileCheck,
  Scale,
  Volume2,
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { playSealChime, playSuccessChirp, speakSovereignAlert } from '@/lib/sound/sovereign-audio';

export interface AgentDebater {
  id: 'ALPHA' | 'BETA' | 'GAMMA';
  name: string;
  role: string;
  avatarColor: string;
  initialStance: string;
  proposedValue: string;
  keyMetric: string;
  governingStandard: string;
}

export interface DebateMessage {
  id: string;
  round: 1 | 2 | 3;
  speaker: 'ALPHA' | 'BETA' | 'GAMMA';
  argument: string;
  standardCitation: string;
  stanceAdjustment?: string;
  sentiment: 'AGREE' | 'DISAGREE' | 'COMPROMISE';
}

export interface MultiAgentConsensusProps {
  tag?: string;
  title?: string;
  equipmentType?: string;
  targetParameter?: string;
  consensusValue?: string;
  agreementScore?: number;
  riskReductionFactor?: number;
  debaters?: AgentDebater[];
  debateTranscript?: DebateMessage[];
}

export default function MultiAgentConsensusWidget({
  tag = 'CDU-Pipe-104',
  title = 'Tri-Model Autonomous Peer-Review & Consensus Engine',
  equipmentType = 'Crude Distillation Transfer Spool (ASTM A106 Gr B)',
  targetParameter = 'Maximum Allowable Operating Pressure (MAOP) & Recirculation Trip Setpoint',
  consensusValue = '465.0 psig (with 14.5% FV-101 minimum bypass)',
  agreementScore = 98.4,
  riskReductionFactor = 1250,
  debaters,
  debateTranscript,
}: MultiAgentConsensusProps) {
  const { setApprovalsModalOpen, addToast, addNetworkEvent, selectTag } = useIndraStore();

  const [activeRound, setActiveRound] = useState<1 | 2 | 3>(3);
  const [isDebating, setIsDebating] = useState(false);
  const [isDispatched, setIsDispatched] = useState(false);
  const [consensusProgress, setConsensusProgress] = useState(0);

  const defaultDebaters: AgentDebater[] = debaters || [
    {
      id: 'ALPHA',
      name: 'Agent Alpha (Process Lead)',
      role: 'Thermodynamics & Plant Throughput',
      avatarColor: 'from-cyan-500 to-blue-600',
      initialStance: 'Advocates maximum throughput at 510 psig to sustain 220,000 kg/h crude feed.',
      proposedValue: '510 psig',
      keyMetric: 'Throughput: 100%',
      governingStandard: 'API 14E / Crane TP-410',
    },
    {
      id: 'BETA',
      name: 'Agent Beta (Materials Specialist)',
      role: 'Metallurgy & Wall Thickness Safety',
      avatarColor: 'from-amber-500 to-orange-600',
      initialStance: 'Vetoes 510 psig. 7.2mm measured wall limits pressure to max 475 psig per ASME B31.3 §304.1.2.',
      proposedValue: '455 psig',
      keyMetric: 'Hoop Stress: 17.8 ksi',
      governingStandard: 'ASME B31.3 / API 570',
    },
    {
      id: 'GAMMA',
      name: 'Agent Gamma (SIS SIL-3 Interlock)',
      role: 'Functional Safety & Trip Automation',
      avatarColor: 'from-violet-500 to-purple-600',
      initialStance: 'Requires safety trip setpoint at 480 psig with compulsory 14.5% spillback recirculation margin.',
      proposedValue: '465 psig',
      keyMetric: 'SIL-2 Safety Margin: +32%',
      governingStandard: 'IEC 61508 / IEC 61511',
    },
  ];

  const defaultTranscript: DebateMessage[] = debateTranscript || [
    // Round 1
    {
      id: 'msg-1',
      round: 1,
      speaker: 'ALPHA',
      argument:
        'To fulfill operational schedule for crude run #42, pipeline CDU-Pipe-104 should operate at 510.0 psig. Darcy-Weisbach friction drops require this inlet pressure to guarantee 2.83 m/s velocity.',
      standardCitation: 'Crane TP-410 §3.2 (Hydraulic Flow Optimization)',
      sentiment: 'DISAGREE',
    },
    {
      id: 'msg-2',
      round: 1,
      speaker: 'BETA',
      argument:
        'Formal objection: Ultrasonic thickness scan verified 7.2mm actual wall (vs 12.7mm nominal). Applying ASME B31.3 Eq. 3a with allowable stress S=20,000 psi and corrosion allowance c=0.0625", 510 psig breaches allowable stress by 11.4%.',
      standardCitation: 'ASME B31.3-2022 Process Piping Clause 304.1.2',
      sentiment: 'DISAGREE',
    },
    {
      id: 'msg-3',
      round: 1,
      speaker: 'GAMMA',
      argument:
        'Independent safety analysis: Without minimum recirculation flow through FV-101, hydraulic pressure surge during sudden feed valve closure could spike pressure +70 psi above steady-state. Overpressure trip is mandatory.',
      standardCitation: 'IEC 61511 Functional Safety for Process Industry',
      sentiment: 'DISAGREE',
    },
    // Round 2
    {
      id: 'msg-4',
      round: 2,
      speaker: 'ALPHA',
      argument:
        'Re-evaluating hydraulic curve: If we maintain minimum recirculation spillback at 14.5% (approx 65 GPM) via valve FV-101, water hammer surge magnitude drops from 70 psi to 18 psi. Can we converge near 470 psig?',
      standardCitation: 'API 610 12th Ed. Minimum Continuous Stable Flow (MCSF)',
      sentiment: 'COMPROMISE',
      stanceAdjustment: 'Adjusts proposal: 510 → 470 psig',
    },
    {
      id: 'msg-5',
      round: 2,
      speaker: 'BETA',
      argument:
        'Recalculated with surge margin: At 465.0 psig steady state + 18.0 psi controlled surge = 483.0 psig peak, the remaining wall thickness provides a safety margin of +0.3268 inches. This complies with API 570 Class 1 piping requirements.',
      standardCitation: 'API 570 In-Service Inspection Clause 7.1.1',
      sentiment: 'AGREE',
      stanceAdjustment: 'Adjusts proposal: 455 → 465 psig',
    },
    {
      id: 'msg-6',
      round: 2,
      speaker: 'GAMMA',
      argument:
        'Safety interlock logic updated: Setting high-pressure trip at 490 psig and interlocked spillback valve FV-101 trim to open at 475 psig achieves an RRF of 1,250, satisfying SIL-2 functional safety.',
      standardCitation: 'IEC 61508 Part 1 (SIL-2 Safety Integrity Requirement)',
      sentiment: 'AGREE',
      stanceAdjustment: 'Adjusts proposal: 465 psig (Confirmed)',
    },
    // Round 3
    {
      id: 'msg-7',
      round: 3,
      speaker: 'ALPHA',
      argument:
        'Consensus accepted. 465.0 psig operating setpoint delivers 94.2% of peak throughput schedule while fully respecting structural thickness and transient surge envelopes.',
      standardCitation: 'Operations Directive OPS-CDU-2026-08',
      sentiment: 'AGREE',
    },
    {
      id: 'msg-8',
      round: 3,
      speaker: 'BETA',
      argument:
        'Consensus approved. Statutory compliance certificate and ASME B31.3 calculation sheet signed off with verified 45.1 years remaining fatigue life.',
      standardCitation: 'ASME Boiler & Pressure Vessel Code Sec VIII / B31.3',
      sentiment: 'AGREE',
    },
    {
      id: 'msg-9',
      round: 3,
      speaker: 'GAMMA',
      argument:
        'Consensus sealed. Tri-agent cryptographic consensus generated with combined Merkle root. Forwarding to Plant Superintendent for dual-key HITL authorization.',
      standardCitation: 'IEC 62443 Industrial Security & NIST SP 800-82',
      sentiment: 'AGREE',
    },
  ];

  // Animate consensus gauge on mount
  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += 3;
      if (current >= agreementScore) {
        setConsensusProgress(agreementScore);
        clearInterval(interval);
      } else {
        setConsensusProgress(current);
      }
    }, 25);
    return () => clearInterval(interval);
  }, [agreementScore]);

  const handleReRunDebate = () => {
    setIsDebating(true);
    setConsensusProgress(30);
    setActiveRound(1);

    setTimeout(() => {
      setActiveRound(2);
      setConsensusProgress(70);
    }, 800);

    setTimeout(() => {
      setActiveRound(3);
      setConsensusProgress(agreementScore);
      setIsDebating(false);
      playSuccessChirp();
      addToast({
        type: 'info',
        title: 'Tri-Agent Convergence Complete',
        message: '3 local specialized models converged on 465.0 psig consensus setpoint with 98.4% agreement index.',
      });
    }, 1600);
  };

  const handleAuthorizeDispatch = () => {
    playSealChime();
    setIsDispatched(true);
    setApprovalsModalOpen(true);

    addNetworkEvent({
      destination: '127.0.0.1:dcs-safety-plc',
      action: 'TRI_AGENT_CONSENSUS_DISPATCH',
      status: 'contained',
      timestamp: new Date().toLocaleTimeString(),
      protocol: 'MODBUS/TCP (Encrypted)',
      source: 'indra:consensus-engine',
    });

    addToast({
      type: 'success',
      title: 'Tri-Signed Consensus Authorized',
      message: 'Consensus setpoints queued for Human-in-the-Loop Plant Superintendent approval.',
    });
  };

  const handleVoiceSummary = () => {
    speakSovereignAlert(
      `Autonomous multi-agent consensus achieved for equipment tag ${tag}. Agent Alpha, Beta, and Gamma have reached 98.4 percent agreement on operating setpoint 465 psig.`
    );
  };

  return (
    <div className="w-full my-3 rounded-2xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 shadow-md overflow-hidden font-sans select-none transition-all">
      {/* 1. Header Banner */}
      <div className="p-4 bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-transparent border-b border-slate-200 dark:border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-600 text-white shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">{title}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-violet-100 text-violet-800 dark:bg-violet-950/80 dark:text-violet-300 border border-violet-300 dark:border-violet-800 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-violet-600 dark:text-violet-400" />
                  <span>TRI-MODEL CONSENSUS</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-mono">
                <span>Asset: {tag}</span>
                <span>•</span>
                <span>{equipmentType}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => selectTag(tag)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-mono font-semibold transition-colors cursor-pointer border border-slate-200 dark:border-zinc-800"
              title="Locate equipment tag on P&ID schematic"
            >
              Tag: {tag}
            </button>

            <button
              onClick={handleVoiceSummary}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer border border-slate-200 dark:border-zinc-800"
              title="Vocalize consensus summary"
            >
              <Volume2 className="w-4 h-4 text-violet-500" />
            </button>
          </div>
        </div>

        {/* 2. Consensus Metrics Card */}
        <div className="mt-3.5 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800/80">
            <div className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">
              Deliberated Target Parameter
            </div>
            <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200 mt-0.5 truncate">
              {targetParameter}
            </div>
            <div className="text-sm font-mono font-bold text-violet-600 dark:text-violet-400 mt-1">
              {consensusValue}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800/80">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">
              <span>Convergence Agreement</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{consensusProgress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-700"
                style={{ width: `${consensusProgress}%` }}
              />
            </div>
            <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 mt-1 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Mathematical Equilibrium Reached</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">
                Risk Reduction Factor (RRF)
              </div>
              <div className="text-base font-mono font-bold text-slate-800 dark:text-zinc-100 mt-0.5">
                RRF = {riskReductionFactor}:1
              </div>
              <div className="text-[10px] font-mono text-violet-600 dark:text-violet-400 font-semibold">
                SIL-2 / IEC 61508 Certified
              </div>
            </div>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600">
              <Scale className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Debater Personas Strip */}
      <div className="p-3 bg-slate-50/60 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-zinc-800">
        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2 px-1">
          Active Autonomous Debaters (100% Local Multi-Model Engine)
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {defaultDebaters.map((debater) => (
            <div
              key={debater.id}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-start gap-2.5 text-xs shadow-2xs"
            >
              <div
                className={`w-7 h-7 rounded-lg bg-gradient-to-br ${debater.avatarColor} text-white flex items-center justify-center flex-shrink-0 font-mono font-bold text-[11px] shadow-2xs`}
              >
                {debater.id[0]}
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="font-bold text-slate-800 dark:text-zinc-200 truncate">
                  {debater.name}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono truncate">
                  {debater.role}
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono pt-1 text-slate-600 dark:text-zinc-300">
                  <span className="font-semibold text-violet-600 dark:text-violet-400">{debater.proposedValue}</span>
                  <span className="text-[9px] text-slate-400 truncate max-w-[120px]">{debater.governingStandard}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Multi-Round Debate Stepper & Transcript */}
      <div className="p-4">
        {/* Round Switcher Tabs */}
        <div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-zinc-800 pb-2">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((rnd) => (
              <button
                key={rnd}
                onClick={() => setActiveRound(rnd as 1 | 2 | 3)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                  activeRound === rnd
                    ? 'bg-violet-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800'
                }`}
              >
                {rnd === 1 ? 'Round 1: Initial Stances' : rnd === 2 ? 'Round 2: Rebuttal & Stress Calc' : 'Round 3: Final Consensus'}
              </button>
            ))}
          </div>

          <button
            onClick={handleReRunDebate}
            disabled={isDebating}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer border border-slate-200 dark:border-zinc-800 disabled:opacity-50"
            title="Re-run autonomous debate rounds"
          >
            <RefreshCw className={`w-3 h-3 ${isDebating ? 'animate-spin' : ''}`} />
            <span>Re-Deliberate</span>
          </button>
        </div>

        {/* Debate Message Cards */}
        <div className="space-y-2.5">
          {defaultTranscript
            .filter((m) => m.round === activeRound)
            .map((msg) => {
              const speakerInfo = defaultDebaters.find((d) => d.id === msg.speaker);
              return (
                <div
                  key={msg.id}
                  className="p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/40 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 font-mono font-bold text-[10px] flex items-center justify-center">
                        {msg.speaker}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-zinc-200">
                        {speakerInfo?.name}
                      </span>
                      {msg.stanceAdjustment && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          {msg.stanceAdjustment}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        msg.sentiment === 'AGREE'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : msg.sentiment === 'COMPROMISE'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {msg.sentiment}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed font-sans pl-7">
                    {msg.argument}
                  </p>

                  <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono pl-7 flex items-center gap-1.5">
                    <FileCheck className="w-3 h-3 text-slate-400" />
                    <span>Citation: {msg.standardCitation}</span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* 5. Tri-Key Cryptographic Signatures Strip */}
      <div className="px-4 py-3 bg-slate-50 dark:bg-zinc-900/90 border-t border-slate-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-400">
            <Lock className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-semibold text-slate-800 dark:text-zinc-200">Consensus Merkle Proof Leaf:</span>
            <span className="text-[10px] text-slate-500 truncate max-w-[200px]">
              0x44b9e28fa10c3b88...c7a1
            </span>
          </div>
          <div className="text-[10px] text-slate-400 dark:text-zinc-500">
            Tri-Signed by: Alpha (Ed25519) • Beta (Ed25519) • Gamma (Ed25519)
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAuthorizeDispatch}
            disabled={isDispatched}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
              isDispatched
                ? 'bg-emerald-600 text-white'
                : 'bg-violet-600 hover:bg-violet-700 text-white'
            }`}
          >
            {isDispatched ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Queued in HITL Register</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Authorize Tri-Signed Dispatch</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
