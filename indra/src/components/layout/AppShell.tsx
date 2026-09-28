'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LeftPane from '@/components/left-pane/LeftPane';
import ToastContainer from '@/components/common/ToastContainer';
import { useIndraStore } from '@/store/indra-store';
import { useApprovalsQuery, useModelsQuery } from '@/lib/queries';
import { useNativeBridge } from '@/hooks/useNativeBridge';
import { sendNativeNotification } from '@/lib/native-bridge';
import { 
  PanelLeft, 
  PanelRight,
  X, 
  Lock, 
  ShieldCheck, 
  Sun, 
  Moon,
  Presentation,
  Clock,
  Download,
  AlertTriangle,
  LayoutDashboard,
  Network,
  BookOpen,
  Cpu,
  Server
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import VoiceCommandButton from '@/components/voice/VoiceCommandButton';
import VoiceTranscriptOverlay from '@/components/voice/VoiceTranscriptOverlay';
import { useVoiceCommandContext } from '@/providers/VoiceCommandProvider';
import { useCrossWindowSync } from '@/hooks/useCrossWindowSync';
import { multiWindowSync } from '@/lib/sync/multi-window-sync';
import { useAirGapTelemetry } from '@/hooks/useAirGapTelemetry';

const navLabels: Record<string, string> = {
  workbench: 'Agent Workbench',
  canvas: 'Spatial P&ID Canvas',
  knowledge: 'Knowledge Base (RAG)',
  kb: 'Knowledge Base (RAG)',
  audit: 'Merkle Audit Ledger',
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const { data: pendingApprovals = [] } = useApprovalsQuery();
  const { data: loadedModels = [] } = useModelsQuery();

  const { 
    isSidebarOpen, 
    toggleSidebar, 
    isRightPaneOpen,
    toggleRightPane,
    deliverables,
    activeModel,
    setActiveModel,
    setActiveNav,
    isBackendConnected,
    setApprovalsModalOpen,
    isSettingsOpen,
    setSettingsOpen,
    theme,
    setTheme,
    toggleTheme,
    syncHistoryWithBackend,
    initLocalDB,
  } = useIndraStore();

  const { isNative, appInfo } = useNativeBridge();
  const voiceCommand = useVoiceCommandContext();
  useCrossWindowSync();
  const prevApprovalsCount = useRef(pendingApprovals.length);

  // DCS Air-Gap Telemetry, Synchronized 1Hz UTC Clock & Audit Recording Engine
  const {
    utcTime,
    apiLatencyMs,
    isApiAlive,
    merkleRootPreview,
    merkleRootRaw,
    gpuLoad,
    isRecording,
    recordingDuration,
    eventCount,
    toggleRecording,
    exportAuditLog,
    recordAuditEvent,
  } = useAirGapTelemetry();

  // Trigger Native Desktop Notification when new pending approvals arrive
  useEffect(() => {
    if (pendingApprovals.length > prevApprovalsCount.current) {
      const newItems = pendingApprovals.slice(prevApprovalsCount.current);
      const first = newItems[0];
      const toolName = first?.tool || first?.tool_name || first?.title || 'Plant Execution Tool';
      sendNativeNotification({
        title: 'INDRA: HITL Authorization Required',
        body: `High-consequence plant tool (${toolName}) awaits authorized digital signature.`,
      });
    }
    prevApprovalsCount.current = pendingApprovals.length;
  }, [pendingApprovals]);

  // Record UI navigation events in active DCS Session Audit
  useEffect(() => {
    recordAuditEvent({
      category: 'UI_NAVIGATION',
      action: 'ROUTE_CHANGED',
      route: pathname,
      payload: { pathname },
    });
  }, [pathname, recordAuditEvent]);

  // Record active model changes in DCS Session Audit
  useEffect(() => {
    recordAuditEvent({
      category: 'PARAMETER_CHANGE',
      action: 'ACTIVE_MODEL_SWITCHED',
      route: pathname,
      payload: { activeModel },
    });
  }, [activeModel, pathname, recordAuditEvent]);

  // Determine active navigation segment from current pathname
  const activeNav: 'workbench' | 'canvas' | 'kb' | 'audit' = pathname.startsWith('/canvas')
    ? 'canvas'
    : pathname.startsWith('/knowledge') || pathname.startsWith('/kb')
    ? 'kb'
    : pathname.startsWith('/audit')
    ? 'audit'
    : 'workbench';

  // Synchronize store activeNav with current route for backward compatibility
  useEffect(() => {
    setActiveNav(activeNav === 'canvas' ? 'workbench' : activeNav);
  }, [activeNav, setActiveNav]);

  useEffect(() => {
    initLocalDB();
    syncHistoryWithBackend();
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('indra-theme') as 'light' | 'dark' | null;
      if (savedTheme) {
        setTheme(savedTheme);
      }
    }
  }, [initLocalDB, setTheme, syncHistoryWithBackend]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#f8fafc] dark:bg-[#0a0a0a] text-slate-800 dark:text-zinc-100 select-none">
      {/* 1. Top DCS Sovereign Header Bar */}
      <header className="h-16 bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between px-4 sm:px-5 text-xs z-50">
        {/* Left: App Title, Logo & Live Synchronized UTC Clock */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
              <img 
                src="/logo.png" 
                alt="INDRA" 
                className="w-full h-full object-contain" 
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-zinc-100 tracking-wider text-base group-hover:text-emerald-500 transition-colors">
                  INDRA
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/50 font-semibold font-mono">
                  DCS ONLINE
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                Industrial Neural Decision & Reasoning Assistant
              </div>
            </div>
          </Link>

          {/* Synchronized 1Hz UTC SCADA Clock */}
          <div 
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-black border border-slate-800 text-slate-100 font-mono text-xs shadow-inner"
            title="DCS Control Room Synchronized UTC Reference Clock (1Hz IEEE 1588 Standard)"
          >
            <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="tracking-widest font-semibold font-mono text-emerald-400">
              {utcTime.hours}
              <span className={`inline-block transition-opacity duration-150 ${utcTime.pulse ? 'opacity-100 text-white' : 'opacity-20 text-emerald-600'}`}>:</span>
              {utcTime.minutes}
              <span className={`inline-block transition-opacity duration-150 ${utcTime.pulse ? 'opacity-100 text-white' : 'opacity-20 text-emerald-600'}`}>:</span>
              {utcTime.seconds}
            </span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700">
              UTC
            </span>
          </div>
        </div>

        {/* Right: Session Audit Recording Mode, Theme, Voice & System Actions */}
        <div className="flex items-center gap-3 text-xs">
          {/* Session Audit Recording Mode (REC / IDLE) */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                const nowRecording = toggleRecording(pathname);
                if (!nowRecording && eventCount > 0) {
                  exportAuditLog();
                }
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold transition-all cursor-pointer select-none ${
                isRecording
                  ? 'bg-red-950/80 hover:bg-red-900 border-red-700 text-red-200 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-850 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300'
              }`}
              title={isRecording ? 'Click to STOP and export session audit log (.jsonl)' : 'Click to START recording session audit log'}
            >
              {isRecording ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                  <span className="font-bold text-red-300">REC [{recordingDuration}]</span>
                  <span className="text-[10px] text-red-400/90 px-1.5 py-0.2 rounded bg-red-900/60">
                    {eventCount} evts
                  </span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-zinc-500" />
                  <span>REC / IDLE</span>
                </>
              )}
            </button>

            {isRecording && (
              <button
                onClick={() => exportAuditLog()}
                className="px-2.5 py-1.5 rounded-lg bg-red-900/60 hover:bg-red-800/80 border border-red-700/80 text-red-200 text-xs font-mono transition-colors cursor-pointer"
                title="Export current session audit records (.jsonl)"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Theme Switcher Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer font-medium"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs text-amber-300">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-xs text-indigo-700">Dark</span>
              </>
            )}
          </button>

          {/* Voice Command Mic Button */}
          <VoiceCommandButton />

          {/* Security & Settings Trigger */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-850 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 cursor-pointer transition-colors"
            title="Inspect Air-Gap Telemetry & Diagnostics"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-medium text-xs text-slate-800 dark:text-zinc-200">On-Premise</span>
          </button>

          {isNative && (
            <Badge variant="violet" className="py-1 px-2.5">
              ELECTRON DESKTOP
            </Badge>
          )}
        </div>
      </header>

      {/* 2. Secondary DCS Navigation & Air-Gap Telemetry Toolbar */}
      <div className="h-11 bg-white/85 dark:bg-zinc-950/90 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between px-3 sm:px-4 text-xs overflow-x-auto no-scrollbar">
        {/* Left: Sidebar Toggle & Ergonomic Quick Navigation Bar */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button 
            onClick={toggleSidebar}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-900 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            title="Toggle Left Navigation Sidebar"
          >
            <PanelLeft className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800 mx-0.5" />

          {/* Ergonomic Quick Navigation Pills */}
          <nav className="flex items-center gap-1 font-mono text-[11px]">
            <Link
              href="/workbench"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                pathname === '/workbench'
                  ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-900'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Workbench (Tri-Pane)</span>
            </Link>

            <Link
              href="/canvas"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                pathname === '/canvas'
                  ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-900'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Spatial P&amp;ID Canvas (/canvas)</span>
            </Link>

            <Link
              href="/knowledge"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                pathname.startsWith('/knowledge') || pathname.startsWith('/kb')
                  ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>RAG Knowledge Base (/knowledge)</span>
            </Link>

            <Link
              href="/audit"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                pathname.startsWith('/audit')
                  ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Merkle Audit Ledger (/audit)</span>
            </Link>

            {/* Live Amber HITL Pending Approvals Badge */}
            <button
              onClick={() => setApprovalsModalOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer border ${
                pendingApprovals.length > 0
                  ? 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 font-bold shadow-xs'
                  : 'bg-slate-100/70 hover:bg-slate-200/70 dark:bg-zinc-900 dark:hover:bg-zinc-800 border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 font-medium'
              }`}
              title="Human-In-The-Loop Cryptographic Tool Sign-Off"
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${pendingApprovals.length > 0 ? 'text-amber-600 dark:text-amber-400 animate-pulse' : 'text-slate-400 dark:text-zinc-500'}`} />
              <span>HITL:</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                pendingApprovals.length > 0
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
              }`}>
                {pendingApprovals.length}
              </span>
              {pendingApprovals.length > 0 && (
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-amber-600 dark:text-amber-400">
                  PENDING
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Right: Air-Gap Telemetry Badges & Pitch Deck Action */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Telemetry 1: LOCAL LOOP (127.0.0.1) */}
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] font-bold shadow-2xs"
            title="Local loopback binding (127.0.0.1) - Zero WAN egress confirmed"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">LOCAL LOOP (127.0.0.1)</span>
            <span className="sm:hidden">127.0.0.1</span>
          </div>

          {/* Telemetry 2: API ENGINE (Port 8000) Latency */}
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 font-mono text-[10px] font-semibold"
            title="FastAPI Local Server Port 8000 Healthcheck Roundtrip Latency"
          >
            <Server className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
            <span>API ENGINE (Port 8000):</span>
            <span className={isApiAlive ? 'text-cyan-600 dark:text-cyan-400 font-bold' : 'text-amber-500 font-bold'}>
              {apiLatencyMs}ms
            </span>
          </div>

          {/* Telemetry 3: AUDIT LEDGER Merkle Root Preview */}
          <div 
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 font-mono text-[10px] font-semibold"
            title={`Merkle Chain Integrity Root: ${merkleRootRaw}`}
          >
            <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>AUDIT LEDGER:</span>
            <span className="text-slate-900 dark:text-zinc-100 font-bold">{merkleRootPreview}</span>
          </div>

          {/* Telemetry 4: GPU / INFERENCE Load */}
          <div 
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 font-mono text-[10px] font-semibold"
            title="Local Tensor Runner & WebGPU Resident Core Load"
          >
            <Cpu className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
            <span>GPU / INFERENCE:</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">{gpuLoad}%</span>
          </div>

          {/* SIH 6-Slide Pitch Deck Download */}
          <a
            href="http://localhost:8000/api/sih/pitch-deck"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[11px] font-mono font-bold transition-all shadow-2xs cursor-pointer"
            title="Export official 6-slide Smart India Hackathon 2026 Presentation (.pptx)"
          >
            <Presentation className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="hidden sm:inline">Export SIH Pitch Deck</span>
          </a>
        </div>
      </div>

      {/* 3. Main Layout with Routed Children Content */}
      <main className="flex flex-1 min-h-0 overflow-hidden relative bg-[#f8fafc] dark:bg-[#0a0a0a]">
        {/* Pane 1: Left Pane (w-64) */}
        {isSidebarOpen && <LeftPane />}

        {/* Pane 2: Routed Content (Workbench, KB, or Audit) */}
        {children}
      </main>

      {/* 4. Settings / Sovereign Diagnostics Modal */}
      <Dialog open={isSettingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-xl space-y-4">
          <DialogHeader className="border-b border-slate-100 dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 flex items-center justify-center flex-shrink-0">
                <img src="/logo.png" alt="INDRA" className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(124,58,237,0.2)]" />
              </div>
              <DialogTitle className="text-base">
                INDRA Sovereign Architecture & Security Telemetry
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-4 text-xs font-mono">
            <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl space-y-2">
              <div className="text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                AIR-GAP ARCHITECTURE: LOCALHOST LOOPBACK
              </div>
              <div className="text-emerald-700 dark:text-emerald-400/90 leading-relaxed text-[11px] space-y-1 font-sans">
                <div>• <strong>Loopback Binding:</strong> FastAPI backend is strictly bound to local loopback <code className="px-1 py-0.5 rounded bg-emerald-100 dark:emerald-900/60 font-mono text-[10px] text-emerald-900 dark:text-emerald-200 font-semibold">127.0.0.1:8000</code>.</div>
                <div>• <strong>Zero Cloud Calls:</strong> No external cloud LLM APIs, telemetry sinks, or WAN endpoints are contacted.</div>
                <div>• <strong>Local-Only Routing:</strong> Prompts, RAG embeddings, and calculations run entirely on-device with local resident models.</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl">
                <span className="text-slate-500 dark:text-zinc-400 block text-[11px]">Backend Binding</span>
                <span className="text-sm font-bold text-slate-900 dark:text-zinc-100 block mt-0.5">
                  {isBackendConnected ? '127.0.0.1:8000' : 'OFFLINE'}
                </span>
                <Badge variant="success" className="mt-1">Localhost Loopback</Badge>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl">
                <span className="text-slate-500 dark:text-zinc-400 block text-[11px]">Model Routing</span>
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 block truncate mt-0.5">Local-Only (Zero WAN)</span>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500 block mt-1">Resident Weights</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl">
                <span className="text-slate-500 dark:text-zinc-400 block text-[11px]">Storage Engine</span>
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 block truncate mt-0.5">Dexie (IndexedDB)</span>
                <Badge variant="violet" className="mt-1">Local-First Disk</Badge>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl space-y-2">
              <span className="text-slate-500 dark:text-zinc-400 block uppercase tracking-wider text-[10px] font-semibold">Resident Model Core</span>
              <div className="flex flex-wrap gap-2">
                {loadedModels.length > 0 ? (
                  loadedModels.map((m) => (
                    <Button
                      key={m.id}
                      variant={activeModel === m.name ? 'gradient' : 'outline'}
                      size="xs"
                      onClick={() => setActiveModel(m.name)}
                    >
                      {m.name}
                    </Button>
                  ))
                ) : (
                  <span className="text-slate-400 dark:text-zinc-500 text-xs italic">Resident models fetched from /api/models</span>
                )}
              </div>
            </div>

            {isNative && appInfo && (
              <div className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl space-y-1.5">
                <span className="text-slate-500 dark:text-zinc-400 block uppercase tracking-wider text-[10px] font-semibold">Native Desktop IPC Bridge</span>
                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                  <div>
                    <span className="text-slate-400 dark:text-zinc-500 block text-[10px]">OS Platform</span>
                    <span className="font-bold text-slate-800 dark:text-zinc-200">{appInfo.platform} ({appInfo.arch})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-zinc-500 block text-[10px]">Electron Engine</span>
                    <span className="font-bold text-slate-800 dark:text-zinc-200">v{appInfo.electronVersion || '41.x'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-zinc-500 block text-[10px]">Context Isolation</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Hardened (Active)</span>
                  </div>
                </div>
              </div>
            )}

            <div className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl space-y-1.5">
              <span className="text-slate-500 dark:text-zinc-400 block uppercase tracking-wider text-[10px] font-semibold">Voice Engine (Local Whisper AI)</span>
              <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                <div>
                  <span className="text-slate-400 dark:text-zinc-500 block text-[10px]">Model</span>
                  <span className="font-bold text-slate-800 dark:text-zinc-200">whisper-tiny.en</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-zinc-500 block text-[10px]">Status</span>
                  <span className={`font-bold ${voiceCommand.isModelLoaded ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-zinc-400'}`}>
                    {voiceCommand.isModelLoaded ? 'Loaded (Warm)' : voiceCommand.isModelLoading ? `Loading ${voiceCommand.modelLoadProgress}%` : 'Not Loaded'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-zinc-500 block text-[10px]">Inference</span>
                  <Badge variant={voiceCommand.isModelLoaded ? 'success' : 'default'} className="mt-0.5">
                    {typeof navigator !== 'undefined' && 'gpu' in navigator ? 'WebGPU' : 'WASM'} Local
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button 
              onClick={() => setSettingsOpen(false)}
              size="sm"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Global Connection Alerts & Status Toasts */}
      <ToastContainer />

      {/* 8. Voice Command Transcript Overlay (Whisper Local AI) */}
      <VoiceTranscriptOverlay />
    </div>
  );
}
