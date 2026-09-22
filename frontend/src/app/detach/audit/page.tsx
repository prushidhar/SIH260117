/**
 * Detached Merkle Audit Ledger & HITL Sign-Off Window
 * 
 * Standalone full-screen inspection window for cryptographic chain verification
 * and 3-tier plant authorization.
 */

'use client';

import React from 'react';
import { ShieldCheck, Lock, Monitor, ArrowLeft } from 'lucide-react';
import AuditLedgerView from '@/components/views/AuditLedgerView';

export default function DetachedAuditPage() {
  return (
    <div className="flex flex-col h-screen w-screen bg-[#0a0a0a] text-zinc-100 select-none overflow-hidden font-sans">
      {/* Top Window Header */}
      <header className="h-12 bg-zinc-950/90 border-b border-zinc-800 flex items-center justify-between px-4 z-20 shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs tracking-wider text-zinc-100">
                STANDALONE MERKLE AUDIT LEDGER & HITL GATE
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950/50 text-emerald-400 border border-emerald-800/60 text-[9px] font-mono font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                IMMUTABLE CHAIN
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <span>GOVERNANCE:</span>
          <span className="text-zinc-200 font-bold">ASME B31.3 §304.1.2 3-TIER GATE</span>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <AuditLedgerView />
      </main>
    </div>
  );
}
