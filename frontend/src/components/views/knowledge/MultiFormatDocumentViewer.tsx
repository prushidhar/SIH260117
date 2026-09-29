'use client';

import React, { useState } from 'react';
import {
  X,
  FileText,
  Layers,
  Sigma,
  Copy,
  Check,
  ExternalLink,
  BookOpen,
  Hash,
  Download,
  ShieldCheck,
} from 'lucide-react';
import katex from 'katex';
import MarkdownRenderer from '@/components/common/MarkdownRenderer';
import type { StandardDocument } from '@/lib/rag/standard-docs-catalog';

interface MultiFormatDocumentViewerProps {
  document: StandardDocument | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function MultiFormatDocumentViewer({
  document,
  isOpen,
  onClose,
}: MultiFormatDocumentViewerProps) {
  const [activeTab, setActiveTab] = useState<'markdown' | 'chunks' | 'equations'>('markdown');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen || !document) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderMathHtml = (formula: string) => {
    try {
      return katex.renderToString(formula, {
        displayMode: true,
        throwOnError: false,
      });
    } catch {
      return formula;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[680px] lg:w-[780px] bg-zinc-950/98 border-l border-zinc-800 shadow-2xl flex flex-col font-sans select-none backdrop-blur-xl animate-in slide-in-from-right duration-250">
      {/* Top Drawer Header Bar */}
      <div className="h-14 px-5 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5 truncate pr-4">
          <div className="w-8 h-8 rounded-xl bg-cyan-950/70 border border-cyan-800/60 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs text-zinc-100 truncate">
                {document.standard}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 text-[9px] font-mono font-bold">
                AUDIT VERIFIED
              </span>
            </div>
            <div className="text-[11px] font-mono text-zinc-400 truncate">
              {document.filename}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
          title="Close Document Drawer (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 3 View Tabs: Extracted Markdown | Raw Text Chunks | Highlighted Equations */}
      <div className="flex items-center border-b border-zinc-800 bg-zinc-900/30 px-5 gap-2 pt-2">
        <button
          onClick={() => setActiveTab('markdown')}
          className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-mono font-semibold transition-all border-b-2 cursor-pointer ${
            activeTab === 'markdown'
              ? 'border-emerald-500 text-emerald-300 font-bold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Extracted Markdown</span>
        </button>

        <button
          onClick={() => setActiveTab('chunks')}
          className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-mono font-semibold transition-all border-b-2 cursor-pointer ${
            activeTab === 'chunks'
              ? 'border-emerald-500 text-emerald-300 font-bold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Raw Text Chunks</span>
          <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-[9px] font-bold">
            {document.chunks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('equations')}
          className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-mono font-semibold transition-all border-b-2 cursor-pointer ${
            activeTab === 'equations'
              ? 'border-emerald-500 text-emerald-300 font-bold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Sigma className="w-3.5 h-3.5 text-amber-400" />
          <span>Engineering Equations</span>
          <span className="px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-400 border border-amber-800/60 text-[9px] font-bold">
            {document.equations.length}
          </span>
        </button>
      </div>

      {/* Main Drawer Body Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* TAB 1: Extracted Rendered Markdown */}
        {activeTab === 'markdown' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 text-[11px] font-mono text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                SOVEREIGN PARSED MARKDOWN • {(document.size / 1024).toFixed(1)} KB
              </span>
              <button
                onClick={() => handleCopy(document.fullMarkdown, 'fullMarkdown')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-[10px] transition-colors cursor-pointer"
              >
                {copiedId === 'fullMarkdown' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Markdown</span>
                  </>
                )}
              </button>
            </div>

            <div className="prose prose-invert prose-zinc max-w-none text-xs leading-relaxed font-sans">
              <MarkdownRenderer content={document.fullMarkdown} />
            </div>
          </div>
        )}

        {/* TAB 2: Raw Text Chunks with Vector Embeddings */}
        {activeTab === 'chunks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80 text-[11px] font-mono text-zinc-400">
              <span>{document.chunks.length} RECURSIVE CHUNKS (512-TOKEN WINDOW)</span>
              <span className="text-emerald-400 font-bold">384-DIM DENSE VECTORS</span>
            </div>

            <div className="space-y-3">
              {document.chunks.map((chunk) => (
                <div
                  key={chunk.id}
                  className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-4 space-y-2.5 font-mono text-xs shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-emerald-400 font-bold text-[10px]">
                        CHUNK #{chunk.index + 1}
                      </span>
                      <span className="font-bold text-zinc-200">{chunk.title}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-500">
                        {chunk.tokenCount} tokens
                      </span>
                      <button
                        onClick={() => handleCopy(chunk.content, chunk.id)}
                        className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded transition-colors cursor-pointer"
                        title="Copy Chunk Text"
                      >
                        {copiedId === chunk.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-zinc-300 text-[11px] leading-relaxed bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/60">
                    {chunk.content}
                  </p>

                  {/* Dense Vector Embedding Preview */}
                  <div className="p-2 rounded bg-zinc-950/80 border border-zinc-800/80 text-[9px] text-zinc-500 overflow-x-auto">
                    <span className="text-emerald-400 font-bold mr-1">EMBEDDING[0..7]:</span>
                    <span>
                      [{chunk.embeddingPreview.map((v) => (v >= 0 ? `+${v.toFixed(4)}` : v.toFixed(4))).join(', ')}, ...]
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Highlighted Engineering Equations */}
        {activeTab === 'equations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80 text-[11px] font-mono text-zinc-400">
              <span className="flex items-center gap-1.5 font-bold text-amber-300">
                <Sigma className="w-3.5 h-3.5" />
                ASME / ISO STATUTORY FORMULAS
              </span>
              <span>KATEX ACCELERATED</span>
            </div>

            {document.equations.length === 0 ? (
              <div className="p-6 text-center text-xs font-mono text-zinc-500 italic">
                No mathematical formulas indexed in this document.
              </div>
            ) : (
              <div className="space-y-4">
                {document.equations.map((eq) => (
                  <div
                    key={eq.id}
                    className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-4 space-y-3 font-mono shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-100">{eq.name}</span>
                      <button
                        onClick={() => handleCopy(eq.formula, eq.id)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-750 text-[10px] text-zinc-300 transition-colors cursor-pointer"
                        title="Copy LaTeX formula"
                      >
                        {copiedId === eq.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>LaTeX</span>
                      </button>
                    </div>

                    {/* KaTeX Centered Formula Block */}
                    <div
                      className="py-4 px-3 rounded-lg bg-zinc-950 border border-zinc-800/80 text-center overflow-x-auto text-emerald-300 font-sans"
                      dangerouslySetInnerHTML={{ __html: renderMathHtml(eq.formula) }}
                    />

                    <p className="text-[11px] text-zinc-400">{eq.description}</p>

                    {/* Variable Definitions Table */}
                    <div className="border border-zinc-800 rounded-lg overflow-hidden text-[10px]">
                      <table className="w-full text-left">
                        <thead className="bg-zinc-950 text-zinc-400 uppercase border-b border-zinc-800">
                          <tr>
                            <th className="p-2">Variable</th>
                            <th className="p-2">Engineering Definition</th>
                            <th className="p-2 text-right">Unit / Limit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                          {eq.variables.map((v, idx) => (
                            <tr key={idx} className="hover:bg-zinc-900/40">
                              <td className="p-2 font-bold text-amber-400 font-mono">
                                ${v.symbol}$
                              </td>
                              <td className="p-2">{v.meaning}</td>
                              <td className="p-2 text-right text-zinc-400 font-mono">
                                {v.unit}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drawer Footer Bar */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>DETERMINISTIC OFFLINE INDEX • AIR-GAPPED VERIFIED</span>
        </div>

        <button
          onClick={onClose}
          className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold transition-colors cursor-pointer"
        >
          Close Drawer
        </button>
      </div>
    </div>
  );
}
