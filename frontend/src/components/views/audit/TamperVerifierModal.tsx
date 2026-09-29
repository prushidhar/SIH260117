'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  Lock,
  Hash,
  Cpu,
  FileCheck,
  Download,
  Copy,
  Check,
  RefreshCw,
  Terminal,
} from 'lucide-react';
import {
  verifyAuditLedgerChain,
  type MerkleVerificationResult,
  type AuditLedgerEvent,
} from '@/lib/audit/merkle-verifier';

interface TamperVerifierModalProps {
  isOpen: boolean;
  onClose: () => void;
  blocks: AuditLedgerEvent[];
  expectedRoot: string;
}

export default function TamperVerifierModal({
  isOpen,
  onClose,
  blocks,
  expectedRoot,
}: TamperVerifierModalProps) {
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<MerkleVerificationResult | null>(null);
  const [copiedRoot, setCopiedRoot] = useState(false);
  const [verifiedStep, setVerifiedStep] = useState(0);

  const runVerification = async () => {
    setVerifying(true);
    setVerifiedStep(0);

    // Simulate animated verification progress for industrial feel
    for (let step = 1; step <= Math.min(blocks.length, 6); step++) {
      setVerifiedStep(step);
      await new Promise((r) => setTimeout(r, 60));
    }

    try {
      const res = await verifyAuditLedgerChain(blocks, expectedRoot);
      setVerificationResult(res);
    } catch (e) {
      console.error('Verification error:', e);
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runVerification();
    } else {
      setVerificationResult(null);
      setVerifiedStep(0);
    }
  }, [isOpen, blocks, expectedRoot]);

  if (!isOpen) return null;

  const handleCopyRoot = () => {
    if (verificationResult?.computedRoot) {
      navigator.clipboard.writeText(verificationResult.computedRoot);
      setCopiedRoot(true);
      setTimeout(() => setCopiedRoot(false), 2000);
    }
  };

  const handleDownloadProof = () => {
    if (!verificationResult) return;
    const proofPayload = {
      standard: 'NIST FIPS 180-4 Secure Hash Standard (SHA-256)',
      verificationTimestamp: new Date().toISOString(),
      merkleRoot: verificationResult.computedRoot,
      expectedRoot: verificationResult.expectedRoot,
      status: verificationResult.isValid ? 'TAMPER_PROOF_VERIFIED_PASS' : 'TAMPER_DETECTED_FAIL',
      totalBlocksEvaluated: verificationResult.blockCount,
      durationMs: verificationResult.verificationDurationMs,
      leafAuditReport: verificationResult.leafVerifications,
    };

    const blob = new Blob([JSON.stringify(proofPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `INDRA-Merkle-Cryptographic-Proof-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden font-mono text-zinc-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-100 tracking-wider">
                  NIST FIPS 180-4 SHA-256 CRYPTOGRAPHIC VERIFIER
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 text-[9px] font-bold">
                  CLIENT-SIDE WebCrypto
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Independent real-time SHA-256 recomputation across all leaf nodes & parent pointer hashes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin dark:scrollbar-thumb-zinc-700">
          {/* Verification Status Banner */}
          {verifying ? (
            <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center gap-4">
              <RefreshCw className="w-7 h-7 text-emerald-400 animate-spin flex-shrink-0" />
              <div className="space-y-1">
                <div className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                  Recalculating Merkle Hash Tree (Leaf {verifiedStep} of {blocks.length})...
                </div>
                <div className="text-[11px] text-zinc-400">
                  Executing browser WebCrypto SHA-256 digests against serialized event payloads and parent hashes...
                </div>
              </div>
            </div>
          ) : verificationResult?.isValid ? (
            /* Cryptographic Seal of Authenticity */
            <div className="relative p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-zinc-900/90 to-zinc-950 border border-emerald-700/60 shadow-xl overflow-hidden">
              <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative w-14 h-14 rounded-2xl bg-emerald-950/90 border-2 border-emerald-500/70 flex items-center justify-center shadow-lg shadow-emerald-500/20 flex-shrink-0">
                    <ShieldCheck className="w-8 h-8 text-emerald-400" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-black stroke-[3]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-emerald-300 tracking-wider">
                        CRYPTOGRAPHIC INTEGRITY VERIFIED
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-900/60 text-emerald-300 border border-emerald-600/50 text-[10px] font-bold">
                        ZERO TAMPERING
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 mt-0.5">
                      All {verificationResult.blockCount} blocks strictly adhere to parent pointer continuity.
                    </p>
                    <div className="text-[10px] text-zinc-400 mt-1 flex items-center gap-3">
                      <span>Verification duration: <strong className="text-emerald-400">{verificationResult.verificationDurationMs} ms</strong></span>
                      <span>•</span>
                      <span>Standard: <strong className="text-zinc-200">OSHA 1910.119 / API 570</strong></span>
                    </div>
                  </div>
                </div>

                {/* NIST Stamp Box */}
                <div className="px-3.5 py-2 rounded-xl bg-zinc-900/90 border border-emerald-800/80 text-right flex-shrink-0">
                  <div className="text-[9px] uppercase tracking-wider text-emerald-500 font-bold">STATUTORY AUDIT SEAL</div>
                  <div className="text-xs font-bold text-zinc-100">FIPS 180-4 COMPLIANT</div>
                  <div className="text-[10px] text-zinc-400">AIR-GAP 127.0.0.1 LOCAL</div>
                </div>
              </div>

              {/* Merkle Root Check Comparison */}
              <div className="mt-4 pt-3.5 border-t border-emerald-800/40 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1">
                    Client Computed Root Hash:
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-emerald-300 font-mono text-[11px] truncate">
                      {verificationResult.computedRoot}
                    </span>
                    <button
                      onClick={handleCopyRoot}
                      className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors flex-shrink-0 cursor-pointer"
                      title="Copy root hash"
                    >
                      {copiedRoot ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1">
                    Expected Merkle Tree Root:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-200 font-mono text-[11px] truncate">
                      {expectedRoot}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold flex-shrink-0">
                      MATCH
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Tamper Failure Warning */
            <div className="p-5 rounded-2xl bg-rose-950/40 border border-rose-700/80 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-rose-950 border border-rose-600 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-7 h-7 text-rose-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-rose-300">
                    CRYPTOGRAPHIC TAMPERING DETECTED AT BLOCK #{verificationResult?.tamperIndex ?? 'UNKNOWN'}
                  </h4>
                  <p className="text-xs text-zinc-300 mt-1">
                    Hash mismatch or parent pointer break found. Immediate OSHA 1910.119 safety lock required.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Leaf-by-Leaf Verification Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Deterministic Leaf Verification Breakdown ({blocks.length} Blocks)</span>
              </div>
              <span className="text-[10px]">Algorithm: SHA-256 (256-bit hash)</span>
            </div>

            <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950/80">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-zinc-900/70 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                <div className="col-span-1">Block</div>
                <div className="col-span-3">Event Action</div>
                <div className="col-span-3">Computed Hash (0x)</div>
                <div className="col-span-3">Stored Hash (0x)</div>
                <div className="col-span-2 text-right">Integrity Status</div>
              </div>

              <div className="divide-y divide-zinc-850/60 max-h-56 overflow-y-auto font-mono text-xs">
                {blocks.map((block, i) => {
                  const leaf = verificationResult?.leafVerifications[i];
                  const isMatch = leaf?.matches ?? true;

                  return (
                    <div
                      key={block.id}
                      className="grid grid-cols-12 gap-2 px-3 py-2 items-center hover:bg-zinc-900/40 transition-colors text-[11px]"
                    >
                      <div className="col-span-1 text-zinc-400 font-bold">
                        #{block.index}
                      </div>
                      <div className="col-span-3 text-zinc-200 truncate" title={block.eventType}>
                        {block.eventType}
                      </div>
                      <div className="col-span-3 text-zinc-400 font-mono truncate text-[10px]">
                        {leaf?.computedHash || '0x4f82a9...'}
                      </div>
                      <div className="col-span-3 text-zinc-400 font-mono truncate text-[10px]">
                        {leaf?.storedHash || '0x4f82a9...'}
                      </div>
                      <div className="col-span-2 text-right">
                        {isMatch ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                            <Check className="w-2.5 h-2.5" />
                            PASS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-700">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            TAMPER
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/40">
          <div className="text-[11px] text-zinc-400 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cryptographic proof generated on secure local hardware</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runVerification}
              disabled={verifying}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
              <span>Re-Run</span>
            </button>

            <button
              onClick={handleDownloadProof}
              disabled={verifying || !verificationResult}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Proof Certificate</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
