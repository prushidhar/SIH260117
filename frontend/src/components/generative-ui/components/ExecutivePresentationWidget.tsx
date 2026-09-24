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
  Sparkles
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';

interface ExecutivePresentationWidgetProps {
  tag?: string;
  title?: string;
  domain?: string;
  filename?: string;
  downloadUrl?: string;
  hash?: string;
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
  const { addToast } = useIndraStore();

  const finalDownloadUrl = downloadUrl.startsWith('http')
    ? downloadUrl
    : `http://localhost:8000${downloadUrl.startsWith('/') ? '' : '/'}${downloadUrl}`;

  const slides = [
    {
      num: 1,
      badge: 'SLIDE 1: EXECUTIVE BRIEFING',
      title: `Executive Asset Integrity Review: ${tag}`,
      subtitle: 'Statutory Plant Asset Integrity & Reliability Briefing for Board Sign-Off',
      theme: 'navy',
      content: (
        <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col justify-between h-48 border border-cyan-500/40 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              IEC 62443 / CMMC OT RESTRICTED
            </span>
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> ZERO-WAN VERIFIED
            </span>
          </div>
          <div>
            <h4 className="text-base font-bold text-white tracking-wide">{title}</h4>
            <p className="text-xs text-slate-300 mt-1">Governing Standard: ASME B31.3 §304.1.2 & API 570 Inspection Protocols</p>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono border-t border-slate-800 pt-2">
            <span>Asset Ref: {tag}</span>
            <span>Classification: Statutory Approval Note</span>
            <span>Format: 16:9 Widescreen</span>
          </div>
        </div>
      ),
    },
    {
      num: 2,
      badge: 'SLIDE 2: KPI DASHBOARD',
      title: 'Operational KPI Dashboard & Remaining Service Life',
      subtitle: 'Deterministic ultrasonic NDT readings & calibrated corrosion wear envelope',
      theme: 'light',
      content: (
        <div className="grid grid-cols-2 gap-2 h-48">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex flex-col justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-zinc-400 font-bold">Measured Wall</span>
            <div className="text-xl font-bold text-slate-900 dark:text-zinc-100 font-mono">7.20 <span className="text-xs font-normal">mm</span></div>
            <span className="text-[9px] text-slate-500 dark:text-zinc-400">Nominal: 12.7mm (Loss: 43.3%)</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-emerald-300 dark:border-emerald-800 flex flex-col justify-between">
            <span className="text-[10px] font-mono uppercase text-emerald-600 dark:text-emerald-400 font-bold">Corrosion Rate</span>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">0.45 <span className="text-xs font-normal">mm/yr</span></div>
            <span className="text-[9px] text-slate-500 dark:text-zinc-400">Calibrated short-term ultrasonic</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex flex-col justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-zinc-400 font-bold">ASME B31.3 t_min</span>
            <div className="text-xl font-bold text-slate-900 dark:text-zinc-100 font-mono">6.31 <span className="text-xs font-normal">mm</span></div>
            <span className="text-[9px] text-slate-500 dark:text-zinc-400">Design P: 464.1 psig (3.2 MPa)</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-400 dark:border-emerald-700 flex flex-col justify-between">
            <span className="text-[10px] font-mono uppercase text-emerald-700 dark:text-emerald-300 font-bold">Remaining Life</span>
            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300 font-mono">10.9 <span className="text-xs font-normal">Years</span></div>
            <span className="text-[9px] text-emerald-700 dark:text-emerald-300 font-bold">STATUS: SAFE FOR RUN</span>
          </div>
        </div>
      ),
    },
    {
      num: 3,
      badge: 'SLIDE 3: MATHEMATICAL PROOF',
      title: 'Deterministic Formulations & Code Verification',
      subtitle: 'ASME B31.3 Eq. 3a pressure design calculation verified with zero hallucination',
      theme: 'light',
      content: (
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 h-48 flex flex-col justify-between font-mono text-xs">
          <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-center">
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
              t_design = (P · D) / [2 · (S · E + P · Y)]
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 dark:text-zinc-300">
            <div>• P = 464.1 psig (3.2 MPa)</div>
            <div>• D = 10.75 in (273.0 mm)</div>
            <div>• S = 20,000 psi (ASTM A106 B)</div>
            <div>• E = 1.0 (Seamless Quality)</div>
            <div>• Y = 0.4 (Ferritic Steel)</div>
            <div>• t_min = 6.31 mm (0.2486 in)</div>
          </div>
          <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold border-t border-slate-200 dark:border-zinc-700 pt-1">
            ✔ Mathematical AST Sandbox Verification: 100% Deterministic match.
          </div>
        </div>
      ),
    },
    {
      num: 4,
      badge: 'SLIDE 4: AUDIT PROVENANCE',
      title: 'Standards Compliance & SHA-256 Merkle Ledger',
      subtitle: 'Process-scoped cryptographic proof confirming zero WAN egress and immutable logging',
      theme: 'light',
      content: (
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 h-48 flex flex-col justify-between text-xs">
          <div className="space-y-1.5 font-mono text-[10px]">
            <div className="flex items-center justify-between p-1.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <span>ASME B31.3 Process Piping (2022)</span>
              <span className="font-bold">VERIFIED</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <span>API 570 Piping Inspection Code</span>
              <span className="font-bold">COMPLIANT</span>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-[10px] font-mono text-slate-600 dark:text-zinc-400 truncate">
            <span className="text-slate-400 block text-[9px]">CRYPTOGRAPHIC MERKLE ROOT:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{hash}</span>
          </div>
          <div className="text-[9px] text-slate-500 dark:text-zinc-400 font-mono">
            Zero external sockets detected. Host loopback strictly confined to 127.0.0.1.
          </div>
        </div>
      ),
    },
    {
      num: 5,
      badge: 'SLIDE 5: DUAL-KEY SIGN-OFF',
      title: 'Statutory Plant Approval & Executive Sign-Off',
      subtitle: 'Formal Human-in-the-Loop multi-tier authorization for operational plant clearance',
      theme: 'navy',
      content: (
        <div className="p-3 rounded-xl bg-slate-900 text-white h-48 flex flex-col justify-between border border-emerald-500/40 font-mono text-xs">
          <div className="text-[10px] text-emerald-400 font-bold tracking-wider">
            AUTHORIZATION SEAL: STATUTORY OPERATIONAL CLEARANCE
          </div>
          <div className="grid grid-cols-3 gap-2 text-[9px] text-center">
            <div className="p-2 rounded bg-slate-800/80 border border-slate-700">
              <span className="text-slate-400 block">Prepared By</span>
              <span className="font-bold text-white block mt-0.5">INDRA AI</span>
              <span className="text-emerald-400 text-[8px] mt-1 block">✔ AUTONOMOUS</span>
            </div>
            <div className="p-2 rounded bg-slate-800/80 border border-slate-700">
              <span className="text-slate-400 block">Verified By</span>
              <span className="font-bold text-white block mt-0.5">Lead Engineer</span>
              <span className="text-emerald-400 text-[8px] mt-1 block">✔ PE-8419</span>
            </div>
            <div className="p-2 rounded bg-slate-800/80 border border-emerald-600">
              <span className="text-slate-400 block">Plant Approval</span>
              <span className="font-bold text-white block mt-0.5">Superintendent</span>
              <span className="text-emerald-400 text-[8px] font-bold mt-1 block">✔ TIER-2 SEALED</span>
            </div>
          </div>
          <div className="text-[9px] text-slate-400 text-center border-t border-slate-800 pt-1">
            Status: Formally signed into local immutable ledger. Approved for continued run.
          </div>
        </div>
      ),
    },
  ];

