'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  Lock,
  RefreshCw,
  Shield,
  Copy,
  Download,
  Search,
} from 'lucide-react';
import { useAuditLedgerQuery, useApprovalsQuery } from '@/lib/queries';
import type { AuditBlock, PendingApproval } from '@/store/indra-store';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(ts: string): string {
  if (!ts) return '—';
  const now = Date.now();
  const then = new Date(ts).getTime();
  if (isNaN(then)) return ts;
  const diff = Math.floor((now - then) / 1000);
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function statusOf(block: AuditBlock): 'APPROVED' | 'PENDING' | 'REJECTED' {
  const raw = (block.status || block.event_type || '').toUpperCase();
  if (raw.includes('APPROV') || raw.includes('SIGNED') || raw.includes('ACCEPTED')) return 'APPROVED';
  if (raw.includes('REJECT') || raw.includes('DENIED') || raw.includes('FAILED')) return 'REJECTED';
  return 'PENDING';
}

function confidenceOf(block: AuditBlock): number {
  // Returns 0–1
  const c = block.confidence ?? block.details?.confidence ?? 0.75;
  return typeof c === 'number' ? Math.min(1, Math.max(0, c)) : 0.75;
}

function agentOf(block: AuditBlock): string {
  return block.operator || block.agent || block.details?.agent || 'INDRA Agent';
}

function actionOf(block: AuditBlock): string {
  return block.action || block.event_type || block.details?.action || 'Ledger Event';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ChainBlockProps {
  index: number;
  block: AuditBlock;
  isLast: boolean;
}

function ChainBlock({ index, block, isLast }: ChainBlockProps) {
  const hash = block.merkle_root || block.hash || block.previous_hash || '';
  const shortHash = hash ? hash.slice(0, 6).toUpperCase() : '------';
  const ts = block.timestamp
    ? new Date(block.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--:--';
  const isGenesis = index === 0;

  return (
    <div className="flex items-center flex-shrink-0">
      {/* Block */}
      <div
        className={`w-[120px] h-[80px] flex flex-col justify-between rounded-lg border px-2.5 py-2 select-none relative
          ${isGenesis
            ? 'bg-indigo-950/60 border-indigo-600/70 shadow-[0_0_10px_rgba(99,102,241,0.3)]'
            : 'bg-zinc-900/80 border-zinc-700/60'
          }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-[9px] font-mono font-bold tracking-widest ${isGenesis ? 'text-indigo-300' : 'text-zinc-400'}`}>
            {isGenesis ? 'GENESIS' : `BLK #${block.index ?? index}`}
          </span>
          {!isGenesis && (
            <span className={`w-1.5 h-1.5 rounded-full ${statusOf(block) === 'APPROVED' ? 'bg-emerald-400' : statusOf(block) === 'REJECTED' ? 'bg-rose-400' : 'bg-amber-400'}`} />
          )}
        </div>
        <div className="text-center">
          <div className={`text-[11px] font-mono font-bold tracking-wider ${isGenesis ? 'text-indigo-200' : 'text-zinc-200'}`}>
            {shortHash}
          </div>
          <div className="text-[8px] font-mono text-zinc-500 mt-0.5 truncate">{ts}</div>
        </div>
        <div className={`h-[2px] w-full rounded-full ${isGenesis ? 'bg-indigo-500/50' : 'bg-zinc-700/60'}`} />
      </div>

      {/* Arrow connector */}
      {!isLast && (
        <div className="w-10 flex-shrink-0 flex items-center justify-center overflow-hidden">
          <svg width="40" height="16" viewBox="0 0 40 16" fill="none" className="overflow-visible">
            <line
              x1="0"
              y1="8"
              x2="32"
              y2="8"
              stroke="#6366f1"
              strokeWidth="1.5"
              strokeDasharray="5 3"
              className="chain-dash-anim"
            />
            <polygon points="32,4 40,8 32,12" fill="#6366f1" opacity="0.7" />
          </svg>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confidence Meter
// ---------------------------------------------------------------------------

function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-rose-500';

  return (
    <div className="flex items-center gap-1.5">
      <div className="w-[60px] h-2 rounded-full bg-zinc-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-zinc-400">{pct}%</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status Icon
// ---------------------------------------------------------------------------

function StatusIcon({ status }: { status: 'APPROVED' | 'PENDING' | 'REJECTED' }) {
  if (status === 'APPROVED')
    return <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />;
  if (status === 'REJECTED')
    return <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />;
  return <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />;
}

// ---------------------------------------------------------------------------
// HITL Countdown
// ---------------------------------------------------------------------------

function HITLCountdown({ createdAt }: { createdAt?: string }) {
  const deadline = useMemo(() => {
    const base = createdAt ? new Date(createdAt).getTime() : Date.now();
    return base + 300_000; // 5 min from creation
  }, [createdAt]);

  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.floor((deadline - Date.now()) / 1000))
  );

  useEffect(() => {
    const id = setInterval(() => {
      const r = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setRemaining(r);
    }, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  if (remaining === 0) {
    return (
      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-900/60 text-amber-300 border border-amber-700/50">
        AUTO-REJECTED
      </span>
    );
  }

  const mins = Math.floor(remaining / 60)
    .toString()
    .padStart(2, '0');
  const secs = (remaining % 60).toString().padStart(2, '0');

  return (
    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-950/60 text-rose-300 border border-rose-700/50 animate-pulse">
      ⏱ {mins}:{secs}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Audit Entry Card
// ---------------------------------------------------------------------------

interface EntryCardProps {
  block: AuditBlock;
  approvals: PendingApproval[];
}

function EntryCard({ block, approvals }: EntryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const status = statusOf(block);
  const confidence = confidenceOf(block);
  const agent = agentOf(block);
  const action = actionOf(block);
  const hash = block.merkle_root || block.hash || '';

  // Check if this block has a pending HITL approval
  const matchingApproval = approvals.find(
    (a) => a.task_id === block.task_id && a.status === 'pending'
  );

  const handleCopy = useCallback(async () => {
    if (!hash) return;
    await navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [hash]);

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(block, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-entry-${block.index ?? block.task_id ?? Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [block]);

  const payload = block.details ?? block.arguments ?? block.args ?? block;

  return (
    <div
      className={`rounded-xl border transition-all overflow-hidden
        ${status === 'APPROVED'
          ? 'border-emerald-800/50 bg-emerald-950/10'
          : status === 'REJECTED'
          ? 'border-rose-800/50 bg-rose-950/10'
          : 'border-amber-800/50 bg-amber-950/10'
        }`}
    >
      {/* Header row – always visible */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left group"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        <StatusIcon status={status} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-semibold text-zinc-200 truncate">{action}</span>
            {matchingApproval && status === 'PENDING' && (
              <HITLCountdown createdAt={matchingApproval.created_at} />
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-[10px] text-zinc-500 font-mono">
              <span className="text-zinc-400">{agent}</span>
            </span>
            <span className="text-[10px] text-zinc-600 font-mono">
              {relativeTime(block.timestamp)}
            </span>
          </div>
        </div>

        <ConfidenceMeter value={confidence} />

        <span
          className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border flex-shrink-0
            ${status === 'APPROVED'
              ? 'text-emerald-300 bg-emerald-950/40 border-emerald-800/50'
              : status === 'REJECTED'
              ? 'text-rose-300 bg-rose-950/40 border-rose-800/50'
              : 'text-amber-300 bg-amber-950/40 border-amber-800/50'
            }`}
        >
          {status}
        </span>

        <span className={`text-zinc-500 group-hover:text-zinc-300 transition-transform text-xs flex-shrink-0 ${expanded ? 'rotate-90' : ''}`}>
          ▶
        </span>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-zinc-800/60 px-4 pb-4 pt-3 space-y-3 bg-zinc-900/40">
          {/* Full hash */}
          <div>
            <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest block mb-1">
              Merkle Root Hash
            </span>
            <code className="text-[10px] font-mono text-emerald-300 break-all">{hash || '—'}</code>
          </div>

          {/* Full timestamp */}
          <div>
            <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest block mb-1">
              Timestamp
            </span>
            <span className="text-[10px] font-mono text-zinc-300">{block.timestamp || '—'}</span>
          </div>

          {/* Payload */}
          <div>
            <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest block mb-1">
              Payload
            </span>
            <pre className="text-[10px] font-mono text-zinc-300 bg-zinc-950/70 border border-zinc-800/60 rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap break-all">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-medium bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 text-zinc-300 hover:text-white transition-all"
            >
              <Copy className="w-3 h-3" />
              {copied ? 'Copied!' : 'Copy Hash'}
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-medium bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 text-zinc-300 hover:text-white transition-all"
            >
              <Download className="w-3 h-3" />
              Export Entry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter pill
// ---------------------------------------------------------------------------

type FilterKey = 'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED';

function FilterPill({
  label,
  active,
  onClick,
  count,
}: {
  label: FilterKey;
  active: boolean;
  onClick: () => void;
  count: number;
}) {
  const colors: Record<FilterKey, string> = {
    ALL: active
      ? 'bg-indigo-700 text-white border-indigo-500'
      : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-white',
    APPROVED: active
      ? 'bg-emerald-700 text-white border-emerald-500'
      : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-white',
    PENDING: active
      ? 'bg-amber-700 text-white border-amber-500'
      : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-white',
    REJECTED: active
      ? 'bg-rose-700 text-white border-rose-500'
      : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-white',
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold border transition-all ${colors[label]}`}
    >
      {label}
      <span className="opacity-70">({count})</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function AuditPage() {
  const { data: ledger, refetch, isLoading } = useAuditLedgerQuery();
  const { data: approvals = [] } = useApprovalsQuery();

  const chain: AuditBlock[] = ledger?.chain ?? [];

  // Auto-refresh countdown
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(30);
  useEffect(() => {
    const id = setInterval(() => {
      setSecondsUntilRefresh((s) => {
        if (s <= 1) {
          refetch();
          return 30;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [refetch]);

  // Search + filter
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('ALL');

  const filtered = useMemo(() => {
    return chain.filter((b) => {
      const matchStatus = filter === 'ALL' || statusOf(b) === filter;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        actionOf(b).toLowerCase().includes(q) ||
        agentOf(b).toLowerCase().includes(q) ||
        (b.task_id || '').toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [chain, search, filter]);

  // Analytics
  const analytics = useMemo(() => {
    const total = chain.length;
    const approved = chain.filter((b) => statusOf(b) === 'APPROVED').length;
    const pending = chain.filter((b) => statusOf(b) === 'PENDING').length;
    const rejected = chain.filter((b) => statusOf(b) === 'REJECTED').length;
    const avgConf =
      chain.length > 0
        ? chain.reduce((acc, b) => acc + confidenceOf(b), 0) / chain.length
        : 0;
    return { total, approved, pending, rejected, avgConf };
  }, [chain]);

  // Blockchain chain viz – last 6 blocks
  const vizBlocks = useMemo(() => {
    if (chain.length === 0) {
      const genesis: AuditBlock = {
        timestamp: new Date().toISOString(),
        action: 'GENESIS',
        merkle_root: 'GENESIS_ROOT',
        index: 0,
      };
      return [genesis];
    }
    return chain.slice(-6);
  }, [chain]);

  const filterCounts: Record<FilterKey, number> = {
    ALL: chain.length,
    APPROVED: analytics.approved,
    PENDING: analytics.pending,
    REJECTED: analytics.rejected,
  };

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-[#080a0f] text-zinc-200 p-4 md:p-6 space-y-5">
      {/* Chain animation style */}
      <style>{`
        @keyframes dashMove {
          from { stroke-dashoffset: 24; }
          to   { stroke-dashoffset: 0; }
        }
        .chain-dash-anim {
          animation: dashMove 1.2s linear infinite;
        }
      `}</style>

      {/* ── PAGE HEADER ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-950/60 border border-indigo-700/50 flex items-center justify-center flex-shrink-0">
            <Lock className="w-4 h-4 text-indigo-300" />
          </div>
          <div>
            <h1 className="text-base font-mono font-bold tracking-widest text-zinc-100 uppercase">
              Merkle Audit Ledger
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              {/* Live tamper-evident indicator */}
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse" />
                <span className="text-[9px] font-mono text-emerald-400 tracking-widest font-semibold">
                  TAMPER-EVIDENT
                </span>
              </span>
              <span className="text-zinc-700">·</span>
              <Shield className="w-3 h-3 text-indigo-400" />
              <span className="text-[9px] font-mono text-indigo-400 tracking-wider">
                SHA-256 CHAIN VERIFIED
              </span>
            </div>
          </div>
        </div>

        {/* Auto-refresh badge */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { refetch(); setSecondsUntilRefresh(30); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 text-[10px] font-mono text-zinc-300 hover:text-white transition-all"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin text-indigo-400' : 'text-zinc-400'}`} />
            {isLoading ? 'Refreshing…' : `⟳ Refresh in ${secondsUntilRefresh}s`}
          </button>
          {ledger?.verified && (
            <span className="px-2 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/50 text-[9px] font-mono font-bold text-emerald-300 tracking-wider">
              ✓ CHAIN INTACT
            </span>
          )}
        </div>
      </div>

      {/* ── BLOCKCHAIN CHAIN VISUALIZATION ──────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-4 overflow-x-auto">
        <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          Live Block Chain
          <span className="text-zinc-700">— last {vizBlocks.length} block(s)</span>
        </div>
        <div className="flex items-center">
          {vizBlocks.map((block, i) => (
            <ChainBlock
              key={block.task_id ?? block.hash ?? i}
              index={i}
              block={block}
              isLast={i === vizBlocks.length - 1}
            />
          ))}
        </div>
      </div>

      {/* ── ANALYTICS ROW ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Entries', value: analytics.total, color: 'text-zinc-200' },
          { label: 'Approved', value: analytics.approved, color: 'text-emerald-400' },
          { label: 'Pending', value: analytics.pending, color: 'text-amber-400' },
          {
            label: 'Avg Confidence',
            value: `${(analytics.avgConf * 100).toFixed(1)}%`,
            color:
              analytics.avgConf >= 0.75
                ? 'text-emerald-400'
                : analytics.avgConf >= 0.5
                ? 'text-amber-400'
                : 'text-rose-400',
          },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-xl bg-zinc-900/60 border border-zinc-800/60 px-4 py-3"
          >
            <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">{label}</div>
            <div className={`text-2xl font-mono font-bold mt-1 ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── SEARCH + FILTER BAR ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, agent, task ID…"
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700/60 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/60 transition-colors"
          />
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5">
          {(['ALL', 'APPROVED', 'PENDING', 'REJECTED'] as FilterKey[]).map((f) => (
            <FilterPill
              key={f}
              label={f}
              active={filter === f}
              onClick={() => setFilter(f)}
              count={filterCounts[f]}
            />
          ))}
        </div>
      </div>

      {/* ── ENTRY LIST ──────────────────────────────────────────────────── */}
      <div className="space-y-2">
        {isLoading && chain.length === 0 ? (
          <div className="text-center py-16 text-zinc-600 font-mono text-sm">
            <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-3 text-indigo-500" />
            Fetching audit ledger…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-zinc-600 font-mono text-sm">
            {chain.length === 0
              ? 'No audit entries found. Run an agent task to generate ledger entries.'
              : 'No entries match your current filter.'}
          </div>
        ) : (
          [...filtered].reverse().map((block, idx) => (
            <EntryCard
              key={block.task_id ?? block.hash ?? block.timestamp ?? idx}
              block={block}
              approvals={approvals}
            />
          ))
        )}
      </div>
    </div>
  );
}
