'use client';

import { useRef, useEffect, useState } from 'react';
import { 
  Activity, 
  Flame, 
  ShieldAlert, 
  Droplets, 
  Gauge, 
  Waves, 
  Cpu, 
  ChevronDown, 
  ChevronUp, 
  Sparkles 
} from 'lucide-react';
import useIndraStore, { Message } from '@/store/indra-store';
import { useWebSocket } from '@/providers/WebSocketProvider';
import UserMessage from './UserMessage';
import AgentMessage from './AgentMessage';
import ChatInput from './ChatInput';

/**
 * 7 Verified Industrial Simulation & Engineering Workflows Grid
 */
const industrialWorkflows = [
  {
    title: 'API 617 Centrifugal Compressor Anti-Surge Map',
    desc: 'Calculate surge limit line (SLL), 10% operating margin, and dynamic recycle valve response for multistage barrel compressor.',
    query: 'Execute API 617 8th Edition anti-surge control evaluation for multistage centrifugal compressor K-201: suction pressure 18.2 bar, discharge pressure 64.5 bar, polytropic head 112 kJ/kg, molecular weight 19.4. Compute the surge limit line (SLL), set minimum flow margin to 10%, and model the rapid recycle valve opening characteristic.',
    icon: Activity,
    badge: 'API 617 / Anti-Surge',
  },
  {
    title: 'ASME PTC 6 Cogeneration & Steam Turbine Heat Balance',
    desc: 'Compute extraction steam enthalpy, turbine cylinder isentropic efficiency, and condenser heat rate balance.',
    query: 'Perform ASME PTC 6 steam turbine thermal performance and heat balance simulation: throttle pressure 9.8 MPa at 540°C, cold reheat 2.4 MPa, condenser backpressure 0.08 bar. Compute turbine cylinder internal efficiency, generator heat rate (kJ/kWh), and extraction steam balance.',
    icon: Flame,
    badge: 'ASME PTC 6 / Thermal',
  },
  {
    title: 'NACE SP0169 Cathodic Protection & API 581 CUI Heatmap',
    desc: 'Corrosion Under Insulation (CUI) risk matrix & polarized -850mV CSE potential criteria for insulated pipework.',
    query: 'Evaluate buried crude pipeline PL-402 according to NACE SP0169 and API 581 CUI assessment: operating temperature 65°C to 110°C thermal cyclic zone, calcium silicate insulation with wet ingress, soil resistivity 2,400 ohm-cm. Verify polarized -850 mV CSE cathodic protection potential and generate a 5x5 CUI risk heatmap matrix.',
    icon: ShieldAlert,
    badge: 'NACE SP0169 / API 581',
  },
  {
    title: 'CTI ATC-105 Cooling Tower Psychrometric Balance',
    desc: 'Counterflow induced-draft tower cooling range, wet-bulb approach, and drift loss calculation.',
    query: 'Calculate cooling tower thermal capability per CTI ATC-105: wet-bulb temperature 28.5°C, circulating water flow 4,200 m3/h, hot water inlet 43.0°C, cold basin outlet 33.0°C. Calculate range (10°C), approach (4.5°C), tower characteristic KaV/L, and evaporation/drift losses.',
    icon: Droplets,
    badge: 'CTI ATC-105 / HVAC',
  },
  {
    title: 'GPSA Sec 20 TEG Glycol Dehydration Contactor',
    desc: 'Natural gas TEG circulation rate, reboiler duty, and water dew-point depression.',
    query: 'Model GPSA Engineering Data Book Section 20 TEG gas dehydration contactor: feed gas flow 45 MMSCFD, pressure 72 bar, inlet water content 85 lb/MMSCF, target pipeline moisture specification 4.0 lb/MMSCF. Compute lean TEG circulation rate (gal TEG/lb H2O), reboiler heat duty at 204°C, and stripper stripping gas requirement.',
    icon: Cpu,
    badge: 'GPSA Sec 20 / Process',
  },
  {
    title: 'API 520 / 526 Pressure Relief Valve Fire Sizing',
    desc: 'External fire exposure relief area, latent heat of vaporization, and standard orifice selection.',
    query: 'Size emergency pressure relief valve per API 520 Part I and API 526 for horizontal separator V-301 under wetted fire case: wetted surface area 48.5 m2, relieving pressure 21.4 bar (121% MAWP), latent heat of vaporization 285 kJ/kg. Calculate heat absorption (Q = 43,200 F A^0.82), relieving mass flow, and select required standard orifice letter designation.',
    icon: Gauge,
    badge: 'API 520 / Safety PSV',
  },
  {
    title: 'ISO 10816-3 Vibration Severity & FFT Harmonics',
    desc: 'Rotary machinery vibration velocity RMS triage, 1X unbalance vs 2X misalignment, and spectral boundary bands.',
    query: 'Perform ISO 10816-3 Group 1 rigid foundation vibration severity triage on crude charge pump P-101B: overall RMS velocity 7.8 mm/s (Zone C/D boundary), 1X running speed spectral peak 5.4 mm/s, 2X harmonic 3.1 mm/s, bearing temperature 78°C. Generate vibration severity gauge, FFT spectral breakdown, and maintenance advisory.',
    icon: Waves,
    badge: 'ISO 10816-3 / Telemetry',
  },
];

