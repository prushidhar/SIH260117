'use client';

import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Cpu, 
  Terminal, 
  FileSignature,
} from 'lucide-react';
import useIndraStore, { type PendingApproval } from '@/store/indra-store';
import { useApprovalsQuery, useSignApprovalMutation } from '@/lib/queries';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function HITLApprovalModal() {
  const { 
    isApprovalsModalOpen, 
    setApprovalsModalOpen, 
  } = useIndraStore();

  const { data: pendingApprovals = [], isLoading: loadingApprovals, refetch: fetchPendingApprovals } = useApprovalsQuery();
  const signMutation = useSignApprovalMutation();

  const [signatureName, setSignatureName] = useState('Admin User');
  const [signingId, setSigningId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (isApprovalsModalOpen) {
      fetchPendingApprovals();
      setFeedback(null);
    }
  }, [isApprovalsModalOpen, fetchPendingApprovals]);

  const handleDecision = async (item: PendingApproval, approved: boolean) => {
    const key = `${item.task_id}-${item.step_index ?? 0}`;
    setSigningId(key);
    setFeedback(null);

    try {
      await signMutation.mutateAsync({
        taskId: item.task_id || (item as any).taskId || item.id || '',
        stepIndex: typeof item.step_index === 'number' ? item.step_index : 0,
        approved,
        signature: signatureName.trim() || 'Admin User',
      });

      setFeedback({
        type: 'success',
        message: approved 
          ? `Authorization granted for ${item.tool || item.tool_name || 'tool'} with digital signature "${signatureName.trim() || 'Admin User'}"`
          : `Execution rejected for ${item.tool || item.tool_name || 'tool'} by "${signatureName.trim() || 'Admin User'}"`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to submit digital signature to backend.',
      });
    } finally {
      setSigningId(null);
    }
  };

  return (
    <Dialog open={isApprovalsModalOpen} onOpenChange={setApprovalsModalOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden text-slate-800 dark:text-zinc-100">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/70">
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold flex items-center gap-2">
                  Human-in-the-Loop (HITL) Authorizations
                  <Badge variant="warning">
                    {pendingApprovals.length} Pending
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-[11px] mt-0.5">
                  Authorizes or blocks high-consequence deterministic plant actions.
                </DialogDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchPendingApprovals()}
              disabled={loadingApprovals}
              title="Refresh Pending Approvals"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingApprovals ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </DialogHeader>

        {/* Global Signature Bar */}
        <div className="px-6 py-3 bg-slate-50/50 dark:bg-zinc-950/50 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-400 font-medium">
            <FileSignature className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span>Digital Signer Name:</span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              placeholder="Admin User"
              className="w-48 text-right font-semibold h-8"
            />
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`mx-6 mt-3 p-3 rounded-xl text-xs font-mono border ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold' 
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 font-semibold'
          }`}>
            {feedback.message}
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin dark:scrollbar-thumb-zinc-700">
          {pendingApprovals.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 font-mono">
                No Pending Tool Authorizations
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                All deterministic tools are currently idle or authorized. Critical calculations requiring human validation will appear here.
              </p>
            </div>
          ) : (
            pendingApprovals.map((item, index) => {
              const toolName = item.tool || item.tool_name || item.title || 'asme_b31_3_calculator';
              const taskId = item.task_id || (item as any).taskId || 'Unknown';
              const stepIndex = typeof item.step_index === 'number' ? item.step_index : index;
              const argsData = item.arguments || item.args || item.calculations || null;
              const isSigning = signingId === `${item.task_id}-${stepIndex}`;

              return (
                <div 
                  key={`${item.task_id}-${stepIndex}`}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-3 font-mono text-xs shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-zinc-100 text-sm">
                          {toolName}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
                          <span>Task: {taskId.slice(0, 8)}...</span>
                          <span>•</span>
                          <span>Step #{stepIndex}</span>
                        </div>
                      </div>
                    </div>

                    <Badge variant="destructive">
                      {item.severity || 'AUTHORIZATION REQUIRED'}
                    </Badge>
                  </div>

                  {item.description && (
                    <p className="text-slate-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  {/* Arguments Box */}
                  {argsData && (
                    <div className="p-3 rounded-xl bg-slate-900 dark:bg-black border border-slate-800 dark:border-zinc-800 text-[11px]">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5 font-semibold">
                        <Terminal className="w-3 h-3 text-slate-400" />
                        <span>Execution Arguments & Parameters:</span>
                      </div>
                      <pre className="text-slate-200 font-mono overflow-x-auto whitespace-pre-wrap">
                        {typeof argsData === 'string' ? argsData : JSON.stringify(argsData, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/80 dark:border-zinc-800">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDecision(item, false)}
                      disabled={isSigning}
                      className="gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </Button>
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleDecision(item, true)}
                      disabled={isSigning}
                      className="gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isSigning ? 'Signing...' : 'Authorize Execution'}</span>
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-3 border-t border-slate-100 dark:border-zinc-800/80 bg-slate-50/70 dark:bg-zinc-950/70 flex justify-between items-center text-xs font-mono sm:justify-between">
          <span className="text-slate-400 dark:text-zinc-500 text-[10px]">
            POST http://localhost:8000/api/approvals/sign
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setApprovalsModalOpen(false)}
          >
            Dismiss
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