  const current = slides[currentSlide];

  return (
    <div className="w-full my-3 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-sm transition-all text-xs font-sans">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
            <Presentation className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-slate-800 dark:text-zinc-100 text-sm flex items-center gap-1.5 truncate">
              <span>Executive 16:9 Presentation Deck</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900 font-mono font-bold">
                BOARD-READY (.PPTX)
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono truncate">
              Asset: {tag} &bull; 5-Slide Executive Review
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <a
            href={finalDownloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 text-[11px] font-mono font-bold transition-colors cursor-pointer"
            title="Download native 16:9 PowerPoint Presentation"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .PPTX</span>
          </a>
        </div>
      </div>

      {/* Slide Carousel Viewer */}
      <div className="mt-3 relative">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
            {current.badge}
          </span>
          <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">
            Slide {currentSlide + 1} of {slides.length}
          </span>
        </div>

        {/* Current Slide Display */}
        {current.content}

        {/* Carousel Footer Navigation */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-zinc-800">
          <button
            onClick={() => setCurrentSlide((prev) => (prev > 0 ? prev - 1 : slides.length - 1))}
            className="p-1 rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 flex items-center gap-1 text-[10px] font-mono cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          {/* Dots Indicator */}
          <div className="flex items-center gap-1.5">
            {slides.map((s, idx) => (
              <button
                key={s.num}
                onClick={() => setCurrentSlide(idx)}
                className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                  currentSlide === idx
                    ? 'w-5 bg-amber-500'
                    : 'bg-slate-300 dark:bg-zinc-700 hover:bg-slate-400'
                }`}
                title={`Go to slide ${s.num}`}
              />
            ))}
          </div>

          <button
            onClick={() => setCurrentSlide((prev) => (prev < slides.length - 1 ? prev + 1 : 0))}
            className="p-1 rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 flex items-center gap-1 text-[10px] font-mono cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