/**
 * Normalize message order so user message ALWAYS appears before its agent reply.
 */
function normalizeMessageOrder(msgs: Message[]): Message[] {
  if (!msgs || msgs.length <= 1) return msgs || [];

  const list = [...msgs];
  const hasOrderIndex = list.some((m: any) => typeof m.orderIndex === 'number');
  if (hasOrderIndex) {
    return list.sort((a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  }

  const getSortKey = (m: Message, originalIdx: number): number => {
    const match = m.id?.match(/\d{10,15}/);
    if (match) {
      const ts = parseInt(match[0], 10);
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
  const [isGridExpanded, setIsGridExpanded] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Empty state — show industrial co-pilot home screen with workflow templates
  if (messages.length === 0) {
    const displayedWorkflows = isGridExpanded 
      ? industrialWorkflows 
      : industrialWorkflows.slice(0, 4);

    return (
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-8 flex flex-col items-center select-none">
        <div className="w-full max-w-3xl flex flex-col items-center my-auto">
          {/* Header Branding */}
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="w-16 h-16 mb-3 flex items-center justify-center">
              <img src="/logo.png" alt="INDRA" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight mb-1.5 font-sans">
              Industrial AI Co-Pilot
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-zinc-400 max-w-lg mx-auto leading-relaxed font-sans">
              Air-gapped deterministic engineering solver, multimodal ISA-5.1 P&amp;ID vision, and statutory code verification.
            </p>
          </div>

          {/* Centered Chat Input Box */}
          <ChatInput mode="center" />

          {/* Quick-Starter Industrial Workflows Grid */}
          <div className="w-full mt-8">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider font-mono">
                  Quick-Starter Industrial Workflows Grid
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 font-semibold font-mono">
                  {industrialWorkflows.length} Templates
                </span>
              </div>

              {/* Expand / Collapse Grid Toggle */}
              <button
                onClick={() => setIsGridExpanded(!isGridExpanded)}
                className="flex items-center gap-1 text-[11px] font-mono text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
              >
                <span>{isGridExpanded ? 'Collapse Grid' : `View All (${industrialWorkflows.length})`}</span>
                {isGridExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {displayedWorkflows.map((starter) => {
                const Icon = starter.icon;
                return (
                  <button
                    key={starter.title}
                    onClick={() => {
                      if (isAgentWorking) return;
                      setInputValue(starter.query);
                      sendMessage(starter.query);
                    }}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-xs transition-all text-left cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900 group-hover:scale-105 transition-transform">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-mono font-semibold">
                        {starter.badge}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {starter.title}
                    </div>
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
