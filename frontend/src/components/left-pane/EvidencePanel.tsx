'use client';

import { useState } from 'react';
import { 
  FileText, 
  BookOpen, 
  Quote, 
  ShieldCheck, 
  CheckCircle2, 
  Layers, 
  ExternalLink,
  Lock,
  Bookmark
} from 'lucide-react';
import { useIndraStore, type RAGSource } from '@/store/indra-store';

interface IndustrialStandardSpec {
  code: string;
  title: string;
  governingBody: string;
  keyClause: string;
  summary: string;
  formula?: string;
  safetyFactor: string;
}

const INDUSTRIAL_STANDARDS: IndustrialStandardSpec[] = [
  {
    code: 'ASME B31.3-2022',
    title: 'Process Piping Design Code',
    governingBody: 'American Society of Mechanical Engineers',
    keyClause: 'Paragraph 304.1.2 (Straight Pipe Under Internal Pressure)',
    summary: 'Governs minimum required wall thickness and pressure design of piping in chemical and petroleum plants.',
    formula: 'tm = (P × D) / [2(S·E·W + P·Y)] + c',
    safetyFactor: '3.0:1 on Tensile Strength / 1.5:1 on Yield'
  },
  {
    code: 'API 610 12th Ed.',
    title: 'Centrifugal Pumps for Petroleum Industries',
    governingBody: 'American Petroleum Institute / ISO 13709',
    keyClause: 'Section 6.1 (NPSH Margin & Operating Region)',
    summary: 'Specifies heavy-duty pump construction, minimum continuous flow limits, and vibration thresholds.',
    formula: 'NPSH Margin = NPSHa - NPSHr ≥ 1.0 m (or 1.2x)',
    safetyFactor: 'POR: 70% to 120% of Best Efficiency Point (BEP)'
  },
  {
    code: 'ISO 10816-3',
    title: 'Mechanical Vibration Evaluation Standards',
    governingBody: 'International Organization for Standardization',
    keyClause: 'Part 3: Industrial Machines on Rigid/Flexible Supports',
    summary: 'Defines Severity Zones A (Good), B (Satisfactory), C (Unsatisfactory), and D (Critical Trip).',
    formula: 'Zone C Limit: 4.5 mm/s RMS (Rigid Foundation)',
    safetyFactor: 'Class II: Zone D > 7.1 mm/s RMS (Instant Shutdown)'
  },
  {
    code: 'ASME B16.5-2020',
    title: 'Pipe Flanges & Flanged Fittings',
    governingBody: 'American Society of Mechanical Engineers',
    keyClause: 'Table 2-1.1 (Pressure-Temperature Ratings for ASTM A105)',
    summary: 'Pressure ratings for Class 150, 300, 600, 900, 1500, and 2500 flanges across operating temperatures.',
    formula: 'Hydrotest Pressure = 1.5 × MAWP @ 38°C (100°F)',
    safetyFactor: 'Class 300 MAWP @ 180°C = 3.20 MPa (464.1 psig)'
  },
  {
    code: 'TEMA Class R',
    title: 'Tubular Exchanger Manufacturers Association',
    governingBody: 'TEMA Standards 10th Edition',
    keyClause: 'Section 5 (Severe Petroleum Refinery Services)',
    summary: 'Standards for shell and tube heat exchangers designed for continuous heavy fouling services.',
    formula: 'Q = U × A × LMTD × Ft',
    safetyFactor: 'Fouling Allowance Rf ≥ 0.00035 m²·K/W'
  }
];

export default function EvidencePanel() {
  const ragSources = useIndraStore((state) => state.ragSources);
  const [selectedStandard, setSelectedStandard] = useState<IndustrialStandardSpec | null>(null);

  return (
    <div className="flex-1 px-3 py-3 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent flex flex-col min-h-0 text-xs font-mono">
      {/* Evidence & Citations Header */}
      <div className="flex items-center justify-between px-1 mb-2.5">
        <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-zinc-500 font-mono">
          <BookOpen className="w-3 h-3 text-sky-600 dark:text-sky-400" />
          <span>Evidence Lock™ Citations</span>
        </div>
        <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          SHA-256 SEALED
        </span>
      </div>

      {/* Governing Standards Quick-Reference Chips */}
      <div className="mb-3 space-y-1">
        <div className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">
          Governing Engineering Codes:
        </div>
        <div className="flex flex-wrap gap-1">
          {INDUSTRIAL_STANDARDS.map((std) => (
            <button
              key={std.code}
              onClick={() => setSelectedStandard(selectedStandard?.code === std.code ? null : std)}
              className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
                selectedStandard?.code === std.code
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700'
              }`}
            >
              {std.code.split(' ')[0]} {std.code.split(' ')[1]}
            </button>
          ))}
        </div>

        {/* Selected Standard Quick-Reference Card */}
        {selectedStandard && (
          <div className="mt-2 p-2.5 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 text-[10px] space-y-1 animate-in fade-in duration-150">
            <div className="flex items-center justify-between font-bold text-sky-800 dark:text-sky-300">
              <span>{selectedStandard.code}</span>
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300">
                {selectedStandard.governingBody.split('/')[0]}
              </span>
            </div>
            <div className="font-semibold text-slate-800 dark:text-zinc-200">{selectedStandard.title}</div>
            <div className="text-slate-500 dark:text-zinc-400">{selectedStandard.keyClause}</div>
            {selectedStandard.formula && (
              <div className="p-1.5 rounded bg-white dark:bg-zinc-950 border border-sky-100 dark:border-sky-900 text-sky-700 dark:text-sky-400 font-bold">
                {selectedStandard.formula}
              </div>
            )}
            <div className="text-[9px] text-slate-500 pt-0.5">
              Margin / Safety: {selectedStandard.safetyFactor}
            </div>
          </div>
        )}
      </div>

      {/* Dynamic RAG Sources Feed */}
      <div className="text-[9px] text-slate-400 uppercase tracking-wider font-bold mb-1.5">
        Active Task Citations ({ragSources.length}):
      </div>

      {!ragSources || ragSources.length === 0 ? (
        <div className="text-slate-400 dark:text-zinc-500 text-[10px] italic text-center py-5 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl p-3 bg-slate-50/50 dark:bg-zinc-900/50 leading-relaxed font-sans">
          Offline citations will dynamically populate here when the RAG search tool executes on plant SOPs and standards.
        </div>
      ) : (
        <div className="space-y-2">
          {ragSources.map((source: RAGSource, index: number) => (
            <div
              key={source.id || index}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 hover:border-violet-300 dark:hover:border-violet-700 transition-all text-xs shadow-2xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <FileText className="w-3 h-3 text-sky-600 dark:text-sky-400 flex-shrink-0" />
                  <span className="text-[11px] text-slate-800 dark:text-zinc-200 font-bold truncate font-mono">
                    {source.documentName || source.document}
                  </span>
                </div>
                {source.relevance !== undefined && (
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 font-mono font-bold flex-shrink-0">
                    {source.relevance}% Match
                  </span>
                )}
              </div>

              {source.section && (
                <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1 pl-4.5 font-mono">
                  {source.section}
                </div>
              )}

              {source.snippet && (
                <div className="mt-1.5 p-2 rounded-lg bg-white dark:bg-zinc-950 border border-slate-200/60 dark:border-zinc-800 text-[10px] text-slate-600 dark:text-zinc-300 font-mono line-clamp-3 leading-relaxed">
                  <Quote className="w-2.5 h-2.5 text-slate-400 dark:text-zinc-500 inline mr-1" />
                  {source.snippet}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
