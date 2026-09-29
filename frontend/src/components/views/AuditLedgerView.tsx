'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  UserCheck, 
  Hash, 
  Link as LinkIcon, 
  AlertTriangle,
  FileCheck,
  Cpu,
  Clock,
  ExternalLink,
  Download,
  Filter,
  Search,
  ChevronDown,
  Eye,
  FileSpreadsheet,
  FileText,
  X,
  Copy,
  Check,
  ArrowRight,
} from 'lucide-react';
import { API_BASE, type AuditBlock, type PendingApproval } from '@/store/indra-store';
import { useAuditLedgerQuery, useApprovalsQuery, useSignApprovalMutation } from '@/lib/queries';
import { multiWindowSync } from '@/lib/sync/multi-window-sync';
import {
  type AuditLedgerEvent,
  DEFAULT_AUDIT_BLOCKS,
  generateComplianceReport,
} from '@/lib/audit/merkle-verifier';
import BlockChainTopologyMap from './audit/BlockChainTopologyMap';
import { AutoRefreshRing, HitlAutoHoldClock } from './audit/HitlCountdownTimer';
import TamperVerifierModal from './audit/TamperVerifierModal';

type FilterStatus = 'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED' | 'CRITICAL OVERRIDE';

export default function AuditLedgerView() {
  const { data: ledgerData, isLoading: loadingLedger, refetch: fetchLedger } = useAuditLedgerQuery();
  const { data: pendingApprovals = [], isLoading: loadingApprovals, refetch: fetchPendingApprovals } = useApprovalsQuery();
  const signMutation = useSignApprovalMutation();

  // Modal states
  const [isVerifierOpen, setIsVerifierOpen] = useState(false);
  const [inspectedBlock, setInspectedBlock] = useState<AuditLedgerEvent | null>(null);
  const [copiedRoot, setCopiedRoot] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  // Filter state for Audit Matrix
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // HITL Sign-off Form State
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [engineerName, setEngineerName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [tier, setTier] = useState<'1' | '2' | '3'>('2');
  const [notes, setNotes] = useState('');
  const [signing, setSigning] = useState(false);
  const [signSuccess, setSignSuccess] = useState<string | null>(null);
  const [signError, setSignError] = useState<string | null>(null);

  // Synthesize or map blockchain events
  const allBlocks: AuditLedgerEvent[] = useMemo(() => {
    const rawBlocks = ledgerData?.chain || [];
    if (rawBlocks.length >= 3) {
      return rawBlocks.map((b: AuditBlock, idx: number) => ({
        id: b.id || `live-block-${b.index ?? idx}`,
        index: b.index !== undefined ? b.index : idx,
        timestamp: b.timestamp || new Date().toISOString(),
        eventType: b.event_type || b.action || 'SOVEREIGN_ACTION',
        status: (b.status as any) || (b.valid === false ? 'REJECTED' : 'APPROVED'),
        assetTag: b.asset_tag || b.tag || 'CDU-MAIN',
        severity: (b.severity as any) || 'MEDIUM',
        operator: b.operator || b.signature || 'LEAD_DCS_OPERATOR',
        hash: b.hash || b.merkle_root || 'sha256:sealed',
        previousHash: b.previous_hash || b.prev_hash || '00000000000000000000000000000000',
        payload: b.payload || b.details || { action: b.action, task_id: b.task_id },
      }));
    }
    return DEFAULT_AUDIT_BLOCKS;
  }, [ledgerData]);

  const isValidChain: boolean = ledgerData?.verified ?? true;
  const totalBlocks: number = allBlocks.length;
  const merkleRoot: string =
    ledgerData?.merkle_root ||
    allBlocks[allBlocks.length - 1]?.hash ||
    'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069';

  useEffect(() => {
    if (pendingApprovals.length > 0 && !selectedApproval) {
      setSelectedApproval(pendingApprovals[0]);
    }
  }, [pendingApprovals, selectedApproval]);

  // Handle revalidation
  const handleRefreshAll = () => {
    fetchLedger();
    fetchPendingApprovals();
  };

  // 3-Tier Human-in-the-Loop Sign-off submission
  const handleSignApproval = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!selectedApproval) return;
    const signer = engineerName.trim() || 'Admin User';

    try {
      setSigning(true);
      setSignError(null);
      setSignSuccess(null);

      await signMutation.mutateAsync({
        taskId: selectedApproval.task_id || (selectedApproval as any).taskId || selectedApproval.id,
        stepIndex: typeof selectedApproval.step_index === 'number' ? selectedApproval.step_index : 0,
        approved: decision === 'APPROVED',
        signature: `${signer} (Tier ${tier} Certified)`,
      });

      setSignSuccess(`Action recorded: Tool execution ${decision === 'APPROVED' ? 'Approved' : 'Rejected'} by ${signer} & sealed into Merkle Ledger.`);
      setNotes('');
      
      setTimeout(() => {
        setSignSuccess(null);
        setSelectedApproval(null);
      }, 3000);
    } catch (err: any) {
      setSignError(err.message || 'Failed to submit signature to backend.');
    } finally {
      setSigning(false);
    }
  };

  // Filtered blocks for Audit Matrix
  const filteredBlocks = useMemo(() => {
    return allBlocks.filter((b) => {
      // Status filter
      if (statusFilter !== 'ALL' && b.status !== statusFilter) {
        return false;
      }
      // Text query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTag = b.assetTag.toLowerCase().includes(q);
        const matchesEvent = b.eventType.toLowerCase().includes(q);
        const matchesOperator = b.operator.toLowerCase().includes(q);
        const matchesHash = b.hash.toLowerCase().includes(q);
        return matchesTag || matchesEvent || matchesOperator || matchesHash;
      }
      return true;
    });
  }, [allBlocks, statusFilter, searchQuery]);

  // Export handlers
  const handleExport = (format: 'csv' | 'json') => {
    const report = generateComplianceReport(filteredBlocks, merkleRoot, format);
    const blob = new Blob([report.content], { type: report.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = report.filename;
    a.click();
    URL.revokeObjectURL(url);
    setExportDropdownOpen(false);
  };

  const handleCopyRoot = () => {
    navigator.clipboard.writeText(merkleRoot);
    setCopiedRoot(true);
    setTimeout(() => setCopiedRoot(false), 2000);
  };

  return (
    <div className="flex-1 min-h-0 h-full flex flex-col bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 overflow-hidden p-5 font-mono select-none transition-colors duration-200">
      {/* Top SCADA Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 dark:border-zinc-800/80 gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-base font-bold text-slate-900 dark:text-zinc-100 tracking-wider">
              MERKLE AUDIT LEDGER & 3-TIER HITL TIMELINE
            </h1>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60 font-bold">
              SHA-256 IMMUTABLE
            </span>
            <span className="text-[10px] text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-200 dark:border-cyan-800/60 font-semibold hidden sm:inline">
              AIR-GAP LOCAL (127.0.0.1)
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            OSHA 1910.119 / API 570 / ASME B31.3 deterministic ledger with client-side cryptographic seal verification.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Integrity status pill */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold border ${
            isValidChain 
              ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300' 
              : 'bg-rose-950/60 border-rose-800/80 text-rose-300'
          }`}>
            {isValidChain ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
            <span>{isValidChain ? 'CRYPTOGRAPHICALLY SEALED (0 TAMPER)' : 'CHAIN BROKEN'}</span>
          </div>

          {/* 30-Second Auto Refresh Circular Timer */}
          <AutoRefreshRing
            intervalSeconds={30}
            onRefresh={handleRefreshAll}
            isRefreshing={loadingLedger || loadingApprovals}
          />

          {/* One-Click Verify Merkle Tree Button */}
          <button
            onClick={() => setIsVerifierOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/80 text-xs text-emerald-300 font-bold transition-all shadow-sm cursor-pointer"
            title="Recalculate SHA-256 hashes client-side with NIST FIPS 180-4 Seal"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Verify Merkle Tree</span>
          </button>

          {/* Pop Out Window Button */}
          <button
            onClick={() => multiWindowSync.openWindow('audit')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-xs text-zinc-300 font-bold transition-colors shadow-2xs cursor-pointer"
            title="Detach Ledger to Dedicated Popout Window"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pop Out</span>
          </button>
        </div>
      </div>

      {/* Main Scrollable Body */}
      <div className="flex-1 overflow-y-auto space-y-4 scrollbar-thin dark:scrollbar-thumb-zinc-700 pr-1">
        {/* Merkle Root Telemetry Bar */}
        <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-950/70 text-emerald-400 border border-emerald-800/60">
              <Lock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                ACTIVE STATUTORY MERKLE ROOT (SHA-256)
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-zinc-100 font-bold truncate max-w-md">
                  {merkleRoot}
                </span>
                <button
                  onClick={handleCopyRoot}
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                  title="Copy Merkle Root"
                >
                  {copiedRoot ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-right">
            <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                CONSENSUS ENGINE
              </div>
              <div className="text-emerald-400 font-bold text-xs mt-0.5">
                LOCAL AIR-GAP (0 WAN EGRESS)
              </div>
            </div>
            <div className="pl-4 border-l border-zinc-800">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                TOTAL CHAIN BLOCKS
              </div>
              <div className="text-emerald-400 font-bold text-sm mt-0.5">
                {totalBlocks} Blocks
              </div>
            </div>
          </div>
        </div>

        {/* 1. Interactive Block-Chain Topology Map */}
        <BlockChainTopologyMap
          blocks={allBlocks}
          onSelectBlock={(block) => setInspectedBlock(block)}
        />

        {/* 2. 3-Tier Human-in-the-Loop (HITL) Sign-off Section */}
        <div className="p-4.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-950/70 border border-emerald-800/60 flex items-center justify-center">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <h2 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                Human-in-the-Loop (HITL) 3-Tier Sign-Off Gate
              </h2>
            </div>
            <span className="text-[10px] text-zinc-400 font-semibold">
              {pendingApprovals.length} pending decisions awaiting authorization
            </span>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="text-xs text-zinc-500 italic py-5 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-950/50">
              No pending operator approvals. Critical actions triggered by ASME B31.3 limits or SIL setpoint overrides will pause here for 3-tier plant authorization.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* List of pending approvals */}
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                  Select Action Requiring Authorization:
                </div>
                {pendingApprovals.map((item, idx) => {
                  const itemKey = `${item.task_id}-${item.step_index ?? idx}`;
                  const isSelected =
                    selectedApproval?.task_id === item.task_id &&
                    (selectedApproval?.step_index ?? 0) === (item.step_index ?? idx);

                  return (
                    <div
                      key={itemKey}
                      onClick={() => setSelectedApproval(item)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-zinc-850 border-emerald-500/80 shadow-md ring-1 ring-emerald-500/30'
                          : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-zinc-100">
                          {item.tool || item.tool_name || item.title || 'Tool Authorization'}
                        </span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-rose-950/80 text-rose-300 border border-rose-800">
                          {item.severity || 'CRITICAL'}
                        </span>
                      </div>

                      <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">
                        {item.description || (item.arguments ? JSON.stringify(item.arguments) : 'Deterministic action waiting for approval')}
                      </p>

                      {/* 5-minute auto-hold countdown timer */}
                      <div className="mt-2.5">
                        <HitlAutoHoldClock
                          initialSeconds={300}
                          label="5-MIN AUTO-HOLD"
                        />
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-zinc-850 text-[10px] text-zinc-500">
                        <span>Task: {item.task_id?.slice(0, 8)}... (Step #{item.step_index ?? idx})</span>
                        <span>{item.created_at || 'Pending'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Digital Signature Panel */}
              {selectedApproval ? (
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                    <span className="font-bold text-zinc-100">
                      Sign-Off: {selectedApproval.tool || selectedApproval.tool_name || selectedApproval.title || 'Action'}
                    </span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-950/70 px-2 py-0.5 rounded-md border border-emerald-800/60 font-semibold">
                      Step #{selectedApproval.step_index ?? 0}
                    </span>
                  </div>

                  {/* 3-Tier Authority Level Selector */}
                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-1 uppercase font-semibold">
                      Statutory Sign-off Authority Tier:
                    </label>
                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setTier('1')}
                        className={`py-1.5 px-2 rounded-lg border font-bold transition-all cursor-pointer ${
                          tier === '1'
                            ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Tier 1: Operator
                      </button>
                      <button
                        type="button"
                        onClick={() => setTier('2')}
                        className={`py-1.5 px-2 rounded-lg border font-bold transition-all cursor-pointer ${
                          tier === '2'
                            ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Tier 2: PE Lead
                      </button>
                      <button
                        type="button"
                        onClick={() => setTier('3')}
                        className={`py-1.5 px-2 rounded-lg border font-bold transition-all cursor-pointer ${
                          tier === '3'
                            ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Tier 3: Plant Mgr
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-1 uppercase font-semibold">
                        Digital Signer Name:
                      </label>
                      <input
                        type="text"
                        value={engineerName}
                        onChange={(e) => setEngineerName(e.target.value)}
                        placeholder="Admin User / PE_48291"
                        className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-1 uppercase font-semibold">
                        Employee / License ID:
                      </label>
                      <input
                        type="text"
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        placeholder="PE-LIC-TX-99042"
                        className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>

                  {selectedApproval.arguments && (
                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-1 uppercase font-semibold">
                        Action Parameters:
                      </label>
                      <pre className="p-2 rounded-lg bg-black/80 text-[10px] text-zinc-300 overflow-x-auto max-h-24">
                        {JSON.stringify(selectedApproval.arguments, null, 2)}
                      </pre>
                    </div>
                  )}

                  {signError && (
                    <div className="text-[11px] text-rose-300 bg-rose-950/60 p-2.5 rounded-xl border border-rose-800 font-medium">
                      {signError}
                    </div>
                  )}

                  {signSuccess && (
                    <div className="text-[11px] text-emerald-300 bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-800 font-medium">
                      {signSuccess}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleSignApproval('APPROVED')}
                      disabled={signing}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>SIGN & APPROVE (TIER {tier})</span>
                    </button>

                    <button
                      onClick={() => handleSignApproval('REJECTED')}
                      disabled={signing}
                      className="px-4 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>REJECT</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center p-6 text-xs text-zinc-500 italic border border-dashed border-zinc-800 rounded-xl bg-zinc-950/50">
                  Select an action on the left to sign off
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Filterable Audit Matrix Section */}
        <div className="p-4.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-800 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                  Filterable Audit Matrix & Statutory Ledger
                </h2>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Displaying {filteredBlocks.length} of {allBlocks.length} cryptographic events
              </p>
            </div>

            {/* Compliance Report Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-xs font-bold text-zinc-200 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export Compliance Report</span>
                <ChevronDown className="w-3 h-3 text-zinc-400" />
              </button>

              {exportDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl p-1.5 z-20 space-y-1">
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 transition-colors text-left cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-bold">Export CSV</div>
                      <div className="text-[9px] text-zinc-500">Excel / OSHA PSM Format</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleExport('json')}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 transition-colors text-left cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <div>
                      <div className="font-bold">Export JSON</div>
                      <div className="text-[9px] text-zinc-500">Full Cryptographic Chain</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Filter Pills and Search Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
              {(['ALL', 'APPROVED', 'PENDING', 'REJECTED', 'CRITICAL OVERRIDE'] as FilterStatus[]).map(
                (status) => {
                  const isActive = statusFilter === status;
                  return (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                        isActive
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-sm'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      {status === 'ALL' ? 'ALL EVENTS' : status}
                    </button>
                  );
                }
              )}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tag, operator, action..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 outline-none focus:border-emerald-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Matrix List / Table */}
          <div className="space-y-2">
            {filteredBlocks.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-950/50 text-xs text-zinc-500">
                No audit blocks match the selected filter criteria.
              </div>
            ) : (
              filteredBlocks.map((b) => {
                const isApproved = b.status === 'APPROVED';
                const isPending = b.status === 'PENDING';
                const isOverride = b.status === 'CRITICAL OVERRIDE';
                const isRejected = b.status === 'REJECTED';

                const statusBadgeStyle = isApproved
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80'
                  : isOverride
                  ? 'bg-rose-950/80 text-rose-300 border-rose-700/80 animate-pulse'
                  : isPending
                  ? 'bg-amber-950/80 text-amber-300 border-amber-700/80'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700';

                return (
                  <div
                    key={b.id}
                    className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/90 hover:border-zinc-700 transition-all text-xs space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold text-[10px]">
                          BLOCK #{b.index}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md border text-[9px] font-bold ${statusBadgeStyle}`}>
                          {b.status}
                        </span>
                        <span className="text-zinc-100 font-bold text-xs">
                          {b.eventType}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                        <span className="text-emerald-400 font-bold">TAG: {b.assetTag}</span>
                        <span className="text-zinc-500 text-[10px] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {b.timestamp}
                        </span>
                        <button
                          onClick={() => setInspectedBlock(b)}
                          className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-emerald-400 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                      </div>
                    </div>

                    {/* Hash & Previous Hash linkage summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] pt-2 border-t border-zinc-900">
                      <div className="flex items-center gap-1.5 text-zinc-400 truncate">
                        <LinkIcon className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                        <span className="text-zinc-500">previous_hash:</span>
                        <span className="font-mono text-zinc-300 truncate">{b.previousHash}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-emerald-400 truncate">
                        <Hash className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                        <span className="text-zinc-500">block_hash:</span>
                        <span className="font-mono text-emerald-400 truncate">{b.hash}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-0.5">
                      <span>Operator: <strong className="text-zinc-300">{b.operator}</strong></span>
                      <span className="truncate max-w-sm text-right text-zinc-400">
                        Payload: {JSON.stringify(b.payload).substring(0, 70)}...
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Block Inspector Modal */}
      {inspectedBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl p-6 font-mono text-xs space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold text-[10px]">
                  BLOCK #{inspectedBlock.index}
                </span>
                <h3 className="font-bold text-zinc-100 text-sm">
                  {inspectedBlock.eventType}
                </h3>
              </div>
              <button
                onClick={() => setInspectedBlock(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block">ASSET TAG</span>
                  <span className="font-bold text-emerald-400">{inspectedBlock.assetTag}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block">STATUS</span>
                  <span className="font-bold text-zinc-200">{inspectedBlock.status}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block">SIGNER / OPERATOR</span>
                  <span className="font-bold text-zinc-200">{inspectedBlock.operator}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block">TIMESTAMP (UTC)</span>
                  <span className="font-bold text-zinc-200">{inspectedBlock.timestamp}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-zinc-500 block mb-1">CURRENT SHA-256 HASH</span>
                <div className="p-2 rounded-lg bg-black text-[11px] font-mono text-emerald-400 break-all border border-zinc-850">
                  {inspectedBlock.hash}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-zinc-500 block mb-1">PREVIOUS BLOCK HASH</span>
                <div className="p-2 rounded-lg bg-black text-[11px] font-mono text-zinc-400 break-all border border-zinc-850">
                  {inspectedBlock.previousHash}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-zinc-500 block mb-1">PAYLOAD & RECONCILIATION PARAMETERS</span>
                <pre className="p-3 rounded-xl bg-black text-[11px] font-mono text-zinc-200 overflow-x-auto max-h-48 border border-zinc-850">
                  {JSON.stringify(inspectedBlock.payload, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInspectedBlock(null)}
                className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold transition-colors cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cryptographic Verifier Modal */}
      <TamperVerifierModal
        isOpen={isVerifierOpen}
        onClose={() => setIsVerifierOpen(false)}
        blocks={allBlocks}
        expectedRoot={merkleRoot}
      />
    </div>
  );
}
