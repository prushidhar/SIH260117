'use client';

import Link from 'next/link';
import Image from 'next/image';
import { 
  ShieldCheck, 
  Terminal, 
  Cpu, 
  Scale, 
  Lock, 
  ArrowRight, 
  Layers, 
  Network, 
  Server, 
  HardDrive,
  CheckCircle2,
  Sun,
  Moon
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';

export default function LandingPage() {
  const { theme, toggleTheme } = useIndraStore();

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      {/* 1. Header / Navigation */}
      <header className="border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-shrink-0 shadow-xs">
              <Image 
                src="/logo.png" 
                alt="INDRA Logo" 
                fill 
                className="object-contain p-1"
                priority
              />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <span>INDRA</span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold">
                  v2.4.0
                </span>
              </div>
              <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">SOVEREIGN INDUSTRIAL WORKBENCH</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-mono font-medium text-slate-600 dark:text-slate-300">
            <a href="#architecture" className="hover:text-slate-900 dark:hover:text-white transition-colors">Architecture</a>
            <a href="#standards" className="hover:text-slate-900 dark:hover:text-white transition-colors">Standards Compliance</a>
            <a href="#air-gap" className="hover:text-slate-900 dark:hover:text-white transition-colors">Air-Gap Security</a>
            <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-900 dark:hover:text-white transition-colors">Terms</Link>
          </nav>

          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>

            <Link
              href="/workbench"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-semibold transition-colors shadow-xs"
            >
              <span>Launch Workbench</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-4xl space-y-6">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>IEC 62443-3-3 RESTRICTED &bull; 100% LOCAL LOOPBACK (127.0.0.1)</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              Sovereign Air-Gapped Industrial AI Workbench
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl font-sans">
              Deterministic calculation engines, multimodal ISA-5.1 P&amp;ID vision parsing, and tamper-evident Merkle audit ledgers running strictly on local workstation hardware with zero external network egress.
            </p>

            {/* Direct Action Hub */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href="/workbench"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs transition-colors shadow-xs"
              >
                <Terminal className="w-4 h-4" />
                <span>Open Agent Workbench</span>
              </Link>
              <Link
                href="/canvas"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-mono font-bold text-xs transition-colors"
              >
                <Network className="w-4 h-4" />
                <span>Open Spatial Canvas (2D Nodes)</span>
              </Link>
              <Link
                href="/audit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 font-mono font-medium text-xs transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                <span>Audit Ledger</span>
              </Link>
            </div>
          </div>

          {/* Real Architecture Specs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12 pt-12 border-t border-slate-200 dark:border-slate-800/80">
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <Scale className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>Calculation Engine</span>
              </div>
              <div className="text-base font-bold text-slate-900 dark:text-white font-mono">ASME B31.3 Eq. 3a</div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Deterministic Barlow formula solver with statutory corrosion allowances and joint factors.</p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Vector RAG Embeddings</span>
              </div>
              <div className="text-base font-bold text-slate-900 dark:text-white font-mono">384d In-Browser WASM</div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Local feature extraction via Transformers.js with cosine similarity in IndexedDB.</p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Audit Trail Security</span>
              </div>
              <div className="text-base font-bold text-slate-900 dark:text-white font-mono">SHA-256 Merkle Chain</div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Immutable cryptographic parent-block hashing with zero possibility of undetected tampering.</p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Network Containment</span>
              </div>
              <div className="text-base font-bold text-slate-900 dark:text-white font-mono">0 WAN Egress (Air-Gap)</div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Strict loopback binding on 127.0.0.1. Zero external telemetry, API tokens, or cloud dependency.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Engineering Capabilities & Technical Architecture */}
      <section id="architecture" className="py-16 sm:py-20 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mb-12">
            <span className="text-xs font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">Subsystem Breakdown</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
              Deterministic Engineering &amp; Sovereign OT Architecture
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              Unlike generic chatbot wrappers that hallucinate engineering calculations, INDRA enforces strict separation between probabilistic natural language synthesis and deterministic math execution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column 1: Deterministic Solvers */}
            <div className="p-6 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-md bg-emerald-50 dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
                  <Terminal className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Deterministic Math Containers</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Engineering math runs in an isolated Python 3 sandbox inside local AST execution gates. The LLM never computes formulas directly; it structures input parameters and calls audited statutory solvers.
                </p>
                <div className="p-3 rounded-md bg-slate-900 dark:bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-400 space-y-1">
                  <div># ASME B31.3 Eq. 3a Calculation</div>
                  <div>t_min = (P * D) / (2 * (S * E + P * Y))</div>
                  <div className="text-slate-500"># Result verified: t_min = 0.382 in</div>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 text-xs font-mono text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                <span>Zero Hallucination Tolerance</span>
              </div>
            </div>

            {/* Column 2: Computer Vision P&ID Parsing */}
            <div className="p-6 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-md bg-cyan-50 dark:bg-slate-800 border border-cyan-200 dark:border-slate-700 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-4">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Multimodal P&amp;ID Schematic Vision</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Vector WebGL canvas parses high-resolution piping and instrumentation diagrams. Automatically localizes ISA-5.1 tags, isolates equipment loops, and visualizes live sensor telemetry overlays.
                </p>
                <div className="p-3 rounded-md bg-slate-900 dark:bg-slate-950 border border-slate-800 font-mono text-[11px] text-cyan-300 space-y-1">
                  <div>Tag: HX-4201 [Heat Exchanger]</div>
                  <div>Sensor: PT-101 [3.20 MPa / Normal]</div>
                  <div className="text-slate-500">Bounding Box: [x: 420, y: 180, w: 260]</div>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 text-xs font-mono text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                <span>ISA-5.1 Tag Hit-Testing</span>
              </div>
            </div>

            {/* Column 3: Cryptographic Merkle Ledger */}
            <div className="p-6 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-md bg-amber-50 dark:bg-slate-800 border border-amber-200 dark:border-slate-700 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Merkle Audit &amp; HITL Sign-Off</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Every tool execution, parameter override, and statutory note is chained into a SHA-256 Merkle tree. Critical plant setpoints require explicit human-in-the-loop sign-off before transmission.
                </p>
                <div className="p-3 rounded-md bg-slate-900 dark:bg-slate-950 border border-slate-800 font-mono text-[11px] text-amber-300 space-y-1">
                  <div>Block #4: ASME_CALCULATION</div>
                  <div>Root: SHA256:7f83b165...</div>
                  <div className="text-slate-500">Sign-Off: Plant Superintendent</div>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 text-xs font-mono text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>Tamper-Evident Proof Chain</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Statutory Standards Compliance Architecture */}
      <section id="standards" className="py-16 sm:py-20 border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mb-10">
            <span className="text-xs font-mono font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Statutory Engineering Alignment</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
              Supported Industry Standards &amp; Codes
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              Deliverables and calculations are explicitly mapped to recognized statutory engineering standards (ASME, API, ISO, IEC, NFPA) applied across power stations, chemical and pharmaceutical plants, advanced manufacturing, utility networks, and heavy process infrastructure.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">ASME B31.3 / B31.1</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">Piping Design</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Deterministic solvers for process and power piping wall thickness, Barlow equation, allowable stresses (A106 Gr B, 316L SS), design temp de-rating, and thermal expansion loops.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">ASME Sec I / Sec VIII</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">Boilers &amp; Vessels</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Thermosiphon boiler circulation ratios, steam drum quality, DNB departure limits, and pressure vessel MAWP shell, head, and conical reducer transitions per UG-27/UG-32.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">API 570 / API 653</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">Asset Integrity</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Remaining useful life (RUL) modeling based on ultrasonic survey thickness data, short-term vs long-term corrosion rates, and statutory inspection intervals.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">ISA-5.1 &amp; IEC 62443</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">Instrumentation &amp; OT</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Standardized tag identification and loop diagrams for sensors, control valves, and interlocks on P&amp;IDs, aligned with air-gapped ICS security perimeter zoning.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">ISO 10816-3 &amp; ISO 1940</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">Rotating Dynamics</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Evaluation of machine vibration velocity RMS harmonics across Zones A to D for pumps, motors, and turbines, plus dual-plane dynamic rotor balance quality limits.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">IEC 61511 &amp; NFPA 68/70E</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">Functional Safety</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                SIL verification Markov PFDavg calculations for safety instrumented systems, arc flash incident energy boundary analysis, and silo deflagration vent sizing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Air-Gap & Security Architecture Section */}
      <section id="air-gap" className="py-16 sm:py-20 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mb-10">
            <span className="text-xs font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">Cybersecurity &amp; Containment</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
              Zero External Egress Guarantee
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              Designed specifically for critical infrastructure where sovereign data cannot leave plant perimeter firewalls.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <HardDrive className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-3" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">Local-First IndexedDB</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Chat histories, vector embeddings, and tool deliverables reside on the operator&apos;s physical disk using Dexie.js IndexedDB storage.
              </p>
            </div>

            <div className="p-5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <Server className="w-5 h-5 text-cyan-600 dark:text-cyan-400 mb-3" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">Loopback Binding</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                The FastAPI execution daemon strictly binds to loopback interface <code>127.0.0.1:8000</code>. No public network interface is ever opened.
              </p>
            </div>

            <div className="p-5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 mb-3" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">No Cloud Telemetry</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Zero analytic beacons, error trackers, or third-party cloud SDKs. All Whisper voice models and MiniLM embeddings execute in-browser via WebGPU/WASM.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Direct Action Section */}
      <section className="py-16 sm:py-20 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Access the Sovereign Workbench</h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
              Launch into the active agent conversation, explore the infinite 2D spatial canvas, inspect the local knowledge base, or audit cryptographic event blocks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/workbench"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs transition-colors shadow-xs"
            >
              <span>Launch Agent Workbench</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/canvas"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-mono font-bold text-xs transition-colors shadow-xs"
            >
              <span>Spatial Canvas</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 7. Industrial Operational Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-10 text-xs text-slate-600 dark:text-slate-400 font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-5 h-5 rounded overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <Image src="/logo.png" alt="INDRA" fill className="object-contain p-0.5" />
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-300">INDRA Sovereign Industrial AI</span>
            <span className="text-slate-400 dark:text-slate-600">&bull;</span>
            <span className="text-slate-500">Air-Gapped Workstation Distribution</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
              Terms &amp; Conditions
            </Link>
            <Link href="/workbench" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
              Workbench
            </Link>
            <Link href="/audit" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
              Audit Ledger
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
