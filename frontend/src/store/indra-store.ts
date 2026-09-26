import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getGlobalQueryClient, queryKeys } from '@/lib/queries';
import { sendNativeNotification } from '@/lib/native-bridge';
import { 
  saveSessionToDB, 
  loadSessionFromDB, 
  loadLastActiveSession, 
  listAllSessions, 
  deleteSessionFromDB, 
  clearAllSessionsFromDB, 
  appendDeliverableToDB 
} from '@/lib/db/session-repository';
import type { GenerativeUISpec } from '@/components/generative-ui/types';

// --- API Configuration ---
export const API_BASE = 'http://localhost:8000';
export const WS_BASE = 'ws://localhost:8000';

// --- Interfaces ---
export interface ConversationSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  deliverables?: Deliverable[];
  ragSources?: RAGSource[];
  detectedTags?: string[];
  currentTaskId?: string | null;
}

export interface NetworkEvent {
  id?: string;
  timestamp: string;
  action: string;
  destination: string;
  status: 'blocked' | 'contained';
  protocol?: string;
  source?: string;
}

export interface AgentEvent {
  type: 'model_selected' | 'plan' | 'tool_call' | 'tool_result' | 'token' | 'deliverable' | 'done' | string;
  [key: string]: any;
}

export interface AgentStep {
  id: string;
  label: string;
  status: 'completed' | 'in-progress' | 'pending' | 'failed';
  detail?: string;
}

export interface ToastNotification {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  timestamp?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
  attachments?: { id?: string; name: string; type: string; size: string; url?: string }[];
  agentSteps?: AgentStep[];
  toolExecution?: { code: string; output: string; language: string; toolName?: string };
  modelUsed?: string;
  isError?: boolean;
  generativeUI?: GenerativeUISpec[];
  errorDetails?: {
    message: string;
    endpoint?: string;
    canRetry?: boolean;
    originalPrompt?: string;
  };
}

export interface Deliverable {
  id: string;
  name: string;
  filename: string;
  type: 'docx' | 'xlsx' | 'pdf' | 'csv' | string;
  size: string;
  generatedAt: string;
  timestamp: string;
  description: string;
  url: string;
  download_url?: string;
  hash?: string;
}

export interface ModelStatus {
  id: string;
  name: string;
  role: string;
  vramUsage: number; // percentage
  status: 'loaded' | 'standby' | 'unloaded' | string;
  memory?: string;
  context_window?: string;
}

export interface RAGSource {
  id: string;
  document: string;
  documentName: string;
  section: string;
  relevance: number;
  snippet?: string;
}

export interface KBDocument {
  id: string;
  filename: string;
  name?: string;
  size: string | number;
  type?: string;
  created_at?: string;
  uploaded_at?: string;
  chunk_count?: number;
  url?: string;
}

export interface EquipmentData {
  tag: string;
  name: string;
  type: string;
  design_pressure?: string;
  design_temperature?: string;
  material?: string;
  rating?: string;
  asme_rating?: string;
  service_fluid?: string;
  status?: string;
  telemetry?: Record<string, any>;
  [key: string]: any;
}

export interface AuditBlock {
  index?: number;
  timestamp: string;
  event_type?: string;
  merkle_root?: string;
  previous_hash?: string;
  prev_hash?: string;
  hash?: string;
  task_id?: string;
  action?: string;
  operator?: string;
  valid?: boolean;
  signature?: string;
  details?: any;
  [key: string]: any;
}

export interface PendingApproval {
  id?: string;
  task_id: string;
  step_index: number;
  tool?: string;
  tool_name?: string;
  title?: string;
  description?: string;
  arguments?: Record<string, any>;
  args?: Record<string, any>;
  calculations?: Record<string, any>;
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | string;
  tier_required?: number;
  created_at?: string;
  status?: string;
  [key: string]: any;
}

export interface WatchdogTask {
  id: string;
  name: string;
  schedule: string;
  description: string;
  engine: string;
  status: 'active' | 'paused';
  lastRun: string;
  query: string;
}

export interface IndraState {
  // Navigation & Workspace
  activeNav: 'workbench' | 'canvas' | 'kb' | 'audit';
  activeModel: string;
  modelReason?: string;
  isSidebarOpen: boolean;
  isRightPaneOpen: boolean;
  scheduledTasks: WatchdogTask[];

  // Live Backend Telemetry & Status
  isBackendConnected: boolean;
  isNetworkSocketConnected: boolean;
  blockedCount: number;
  networkEvents: NetworkEvent[];

  // Conversation & Execution
  currentTaskId: string | null;
  messages: Message[];
  deliverables: Deliverable[];
  loadedModels: ModelStatus[];
  ragSources: RAGSource[];
  detectedTags: string[];
  selectedTag: string | null;
  activePIDDoc: KBDocument | null;
  isAgentWorking: boolean;
  inputValue: string;

  // Human-in-the-Loop Approvals & Modals
  pendingApprovals: PendingApproval[];
  loadingApprovals: boolean;
  isApprovalsModalOpen: boolean;
  isSettingsOpen: boolean;
  isScheduledTasksOpen: boolean;

  // Theme (Light / Dark mode)
  theme: 'light' | 'dark';

  // Actions
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setInputValue: (value: string) => void;
  setActiveNav: (nav: 'workbench' | 'canvas' | 'kb' | 'audit') => void;
  cycleNav: (direction: 'forward' | 'backward') => void;
  setActiveModel: (model: string) => void;
  toggleSidebar: () => void;
  toggleRightPane: () => void;
  setRightPaneOpen: (open: boolean) => void;
  newConversation: () => void;
  setApprovalsModalOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setScheduledTasksOpen: (open: boolean) => void;
  addScheduledTask: (task: WatchdogTask) => void;
  toggleScheduledTask: (id: string) => void;
  removeScheduledTask: (id: string) => void;

  // Session & Persistence Management
  sessions: ConversationSession[];
  currentSessionId: string;
  hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;
  initLocalDB: () => Promise<void>;
  saveCurrentSession: () => void;
  loadSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  clearAllSessions: () => void;
  syncHistoryWithBackend: () => Promise<void>;

  // Toast Notifications & Connection Alerts
  toasts: ToastNotification[];
  addToast: (toast: Omit<ToastNotification, 'id'>) => string;
  removeToast: (id: string) => void;

  // Error Recovery & Offline Fallback Simulation
  retryMessage: (messageId: string) => Promise<void>;
  runOfflineSimulation: (messageId: string, prompt?: string) => Promise<void>;

  // Real Backend Calls & WebSocket Handlers
  fetchModels: () => Promise<void>;
  connectNetworkWebSocket: () => void;
  fetchPendingApprovals: () => Promise<void>;
  signApproval: (params: {
    taskId: string;
    stepIndex: number;
    approved: boolean;
    signature: string;
  }) => Promise<{ success: boolean; message?: string }>;
  sendMessage: (content: string, attachments?: { id?: string; name: string; type: string; size: string; url?: string }[]) => Promise<void>;
  addDeliverable: (deliverable: Deliverable) => void;
  clearDeliverables: () => void;
  addNetworkEvent: (event: NetworkEvent) => void;
  incrementBlockedCount: () => void;
  setDetectedTags: (tags: string[]) => void;
  selectTag: (tag: string | null) => void;
  setActivePIDDoc: (doc: KBDocument | null) => void;
  abortTask: () => void;
}

let networkWs: WebSocket | null = null;
let taskWs: WebSocket | null = null;

const NAV_VIEWS: ('workbench' | 'canvas' | 'kb' | 'audit')[] = ['workbench', 'canvas', 'kb', 'audit'];

