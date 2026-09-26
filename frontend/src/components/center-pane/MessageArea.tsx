'use client';

import { useRef, useEffect } from 'react';
import { FileText, Terminal, ScanEye, Activity, Gauge, Flame, Sparkles, AlertTriangle, ShieldCheck, Users, BellOff, Factory, ShieldAlert, Calendar, RotateCw, Zap } from 'lucide-react';
import useIndraStore, { Message } from '@/store/indra-store';
import { useWebSocket } from '@/providers/WebSocketProvider';
import UserMessage from './UserMessage';
import AgentMessage from './AgentMessage';
import ChatInput from './ChatInput';

const verifiedWorkflows = [
  {
    title: 'API 617 Compressor Anti-Surge Envelope',
    desc: 'Aerodynamic head-capacity map, 10% Surge Control Line (SCL), and <0.9s fast-opening ASV hot-gas recirculation',
    query: 'Analyze recycle gas compressor K-101 anti-surge operating map: suction flow 6500 m3/h, suction pressure 18.5 bar, discharge pressure 62.0 bar, speed 10450 RPM. Evaluate polytropic head, surge control margin, and display dynamic compressor map.',
    icon: RotateCw,
    badge: 'API 617 Aerodynamic',
  },
  {
    title: 'ASME PTC 6 Steam Turbine Cogeneration',
    desc: 'Multi-stage superheated steam expansion, 35 MW gross power generation, process heat export, and avoided carbon emissions',
    query: 'Evaluate steam turbine generator STG-01 multi-stage cogeneration balance: throttle flow 120 t/h at 90 bar and 510 C, MP extraction 45 t/h at 32 bar, LP extraction 35 t/h at 4.2 bar. Calculate electrical power generation, process thermal export, and carbon offset.',
    icon: Zap,
    badge: 'ASME PTC 6 Cogen',
  },
  {
    title: 'Statutory Approval Note & ASME B31.3 Inspection',
    desc: 'Review crude line CDU-Pipe-104 ultrasonic report, calculate t_min, and draft executive Word (.docx) approval note',
    query: 'Review the ultrasonic thickness inspection report for crude distillation unit CDU-Pipe-104: nominal thickness 12.7mm, measured thickness 7.2mm, corrosion rate 0.45 mm/yr, design pressure 3.2 MPa. Perform ASME B31.3 minimum thickness calculation and draft a statutory plant approval note for executive sign-off.',
    icon: FileText,
    badge: 'SIH Deliverable (.docx)',
  },
  {
    title: 'API 521 Flare Thermal Radiation & Dispersion',
    desc: 'Simulate emergency flaring heat release, tip exit Mach number (Ma <= 0.5), and radial thermal radiation contours',
    query: 'Calculate API 521 flare radiation profile, tip exit Mach number, and Gaussian plume ground dispersion for emergency relief stack FL-101 at 45 kg/s hydrocarbon flow.',
    icon: Flame,
    badge: 'API 521 Flare Relief',
  },
  {
    title: 'Refinery Turnaround (TAR) & CPM Scheduling',
    desc: 'OSHA 1910.119 Critical Path Method (CPM) shutdown schedule, positive blind list, and downtime delay risk',
    query: 'Synthesize the refinery turnaround TAR-2026-CDU1 CPM schedule for CDU-104 major overhaul. Analyze critical path tasks, positive isolation blinds, and financial downtime risk.',
    icon: Calendar,
    badge: 'TAR & CPM Scheduling',
  },
  {
    title: 'Tri-Model Autonomous Peer-Review & Consensus',
    desc: 'Multi-agent debate across Process, Materials, and Safety models reconciling throughput vs ASME B31.3 limits',
    query: 'Execute a tri-model autonomous peer-review debate for CDU-Pipe-104 between Agent Alpha (Process), Beta (Materials), and Gamma (Safety) to reconcile operating pressure and surge margins.',
    icon: Users,
    badge: 'Multi-Agent Debate',
  },
  {
    title: 'ISA-18.2 Intelligent Alarm Flood Rationalization',
    desc: 'Sequence of Events (SOE) first-out trip detection, suppressing sympathetic alarms per EEMUA 191',
    query: 'Analyze the DCS alarm flood sequence following the CDU-104 plant trip. Execute ISA-18.2 first-out root cause isolation and rationalize consequential secondary alarms.',
    icon: BellOff,
    badge: 'Alarm Management',
  },
  {
    title: 'Refinery Process Train & Mass-Energy Digital Twin',
    desc: 'Interactive CDU/VDU digital twin, real-time Nelson-Farrar cut yields, furnace duty, and Souders-Brown flooding check',
    query: 'Simulate refinery atmospheric distillation unit CDU-104 mass and energy balance for Arab Light crude feed at 100,000 BPD and 365 C furnace temperature. Display digital twin.',
    icon: Factory,
    badge: 'Process Digital Twin',
  },
  {
    title: 'Automated HAZOP & LOPA SIL Safety Case',
    desc: 'Quantitative Layer of Protection Analysis (LOPA) calculating cumulative PFD, required RRF, and IEC 61511 SIL level',
    query: 'Perform an automated HAZOP and Layer of Protection Analysis (LOPA) for Node 01 crude charge line overpressure deviation. Calculate cumulative PFD across active IPLs and target SIL allocation.',
    icon: ShieldAlert,
    badge: 'IEC 61511 Safety',
  },
  {
    title: 'Fluid Dynamics Darcy-Weisbach Sandbox',
    desc: 'Synthesize & verify Python hydraulic solver for friction factor and pressure drop using Colebrook-White equation',
    query: 'Write a Python script to calculate the Darcy-Weisbach friction factor and pressure drop in a 100m carbon steel pipe with flow rate 0.05 m3/s and diameter 0.15m.',
    icon: Terminal,
    badge: 'Code Sandbox',
  },
  {
    title: 'P&ID Schematic & ISA-5.1 Tag Localization',
    desc: 'Multimodal vision extraction of instrument tags, control valves, and line numbers from engineering drawings',
    query: 'Analyze the high-pressure feed P&ID schematic for crude distillation unit CDU-104. Extract all ISA-5.1 tags, valve designations, and line numbers, and verify safety relief valve isolation standards.',
    icon: ScanEye,
    badge: 'Multimodal Vision',
  },
  {
    title: 'ISO 10816 Vibration Triage & Telemetry Deck',
    desc: 'Triage slurry pump P-101 FFT harmonics (1X unbalance vs 2X misalignment), live telemetry gauge, and health score',
    query: 'Perform ISO 10816-3 vibration triage on slurry feed pump P-101: 1X harmonic 7.2 mm/s RMS, 2X harmonic 1.8 mm/s RMS. Identify root cause and stream telemetry and equipment health card.',
    icon: Activity,
    badge: 'Autonomous Diagnostics',
  },
  {
    title: 'API 610 Pump Hydraulics & NPSH Cavitation',
    desc: 'Evaluate slurry pump P-101 operating head, brake horsepower, and NPSH available vs NPSH required margin',
    query: 'Evaluate slurry pump P-101 for cavitation risk: operating flow 450 GPM, suction pressure 14.5 psig, discharge pressure 78.4 psig, specific gravity 0.88. Verify NPSH margin per API 610 12th Ed.',
    icon: Gauge,
    badge: 'API 610 Rotating',
  },
  {
    title: 'TEMA Exchanger Rating & Fouling Resistance',
    desc: 'Thermal duty, log mean temperature difference (LMTD), and fouling resistance factor on crude preheater E-101',
    query: 'Perform thermal rating and fouling resistance calculation on crude pre-heat exchanger E-101: crude flow 220,000 kg/h, inlet 140 C, outlet 185 C. Calculate duty in MW and compare against TEMA Class R.',
    icon: Flame,
    badge: 'TEMA Thermal',
  },
  {
    title: 'Root Cause Failure Analysis & 5-Whys (RCA)',
    desc: 'Bayesian Fault Tree (FTA), 5-Whys causal chain, Ishikawa 6M fishbone, and CAPA DCS dispatch for pump P-101 trip',
    query: 'Perform Root Cause Analysis (RCA) on crude feed pump P-101 mechanical seal flush disruption and high temperature trip. Synthesize Bayesian Fault Tree, 5-Whys, Ishikawa fishbone matrix, and CAPA remediations.',
    icon: AlertTriangle,
    badge: 'RCA & CAPA Engine',
  },
  {
    title: '0-WAN Air-Gap Penetration & Merkle Proof',
    desc: 'Kernel-level socket containment audit, local loopback boundary verification, and SHA-256 Merkle root verification',
    query: 'Execute 0-WAN Air-Gap penetration probe test and verify kernel socket loopback enforcement and SHA-256 Merkle ledger integrity.',
    icon: ShieldCheck,
    badge: '0-WAN Security',
  },
];

