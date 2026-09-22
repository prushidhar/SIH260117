'use client';

import { useState } from 'react';
import { Package, FileText, Sheet, Download, Check, ShieldCheck, Hash } from 'lucide-react';
import useIndraStore, { type Deliverable } from '@/store/indra-store';

export default function Deliverables() {
  const { deliverables } = useIndraStore();
  const [downloadedId, setDownloadedId] = useState<string | null>(null);

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'xlsx':
      case 'excel':
      case 'sheet':
        return <Sheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'pdf':
        return <FileText className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
      case 'docx':
      case 'word':
      case 'doc':
      default:
        return <FileText className="w-4 h-4 text-violet-600 dark:text-violet-400" />;
    }
  };

  const getBadgeLabel = (type: string) => {
    switch (type.toLowerCase()) {
      case 'xlsx':
      case 'excel':
        return 'ASME B31.3 HEALTH WORKBOOK';
      case 'docx':
      case 'word':
        return 'MAINTENANCE APPROVAL NOTE';
      default:
        return 'SOVEREIGN DELIVERABLE';
    }
  };

  const handleDownload = (item: Deliverable) => {
    const rawUrl = item.url || `/files/artifacts/${item.filename}`;
    const downloadUrl = rawUrl.startsWith('http')
      ? rawUrl
      : `http://localhost:8000${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;

    window.open(downloadUrl, '_blank');

    setDownloadedId(item.id || item.filename);
    setTimeout(() => setDownloadedId(null), 3000);
  };

  return (
    <div className="p-4 text-slate-800 dark:text-zinc-100">
      <div className="flex items-center gap-2 mb-3">
        <Package className="w-4 h-4 text-violet-600 dark:text-violet-400" />
        <h2 className="text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:text-zinc-400 font-mono">
          Generated Deliverables
        </h2>
        <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-mono font-bold border border-slate-200 dark:border-zinc-700">
          {deliverables.length}
        </span>
      </div>

      {deliverables.length === 0 ? (
        <div className="text-slate-400 dark:text-zinc-500 text-xs italic text-center py-6 px-3 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50/50 dark:bg-zinc-900/30 leading-relaxed">
          No deliverables generated yet. Prompt an ASME B31.3 audit or P&ID inspection to produce native reports.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {deliverables.map((item, index) => {
            const isDownloaded = downloadedId === (item.id || item.filename);
            const isExcel = item.type?.toLowerCase() === 'xlsx' || item.filename.endsWith('.xlsx');
            
            return (
              <div
                key={item.id || index}
                className="group p-3 rounded-xl bg-slate-50/80 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800/60 hover:border-slate-300 dark:hover:border-zinc-700 transition-all duration-200 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    {getFileIcon(item.type)}
                    <span className="text-xs text-slate-900 dark:text-zinc-100 font-bold truncate">
                      {item.filename || item.name}
                    </span>
                  </div>
                  <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    isExcel 
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                      : 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800'
                  }`}>
                    {getBadgeLabel(item.type)}
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                  {item.description}
                </div>

                {/* SHA-256 Hash Indicator */}
                {item.hash && (
                  <div className="flex items-center gap-1.5 mt-2 text-[9px] font-mono text-slate-500 dark:text-zinc-400 bg-white dark:bg-zinc-950 px-2 py-1 rounded-lg border border-slate-200/80 dark:border-zinc-800/80 truncate">
                    <Hash className="w-3 h-3 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span className="truncate">SHA256: {item.hash}</span>
                  </div>
                )}

                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-200/70 dark:border-zinc-800/60">
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">{item.size}</span>
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">{item.timestamp || item.generatedAt}</span>
                  
                  <button 
                    onClick={() => handleDownload(item)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer shadow-2xs ${
                      isDownloaded 
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700' 
                        : 'bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Download native binary artifact from sovereign backend"
                  >
                    {isDownloaded ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Downloaded</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3 h-3 text-slate-500 dark:text-zinc-400" />
                        <span>Download</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