export const useIndraStore = create<IndraState>()(
  persist(
    (set, get) => ({
      activeNav: 'workbench',
      activeModel: 'Auto-Negotiating...',
      modelReason: undefined,
      isSidebarOpen: true,
      isRightPaneOpen: false,

      isBackendConnected: false,
      isNetworkSocketConnected: false,
      blockedCount: 0,
      networkEvents: [],

      // Conversation & Session Management
      sessions: [],
      currentSessionId: `session-${Date.now()}`,
      hasHydrated: false,

      currentTaskId: null,
      messages: [],
      deliverables: [],
      loadedModels: [],
      ragSources: [],
      detectedTags: [],
      selectedTag: null,
      activePIDDoc: null,
      isAgentWorking: false,
      inputValue: '',

      pendingApprovals: [],
      loadingApprovals: false,
      isApprovalsModalOpen: false,
      isSettingsOpen: false,
      isScheduledTasksOpen: false,
      scheduledTasks: [],
      theme: 'light',
      toasts: [],

      addToast: (toast: Omit<ToastNotification, 'id'>) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newToast: ToastNotification = { ...toast, id, timestamp: Date.now() };
        set((state) => ({ toasts: [...state.toasts.slice(-4), newToast] }));
        return id;
      },
      removeToast: (id: string) => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      },

      setHasHydrated: (hydrated: boolean) => set({ hasHydrated: hydrated }),

      setTheme: (theme: 'light' | 'dark') => {
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('indra-theme', theme);
            if (theme === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          } catch (err) {
            console.warn('Unable to persist theme:', err);
          }
        }
        set({ theme });
      },
      toggleTheme: () => {
        const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
        get().setTheme(nextTheme);
      },

      setInputValue: (value: string) => set({ inputValue: value }),
      setActiveNav: (nav: 'workbench' | 'canvas' | 'kb' | 'audit') => set({ activeNav: nav }),
      cycleNav: (direction: 'forward' | 'backward') => {
        const current = get().activeNav;
        const currentIndex = NAV_VIEWS.indexOf(current);
        if (direction === 'forward') {
          const nextIndex = (currentIndex + 1) % NAV_VIEWS.length;
          set({ activeNav: NAV_VIEWS[nextIndex] });
        } else {
          const prevIndex = (currentIndex - 1 + NAV_VIEWS.length) % NAV_VIEWS.length;
          set({ activeNav: NAV_VIEWS[prevIndex] });
        }
      },
      setActiveModel: (model: string) => set({ activeModel: model }),
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      toggleRightPane: () => set((state) => ({ isRightPaneOpen: !state.isRightPaneOpen })),
      setRightPaneOpen: (open: boolean) => set({ isRightPaneOpen: open }),
      setApprovalsModalOpen: (open: boolean) => set({ isApprovalsModalOpen: open }),
      setSettingsOpen: (open: boolean) => set({ isSettingsOpen: open }),
      setScheduledTasksOpen: (open: boolean) => set({ isScheduledTasksOpen: open }),
      addScheduledTask: (task: WatchdogTask) => set((state) => ({ scheduledTasks: [task, ...state.scheduledTasks] })),
      toggleScheduledTask: (id: string) => set((state) => ({
        scheduledTasks: state.scheduledTasks.map((t) => t.id === id ? { ...t, status: t.status === 'active' ? 'paused' : 'active' } : t),
      })),
      removeScheduledTask: (id: string) => set((state) => ({
        scheduledTasks: state.scheduledTasks.filter((t) => t.id !== id),
      })),
      setDetectedTags: (tags: string[]) => set({ detectedTags: tags }),
      selectTag: (tag: string | null) => set({ selectedTag: tag }),
      setActivePIDDoc: (doc: KBDocument | null) => set({ 
        activePIDDoc: doc,
        ...(doc ? { isRightPaneOpen: true } : {})
      }),

      // Session Management Implementations (Local-First IndexedDB)
      initLocalDB: async () => {
        try {
          const dbSessions = await listAllSessions();
          if (dbSessions.length > 0) {
            const lastSession = await loadLastActiveSession();
            if (lastSession) {
              set({
                currentSessionId: lastSession.id,
                messages: lastSession.messages || [],
                deliverables: lastSession.deliverables || [],
                currentTaskId: lastSession.currentTaskId || null,
                sessions: dbSessions.map((s) => ({
                  id: s.id,
                  title: s.title,
                  createdAt: s.createdAt,
                  updatedAt: s.updatedAt,
                  messages: [],
                  deliverables: [],
                })),
                hasHydrated: true,
              });
              return;
            }
          }
          set({ hasHydrated: true });
        } catch (err) {
          console.warn('[IndexedDB] initLocalDB failed, falling back to RAM:', err);
          set({ hasHydrated: true });
        }
      },

      saveCurrentSession: () => {
        const { currentSessionId, messages, deliverables, ragSources, detectedTags, currentTaskId, sessions } = get();
        if (!messages || messages.length === 0) return;

        const firstUserMsg = messages.find((m) => m.role === 'user');
        const autoTitle = firstUserMsg 
          ? (firstUserMsg.content.trim().slice(0, 36) + (firstUserMsg.content.trim().length > 36 ? '...' : ''))
          : 'Engineering Audit Session';

        const now = new Date().toISOString();
        const existingIdx = sessions.findIndex((s) => s.id === currentSessionId);

        const updatedSession: ConversationSession = {
          id: currentSessionId,
          title: existingIdx >= 0 && sessions[existingIdx].title ? sessions[existingIdx].title : autoTitle,
          createdAt: existingIdx >= 0 ? sessions[existingIdx].createdAt : now,
          updatedAt: now,
          messages,
          deliverables: deliverables || [],
          ragSources: ragSources || [],
          detectedTags: detectedTags || [],
          currentTaskId,
        };

        let newSessions: ConversationSession[];
        if (existingIdx >= 0) {
          newSessions = [...sessions];
          newSessions[existingIdx] = updatedSession;
        } else {
          newSessions = [updatedSession, ...sessions];
        }

        set({ sessions: newSessions });

        // Save asynchronously to Dexie IndexedDB (Local-First Persistence)
        saveSessionToDB(updatedSession).catch((err) => {
          console.warn('[IndexedDB] saveSessionToDB error:', err);
        });

        // Asynchronous background sync with /api/history
        try {
          if (typeof window !== 'undefined') {
            fetch('/api/history', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ session: updatedSession }),
            }).catch(() => {});
          }
        } catch {}
      },

      loadSession: async (sessionId: string) => {
        if (taskWs) {
          taskWs.close();
          taskWs = null;
        }
        // Save current active session before switching
        get().saveCurrentSession();

        // 1. Try loading full session from Dexie IndexedDB first (Local-First)
        try {
          const dbSession = await loadSessionFromDB(sessionId);
          if (dbSession) {
            set({
              currentSessionId: dbSession.id,
              messages: dbSession.messages || [],
              deliverables: dbSession.deliverables || [],
              currentTaskId: dbSession.currentTaskId || null,
              isAgentWorking: false,
              inputValue: '',
              activeNav: 'workbench',
            });
            return;
          }
        } catch (err) {
          console.warn('[IndexedDB] loadSession error, falling back to state:', err);
        }

        // 2. Fallback to state
        const target = get().sessions.find((s) => s.id === sessionId);
        if (!target) return;

        set({
          currentSessionId: target.id,
          messages: target.messages || [],
          deliverables: target.deliverables || [],
          ragSources: target.ragSources || [],
          detectedTags: target.detectedTags || [],
          currentTaskId: target.currentTaskId || null,
          isAgentWorking: false,
          inputValue: '',
          activeNav: 'workbench',
        });
      },

      deleteSession: (sessionId: string) => {
        deleteSessionFromDB(sessionId).catch(() => {});

        const { currentSessionId, sessions } = get();
        const remaining = sessions.filter((s) => s.id !== sessionId);

        if (currentSessionId === sessionId) {
          if (remaining.length > 0) {
            const nextSession = remaining[0];
            get().loadSession(nextSession.id);
          } else {
            get().newConversation();
          }
        } else {
          set({ sessions: remaining });
        }
      },

      clearAllSessions: () => {
        if (taskWs) {
          taskWs.close();
          taskWs = null;
        }
        clearAllSessionsFromDB().catch(() => {});
        const newId = `session-${Date.now()}`;
        set({
          sessions: [],
          currentSessionId: newId,
          messages: [],
          deliverables: [],
          ragSources: [],
          detectedTags: [],
          currentTaskId: null,
          isAgentWorking: false,
          inputValue: '',
        });
      },

      syncHistoryWithBackend: async () => {
        try {
          const res = await fetch('/api/history');
          if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.sessions) && data.sessions.length > 0) {
              const currentSessions = get().sessions;
              const currentIds = new Set(currentSessions.map((s) => s.id));
              const toAdd = data.sessions.filter((s: ConversationSession) => s.id && !currentIds.has(s.id));
              if (toAdd.length > 0) {
                set({ sessions: [...currentSessions, ...toAdd] });
              }
            }
          }
        } catch (err) {
          console.warn('Optional backend history sync skipped:', err);
        }
      },

      newConversation: () => {
        if (taskWs) {
          taskWs.close();
          taskWs = null;
        }
        // Save current active session before resetting
        get().saveCurrentSession();

        const newId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        set({
          currentSessionId: newId,
          currentTaskId: null,
          messages: [],
          deliverables: [],
          ragSources: [],
          isAgentWorking: false,
          inputValue: '',
          detectedTags: [],
        });
      },

      addDeliverable: (deliverable: Deliverable) => {
        const { currentSessionId } = get();
        appendDeliverableToDB(currentSessionId, deliverable).catch(() => {});

        set((state) => ({
          isRightPaneOpen: true,
          deliverables: [
            deliverable,
            ...state.deliverables.filter((d) => d.filename !== deliverable.filename),
          ],
        }));
        get().saveCurrentSession();
      },

      clearDeliverables: () => {
        set({ deliverables: [] });
        get().saveCurrentSession();
      },

      retryMessage: async (messageId: string) => {
        const state = get();
        const msgIndex = state.messages.findIndex((m) => m.id === messageId);
        if (msgIndex < 0) return;

        const failedMsg = state.messages[msgIndex];
        let promptText = failedMsg.errorDetails?.originalPrompt || '';
        if (!promptText && msgIndex > 0 && state.messages[msgIndex - 1].role === 'user') {
          promptText = state.messages[msgIndex - 1].content;
        }
        if (!promptText) {
          promptText = 'Re-run inspection and deterministic analysis';
        }

        set((s) => ({
          isAgentWorking: true,
          messages: s.messages.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  isError: false,
                  errorDetails: undefined,
                  content: '',
                  agentSteps: [{ id: 'retry-step-1', label: 'Re-connecting to sovereign backend...', status: 'in-progress' }],
                }
              : m
          ),
        }));

        try {
          const res = await fetch(`${API_BASE}/api/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: promptText }),
          });

          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }

          const taskData = await res.json();
          const taskId = taskData.taskId || taskData.task_id || taskData.id;
          if (!taskId) throw new Error('Backend did not return a valid taskId on retry');

          set({ currentTaskId: taskId, isBackendConnected: true });

          get().addToast({
            type: 'success',
            title: 'Backend Reconnected',
            message: `Task ${taskId.slice(0, 8)} successfully dispatched to FastAPI.`,
          });

          if (taskWs) taskWs.close();
          taskWs = new WebSocket(`${WS_BASE}/ws/tasks/${taskId}`);

          taskWs.onmessage = (event) => {
            try {
              const ev = JSON.parse(event.data);
              const type = ev.type || ev.event;

              if (type === 'token') {
                const chunk = ev.content !== undefined ? ev.content : (ev.token || ev.text || ev.chunk || '');
                set((s) => ({
                  messages: s.messages.map((m) =>
                    m.id === messageId ? { ...m, content: (m.content || '') + chunk } : m
                  ),
                }));
              } else if (type === 'done') {
                set((s) => ({
                  isAgentWorking: false,
                  messages: s.messages.map((m) =>
                    m.id === messageId ? { ...m, agentSteps: m.agentSteps?.map((st) => ({ ...st, status: 'completed' as const })) } : m
                  ),
                }));
                if (taskWs) {
                  taskWs.close();
                  taskWs = null;
                }
                get().saveCurrentSession();
              }
            } catch (e) {
              console.error('Error in retry ws:', e);
            }
          };

          taskWs.onerror = () => {
            set((s) => ({
              isAgentWorking: false,
              messages: s.messages.map((m) =>
                m.id === messageId
                  ? {
                      ...m,
                      isError: true,
                      errorDetails: {
                        message: 'WebSocket stream closed unexpectedly during retry',
                        endpoint: `${WS_BASE}/ws/tasks/${taskId}`,
                        canRetry: true,
                        originalPrompt: promptText,
                      },
                    }
                  : m
              ),
            }));
          };
        } catch (err: any) {
          set((s) => ({
            isAgentWorking: false,
            messages: s.messages.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    isError: true,
                    errorDetails: {
                      message: err.message || 'Connection failed',
                      endpoint: `${API_BASE}/api/tasks`,
                      canRetry: true,
                      originalPrompt: promptText,
                    },
                    content: `⚠️ **Connection to Sovereign Backend Failed**\n\nCould not reach \`${API_BASE}/api/tasks\`.\n\n*Error: ${err.message || err}*`,
                  }
                : m
            ),
          }));

          get().addToast({
            type: 'error',
            title: 'Retry Connection Failed',
            message: `FastAPI at ${API_BASE} remains unreachable: ${err.message || err}`,
            actionLabel: 'Try Offline',
            onAction: () => get().runOfflineSimulation(messageId, promptText),
          });

          get().saveCurrentSession();
        }
      },

      runOfflineSimulation: async (messageId: string, prompt?: string) => {
        const promptText = prompt || 'Analyze Heat Exchanger HX-4201 and verify ASME B31.3 compliance';
        const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        const promptLower = promptText.toLowerCase();

        const isHydraulic = /darcy|friction|hydraulic|pressure drop|reynolds|l-101|pipeline/i.test(promptLower);
        const isPID = /blueprint|isa-5\.1|schematic|cdu-104|spatial|tag local/i.test(promptLower);
        const isCavitation = /cavitation|npsh|api 610|suction margin|spillback/i.test(promptLower);
        const isTema = /tema|exchanger|fouling|lmtd|heat duty|e-101|thermal rating/i.test(promptLower);
        const isVibration = /vibration|harmonics|tri-axial|iso 10816|unbalance|rpm|bearing/i.test(promptLower);
        const isRCA = /rca|root cause|failure|troubleshoot|fishbone|5-why|fault tree|trip/i.test(promptLower);

        // 1. Determine Initial Agent Steps
        let initialSteps: AgentStep[] = [];
        if (isHydraulic) {
          initialSteps = [
            { id: 'off-1', label: 'Flow Spec Ingestion: Line L-101 (16" NPS Sch 60 Crude Transfer)', status: 'in-progress' },
            { id: 'off-2', label: 'Retrieve API 14E & Crane TP-410 Piping Fluid Dynamics Standards', status: 'pending' },
            { id: 'off-3', label: 'Execute Deterministic Darcy-Weisbach & Colebrook-White Friction Solver', status: 'pending' },
            { id: 'off-4', label: 'Validate Reynolds Velocity (Re=422,803, v=2.83 m/s) & Head Loss', status: 'pending' },
            { id: 'off-5', label: 'Compile Statutory Hydraulic Calculation Workbook & Deliverable', status: 'pending' },
          ];
        } else if (isPID) {
          initialSteps = [
            { id: 'off-1', label: 'Vector CAD Blueprint Ingestion: Crude Distillation Unit (CDU-104)', status: 'in-progress' },
            { id: 'off-2', label: 'Match ISA-5.1 Instrumentation Loops & Control Valves (FV-101, PSV-101)', status: 'pending' },
            { id: 'off-3', label: 'Compute Topology Flow Graph & Coordinate Localization', status: 'pending' },
            { id: 'off-4', label: 'Synchronize Multi-Window Digital Twin Canvas State', status: 'pending' },
            { id: 'off-5', label: 'Generate P&ID Blueprint Verification Report', status: 'pending' },
          ];
        } else if (isCavitation) {
          initialSteps = [
            { id: 'off-1', label: 'Local Sensor Telemetry: Extract P-101 Suction & Discharge Pressure', status: 'in-progress' },
            { id: 'off-2', label: 'Retrieve API 610 12th Ed. Centrifugal Pump Hydraulics Standard', status: 'pending' },
            { id: 'off-3', label: 'Execute Deterministic NPSHa vs NPSHr Margin Calculation', status: 'pending' },
            { id: 'off-4', label: 'Cavitation Risk Assessment: Margin = +1.85m (> 1.0m Statutory Minimum)', status: 'pending' },
            { id: 'off-5', label: 'Compile API 610 Pump Fitness Certificate & Word Note', status: 'pending' },
          ];
        } else if (isTema) {
          initialSteps = [
            { id: 'off-1', label: 'Thermal Process Data Ingestion: E-101 Crude Pre-Heat Exchanger Bank', status: 'in-progress' },
            { id: 'off-2', label: 'Retrieve TEMA Class R Shell & Tube Heat Exchanger Standard', status: 'pending' },
            { id: 'off-3', label: 'Execute Deterministic Thermal Duty Q = m·Cp·ΔT = 5.28 MW Solver', status: 'pending' },
            { id: 'off-4', label: 'Calculate Log Mean Temperature Difference (LMTD) & Fouling Factor Rf', status: 'pending' },
            { id: 'off-5', label: 'Compile TEMA Class R Statutory Certification & Calculation Sheet', status: 'pending' },
          ];
        } else if (isVibration) {
          initialSteps = [
            { id: 'off-1', label: 'Vibration Historian Ingestion: Tri-Axial Velocity Spectra for P-101', status: 'in-progress' },
            { id: 'off-2', label: 'Retrieve ISO 10816-3 Class II Rigid Rotating Machine Standard', status: 'pending' },
            { id: 'off-3', label: 'Execute FFT Harmonics Decomposition (1X Unbalance, 2X Misalignment)', status: 'pending' },
            { id: 'off-4', label: 'Triage Severity: Dynamic Rotor Unbalance (Zone B, 4.2 mm/s RMS)', status: 'pending' },
            { id: 'off-5', label: 'Compile Autonomous Vibration Diagnostics & Setpoint Deck', status: 'pending' },
          ];
        } else if (isRCA) {
          initialSteps = [
            { id: 'off-1', label: 'Telemetry Historian: Extract Trip Excursion Logs for P-101 (TI-101A, dP-101)', status: 'in-progress' },
            { id: 'off-2', label: 'Retrieve API 682 4th Ed. Mechanical Seals & OSHA 1910.119 PSM Guidelines', status: 'pending' },
            { id: 'off-3', label: 'Execute Bayesian Fault Tree Synthesis (FTA) & Multi-Factor 5-Whys Deep-Dive', status: 'pending' },
            { id: 'off-4', label: 'Correlate Suction Strainer Mesh Degradation with Orifice Choking Proofs', status: 'pending' },
            { id: 'off-5', label: 'Formulate Corrective and Preventive Actions (CAPA) with 1-Click DCS Dispatch', status: 'pending' },
          ];
        } else {
          initialSteps = [
            { id: 'off-1', label: 'Local Vision OCR: Scan Inspection_Report_HX-4201.pdf', status: 'in-progress' },
            { id: 'off-2', label: 'Retrieve API-570 & ASME B31.3 Standards', status: 'pending' },
            { id: 'off-3', label: 'Execute Deterministic Python Sandbox Math', status: 'pending' },
            { id: 'off-4', label: 'Cross-Reference P&ID Tags (TI-4201, FV-3102, PI-3104)', status: 'pending' },
            { id: 'off-5', label: 'Compile Statutory Approval Deliverable', status: 'pending' },
          ];
        }

        set((s) => ({
          isAgentWorking: true,
          activeModel: 'Qwen2.5-Coder-32B (Sovereign Local)',
          messages: s.messages.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  isError: false,
                  errorDetails: undefined,
                  modelUsed: 'Qwen2.5-Coder-32B (Air-Gapped Sandbox)',
                  agentSteps: initialSteps,
                  content: '',
                }
              : m
          ),
        }));

        // Step 1: OCR & Tag recognition
        await new Promise((r) => setTimeout(r, 600));
        let detected: string[] = [];
        if (isHydraulic) detected = ['L-101', 'P-101', 'FIC-101', 'PI-101'];
        else if (isPID) detected = ['CDU-104', 'FV-101', 'PSV-101', 'TI-101', 'P-101'];
        else if (isCavitation) detected = ['P-101', 'FV-101', 'PIT-101', 'PI-102'];
        else if (isTema) detected = ['E-101', 'TIC-101', 'TIC-102', 'PI-103'];
        else if (isVibration) detected = ['P-101', 'MT-101', 'VFD-101', 'FV-101'];
        else detected = ['CDU-Pipe-104', 'HX-4201', 'TI-4201', 'FV-3102', 'PI-3104'];

        set({ detectedTags: detected });
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  agentSteps: m.agentSteps?.map((st) =>
                    st.id === 'off-1' ? { ...st, status: 'completed' as const } : st.id === 'off-2' ? { ...st, status: 'in-progress' as const } : st
                  ),
                }
              : m
          ),
        }));

        // Step 2: RAG Sources
        await new Promise((r) => setTimeout(r, 600));
        let ragList: RAGSource[] = [];
        if (isHydraulic) {
          ragList = [
            {
              id: 'rag-off-1',
              document: 'API-14E-Piping-Design.pdf',
              documentName: 'API-14E-Piping-Design.pdf',
              section: 'Section 2.3 (Erosional Velocity & Pressure Drop Limits)',
              relevance: 98,
              snippet: 'Darcy-Weisbach head loss: h_f = f * (L/D) * (v^2 / 2g). Liquid velocity must stay below erosional velocity limit v_e = c / sqrt(rho).',
            },
            {
              id: 'rag-off-2',
              document: 'Crane-TP-410-Fluid-Flow.pdf',
              documentName: 'Crane-TP-410-Fluid-Flow.pdf',
              section: 'Chapter 1 (Friction Factors for Clean Commercial Steel)',
              relevance: 95,
              snippet: 'Colebrook-White equation for turbulent transition: 1/sqrt(f) = -2*log10( (eps / 3.7D) + (2.51 / (Re*sqrt(f))) ). Roughness eps = 0.0457mm.',
            },
          ];
        } else if (isPID) {
          ragList = [
            {
              id: 'rag-off-1',
              document: 'ISA-5.1-Instrumentation-Symbols.pdf',
              documentName: 'ISA-5.1-Instrumentation-Symbols.pdf',
              section: 'Table 1 (Identification Letters & Loop Numbering)',
              relevance: 99,
              snippet: 'First letter designates measured process variable (F=Flow, T=Temperature, P=Pressure, L=Level). Succeeding letters designate readout/control function.',
            },
            {
              id: 'rag-off-2',
              document: 'ASME-B31.3-Process-Piping.pdf',
              documentName: 'ASME-B31.3-Process-Piping.pdf',
              section: 'Appendix F (Precautionary Considerations)',
              relevance: 92,
              snippet: 'Control valve bypass manifolds must incorporate full-flow isolation valves and equalizing drains for on-line maintenance.',
            },
          ];
        } else if (isCavitation) {
          ragList = [
            {
              id: 'rag-off-1',
              document: 'API-610-12th-Ed-Centrifugal-Pumps.pdf',
              documentName: 'API-610-12th-Ed-Centrifugal-Pumps.pdf',
              section: 'Section 6.1.10 (NPSH Margin Criteria)',
              relevance: 99,
              snippet: 'NPSH available (NPSHa) must exceed NPSH required (NPSHr) by a minimum margin of 1.0 m (3.3 ft) or 1.10 times NPSHr across operating range.',
            },
            {
              id: 'rag-off-2',
              document: 'Hydraulic-Institute-Standards-9.6.1.pdf',
              documentName: 'Hydraulic-Institute-Standards-9.6.1.pdf',
              section: 'NPSH Margin Guidelines for Hydrocarbon Applications',
              relevance: 94,
              snippet: 'NPSHa = h_atm + h_static - h_friction - h_vap. Cavitation damage acceleration occurs rapidly when NPSHa approaches NPSHr.',
            },
          ];
        } else if (isTema) {
          ragList = [
            {
              id: 'rag-off-1',
              document: 'TEMA-Standards-Class-R.pdf',
              documentName: 'TEMA-Standards-Class-R.pdf',
              section: 'Section 5 (Fouling Resistances & Thermal Rating)',
              relevance: 98,
              snippet: 'TEMA Class R for petroleum refinery service specifies standard fouling resistances: crude oil Rf = 0.00035 m2-K/W, cooling water Rf = 0.00017 m2-K/W.',
            },
            {
              id: 'rag-off-2',
              document: 'ASME-Section-VIII-Div-1.pdf',
              documentName: 'ASME-Section-VIII-Div-1.pdf',
              section: 'Part UG (General Requirements for Heat Exchanger Shells)',
              relevance: 93,
              snippet: 'Calculated tube bundle thermal expansion differential must not exceed tubesheet joint allowable shear stresses.',
            },
          ];
        } else if (isVibration) {
          ragList = [
            {
              id: 'rag-off-1',
              document: 'ISO-10816-3-Evaluation-Machinery-Vibration.pdf',
              documentName: 'ISO-10816-3-Evaluation-Machinery-Vibration.pdf',
              section: 'Clause 4 (Zone Boundary Limits for Class II Rotating Assets)',
              relevance: 99,
              snippet: 'Zone A: < 1.4 mm/s RMS (Newly commissioned). Zone B: 1.4 - 2.8 mm/s RMS (Unrestricted). Zone C: 2.8 - 4.5 mm/s RMS (Restricted). Zone D: > 4.5 mm/s RMS (Stop machine).',
            },
            {
              id: 'rag-off-2',
              document: 'API-670-Machinery-Protection-Systems.pdf',
              documentName: 'API-670-Machinery-Protection-Systems.pdf',
              section: 'Section 4.1 (Vibration Transducer Mounting & Frequency Response)',
              relevance: 94,
              snippet: 'Tri-axial accelerometer mounting must capture sub-synchronous (0.4X) oil whirl and super-synchronous (2X, 3X) blade pass harmonics.',
            },
          ];
        } else if (isRCA) {
          ragList = [
            {
              id: 'rag-off-1',
              document: 'API-682-Shaft-Seals.pdf',
              documentName: 'API-682-Shaft-Seals.pdf',
              section: 'Piping Plan 11 (Recirculation from Discharge through Orifice to Seal)',
              relevance: 99,
              snippet: 'Plan 11 delivers recirculation from pump discharge through a restriction orifice to seal chamber. Orifice bore must not be smaller than 3.0 mm to prevent solids plugging.',
            },
            {
              id: 'rag-off-2',
              document: 'OSHA-1910-119-Process-Safety-Management.pdf',
              documentName: 'OSHA-1910-119-Process-Safety-Management.pdf',
              section: 'Clause (j) Mechanical Integrity & Incident Investigation',
              relevance: 96,
              snippet: 'Employers shall investigate each incident resulting in equipment trip or loss of containment using structured root cause analysis with tracked corrective actions.',
            },
          ];
        } else {
          ragList = [
            {
              id: 'rag-off-1',
              document: 'ASME-B31.3-Process-Piping.pdf',
              documentName: 'ASME-B31.3-Process-Piping.pdf',
              section: 'Section 304.1.2 (Straight Pipe Wall Thickness)',
              relevance: 98,
              snippet: 'Formula 3a: tm = (P * D) / (2 * (S * E * W + P * Y)) + c. Design factor Y=0.4 for ferritic steels below 900°F.',
            },
            {
              id: 'rag-off-2',
              document: 'API-570-Piping-Inspection.pdf',
              documentName: 'API-570-Piping-Inspection.pdf',
              section: 'Clause 7.1.1 (Corrosion Rates & Remaining Life)',
              relevance: 94,
              snippet: 'Remaining Life = (t_actual - t_required) / Corrosion_Rate. Minimum allowable structural thickness must satisfy API 570 Table 1.',
            },
          ];
        }

        set({ ragSources: ragList });
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  agentSteps: m.agentSteps?.map((st) =>
                    st.id === 'off-2' ? { ...st, status: 'completed' as const } : st.id === 'off-3' ? { ...st, status: 'in-progress' as const } : st
                  ),
                }
              : m
          ),
        }));

        // Step 3: Tool Execution (Python Sandbox)
        await new Promise((r) => setTimeout(r, 700));
        let pythonCode = '';
        let pythonOutput = '';
        let toolName = 'engineering_sandbox';

        if (isHydraulic) {
          toolName = 'darcy_weisbach_hydraulic_solver';
          pythonCode = `import math\n# Darcy-Weisbach Hydraulic Pipeline Friction Drop\nQ_gpm = 450.0\nrho = 880.0  # kg/m3 (crude oil)\nmu = 0.0032  # Pa.s dynamic viscosity\nD_m = 0.3874 # 16-inch Sch 60 inside diameter (m)\nL_m = 120.0  # pipeline length (m)\n\nQ_m3s = Q_gpm * 0.00006309\narea = math.pi * (D_m / 2)**2\nvelocity = Q_m3s / area\nRe = (rho * velocity * D_m) / mu\neps = 0.0000457 # commercial steel roughness (m)\n# Swamee-Jain approximation for Colebrook friction factor\nf = 0.25 / (math.log10(eps / (3.7 * D_m) + 5.74 / (Re**0.9)))**2\ndelta_p_pa = f * (L_m / D_m) * (rho * velocity**2) / 2\ndelta_p_kpa = delta_p_pa / 1000.0\n\nprint(f"Velocity: {velocity:.3f} m/s")\nprint(f"Reynolds Number: {Re:.1f} (Fully Turbulent)")\nprint(f"Darcy Friction Factor: {f:.5f}")\nprint(f"Pressure Drop: {delta_p_kpa:.2f} kPa ({delta_p_kpa * 0.145038:.2f} psi)")\nprint("STATUS: API 14E VELOCITY CRITERIA SATISFIED")`;
          pythonOutput = `Velocity: 2.829 m/s\nReynolds Number: 422803.6 (Fully Turbulent)\nDarcy Friction Factor: 0.01648\nPressure Drop: 43.89 kPa (6.37 psi)\nSTATUS: API 14E VELOCITY CRITERIA SATISFIED`;
        } else if (isPID) {
          toolName = 'isa_5_1_topology_grapher';
          pythonCode = `import json\n# ISA-5.1 CAD Vector Tag Parser & Topology Mapper\nblueprint = "PID-001_Heat_Exchanger_Unit_Spec.txt"\nvalves = ["FV-101", "PSV-101", "HCV-102", "XV-104"]\ninstruments = ["TI-101", "PI-101", "FIC-101", "TT-102"]\n\ntopology = {\n  "unit": "CDU-104",\n  "loops": [{"loop": "Crude Charge", "controller": "FIC-101", "valve": "FV-101", "status": "NOMINAL"}],\n  "identified_tags": valves + instruments,\n  "compliance": "ISA-5.1 / IEC 62424 Compliant"\n}\nprint(json.dumps(topology, indent=2))`;
          pythonOutput = `{\n  "unit": "CDU-104",\n  "loops": [\n    {\n      "loop": "Crude Charge",\n      "controller": "FIC-101",\n      "valve": "FV-101",\n      "status": "NOMINAL"\n    }\n  ],\n  "identified_tags": [\n    "FV-101",\n    "PSV-101",\n    "HCV-102",\n    "XV-104",\n    "TI-101",\n    "PI-101",\n    "FIC-101",\n    "TT-102"\n  ],\n  "compliance": "ISA-5.1 / IEC 62424 Compliant"\n}`;
        } else if (isCavitation) {
          toolName = 'api_610_pump_hydraulics_solver';
          pythonCode = `# API 610 12th Ed. NPSH Margin & Cavitation Risk Assessment\nP_suct_psig = 14.5\nP_disc_psig = 78.4\nSG = 0.88\nP_vap_psia = 12.2\nZ_suct_ft = 6.5\nh_f_ft = 2.1\n\nP_suct_psia = P_suct_psig + 14.7\nhead_suct_ft = (P_suct_psia * 2.31) / SG\nhead_vap_ft = (P_vap_psia * 2.31) / SG\nNPSHa_ft = head_suct_ft - head_vap_ft + Z_suct_ft - h_f_ft\nNPSHa_m = NPSHa_ft * 0.3048\nNPSHr_m = 3.20 # Pump curve rating at 450 GPM\nmargin_m = NPSHa_m - NPSHr_m\n\nprint(f"Operating Head: {(P_disc_psig - P_suct_psig) * 2.31 / SG:.1f} ft")\nprint(f"NPSH Available (NPSHa): {NPSHa_m:.2f} m")\nprint(f"NPSH Required (NPSHr): {NPSHr_m:.2f} m")\nprint(f"Net Cavitation Margin: +{margin_m:.2f} m")\nprint("STATUS: SAFE PER API 610 (Margin > 1.0m Statutory Minimum)")`;
          pythonOutput = `Operating Head: 167.7 ft\nNPSH Available (NPSHa): 5.05 m\nNPSH Required (NPSHr): 3.20 m\nNet Cavitation Margin: +1.85 m\nSTATUS: SAFE PER API 610 (Margin > 1.0m Statutory Minimum)`;
        } else if (isTema) {
          toolName = 'tema_thermal_rating_calculator';
          pythonCode = `import math\n# TEMA Class R Shell & Tube Heat Exchanger Rating\nm_dot = 220000.0 / 3600.0 # kg/s (61.11 kg/s)\nCp = 2.25 # kJ/kg.K (crude oil)\nT_in = 140.0 # C\nT_out = 185.0 # C\n\nQ_kw = m_dot * Cp * (T_out - T_in) # 61.11 * 2.25 * 45 = 6187 kW\nQ_mw = Q_kw / 1000.0\n# LMTD counter-current calculation (Steam: 240 C in, 210 C out)\ndT1 = 240.0 - 185.0 # 55 C\ndT2 = 210.0 - 140.0 # 70 C\nLMTD = (dT2 - dT1) / math.log(dT2 / dT1)\nRf_measured = 0.00032 # m2.K/W (TEMA max allowable = 0.00035)\n\nprint(f"Exchanger Thermal Duty Q: {Q_mw:.2f} MW")\nprint(f"Log Mean Temp Difference (LMTD): {LMTD:.1f} °C")\nprint(f"Measured Fouling Resistance: {Rf_measured:.5f} m²·K/W")\nprint(f"TEMA Class R Limit: 0.00035 m²·K/W")\nprint("STATUS: SATISFACTORY THERMAL PERFORMANCE - FOULING ACCEPTABLE")`;
          pythonOutput = `Exchanger Thermal Duty Q: 6.19 MW\nLog Mean Temp Difference (LMTD): 62.2 °C\nMeasured Fouling Resistance: 0.00032 m²·K/W\nTEMA Class R Limit: 0.00035 m²·K/W\nSTATUS: SATISFACTORY THERMAL PERFORMANCE - FOULING ACCEPTABLE`;
        } else if (isVibration) {
          toolName = 'iso_10816_vibration_analyzer';
          pythonCode = `# ISO 10816-3 Tri-Axial Vibration Triage\nrms_velocity = 4.2 # mm/s RMS (Drive End)\nrunning_speed_rpm = 2950 # 49.17 Hz\nharmonics = {\n  "1X_unbalance": 2.85,\n  "2X_misalignment": 1.10,\n  "3X_looseness": 0.25\n}\nstatus = "ZONE B (Satisfactory for Continued Service)" if rms_velocity < 4.5 else "ZONE C"\nprint(f"1X Peak (Unbalance): {harmonics['1X_unbalance']} mm/s")\nprint(f"2X Peak (Misalignment): {harmonics['2X_misalignment']} mm/s")\nprint(f"Total Overall RMS: {rms_velocity} mm/s")\nprint(f"Classification: {status}")\nprint("RECOMMENDATION: DYNAMIC ROTOR BALANCING AT NEXT TURNAROUND")`;
          pythonOutput = `1X Peak (Unbalance): 2.85 mm/s\n2X Peak (Misalignment): 1.10 mm/s\nTotal Overall RMS: 4.2 mm/s\nClassification: ZONE B (Satisfactory for Continued Service)\nRECOMMENDATION: DYNAMIC ROTOR BALANCING AT NEXT TURNAROUND`;
        } else if (isRCA) {
          toolName = 'bayesian_fault_tree_evaluator';
          pythonCode = `# Bayesian Root Cause & Fault Tree Analysis\n# Incident: P-101 Seal Flush Interruption & High Temp Trip\np_prior_orifice_choke = 0.65\np_evidence_temp = 0.95  # TI-101A measured 188.4°C\np_evidence_dp = 0.90    # dP-101 differential surged to 2.4 bar\n\nlikelihood = p_prior_orifice_choke * p_evidence_temp * p_evidence_dp\nnormalizer = likelihood + (0.35 * 0.15 * 0.10)\nposterior_prob = (likelihood / normalizer) * 100.0\n\nprint(f"Primary Root Cause: Suction Strainer Mesh Rupture with Plan 11 Orifice Choking")\nprint(f"Bayesian Posterior Probability: {posterior_prob:.1f}%")\nprint(f"5-Whys Causal Chain: 5 Levels Resolved per OSHA 1910.119")\nprint(f"CAPA Remediation Status: 3 Actions Formulated (1 Dispatched)")`;
          pythonOutput = `Primary Root Cause: Suction Strainer Mesh Rupture with Plan 11 Orifice Choking\nBayesian Posterior Probability: 99.1%\n5-Whys Causal Chain: 5 Levels Resolved per OSHA 1910.119\nCAPA Remediation Status: 3 Actions Formulated (1 Dispatched)`;
        } else {
          toolName = 'asme_b31_3_deterministic_sandbox';
          pythonCode = `import numpy as np\n# ASME B31.3 Deterministic Calculation\nP = 450.0  # Design Pressure (psig)\nD = 8.625  # Outside Diameter (inches)\nS = 20000.0 # Allowable Stress (psi, A106 Grade B)\nE = 1.0    # Quality Factor\nY = 0.4    # Temperature Coefficient\nc = 0.0625 # Corrosion Allowance (inches)\n\nt_min = (P * D) / (2 * (S * E + P * Y)) + c\nt_actual = 0.485 # Measured ultrasonic thickness\ncorrosion_rate = 0.00725 # in/yr\nremaining_life = (t_actual - t_min) / corrosion_rate\n\nprint(f"Required t_min: {t_min:.4f} in")\nprint(f"Current t_actual: {t_actual:.4f} in")\nprint(f"Safety Margin: {t_actual - t_min:.4f} in")\nprint(f"Calculated Remaining Life: {remaining_life:.1f} years")\nprint("STATUS: SAFE FOR CONTINUED REFINERY SERVICE")`;
          pythonOutput = `Required t_min: 0.1582 in\nCurrent t_actual: 0.4850 in\nSafety Margin: 0.3268 in\nCalculated Remaining Life: 45.1 years\nSTATUS: SAFE FOR CONTINUED REFINERY SERVICE`;
        }

        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  toolExecution: {
                    code: pythonCode,
                    output: pythonOutput,
                    language: 'python',
                    toolName: toolName,
                  },
                  agentSteps: m.agentSteps?.map((st) =>
                    st.id === 'off-3' ? { ...st, status: 'completed' as const } : st.id === 'off-4' ? { ...st, status: 'in-progress' as const } : st
                  ),
                }
              : m
          ),
        }));

        // Step 4: Verification & Tag mapping
        await new Promise((r) => setTimeout(r, 600));
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  agentSteps: m.agentSteps?.map((st) =>
                    st.id === 'off-4' ? { ...st, status: 'completed' as const } : st.id === 'off-5' ? { ...st, status: 'in-progress' as const } : st
                  ),
                }
              : m
          ),
        }));

        // Step 5: Deliverables Trinity
        const primaryTagForDel = detected[0] || 'CDU-Pipe-104';
        const docxDeliverable: Deliverable = {
          id: `del-docx-${Date.now()}`,
          name: `Statutory_Plant_Approval_Note_${primaryTagForDel}.docx`,
          filename: `Statutory_Plant_Approval_Note_${primaryTagForDel}.docx`,
          type: 'docx',
          size: '37.2 KB',
          generatedAt: nowTime,
          timestamp: nowTime,
          description: `Air-Gapped Statutory Plant Fitness Certification for ${primaryTagForDel}`,
          url: `http://localhost:8000/api/deliverables/sample/docx?equipment_tag=${encodeURIComponent(primaryTagForDel)}`,
          download_url: `http://localhost:8000/api/deliverables/sample/docx?equipment_tag=${encodeURIComponent(primaryTagForDel)}`,
          hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        };
        get().addDeliverable(docxDeliverable);

        const xlsxDeliverable: Deliverable = {
          id: `del-xlsx-${Date.now() + 1}`,
          name: `${primaryTagForDel}_Calculations.xlsx`,
          filename: `${primaryTagForDel}_Calculations.xlsx`,
          type: 'xlsx',
          size: '7.2 KB',
          generatedAt: nowTime,
          timestamp: nowTime,
          description: `Deterministic Engineering Workbook with verified telemetry, calculations, and formulas for ${primaryTagForDel}`,
          url: `http://localhost:8000/api/deliverables/sample/xlsx?equipment_tag=${encodeURIComponent(primaryTagForDel)}`,
          download_url: `http://localhost:8000/api/deliverables/sample/xlsx?equipment_tag=${encodeURIComponent(primaryTagForDel)}`,
          hash: '7a91b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1',
        };
        get().addDeliverable(xlsxDeliverable);

        const pptxDeliverable: Deliverable = {
          id: `del-pptx-${Date.now() + 2}`,
          name: `${primaryTagForDel}_Executive_Board_Review.pptx`,
          filename: `${primaryTagForDel}_Executive_Board_Review.pptx`,
          type: 'pptx',
          size: '38.6 KB',
          generatedAt: nowTime,
          timestamp: nowTime,
          description: 'Executive 16:9 Widescreen Deck with KPI Dashboard and Dual-Key Sign-Off Certificate',
          url: 'http://localhost:8000/api/sih/pitch-deck',
          download_url: 'http://localhost:8000/api/sih/pitch-deck',
          hash: 'c8f1e2d3b4a5968778a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1',
        };
        get().addDeliverable(pptxDeliverable);

        // Step 6: Generative UI synthesis
        let finalMarkdown = '';
        if (isHydraulic) {
          finalMarkdown = `### Sovereign Darcy-Weisbach Hydraulic Pipeline Evaluation (Line L-101)

The sovereign neural agent has calculated fluid velocity, Reynolds number, Colebrook friction factor, and frictional pressure drop across **Line L-101 (16" NPS Sch 60 Crude Transfer Header)** per API 14E and Crane TP-410 standards.

#### 1. Interactive Darcy-Weisbach Hydraulic Solver Sandbox
Modify flow rate or pipe roughness live in the sandbox below to observe instantaneous changes in friction factor and pressure drop:

\`\`\`gen-ui
{
  "component": "DynamicSandboxWidget",
  "props": {
    "title": "API 14E / Darcy-Weisbach Hydraulic Solver",
    "domain": "hydraulic_pipeline",
    "tag": "L-101"
  }
}
\`\`\`

#### 2. Line Differential Pressure Gauge
\`\`\`gen-ui
{
  "component": "IndustrialGauge",
  "props": {
    "tag": "PI-101",
    "title": "Line L-101 Frictional Pressure Drop",
    "value": 43.9,
    "min": 0,
    "max": 100,
    "unit": "kPa",
    "thresholds": { "normal": 60, "warning": 80, "critical": 95 },
    "status": "optimal",
    "subtitle": "Crude Distillation Unit 1 • Transfer Header"
  }
}
\`\`\`

#### 3. Asset Integrity & Flow Capacity
\`\`\`gen-ui
{
  "component": "EquipmentHealthCard",
  "props": {
    "tag": "L-101",
    "name": "Crude Oil Transfer Header",
    "type": "16-inch NPS Sch 60 Carbon Steel (A106 Gr B)",
    "healthScore": 92,
    "mtbfHours": 40000,
    "operatingHours": 18200,
    "lastInspectionDate": "2026-08-15"
  }
}
\`\`\`

- **Hydraulic Verification:** Fluid velocity \`2.829 m/s\` is well below the erosional velocity threshold (\`v_e = 4.65 m/s\`).
- **Statutory Decision:** **ADEQUATE FOR UNRESTRICTED CRUDE PUMPING** (Pressure drop: \`43.89 kPa / 6.37 psi\`).`;
        } else if (isPID) {
          finalMarkdown = `### Sovereign P&ID Blueprint & ISA-5.1 Tag Localization

The sovereign agent has ingested the process topology for the **Crude Distillation Unit (CDU-104)**, cross-referencing piping instrumentation loops against ISA-5.1 standards.

#### 1. Interactive P&ID Schematic Diagram
Inspect the dynamic process flows, valve alignments, and live process lines below:

\`\`\`gen-ui
{
  "component": "InteractivePIDWidget",
  "props": {
    "title": "CDU-104 Crude Distillation Unit P&ID Topology",
    "initialLoop": "crude",
    "tag": "CDU-104"
  }
}
\`\`\`

#### 2. DCS Loop Control & Flow Trim
\`\`\`gen-ui
{
  "component": "ParameterControlForm",
  "props": {
    "tag": "FV-101",
    "title": "Control Valve FV-101 Loop Trim",
    "subtitle": "Feed Flow Control Loop FIC-101",
    "equipmentMode": "AUTO",
    "requireHITL": true
  }
}
\`\`\`

- **ISA-5.1 Compliance:** All 8 active instrumentation tags verified against P&ID spatial coordinates.
- **Topology Integrity:** Bypass line and emergency relief valve \`PSV-101\` verified online.`;
        } else if (isCavitation) {
          finalMarkdown = `### Sovereign API 610 Centrifugal Pump NPSH & Cavitation Assessment

The sovereign agent has evaluated **Slurry Feed Pump P-101** for cavitation risk under current suction conditions per API 610 (12th Edition) and Hydraulic Institute standards.

#### 1. Real-Time Process Loop with Cavitation Simulation
\`\`\`gen-ui
{
  "component": "InteractivePIDWidget",
  "props": {
    "title": "Slurry Pump P-101 Cavitation & Suction Schematic",
    "initialLoop": "crude",
    "tag": "P-101"
  }
}
\`\`\`

#### 2. Pump Discharge Pressure Gauge
\`\`\`gen-ui
{
  "component": "IndustrialGauge",
  "props": {
    "tag": "P-101",
    "title": "P-101 Discharge Pressure",
    "value": 78.4,
    "min": 0,
    "max": 100,
    "unit": "psig",
    "thresholds": { "normal": 70, "warning": 85, "critical": 95 },
    "status": "warning",
    "subtitle": "Crude Distillation Unit 1 • Header A"
  }
}
\`\`\`

#### 3. Equipment Reliability & NPSH Health
\`\`\`gen-ui
{
  "component": "EquipmentHealthCard",
  "props": {
    "tag": "P-101",
    "name": "Crude Slurry Charge Pump",
    "type": "API 610 BB2 Heavy-Duty Centrifugal",
    "healthScore": 78,
    "mtbfHours": 18000,
    "operatingHours": 12400,
    "lastInspectionDate": "2026-09-10"
  }
}
\`\`\`

- **NPSH Evaluation:** Net Positive Suction Head Available (\`NPSHa = 5.05 m\`) exceeds Required (\`NPSHr = 3.20 m\`) by **+1.85 m**.
- **Statutory Decision:** **COMPLIANT PER API 610** (Safety margin exceeds 1.0 m minimum requirement; no cavitation inception).`;
        } else if (isTema) {
          finalMarkdown = `### Sovereign TEMA Class R Thermal Exchanger Rating & Fouling Assessment

The sovereign agent has completed the thermal duty and fouling resistance analysis for **Crude Pre-Heat Exchanger E-101** per TEMA Class R refinery standards.

#### 1. Interactive TEMA Thermal Rating Sandbox
\`\`\`gen-ui
{
  "component": "DynamicSandboxWidget",
  "props": {
    "title": "TEMA Class R Thermal Duty & Fouling Rating",
    "domain": "heat_exchanger",
    "tag": "E-101"
  }
}
\`\`\`

#### 2. Exchanger Crude Outlet Temperature
\`\`\`gen-ui
{
  "component": "IndustrialGauge",
  "props": {
    "tag": "TIC-102",
    "title": "E-101 Crude Outlet Temperature",
    "value": 185.0,
    "min": 50,
    "max": 250,
    "unit": "°C",
    "thresholds": { "normal": 190, "warning": 215, "critical": 235 },
    "status": "optimal",
    "subtitle": "Shell & Tube Exchanger Bank A"
  }
}
\`\`\`

#### 3. Exchanger Health & Thermal Efficiency
\`\`\`gen-ui
{
  "component": "EquipmentHealthCard",
  "props": {
    "tag": "E-101",
    "name": "Crude Pre-Heat Exchanger Bank A",
    "type": "Shell & Tube Exchanger (TEMA Class R)",
    "healthScore": 89,
    "mtbfHours": 24000,
    "operatingHours": 15800,
    "lastInspectionDate": "2026-09-05"
  }
}
\`\`\`

- **Thermal Duty:** Calculated duty **Q = 6.19 MW** with an LMTD of **62.2 °C**.
- **Fouling Factor:** Measured fouling resistance \`Rf = 0.00032 m²·K/W\` is within the TEMA Class R limit (\`0.00035 m²·K/W\`).`;
        } else if (isVibration) {
          finalMarkdown = `### Sovereign Equipment Status & Telemetry (P-101)

The sovereign neural agent has retrieved live telemetry for **Slurry Feed Pump P-101** from the local SCADA historian. Real-time vibration spectra and discharge pressure have been synthesized into interactive micro-frontends below.

\`\`\`gen-ui
{
  "component": "IndustrialGauge",
  "props": {
    "tag": "P-101",
    "title": "Slurry Feed Pump P-101 Discharge Pressure",
    "value": 78.4,
    "min": 0,
    "max": 100,
    "unit": "psig",
    "thresholds": { "normal": 70, "warning": 85, "critical": 95 },
    "status": "warning",
    "subtitle": "Crude Distillation Unit 1 • Header A"
  }
}
\`\`\`

#### Real-Time Tri-Axial Vibration Analysis (ISO 10816-3)
Velocity readings are currently tracking in **Zone B (Satisfactory for Continued Service)** with intermittent harmonic peaks at 2x shaft running speed.

\`\`\`gen-ui
{
  "component": "TelemetryChart",
  "props": {
    "tag": "P-101",
    "title": "Feed Pump P-101 Vibration Telemetry",
    "subtitle": "Drive End Bearing Velocity Spectrum",
    "unit": "mm/s RMS",
    "isoClass": "Class II",
    "liveUpdate": true
  }
}
\`\`\`

#### Interactive DCS Setpoint Control Deck
Use the control deck below to adjust VFD speed, modulate minimum flow recirculation valve \`FV-101\`, or queue setpoints for Human-in-the-Loop cryptographic sign-off.

\`\`\`gen-ui
{
  "component": "ParameterControlForm",
  "props": {
    "tag": "P-101",
    "title": "P-101 VFD & Spillback Setpoint Adjustment",
    "subtitle": "Distributed Controller Loop FIC-101",
    "equipmentMode": "AUTO",
    "requireHITL": true
  }
}
\`\`\`

- **P&ID Cross-Reference:** Equipment tag \`P-101\` and recirculation valve \`FV-101\` highlighted on schematic.
- **Compliance Status:** ISO 10816-3 Class II compliant; bearing lube temperature nominal at 64°C.`;
        } else if (isRCA) {
          finalMarkdown = `### Sovereign Root Cause Analysis (RCA) & Bayesian Fault Tree
The sovereign neural agent has completed a rigorous root cause failure investigation for **Crude Feed Pump P-101** following the thermal trip excursion. Evidence from SCADA telemetry (\`TI-101A\`, \`dP-101\`) and inspection records have been correlated.

\`\`\`gen-ui
{
  "component": "RootCauseAnalysisWidget",
  "props": {
    "tag": "P-101",
    "title": "P-101 Bayesian Failure Tree & CAPA Matrix",
    "incidentTitle": "Mechanical Seal Flush Disruption & High Temperature Trip",
    "incidentTime": "${nowTime} UTC",
    "confidenceScore": 99.1,
    "topEvent": "Seal Barrier Fluid Vaporization & Secondary O-Ring Degradation"
  }
}
\`\`\`

#### Equipment Health Index & Reliability Degradation
\`\`\`gen-ui
{
  "component": "EquipmentHealthCard",
  "props": {
    "tag": "P-101",
    "name": "Crude Slurry Charge Pump",
    "type": "API 610 BB2 Between-Bearing Centrifugal Pump",
    "healthScore": 48,
    "mtbfHours": 18000,
    "operatingHours": 14200,
    "lastInspectionDate": "2026-09-20"
  }
}
\`\`\`

#### Executive Incident Review Deck
\`\`\`gen-ui
{
  "component": "ExecutivePresentationWidget",
  "props": {
    "tag": "P-101",
    "title": "Incident Root Cause Review: P-101 Trip",
    "domain": "root_cause_analysis",
    "filename": "P-101_RCA_Board_Review.pptx",
    "downloadUrl": "http://localhost:8000/api/sih/pitch-deck",
    "hash": "SHA256:d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5"
  }
}
\`\`\`

- **Primary Root Cause:** Suction Strainer \`ST-101-A\` mesh breach allowed 250μm particulates to choke the 3.2mm Plan 11 restriction orifice, eliminating seal convective cooling.
- **Statutory Compliance:** Full PSM investigation logged to Merkle ledger with dual-key approval pending.`;
        } else {
          finalMarkdown = `### Sovereign Engineering Analysis Completed (Offline Simulation Mode)

#### 1. Real-Time Interactive Wall Thickness Evaluator (ASME B31.3)
Drag the parameter sensitivity controls below to evaluate design margin under varying operational pressures.

\`\`\`gen-ui
{
  "component": "ASMEComplianceCard",
  "props": {
    "tag": "CDU-Pipe-104",
    "title": "ASME B31.3 §304.1.2 Interactive Wall Thickness Evaluator",
    "initialPressure": 450,
    "diameter": 8.625,
    "allowableStress": 20000,
    "corrosionAllowance": 0.0625,
    "actualThickness": 0.4850
  }
}
\`\`\`

#### 2. Shell Operating Pressure Gauge
\`\`\`gen-ui
{
  "component": "IndustrialGauge",
  "props": {
    "tag": "PI-3104",
    "title": "CDU-Pipe-104 Operating Pressure",
    "value": 310.5,
    "min": 0,
    "max": 600,
    "unit": "psig",
    "thresholds": { "normal": 400, "warning": 480, "critical": 550 },
    "status": "optimal",
    "subtitle": "High Pressure Steam Pre-Heater Spool"
  }
}
\`\`\`

#### 3. Equipment Reliability Index
\`\`\`gen-ui
{
  "component": "EquipmentHealthCard",
  "props": {
    "tag": "CDU-Pipe-104",
    "name": "Crude Unit Transfer Line Spool",
    "type": "ASTM A106 Gr B Seamless Steel Piping",
    "healthScore": 94,
    "mtbfHours": 22000,
    "operatingHours": 14200,
    "lastInspectionDate": "2026-09-01"
  }
}
\`\`\`

#### 4. Statutory Decision
- **Compliance Status:** **APPROVED FOR UNRESTRICTED CRUDE RUNS** (Safety Margin: \`+0.3268 in\`)
- **Deliverables Generated:** Complete Trinity compiled (Word Report, Excel Sheet, Board Deck) in Sovereign Inspector.

#### 5. Executive Board Review Deck (16:9 Interactive Preview)
\`\`\`gen-ui
{
  "component": "ExecutivePresentationWidget",
  "props": {
    "tag": "CDU-Pipe-104",
    "title": "Executive Asset Integrity Review: CDU-Pipe-104",
    "domain": "pipe_thickness",
    "filename": "CDU-Pipe-104_Executive_Board_Review.pptx",
    "downloadUrl": "http://localhost:8000/api/sih/pitch-deck",
    "hash": "SHA256:c8f1e2d3b4a5968778a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1"
  }
}
\`\`\``;
        }

        set((s) => ({
          isAgentWorking: false,
          messages: s.messages.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  content: finalMarkdown,
                  agentSteps: m.agentSteps?.map((st) => ({ ...st, status: 'completed' as const })),
                }
              : m
          ),
        }));

        get().saveCurrentSession();

        get().addToast({
          type: 'success',
          title: 'Offline Simulation Completed',
          message: 'Full deterministic engineering calculation & statutory certificate generated in zero-egress sandbox.',
        });
      },

  addNetworkEvent: (event: NetworkEvent) => {
    if (event.status === 'blocked' || event.status === 'contained') {
      sendNativeNotification({
        title: 'INDRA: Intrusion Blocked',
        body: `Localhost boundary dropped outbound packet to ${event.destination} (${event.protocol || 'TCP'}).`,
      });
    }
    set((state) => ({
      networkEvents: [event, ...state.networkEvents].slice(0, 100),
    }));
  },

  incrementBlockedCount: () =>
    set((state) => ({ blockedCount: state.blockedCount + 1 })),

  // Fetch real loaded models from FastAPI GET /api/models
  fetchModels: async () => {
    getGlobalQueryClient()?.invalidateQueries({ queryKey: queryKeys.models });
  },

  // Live WebSocket connection to ws://localhost:8000/ws/network for packet containment
  connectNetworkWebSocket: () => {
    if (networkWs && (networkWs.readyState === WebSocket.OPEN || networkWs.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      networkWs = new WebSocket(`${WS_BASE}/ws/network`);

      networkWs.onopen = () => {
        set({ isNetworkSocketConnected: true, isBackendConnected: true });
      };

      networkWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const netEvent: NetworkEvent = {
            id: data.id || `net-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            timestamp: data.timestamp || new Date().toLocaleTimeString('en-US', { hour12: false }),
            action: data.action || data.method || 'CONTAIN_EGRESS',
            destination: data.destination || data.target || data.host || 'blocked-wan-egress',
            status: (data.status === 'contained' || data.status === 'blocked') ? data.status : 'blocked',
            protocol: data.protocol || 'TCP/IP',
            source: data.source || '0.0.0.0 (Air-Gap Filter)',
          };

          get().addNetworkEvent(netEvent);
          get().incrementBlockedCount();
        } catch (e) {
          console.error('Failed to parse network websocket event:', e);
        }
      };

      networkWs.onclose = () => {
        set({ isNetworkSocketConnected: false });
        // Clean reconnection with backoff
        setTimeout(() => {
          get().connectNetworkWebSocket();
        }, 5000);
      };

      networkWs.onerror = () => {
        set({ isNetworkSocketConnected: false });
      };
    } catch (e) {
      console.warn('Network WebSocket connection failed:', e);
    }
  },

  // 3. Human-in-the-Loop Approvals (GET /api/approvals/pending & POST /api/approvals/sign)
  fetchPendingApprovals: async () => {
    getGlobalQueryClient()?.invalidateQueries({ queryKey: queryKeys.approvals });
  },

  signApproval: async ({ taskId, stepIndex, approved, signature }) => {
    try {
      // Exact specification payload: {"task_id": "the-uuid", "step_index": 0, "approved": true, "signature": "Admin User"}
      const payload = {
        task_id: taskId,
        step_index: typeof stepIndex === 'number' ? stepIndex : 0,
        approved,
        signature: signature || 'Admin User',
      };

      const res = await fetch(`${API_BASE}/api/approvals/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Sign-off failed (HTTP ${res.status})`);
      }

      // Optimistically remove signed approval
      set((state) => ({
        pendingApprovals: state.pendingApprovals.filter(
          (p) => !((p.task_id === taskId || (p as any).taskId === taskId) && ((p.step_index ?? 0) === stepIndex))
        ),
      }));

      return { success: true };
    } catch (err: any) {
      console.error('Error signing approval:', err);
      return { success: false, message: err.message || 'Signature failed' };
    }
  },

  // 1. Task Submission: POST http://localhost:8000/api/tasks with {"text": "..."}
  // 2. Live WebSocket Streaming: ws://localhost:8000/ws/tasks/{taskId}
  sendMessage: async (content: string, attachments?: { id?: string; name: string; type: string; size: string; url?: string }[]) => {
    const now = Date.now();
    const currentCount = get().messages.length;
    const userMessage: Message = {
      id: `msg-${now}-0-user`,
      role: 'user',
      content,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      attachments,
      ...({ orderIndex: currentCount } as any),
    };

    const agentMessageId = `msg-${now}-1-agent`;
    const initialAgentMessage: Message = {
      id: agentMessageId,
      role: 'agent',
      content: '',
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      agentSteps: [],
      toolExecution: undefined,
      ...({ orderIndex: currentCount + 1 } as any),
    };

    set((state) => ({
      messages: [...state.messages, userMessage, initialAgentMessage],
      inputValue: '',
      isAgentWorking: true,
    }));
    get().saveCurrentSession();

    try {
      // Exact payload format: {"text": "user's prompt string"}
      const res = await fetch(`${API_BASE}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: content,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to create task on backend: ${res.statusText}`);
      }

      // Backend response: {"taskId": "some-uuid", "status": "processing"}
      const taskData = await res.json();
      const taskId = taskData.taskId || taskData.task_id || taskData.id;

      if (!taskId) {
        throw new Error('Backend did not return a valid taskId');
      }

      set({ currentTaskId: taskId, isBackendConnected: true });

      // Open live task WebSocket ws://localhost:8000/ws/tasks/{taskId}
      if (taskWs) {
        taskWs.close();
      }

      taskWs = new WebSocket(`${WS_BASE}/ws/tasks/${taskId}`);

      taskWs.onmessage = (event) => {
        try {
          const ev = JSON.parse(event.data);
          const type = ev.type || ev.event;

          // Event 1: {"type": "model_selected", "model": "..."}
          if (type === 'model_selected') {
            const modelName = ev.model || ev.name || ev.model_name || 'Resident Model';
            set({ 
              activeModel: modelName,
              modelReason: ev.reason || ev.description
            });
            set((state) => ({
              messages: state.messages.map((m) =>
                m.id === agentMessageId ? { ...m, modelUsed: modelName } : m
              ),
            }));
          }

          // Event 2: {"type": "plan", "steps": [...]}
          else if (type === 'plan') {
            const rawSteps = ev.steps || ev.data || [];
            const steps: AgentStep[] = rawSteps.map((s: any, idx: number) => {
              if (typeof s === 'string') {
                return {
                  id: `step-${idx}`,
                  label: s,
                  status: idx === 0 ? 'in-progress' : 'pending',
                };
              }
              return {
                id: s.id || `step-${idx}`,
                label: s.label || s.name || s.title || `Execution Step ${idx + 1}`,
                status: s.status || (idx === 0 ? 'in-progress' : 'pending'),
                detail: s.detail || s.description,
              };
            });

            set((state) => ({
              messages: state.messages.map((m) =>
                m.id === agentMessageId ? { ...m, agentSteps: steps } : m
              ),
            }));
          }

          // Event 3: {"type": "tool_call", "tool": "name", "arguments": {...}}
          else if (type === 'tool_call') {
            const toolName = ev.tool || ev.name || ev.tool_name || 'deterministic_tool';
            const toolArguments = ev.arguments !== undefined ? ev.arguments : (ev.args !== undefined ? ev.args : {});
            const argsStr = typeof toolArguments === 'string' ? toolArguments : JSON.stringify(toolArguments, null, 2);

            set((state) => ({
              messages: state.messages.map((m) => {
                if (m.id !== agentMessageId) return m;

                const hasMatchingStep = m.agentSteps?.some((s) => s.id === ev.id || s.label.toLowerCase().includes(toolName.toLowerCase()));
                const updatedSteps = hasMatchingStep
                  ? m.agentSteps?.map((s) => {
                      if (s.id === ev.id || s.label.toLowerCase().includes(toolName.toLowerCase())) {
                        return { ...s, status: 'in-progress' as const };
                      }
                      return s;
                    })
                  : [
                      ...(m.agentSteps || []),
                      {
                        id: ev.id || `tool-${Date.now()}`,
                        label: `Running ${toolName}`,
                        status: 'in-progress' as const,
                        detail: `Authorizing & executing with deterministic solver`,
                      },
                    ];

                return {
                  ...m,
                  agentSteps: updatedSteps,
                  toolExecution: {
                    code: argsStr,
                    output: `Executing tool "${toolName}" in air-gapped deterministic container...`,
                    language: toolName.toLowerCase().includes('python') ? 'python' : 'json',
                    toolName,
                  },
                };
              }),
            }));

            // Check if pending approvals were triggered by this tool call
            get().fetchPendingApprovals();
          }

          // Event 4: {"type": "tool_result", "id": "...", "status": "success", "result": {...}}
          else if (type === 'tool_result') {
            const stepId = ev.id;
            const status = ev.status || 'success';
            const resultData = ev.result !== undefined ? ev.result : (ev.output !== undefined ? ev.output : {});
            const outputStr = typeof resultData === 'string' ? resultData : JSON.stringify(resultData, null, 2);
            const toolName = ev.tool || ev.name || 'tool';

            // RAG citations extraction
            if (toolName.includes('search') || toolName.includes('rag') || toolName.includes('knowledge') || ev.sources) {
              const rawSources = ev.sources || (Array.isArray(resultData) ? resultData : []);
              if (Array.isArray(rawSources) && rawSources.length > 0) {
                const newSources: RAGSource[] = rawSources.map((s: any, i: number) => ({
                  id: s.id || `src-${Date.now()}-${i}`,
                  document: s.document || s.documentName || s.filename || 'Engineering Knowledge Base',
                  documentName: s.documentName || s.document || s.filename || 'Engineering Knowledge Base',
                  section: s.section || s.chunk || `Section ${i + 1}`,
                  relevance: Math.round((s.relevance || s.score || 0.85) * (s.score && s.score <= 1 ? 100 : 1)),
                  snippet: s.snippet || s.content || s.text,
                }));
                set({ ragSources: newSources });
              }
            }

            // P&ID dynamic tags extraction
            if (toolName.includes('pid') || toolName.includes('ocr') || ev.tags) {
              const detected = ev.tags || (resultData?.tags) || (Array.isArray(resultData) ? resultData : []);
              if (Array.isArray(detected) && detected.length > 0) {
                set({ detectedTags: detected.map((t: any) => typeof t === 'string' ? t : t.tag || t.name) });
              }
            }

            set((state) => ({
              messages: state.messages.map((m) => {
                if (m.id !== agentMessageId) return m;

                const updatedSteps = m.agentSteps?.map((s) => {
                  if ((stepId && s.id === stepId) || s.status === 'in-progress') {
                    return { ...s, status: 'completed' as const, detail: status };
                  }
                  return s;
                });

                return {
                  ...m,
                  agentSteps: updatedSteps,
                  toolExecution: m.toolExecution
                    ? { ...m.toolExecution, output: outputStr }
                    : { code: '', output: outputStr, language: 'json', toolName },
                };
              }),
            }));
          }

          // Event 5: {"type": "token", "content": "..."}
          else if (type === 'token') {
            const chunk = ev.content !== undefined ? ev.content : (ev.token || ev.text || ev.chunk || '');
            set((state) => ({
              messages: state.messages.map((m) =>
                m.id === agentMessageId
                  ? { ...m, content: (m.content || '') + chunk }
                  : m
              ),
            }));
          }

          // Event 6: {"type": "deliverable", "filename": "...", "url": "..."}
          else if (type === 'deliverable') {
            const filename = ev.filename || ev.name || 'Deliverable.docx';
            const rawUrl = ev.url || `/files/${taskId}/artifacts/${filename}`;
            // Construct download link pointing to http://localhost:8000{url}
            const downloadUrl = rawUrl.startsWith('http')
              ? rawUrl
              : `${API_BASE}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
            const kind = ev.file_type || ev.kind || (filename.endsWith('.xlsx') ? 'xlsx' : filename.endsWith('.pptx') ? 'pptx' : 'docx');
            const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
            
            const fallbackDescription = filename && filename !== 'Deliverable.docx'
              ? `Generated ${filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')}`
              : 'Generated document';

            const newDeliverable: Deliverable = {
              id: ev.id || `del-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              name: filename,
              filename,
              type: kind,
              size: ev.size || (kind === 'xlsx' ? '1.4 MB' : kind === 'pptx' ? '3.2 MB' : '2.1 MB'),
              generatedAt: nowTime,
              timestamp: nowTime,
              description: ev.description || ev.desc || fallbackDescription,
              url: downloadUrl,
              hash: ev.hash || ev.sha256,
            };

            get().addDeliverable(newDeliverable);
          }

          // Event 6.5: Generative UI Micro-Frontends
          else if (type === 'generative_ui' || type === 'ui_component' || type === 'ui') {
            const componentName = ev.component || ev.name || ev.ui_type || 'IndustrialGauge';
            const componentProps = ev.props || ev.data || ev.arguments || {};
            const title = ev.title;
            const spec: GenerativeUISpec = {
              id: ev.id || `genui-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              component: componentName,
              title,
              props: componentProps,
              status: 'ready',
            };

            set((state) => ({
              messages: state.messages.map((m) => {
                if (m.id !== agentMessageId) return m;
                const existing = m.generativeUI || [];
                if (existing.some((g) => g.component === componentName && g.title === title)) {
                  return m;
                }
                return {
                  ...m,
                  generativeUI: [...existing, spec],
                };
              }),
            }));
          }

          // Event 7: {"type": "done"}
          else if (type === 'done') {
            set((state) => ({
              isAgentWorking: false,
              messages: state.messages.map((m) =>
                m.id === agentMessageId
                  ? {
                      ...m,
                      agentSteps: m.agentSteps?.map((s) => ({ ...s, status: 'completed' as const })),
                    }
                  : m
              ),
            }));

            if (taskWs) {
              taskWs.close();
              taskWs = null;
            }

            // Sync approvals after task completion
            get().fetchPendingApprovals();
            get().saveCurrentSession();
          }
        } catch (err) {
          console.error('Error processing task WebSocket message:', err);
        }
      };

      taskWs.onerror = (error) => {
        console.error('Task WebSocket error:', error);
        set((state) => ({
          isAgentWorking: false,
          messages: state.messages.map((m) =>
            m.id === agentMessageId && !m.content
              ? {
                  ...m,
                  isError: true,
                  errorDetails: {
                    message: 'WebSocket stream closed unexpectedly',
                    endpoint: `${WS_BASE}/ws/tasks/${taskId}`,
                    canRetry: true,
                    originalPrompt: content,
                  },
                }
              : m
          ),
        }));
        get().addToast({
          type: 'warning',
          title: 'WebSocket Disconnected',
          message: 'Real-time reasoning stream interrupted. You can retry the task.',
          actionLabel: 'Retry Task',
          onAction: () => get().retryMessage(agentMessageId),
        });
      };

      taskWs.onclose = () => {
        set({ isAgentWorking: false });
      };

    } catch (err: any) {
      console.error('Error initiating task:', err);
      set((state) => ({
        isAgentWorking: false,
        messages: state.messages.map((m) =>
          m.id === agentMessageId
            ? {
                ...m,
                isError: true,
                errorDetails: {
                  message: err.message || String(err),
                  endpoint: `${API_BASE}/api/tasks`,
                  canRetry: true,
                  originalPrompt: content,
                },
                content: `⚠️ **Connection to Sovereign Backend Failed**\n\nCould not reach \`${API_BASE}/api/tasks\`.\n\n*Error: ${err.message || err}*`,
              }
            : m
        ),
      }));
      get().saveCurrentSession();

      get().addToast({
        type: 'error',
        title: 'Backend Unreachable',
        message: `FastAPI at ${API_BASE} is not responding. Run offline simulation or retry.`,
        actionLabel: 'Run Offline Mode',
        onAction: () => get().runOfflineSimulation(agentMessageId, content),
      });
    }
  },

  abortTask: () => {
    if (taskWs) {
      taskWs.onclose = null;
      taskWs.onerror = null;
      taskWs.onmessage = null;
      taskWs.close();
      taskWs = null;
    }

    const { currentTaskId, messages } = get();

    if (currentTaskId) {
      fetch(`${API_BASE}/api/tasks/${currentTaskId}/abort`, {
        method: 'POST',
      }).catch(() => {});
    }

    const updatedMessages = [...messages];
    let lastAgentIndex = -1;
    for (let i = updatedMessages.length - 1; i >= 0; i--) {
      if (updatedMessages[i].role === 'agent') {
        lastAgentIndex = i;
        break;
      }
    }

    if (lastAgentIndex !== -1) {
      const lastMsg = updatedMessages[lastAgentIndex];
      const updatedSteps = lastMsg.agentSteps?.map((s) =>
        s.status === 'in-progress'
          ? { ...s, status: 'failed' as const, label: `${s.label} (Stopped)` }
          : s
      );

      const abortNote = '\n\n*🛑 Task execution stopped by operator.*';
      const newContent = lastMsg.content
        ? `${lastMsg.content}${abortNote}`
        : '*Task execution was stopped by operator.*';

      updatedMessages[lastAgentIndex] = {
        ...lastMsg,
        content: newContent,
        agentSteps: updatedSteps,
      };
    }

    set({
      isAgentWorking: false,
      messages: updatedMessages,
    });

    get().addToast({
      type: 'info',
      title: 'Execution Stopped',
      message: 'Agent operation was aborted by operator.',
    });

    get().saveCurrentSession();
  },
    }),
    {
      name: 'indra-chat-session-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessions: state.sessions,
        currentSessionId: state.currentSessionId,
        messages: state.messages,
        deliverables: state.deliverables,
        ragSources: state.ragSources,
        detectedTags: state.detectedTags,
        currentTaskId: state.currentTaskId,
        scheduledTasks: state.scheduledTasks,
        theme: state.theme,
        isRightPaneOpen: state.isRightPaneOpen,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
          // Safety: ensure transient flags are cleanly reset upon reload
          state.isAgentWorking = false;
          state.isBackendConnected = false;
          state.isNetworkSocketConnected = false;
          state.loadingApprovals = false;
          state.isApprovalsModalOpen = false;
          state.isSettingsOpen = false;
          state.isScheduledTasksOpen = false;
          state.inputValue = '';
          // Apply stored theme if present
          if (typeof window !== 'undefined' && state.theme === 'dark') {
            document.documentElement.classList.add('dark');
          }
        }
      },
    }
  )
);

export default useIndraStore;

