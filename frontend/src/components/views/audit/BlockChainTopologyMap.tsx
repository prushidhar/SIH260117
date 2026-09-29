'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Hash,
  Link as LinkIcon,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Zap,
  ChevronRight,
  Eye,
} from 'lucide-react';
import type { AuditLedgerEvent } from '@/lib/audit/merkle-verifier';

interface BlockChainTopologyMapProps {
  blocks: AuditLedgerEvent[];
  onSelectBlock?: (block: AuditLedgerEvent) => void;
}

export default function BlockChainTopologyMap({
  blocks,
  onSelectBlock,
}: BlockChainTopologyMapProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const handleBlockClick = (block: AuditLedgerEvent) => {
    setSelectedBlockId(block.id);
    onSelectBlock?.(block);
  };

  const getStatusStyle = (status: AuditLedgerEvent['status']) => {
    switch (status) {
      case 'APPROVED':
        return {
          border: 'border-emerald-600/80 hover:border-emerald-400',
          bg: 'bg-emerald-950/40',
          badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80',
          dot: 'bg-emerald-500',
          glow: 'shadow-emerald-500/10',
        };
      case 'CRITICAL OVERRIDE':
        return {
          border: 'border-rose-600/80 hover:border-rose-400',
          bg: 'bg-rose-950/40',
          badge: 'bg-rose-950/80 text-rose-300 border-rose-700/80 animate-pulse',
          dot: 'bg-rose-500',
          glow: 'shadow-rose-500/20',
        };
      case 'PENDING':
        return {
          border: 'border-amber-600/80 hover:border-amber-400',
          bg: 'bg-amber-950/40',
          badge: 'bg-amber-950/80 text-amber-300 border-amber-700/80',
          dot: 'bg-amber-500',
          glow: 'shadow-amber-500/10',
        };
      case 'REJECTED':
        return {
          border: 'border-zinc-700 hover:border-zinc-500',
          bg: 'bg-zinc-900/60',
          badge: 'bg-zinc-800 text-zinc-400 border-zinc-700',
          dot: 'bg-zinc-500',
          glow: 'shadow-zinc-900/50',
        };
      default:
        return {
          border: 'border-zinc-800 hover:border-zinc-600',
          bg: 'bg-zinc-900/50',
          badge: 'bg-zinc-800 text-zinc-400 border-zinc-700',
          dot: 'bg-zinc-500',
          glow: '',
        };
    }
  };

  return (
    <div className="rounded-2xl bg-zinc-950/90 border border-zinc-800 p-4 shadow-xl backdrop-blur-md font-mono select-none">
      {/* Topology Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center">
            <LinkIcon className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                CRYPTOGRAPHIC BLOCK-CHAIN TOPOLOGY MAP
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 text-[9px] font-bold">
                IMMUTABLE SHA-256 LINKAGE
              </span>
            </div>
            <div className="text-[10px] text-zinc-400">
              Horizontal cryptographic chain • Click block to inspect Merkle tree leaves & parent pointers
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-zinc-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> SEALED ({blocks.length})
          </span>
        </div>
      </div>

      {/* Horizontally Scrollable Chain Strip with SVG Hash Linkage Connectors */}
      <div className="overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-zinc-800 no-scrollbar">
        <div className="flex items-center gap-2 min-w-max px-1">
          {blocks.map((block, idx) => {
            const isLast = idx === blocks.length - 1;
            const isGenesis = idx === 0;
            const style = getStatusStyle(block.status);
            const isSelected = selectedBlockId === block.id;

            const timeFormatted = new Date(block.timestamp).toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              timeZone: 'UTC',
            }) + ' UTC';

            return (
              <React.Fragment key={block.id}>
                {/* Block Card */}
                <div
                  onClick={() => handleBlockClick(block)}
                  className={`group relative w-64 p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer shadow-lg ${
                    style.border
                  } ${style.bg} ${style.glow} ${
                    isSelected ? 'ring-2 ring-emerald-500/50 scale-[1.02]' : 'hover:scale-[1.01]'
                  }`}
                >
                  {/* Top Header: Index & Status */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-zinc-300">
                        {isGenesis ? 'BLOCK #0 (GENESIS)' : `BLOCK #${block.index}`}
                      </span>
                      {isLast && (
                        <span className="px-1.5 py-0.2 rounded bg-violet-950/70 text-violet-300 border border-violet-800/60 text-[8px] font-bold">
                          HEAD
                        </span>
                      )}
                    </div>

                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${style.badge}`}>
                      {block.status}
                    </span>
                  </div>

                  {/* Event Type & Asset Tag */}
                  <div className="text-xs font-bold text-zinc-100 truncate mb-1">
                    {block.eventType}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-2">
                    <span className="text-emerald-400 font-bold">TAG: {block.assetTag}</span>
                    <span className="text-zinc-500 text-[9px]">{timeFormatted}</span>
                  </div>

                  {/* Hash Summary Box */}
                  <div className="p-1.5 rounded bg-zinc-950/80 border border-zinc-800/80 text-[9px] text-zinc-400 space-y-1">
                    <div className="flex items-center justify-between truncate">
                      <span className="text-zinc-500">HASH:</span>
                      <span className="text-zinc-300 font-semibold truncate pl-1">
                        0x{block.hash.replace('sha256:', '').substring(0, 12)}...
                      </span>
                    </div>
                    <div className="flex items-center justify-between truncate">
                      <span className="text-zinc-500">PREV:</span>
                      <span className="text-zinc-400 font-medium truncate pl-1">
                        0x{block.previousHash.replace('sha256:', '').substring(0, 12)}...
                      </span>
                    </div>
                  </div>

                  {/* Hover Inspect Indicator */}
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-zinc-800/60 text-[9px] text-zinc-500">
                    <span>OP: {block.operator}</span>
                    <span className="text-emerald-400 group-hover:underline flex items-center gap-0.5">
                      Inspect <Eye className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </div>

                {/* Animated Dashed Hash Linkage Connector between Blocks */}
                {!isLast && (
                  <div className="flex flex-col items-center justify-center px-1">
                    <svg width="48" height="28" viewBox="0 0 48 28" className="overflow-visible">
                      <defs>
                        <marker
                          id="topo-arrow"
                          viewBox="0 0 10 10"
                          refX="6"
                          refY="5"
                          markerWidth="5"
                          markerHeight="5"
                          orient="auto-start-reverse"
                        >
                          <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
                        </marker>
                      </defs>

                      {/* Smooth Hash Linkage Curve */}
                      <path
                        d="M 0 14 C 18 14, 30 14, 44 14"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2"
                        strokeDasharray="4 3"
                        markerEnd="url(#topo-arrow)"
                        className="animate-pulse"
                      />
                    </svg>
                    <span className="text-[8px] font-mono text-emerald-400/80 -mt-1 font-bold">
                      SHA256
                    </span>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
