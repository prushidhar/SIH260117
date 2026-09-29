'use client';

import React from 'react';
import { RefreshCw, Download, Trash2, X, CheckSquare } from 'lucide-react';

interface BulkOperationsBarProps {
  selectedCount: number;
  totalCount: number;
  onBatchReindex: () => void;
  onExportCsv: () => void;
  onPurgeObsolete: () => void;
  onClearSelection: () => void;
  isReindexing?: boolean;
}

export default function BulkOperationsBar({
  selectedCount,
  totalCount,
  onBatchReindex,
  onExportCsv,
  onPurgeObsolete,
  onClearSelection,
  isReindexing = false,
}: BulkOperationsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-zinc-950/95 border border-zinc-800 shadow-2xl backdrop-blur-xl text-xs font-mono select-none animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center gap-2 pr-3 border-r border-zinc-800">
        <CheckSquare className="w-4 h-4 text-emerald-400" />
        <span className="font-bold text-zinc-100">
          {selectedCount} of {totalCount} Selected
        </span>
      </div>

      {/* Batch Re-Index */}
      <button
        onClick={onBatchReindex}
        disabled={isReindexing}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
        title="Re-compute 384D vector embeddings for selected documents"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isReindexing ? 'animate-spin' : ''}`} />
        <span>Batch Re-Index</span>
      </button>

      {/* Export to CSV */}
      <button
        onClick={onExportCsv}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-semibold transition-colors cursor-pointer"
        title="Export document metadata and chunk index to CSV"
      >
        <Download className="w-3.5 h-3.5 text-blue-400" />
        <span>Export CSV</span>
      </button>

      {/* Purge Obsolete */}
      <button
        onClick={onPurgeObsolete}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/70 hover:bg-rose-900/80 border border-rose-800 text-rose-300 font-bold transition-colors cursor-pointer"
        title="Purge selected obsolete manuals from offline vector database"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>Purge Obsolete</span>
      </button>

      <div className="h-4 w-[1px] bg-zinc-800 mx-0.5" />

      {/* Clear Selection */}
      <button
        onClick={onClearSelection}
        className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
        title="Deselect All"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