/**
 * Normalize message order so user message ALWAYS appears before its agent reply.
 * Handles both legacy sessions (indexedDB primary-key sorted) and multi-turn conversations.
 */
function normalizeMessageOrder(msgs: Message[]): Message[] {
  if (!msgs || msgs.length <= 1) return msgs || [];

  const list = [...msgs];

  // If messages have explicit orderIndex, use it
  const hasOrderIndex = list.some((m: any) => typeof m.orderIndex === 'number');
  if (hasOrderIndex) {
    return list.sort((a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  }

  // Extract epoch timestamp from id: e.g. msg-user-1726735000000 or msg-agent-1726735000000
  const getSortKey = (m: Message, originalIdx: number): number => {
    const match = m.id?.match(/\d{10,15}/);
    if (match) {
      const ts = parseInt(match[0], 10);
      // User message always gets priority over agent response with same/adjacent timestamp
      return m.role === 'agent' ? ts + 0.5 : ts;
    }
    return originalIdx;
  };

  return list.sort((a, b) => {
    const idxA = msgs.indexOf(a);
    const idxB = msgs.indexOf(b);
    return getSortKey(a, idxA) - getSortKey(b, idxB);
  });
}

export default function MessageArea() {
  const { messages, setInputValue } = useIndraStore();
  const { sendMessage, isAgentWorking } = useWebSocket();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Empty state — show home screen
  if (messages.length === 0) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-10 flex flex-col items-center select-none">
        <div className="w-full max-w-2xl flex flex-col items-center my-auto">
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-20 h-20 mb-4 flex items-center justify-center">
              <img src="/logo.png" alt="INDRA" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight mb-2">
              Industrial AI Co-Pilot
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
              Multi-step reasoning, ASME & P&ID verification, and deterministic engineering calculations.
            </p>
          </div>

          <ChatInput mode="center" />

          <div className="w-full mt-8">
            <div className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-3 px-1">
              Suggested Workflows
            </div>
            <div className="grid grid-cols-2 gap-3">
              {verifiedWorkflows.map((starter) => {
                const Icon = starter.icon;
                return (
                  <button
                    key={starter.title}
                    onClick={() => {
                      if (isAgentWorking) return;
                      setInputValue(starter.query);
                      sendMessage(starter.query);
                    }}
                    className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-medium">
                        {starter.badge}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200">{starter.title}</div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 leading-normal line-clamp-2">
                      {starter.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active conversation — normalize order then render top-to-bottom
  const orderedMessages = normalizeMessageOrder(messages);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 pb-36 space-y-4">
      {orderedMessages.map((msg) =>
        msg.role === 'user' ? (
          <UserMessage key={msg.id} message={msg} />
        ) : (
          <AgentMessage key={msg.id} message={msg} />
        )
      )}
      <div ref={bottomRef} />
    </div>
  );
}
