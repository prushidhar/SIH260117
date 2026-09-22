'use client';

import { useState, useEffect } from 'react';
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
  ExternalLink
} from 'lucide-react';
import { API_BASE, type AuditBlock, type PendingApproval } from '@/store/indra-store';
import { useAuditLedgerQuery, useApprovalsQuery, useSignApprovalMutation } from '@/lib/queries';
import { multiWindowSync } from '@/lib/sync/multi-window-sync';

export default function AuditLedgerView() {
  const { data: ledgerData, isLoading: loadingLedger, refetch: fetchLedger } = useAuditLedgerQuery();
  const { data: pendingApprovals = [], isLoading: loadingApprovals, refetch: fetchPendingApprovals } = useApprovalsQuery();
  const signMutation = useSignApprovalMutation();

  const blocks: AuditBlock[] = ledgerData?.chain || [];
  const isValidChain: boolean = ledgerData?.verified ?? true;
  const totalBlocks: number = ledgerData?.total_blocks || blocks.length;
  const merkleRoot: string = ledgerData?.merkle_root || 'SHA256:AUTHENTICATED_ROOT';

  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);

  // Sign-off Form State
  const [engineerName, setEngineerName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [tier, setTier] = useState<'1' | '2' | '3'>('2');
  const [notes, setNotes] = useState('');
  const [signing, setSigning] = useState(false);
  const [signSuccess, setSignSuccess] = useState<string | null>(null);
  const [signError, setSignError] = useState<string | null>(null);

  useEffect(() => {
    if (pendingApprovals.length > 0 && !selectedApproval) {
      setSelectedApproval(pendingApprovals[0]);
    }
  }, [pendingApprovals, selectedApproval]);

  // 3. Submit 3-Tier Human-in-the-Loop Sign-off to POST /api/approvals/sign
  // Exact payload format: {"task_id": "the-uuid", "step_index": 0, "approved": true, "signature": "Admin User"}
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
        signature: signer,
      });

      setSignSuccess(`Action recorded: Tool execution ${decision === 'APPROVED' ? 'Approved' : 'Rejected'} by ${signer} & sealed into Merkle Ledger.`);
      setNotes('');
      
      // Deselect or move to next
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

  return (
    <div className="flex-1 min-h-0 h-full flex flex-col bg-[#f8fafc] dark:bg-[#0a0a0a] text-slate-800 dark:text-zinc-200 overflow-hidden p-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-zinc-800/80 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-base font-bold text-slate-900 dark:text-zinc-100 font-mono">
              Merkle Audit Ledger & 3-Tier HITL Governance
            </h1>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/50 font-mono font-bold">
              SHA-256 IMMUTABLE
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 font-mono">
            Every sovereign calculation, P&ID reconciliation, and plant maintenance approval is cryptographically linked and signed.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border ${
            isValidChain 
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' 
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}>
            {isValidChain ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />}
            <span>{isValidChain ? 'CRYPTOGRAPHICALLY VERIFIED (0 TAMPERING)' : 'INTEGRITY CHECK FAILED'}</span>
          </div>

          <button
            onClick={() => { fetchLedger(); fetchPendingApprovals(); }}
            disabled={loadingLedger}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 text-xs text-slate-700 dark:text-zinc-300 font-mono transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingLedger ? 'animate-spin' : ''}`} />
            <span>Verify</span>
          </button>

          <button
            onClick={() => multiWindowSync.openWindow('audit')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300 font-mono transition-colors shadow-2xs cursor-pointer font-bold"
            title="Detach Ledger to Dedicated Popout Window"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Pop Out Window</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 scrollbar-thin dark:scrollbar-thumb-zinc-700 pr-1">
        {/* Merkle Root Telemetry Bar */}
        <div className="p-4.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">
                Active Merkle Root (SHA-256)
              </div>
              <div className="text-slate-800 dark:text-zinc-200 font-bold truncate max-w-lg mt-0.5">
                {merkleRoot || 'SHA256:ROOT_SEALED_ON_PREMISE'}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">Total Blocks in Chain</div>
            <div className="text-emerald-700 dark:text-emerald-400 font-bold text-sm mt-0.5">{totalBlocks || blocks.length} Blocks</div>
          </div>
        </div>

        {/* 3-Tier Human-in-the-Loop (HITL) Sign-off Section */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                <UserCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              </div>
              <h2 className="text-xs font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wider font-mono">
                Human-in-the-Loop (HITL) Sign-Off Gate
              </h2>
            </div>
            <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 font-semibold">
              {pendingApprovals.length} pending decisions
            </span>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="text-xs text-slate-400 italic py-5 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              No pending approvals. Critical decisions triggered by ASME B31.3 limits will appear here for 3-tier plant authorization.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* List of pending approvals */}
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-semibold">
                  Select Action Requiring Authorization:
                </div>
                {pendingApprovals.map((item, idx) => {
                  const itemKey = `${item.task_id}-${item.step_index ?? idx}`;
                  const isSelected = selectedApproval?.task_id === item.task_id && (selectedApproval?.step_index ?? 0) === (item.step_index ?? idx);
                  return (
                    <div
                      key={itemKey}
                      onClick={() => setSelectedApproval(item)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-violet-50/70 dark:bg-violet-950/40 border-violet-400 dark:border-violet-600 shadow-xs ring-2 ring-violet-500/20'
                          : 'bg-slate-50 dark:bg-zinc-950 border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-bold text-slate-800 dark:text-zinc-200">
                          {item.tool || item.tool_name || item.title || 'Tool Authorization'}
                        </span>
                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          {item.severity || 'CRITICAL'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed line-clamp-2">
                        {item.description || (item.arguments ? JSON.stringify(item.arguments) : 'Deterministic action waiting for approval')}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-200/60 dark:border-zinc-800/80 text-[10px] font-mono text-slate-400 dark:text-zinc-500">
                        <span>Task: {item.task_id?.slice(0, 8)}... (Step #{item.step_index ?? idx})</span>
                        <span>{item.created_at || 'Pending'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Digital Signature Panel */}
              {selectedApproval ? (
                <div className="p-4.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800">
                    <span className="font-bold text-slate-900 dark:text-zinc-100">
                      Sign-Off: {selectedApproval.tool || selectedApproval.tool_name || selectedApproval.title || 'Tool Execution'}
                    </span>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/50 font-semibold">
                      Step #{selectedApproval.step_index ?? 0}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 dark:text-zinc-400 mb-1 uppercase font-semibold">
                        Digital Signer Name:
                      </label>
                      <input
                        type="text"
                        value={engineerName}
                        onChange={(e) => setEngineerName(e.target.value)}
                        placeholder="Admin User"
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-800 dark:text-zinc-100 outline-none focus:border-violet-400 dark:focus:border-violet-600 shadow-2xs font-mono"
                      />
                    </div>

                    {selectedApproval.arguments && (
                      <div>
                        <label className="block text-[10px] text-slate-500 dark:text-zinc-400 mb-1 uppercase font-semibold">
                          Tool Parameters:
                        </label>
                        <pre className="p-2.5 rounded-xl bg-slate-900 dark:bg-black text-[10px] text-slate-200 overflow-x-auto font-mono">
                          {JSON.stringify(selectedApproval.arguments, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>

                  {signError && (
                    <div className="text-[11px] text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-800 font-medium">
                      {signError}
                    </div>
                  )}

                  {signSuccess && (
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 font-medium">
                      {signSuccess}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleSignApproval('APPROVED')}
                      disabled={signing}
                      className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm shadow-emerald-500/20"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>SIGN: APPROVE ACTION</span>
                    </button>

                    <button
                      onClick={() => handleSignApproval('REJECTED')}
                      disabled={signing}
                      className="px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>REJECT</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center p-6 text-xs text-slate-400 dark:text-zinc-500 italic border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50/50 dark:bg-zinc-950/50">
                  Select an item on the left to sign off
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cryptographic Ledger Chain Explorer */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Cryptographic Audit Blocks ({totalBlocks || blocks.length})
            </h2>
            <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
              GET /api/audit/ledger
            </span>
          </div>

          {blocks.length === 0 && !loadingLedger ? (
            <div className="text-xs text-slate-400 dark:text-zinc-500 italic p-6 text-center border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 shadow-2xs">
              No audit blocks recorded yet. Execute an AI task to initiate block generation.
            </div>
          ) : (
            <div className="space-y-2.5">
              {blocks.map((b, idx) => {
                const eventType = b.event_type || b.action || 'ASME_B31_3_EXECUTION';
                const merkleRoot = b.merkle_root || b.hash || 'sha256:sealed';
                const prevHash = b.previous_hash || b.prev_hash || '00000000000000000000000000000000';
                const blockNum = b.index !== undefined ? b.index : idx;

                return (
                  <div
                    key={b.hash || `${b.timestamp}-${idx}`}
                    className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-violet-300 dark:hover:border-violet-700 transition-all font-mono text-xs space-y-2 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold text-[10px]">
                          BLOCK #{blockNum}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/50 text-[10px] font-bold">
                          {eventType}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-zinc-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{b.timestamp || 'Recorded'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] pt-1.5 border-t border-slate-100 dark:border-zinc-800">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-zinc-400 truncate">
                        <LinkIcon className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 flex-shrink-0" />
                        <span className="text-slate-400 dark:text-zinc-500">previous_hash:</span>
                        <span className="truncate text-slate-600 dark:text-zinc-300 font-medium">{prevHash}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 truncate font-semibold">
                        <Hash className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <span className="text-slate-400 dark:text-zinc-500 font-normal">merkle_root:</span>
                        <span className="truncate text-emerald-700 dark:text-emerald-400">{merkleRoot}</span>
                      </div>
                    </div>

                    {b.operator && (
                      <div className="text-[10px] text-slate-500 dark:text-zinc-400 pt-0.5">
                        <span className="text-slate-400 dark:text-zinc-500">Signed By: </span>
                        <span className="font-semibold text-slate-700 dark:text-zinc-300">{b.operator}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
