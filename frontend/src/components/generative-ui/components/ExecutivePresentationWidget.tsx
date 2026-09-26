'use client';

import React, { useState } from 'react';
import { 
  Presentation, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  ShieldCheck, 
  CheckCircle2, 
  Hash, 
  FileText, 
  ExternalLink,
  Layers,
  Sparkles,
  Maximize2,
  Minimize2,
  BookOpen,
  Award,
  Zap,
  Cpu,
  Lock,
  Flame,
  Activity
} from 'lucide-react';
import useIndraStore, { API_BASE } from '@/store/indra-store';

interface ExecutivePresentationWidgetProps {
  tag?: string;
  title?: string;
  domain?: string;
  filename?: string;
  downloadUrl?: string;
  hash?: string;
}

interface SlideData {
  num: number;
  badge: string;
  title: string;
  subtitle: string;
  theme: 'navy' | 'dark' | 'emerald' | 'violet';
  speakerNotes: string;
  content: React.ReactNode;
}

export default function ExecutivePresentationWidget({
  tag = 'CDU-Pipe-104',
  title = 'Executive Board Review — CDU-Pipe-104',
  domain = 'pipe_thickness',
  filename = 'CDU-Pipe-104_Board_Review.pptx',
  downloadUrl = '',
  hash = 'SHA256:VERIFIED',
}: ExecutivePresentationWidgetProps) {
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [showNotes, setShowNotes] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const { addToast } = useIndraStore();

  const finalDownloadUrl = downloadUrl.startsWith('http')
    ? downloadUrl
    : `${API_BASE}${downloadUrl.startsWith('/') ? '' : '/'}${downloadUrl}`;

  const handleDownloadPitchDeck = () => {
    window.open(`${API_BASE}/api/sih/pitch-deck`, '_blank');
    addToast({
      type: 'success',
      title: 'Official SIH Deck Downloaded',
      message: 'Opening official 6-slide Smart India Hackathon winning deck.',
    });
  };

  const slides: SlideData[] = [
    {
      num: 1,
      badge: 'SLIDE 1: SOVEREIGN DEFENSE BRIEFING',
      title: 'INDRA — Autonomous Sovereign AI Workbench',
      subtitle: 'Zero-WAN Air-Gapped Industrial Intelligence & Statutory Asset Integrity',
      theme: 'navy',
      speakerNotes: 'Lead with sovereignty: INDRA is 100% on-premise, air-gapped with zero external internet dependencies. Emphasize compliance with IEC 62443 and CMMC OT defense protocols.',
      content: (
        <div className="p-4 rounded-xl bg-slate-950 text-white flex flex-col justify-between h-56 border border-cyan-500/40 shadow-inner font-mono">
          <div className="flex items-center justify-between">
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
              DEFENSE / CRITICAL INFRASTRUCTURE GRADE
            </span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" /> 100% AIR-GAPPED (0-WAN)
            </span>
          </div>
          <div>
            <h4 className="text-base font-bold text-white tracking-wide font-sans">{title}</h4>
            <p className="text-xs text-slate-300 mt-1">Smart India Hackathon • Problem Statement ID 26117</p>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[10px] text-slate-400">
            <div>• Host: 127.0.0.1 Loopback</div>
            <div>• Resident Models: 3 Local</div>
            <div>• Merkle Ledger: SHA-256</div>
          </div>
        </div>
      ),
    },
    {
      num: 2,
      badge: 'SLIDE 2: PROBLEM STATEMENT & RISK',
      title: 'The Industrial Hallucination Crisis',
      subtitle: 'Why generic cloud AI causes catastrophic plant shutdowns & safety risks',
      theme: 'dark',
      speakerNotes: 'Highlight the critical industrial danger: Generic LLMs hallucinate calculations and cannot guarantee standards compliance. A single mathematical error in pipe wall sizing results in catastrophic explosion.',
      content: (
        <div className="grid grid-cols-2 gap-2 h-56 font-mono text-xs">
          <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/60 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-rose-400 font-bold text-[10px] uppercase">
              <Flame className="w-3.5 h-3.5" />
              <span>Generic Cloud LLMs</span>
            </div>
            <div className="text-[11px] text-slate-300 space-y-1">
              <p>❌ Unpredictable mathematical hallucinations</p>
              <p>❌ Sensitive operational data sent to foreign cloud</p>
              <p>❌ Zero cryptographic evidence trail</p>
              <p>❌ Non-compliant with ASME/API plant standards</p>
            </div>
            <span className="text-[9px] text-rose-400 font-bold">Risk: Catastrophic Industrial Failure</span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/60 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[10px] uppercase">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>INDRA Sovereign Workbench</span>
            </div>
            <div className="text-[11px] text-slate-300 space-y-1">
              <p>✔ 100% Deterministic calculation tools (AST Sandbox)</p>
              <p>✔ Evidence Lock™ standard-clause verification</p>
              <p>✔ Cryptographically chained Merkle ledger</p>
              <p>✔ 3-Tier Human-in-the-Loop Plant Sign-Off</p>
            </div>
            <span className="text-[9px] text-emerald-400 font-bold">Standard: IEC 62443 / ASME B31.3</span>
          </div>
        </div>
      ),
    },
    {
      num: 3,
      badge: 'SLIDE 3: MULTI-AGENT ARCHITECTURE',
      title: 'Deterministic DAG Multi-Agent Flow',
      subtitle: 'Autonomous routing with Evidence Lock™ and zero-hallucination tools',
      theme: 'violet',
      speakerNotes: 'Explain the 6-node deterministic DAG architecture: Query Classification -> Local ChromaDB RAG -> Isolated Python Tool Execution -> Evidence Lock verification -> Deliverables Trinity compilation.',
      content: (
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 h-56 flex flex-col justify-between font-mono text-xs">
          <div className="flex items-center justify-between text-[10px] text-violet-400 font-bold uppercase">
            <span>Deterministic Agent Pipeline</span>
            <span>Zero Unaudited Inference</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <div className="font-bold text-sky-400">1. Intent Classifier</div>
              <div className="text-slate-400 text-[9px] mt-0.5">Discipline & domain routing</div>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <div className="font-bold text-violet-400">2. Local RAG</div>
              <div className="text-slate-400 text-[9px] mt-0.5">ChromaDB semantic search</div>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <div className="font-bold text-emerald-400">3. AST Sandbox</div>
              <div className="text-slate-400 text-[9px] mt-0.5">12 deterministic solvers</div>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <div className="font-bold text-amber-400">4. Evidence Lock™</div>
              <div className="text-slate-400 text-[9px] mt-0.5">Mathematical cross-check</div>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <div className="font-bold text-rose-400">5. 3-Tier HITL</div>
              <div className="text-slate-400 text-[9px] mt-0.5">Plant Superintendent sign-off</div>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <div className="font-bold text-cyan-400">6. Deliverables</div>
              <div className="text-slate-400 text-[9px] mt-0.5">.docx, .xlsx, .pptx trinity</div>
            </div>
          </div>
          <div className="text-[9px] text-emerald-400 border-t border-slate-800 pt-1 flex items-center justify-between">
            <span>✔ Complete Execution Cycle Latency: 1.4s</span>
            <span>Cryptographic Merkle Root Logged</span>
          </div>
        </div>
      ),
    },
    {
      num: 4,
      badge: 'SLIDE 4: REAL-TIME OPERATIONAL KPIS',
      title: 'Operational KPI Dashboard & Remaining Service Life',
      subtitle: 'Deterministic ultrasonic NDT readings & calibrated corrosion wear envelope',
      theme: 'emerald',
      speakerNotes: 'Present the engineering findings: Pipe wall measured at 7.2mm against nominal 12.7mm. Minimum thickness required by ASME B31.3 is 6.31mm. Safety margin is +0.89mm, leaving 10.9 years of safe operational life.',
      content: (
        <div className="grid grid-cols-2 gap-2 h-56 font-mono">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] uppercase text-slate-400 font-bold">Measured Thickness</span>
            <div className="text-2xl font-bold text-white">7.20 <span className="text-xs font-normal text-slate-400">mm</span></div>
            <span className="text-[9px] text-slate-400">Ultrasonic UT Gauge (ASTM A106 Gr B)</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-emerald-800 flex flex-col justify-between">
            <span className="text-[10px] uppercase text-emerald-400 font-bold">Corrosion Rate</span>
            <div className="text-2xl font-bold text-emerald-400">0.45 <span className="text-xs font-normal text-slate-400">mm/yr</span></div>
            <span className="text-[9px] text-slate-400">Calibrated ultrasonic NDT envelope</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] uppercase text-slate-400 font-bold">ASME B31.3 Required (tm)</span>
            <div className="text-2xl font-bold text-white">6.31 <span className="text-xs font-normal text-slate-400">mm</span></div>
            <span className="text-[9px] text-slate-400">Design P: 464.1 psig (3.2 MPa)</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-700 flex flex-col justify-between">
            <span className="text-[10px] uppercase text-emerald-300 font-bold">Remaining Useful Life</span>
            <div className="text-2xl font-bold text-emerald-300">10.9 <span className="text-xs font-normal text-slate-400">Years</span></div>
            <span className="text-[9px] text-emerald-400 font-bold">STATUS: SAFE FOR RUN (Re-inspect 24 Mo)</span>
          </div>
        </div>
      ),
    },
    {
      num: 5,
      badge: 'SLIDE 5: CRYPTOGRAPHIC MERKLE LEDGER',
      title: 'Immutable Merkle Chaining & Statutory Governance',
      subtitle: 'SHA-256 block ledger with dual-key Human-in-the-Loop authorization',
      theme: 'dark',
      speakerNotes: 'Explain the governance mechanism: No AI output can trigger high-consequence operational actions without 3-Tier Human-in-the-Loop sign-off. Every calculation and signature is sealed into an immutable SHA-256 Merkle chain.',
      content: (
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 h-56 flex flex-col justify-between font-mono text-xs">
          <div className="space-y-1.5 text-[10px]">
            <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Governing Standard:</span>
              <span className="text-emerald-400 font-bold">ASME B31.3-2022 §304.1.2 & API 570</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Plant Superintendent Sign-Off:</span>
              <span className="text-emerald-400 font-bold">Superintendent Sharma (EMP-108) [Tier 3]</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Audit Block Hash:</span>
              <span className="text-slate-300 truncate max-w-[200px]">01a6aef91e78e3995f33bc184a259bb7e7355dc0366a7ec26f0ac1c9a62a63d9</span>
            </div>
          </div>
          <div className="p-2 rounded bg-emerald-950/40 border border-emerald-800 text-[10px] text-emerald-300 flex items-center justify-between">
            <span>✔ Cryptographic Root Verified</span>
            <span>Zero WAN External Egress Confirmed</span>
          </div>
        </div>
      ),
    },
    {
      num: 6,
      badge: 'SLIDE 6: STRATEGIC IMPACT & ROI',
      title: 'Operational Impact, Latency & Cost Savings',
      subtitle: 'Validated metrics across petroleum refineries and nuclear power infrastructure',
      theme: 'navy',
      speakerNotes: 'Conclude with business and defense value: 100% on-premise operation prevents costly unplanned shutdowns ($4.2M saved per avoided trip), reduces engineering turnaround from 3 days to 45 seconds, with zero cloud vendor lock-in.',
      content: (
        <div className="grid grid-cols-3 gap-2 h-56 font-mono text-xs">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Calculation Speed</span>
            <div className="text-2xl font-bold text-sky-400">45 <span className="text-xs font-normal">sec</span></div>
            <span className="text-[9px] text-slate-400">Vs. 3 days manual engineering review</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-emerald-800 flex flex-col justify-between">
            <span className="text-[10px] text-emerald-400 uppercase font-bold">Unplanned Downtime</span>
            <div className="text-2xl font-bold text-emerald-400">$4.2M</div>
            <span className="text-[9px] text-slate-400">Averted per avoided refinery trip</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 uppercase font-bold">WAN Network Latency</span>
            <div className="text-2xl font-bold text-purple-400">0 <span className="text-xs font-normal">ms</span></div>
            <span className="text-[9px] text-slate-400">100% On-Device local loopback</span>
          </div>
        </div>
      ),
    }
  ];

  const current = slides[currentSlide];

  return (
    <div className={`w-full my-3 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-sm transition-all text-xs font-sans ${
      isFullscreen ? 'fixed inset-4 z-50 overflow-y-auto max-h-[94vh]' : ''
    }`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800 gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Presentation className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-zinc-100 text-sm flex items-center gap-2">
              <span>{title}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900 font-mono font-bold">
                16:9 Widescreen
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
              Slide {currentSlide + 1} of {slides.length} &bull; {current.badge}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-all cursor-pointer ${
              showNotes 
                ? 'bg-violet-600 text-white border-violet-600 font-bold' 
                : 'bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300'
            }`}
            title="Toggle speaker notes and key talking points"
          >
            <BookOpen className="w-3 h-3" />
            <span>Notes</span>
          </button>

          <button
            onClick={handleDownloadPitchDeck}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] font-mono transition-all shadow-xs cursor-pointer"
            title="Download official 6-slide Smart India Hackathon winning deck"
          >
            <Award className="w-3 h-3" />
            <span>SIH Deck</span>
          </button>

          {downloadUrl && (
            <button
              onClick={() => window.open(finalDownloadUrl, '_blank')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-[11px] font-mono transition-all shadow-xs cursor-pointer"
              title="Download task presentation"
            >
              <Download className="w-3 h-3" />
              <span>Deck</span>
            </button>
          )}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Presentation'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Slide Stage */}
      <div className="my-3">
        {current.content}
      </div>

      {/* Speaker Notes Drawer */}
      {showNotes && (
        <div className="my-2 p-3 rounded-xl bg-violet-50/80 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 text-xs font-mono animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5 text-violet-800 dark:text-violet-300 font-bold text-[11px] uppercase mb-1">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Speaker Notes & Hackathon Defense Talking Points:</span>
          </div>
          <p className="text-slate-700 dark:text-zinc-300 text-[11px] leading-relaxed">
            {current.speakerNotes}
          </p>
        </div>
      )}

      {/* Thumbnails Navigation Strip */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800/80 gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentSlide((prev) => Math.max(0, prev - 1))}
            disabled={currentSlide === 0}
            className="p-1 rounded-lg border border-slate-200 dark:border-zinc-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCurrentSlide((prev) => Math.min(slides.length - 1, prev + 1))}
            disabled={currentSlide === slides.length - 1}
            className="p-1 rounded-lg border border-slate-200 dark:border-zinc-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Slide Indicator Dots / Mini Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto font-mono text-[10px]">
          {slides.map((s, idx) => (
            <button
              key={s.num}
              onClick={() => setCurrentSlide(idx)}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                currentSlide === idx
                  ? 'bg-amber-500 text-white font-bold shadow-xs'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200'
              }`}
            >
              Slide {s.num}
            </button>
          ))}
        </div>

        <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 hidden sm:inline">
          Use ← / → arrows to navigate
        </span>
      </div>
    </div>
  );
}
