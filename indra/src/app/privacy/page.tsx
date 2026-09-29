import Link from 'next/link';
import Image from 'next/image';
import { 
  ShieldCheck, 
  ArrowLeft, 
  Lock, 
  HardDrive, 
  Server, 
  FileCheck, 
  CheckCircle2,
  Terminal
} from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy - INDRA Sovereign AI Workbench',
  description: 'Sovereign on-premise privacy policy detailing zero-telemetry, zero-WAN egress, and client-side data custody architecture.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 flex-shrink-0">
                <Image src="/logo.png" alt="INDRA" fill className="object-contain p-1" />
              </div>
              <div>
                <div className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                  INDRA
                </div>
                <div className="text-[10px] font-mono text-slate-400">DATA SOVEREIGNTY CHARTER</div>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-mono transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </Link>
            <Link
              href="/workbench"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-semibold transition-colors"
            >
              <span>Launch Workbench</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 flex-1">
        <div className="space-y-8">
          {/* Header Banner */}
          <div className="border-b border-slate-800 pb-8">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 text-xs font-mono mb-4">
              <Lock className="w-3.5 h-3.5" />
              <span>AIR-GAPPED SOVEREIGNTY CHARTER</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Sovereign Data Privacy &amp; On-Premise Governance Policy
            </h1>
            <p className="text-sm text-slate-400 mt-2 font-mono">
              Effective Date: September 2026 &bull; Classification: IEC 62443 / CMMC OT Restricted
            </p>
          </div>

          {/* Quick Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Zero WAN Telemetry</span>
              </div>
              <p className="text-xs text-slate-400">No prompt, user action, calculation, or weight metric is transmitted to external servers or cloud endpoints.</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-bold mb-1">
                <HardDrive className="w-4 h-4" />
                <span>100% Local Disk Custody</span>
              </div>
              <p className="text-xs text-slate-400">All conversation sessions, vector embeddings, and P&amp;ID schematics reside exclusively in local IndexedDB storage.</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-bold mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Cryptographic Auditing</span>
              </div>
              <p className="text-xs text-slate-400">Audit logs are hashed into SHA-256 Merkle trees under operator custody for tamper-evident compliance inspections.</p>
            </div>
          </div>

          {/* Detailed Policy Sections */}
          <div className="space-y-8 text-sm text-slate-300 leading-relaxed font-sans">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 font-mono">
                <span className="text-emerald-400">01.</span>
                <span>Zero External Network Egress Architecture</span>
              </h2>
              <p>
                INDRA is architected from the foundation up as a sovereign, air-gapped system. The software does not establish outbound connections to commercial AI APIs (such as OpenAI, Anthropic, or Google Cloud), third-party analytics platforms, crash reporters, or tracking beacons.
              </p>
              <p>
                All communications between the user interface and the execution kernel are confined to the local loopback interface (<code>127.0.0.1:8000</code>). When deployed in an air-gapped industrial plant, power station, manufacturing facility, or plant demilitarized zone (DMZ), all external WAN routing is rejected by physical firewall rules without degrading software functionality.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 font-mono">
                <span className="text-emerald-400">02.</span>
                <span>Local Storage &amp; IndexedDB Data Custody</span>
              </h2>
              <p>
                All user data-including chat histories, ASME B31.3 calculation parameters, engineering inspection documents (.pdf, .docx, .xlsx), and custom system instructions-is persisted locally in the client browser using Dexie.js (IndexedDB).
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li><strong className="text-slate-200">No Central Database:</strong> There is no cloud-hosted relational database or multi-tenant repository.</li>
                <li><strong className="text-slate-200">Operator Ownership:</strong> The host enterprise maintains complete physical and cryptographic custody of all generated artifacts.</li>
                <li><strong className="text-slate-200">One-Click Complete Purge:</strong> Operators can permanently wipe all stored messages, vector chunks, and deliverables via the Workbench settings at any time.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 font-mono">
                <span className="text-emerald-400">03.</span>
                <span>On-Device Vector Embeddings (Zero-Cloud RAG)</span>
              </h2>
              <p>
                When engineering documents and statutory manuals are ingested into the Knowledge Base, document chunking and vector embedding occur strictly in-browser using WebAssembly and WebGPU (via Transformers.js with quantized <code>all-MiniLM-L6-v2</code> models).
              </p>
              <p>
                No document text, excerpts, or vector vectors are ever transmitted across network boundaries. Semantic search is executed using client-side vector cosine dot-product kernels directly within the browser thread or local Web Worker.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 font-mono">
                <span className="text-emerald-400">04.</span>
                <span>Microphone &amp; Voice Intercept Telemetry</span>
              </h2>
              <p>
                When utilizing the local voice-to-UI command interface, audio streams from the workstation microphone are processed exclusively on the local client using an in-browser Whisper Web Worker model. Raw audio waveforms and voice transcripts are never stored permanently or broadcasted to any external speech-to-text service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 font-mono">
                <span className="text-emerald-400">05.</span>
                <span>Merkle Audit Ledger &amp; Regulatory Compliance</span>
              </h2>
              <p>
                To satisfy the strict chain-of-custody requirements of statutory industrial audits (including OSHA 1910.119 Process Safety Management and EPA RMP), INDRA logs critical engineering calculations and setpoint actions into an immutable SHA-256 Merkle tree.
              </p>
              <p>
                These audit records remain solely within the plant&apos;s internal perimeter and are accessible only to authorized plant personnel possessing valid physical workstation access.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 font-mono">
                <span className="text-emerald-400">06.</span>
                <span>Regulatory Standards Alignment</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="font-mono font-bold text-xs text-white">IEC 62443-4-2</div>
                  <p className="text-[11px] text-slate-400 mt-1">Technical security requirements for IACS components (data integrity &amp; air-gapped boundary enforcement).</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="font-mono font-bold text-xs text-white">NIST SP 800-82 Rev. 3</div>
                  <p className="text-[11px] text-slate-400 mt-1">Guide to Industrial Control Systems (ICS) Security, including isolation of supervisory OT networks.</p>
                </div>
              </div>
            </section>
          </div>

          {/* Action Footer */}
          <div className="pt-8 border-t border-slate-800 flex items-center justify-between">
            <Link
              href="/terms"
              className="text-xs font-mono text-slate-400 hover:text-white transition-colors"
            >
              Review Terms &amp; Conditions &rarr;
            </Link>
            <Link
              href="/workbench"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-semibold transition-colors shadow-xs"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Enter Sovereign Workbench</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-6 text-xs text-slate-500 font-mono">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <span>INDRA Sovereign AI &bull; Air-Gapped Workstation Distribution</span>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-slate-300">Home</Link>
            <Link href="/terms" className="hover:text-slate-300">Terms</Link>
            <Link href="/workbench" className="hover:text-slate-300">Workbench</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
