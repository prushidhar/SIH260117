'use client';

import { useEffect, useRef, useState } from 'react';
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
  Volume2,
  VolumeX
} from 'lucide-react';
import { isSoundEnabled, toggleSound, playSuccessChirp } from '@/lib/sound/sovereign-audio';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import VoiceCommandButton from '@/components/voice/VoiceCommandButton';
import VoiceTranscriptOverlay from '@/components/voice/VoiceTranscriptOverlay';
import { useVoiceCommandContext } from '@/providers/VoiceCommandProvider';
import { useCrossWindowSync } from '@/hooks/useCrossWindowSync';
import { multiWindowSync } from '@/lib/sync/multi-window-sync';

const navLabels: Record<string, string> = {
  workbench: 'Agent Workbench',
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

  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    setSoundOn(isSoundEnabled());
  }, []);

  const { isNative, appInfo } = useNativeBridge();
  const voiceCommand = useVoiceCommandContext();
  useCrossWindowSync();
  const prevApprovalsCount = useRef(pendingApprovals.length);

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

  // Determine active navigation segment from current pathname
  const activeNav: 'workbench' | 'kb' | 'audit' = pathname.startsWith('/kb')
    ? 'kb'
    : pathname.startsWith('/audit')
    ? 'audit'
    : 'workbench';

  // Synchronize store activeNav with current route for backward compatibility
  useEffect(() => {
    setActiveNav(activeNav);
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
      {/* 1. Top Sovereign Header Bar - Modern Glassmorphic AI Doodle Style */}
      <header className="h-16 bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between px-5 text-xs z-50">
        {/* Left: App Title & Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
            <img 
              src="/logo.png" 
              alt="INDRA" 
              className="w-full h-full object-contain" 
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-zinc-100 tracking-wider text-base">INDRA</span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/50 font-semibold">
                SYSTEM ONLINE
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400">Industrial Neural Decision & Reasoning Assistant</div>
          </div>
        </div>

        {/* Right: Theme Toggle & Voice & Status */}
        <div className="flex items-center gap-3 text-xs">
          {/* Theme Switcher Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer font-medium"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs text-amber-300">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-xs text-indigo-700">Dark Mode</span>
              </>
            )}
          </button>

          {/* Sovereign Audio Annunciator Toggle */}
          <button
            onClick={() => {
              const next = toggleSound();
              setSoundOn(next);
              if (next) playSuccessChirp();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer font-medium text-xs shadow-2xs"
            title={soundOn ? 'Sovereign Audio Annunciator: ON (Click to Mute)' : 'Sovereign Audio Annunciator: MUTED (Click to Enable)'}
          >
            {soundOn ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline text-xs text-emerald-700 dark:text-emerald-400 font-mono">Audio ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                <span className="hidden sm:inline text-xs text-slate-400 dark:text-zinc-500 font-mono">Muted</span>
              </>
            )}
          </button>

          {/* Voice Command Mic Button */}
          <VoiceCommandButton />

          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-medium text-xs text-slate-800 dark:text-zinc-200">On-Premise</span>
          </div>

          {isNative && (
            <Badge variant="violet" className="py-1 px-2.5">
              ELECTRON DESKTOP
            </Badge>
          )}
        </div>
      </header>

      {/* 2. Secondary Navigation Toolbar */}
      <div className="h-10 bg-white/75 dark:bg-zinc-950/80 backdrop-blur-md border-b border-slate-200/70 dark:border-zinc-800/70 flex items-center justify-between px-4 text-xs">
        {/* Left: Sidebar toggle & Active View Label */}
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleSidebar}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-900 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            title="Toggle Left Sidebar"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800" />
          <span className="text-slate-700 dark:text-zinc-200 text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100/70 dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 font-mono">
            {navLabels[activeNav] || 'Agent Workbench'}
          </span>
        </div>

        {/* Right: Quick Pitch Deck Download */}
        <div className="flex items-center gap-2">
          <a
            href="http://localhost:8000/api/sih/pitch-deck"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[11px] font-mono font-bold transition-all shadow-2xs cursor-pointer"
            title="Export official 6-slide Smart India Hackathon 2026 Presentation (.pptx)"
          >
            <Presentation className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Export SIH Pitch Deck (6 Slides)</span>
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
