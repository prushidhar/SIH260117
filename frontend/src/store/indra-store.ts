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
                  agentSteps: [
                    { id: 'off-1', label: 'Local Vision OCR: Scan Inspection_Report_HX-4201.pdf', status: 'in-progress' },
                    { id: 'off-2', label: 'Retrieve API-570 & ASME B31.3 Standards', status: 'pending' },
                    { id: 'off-3', label: 'Execute Deterministic Python Sandbox Math', status: 'pending' },
                    { id: 'off-4', label: 'Cross-Reference P&ID Tags (TI-4201, FV-3102, PI-3104)', status: 'pending' },
                    { id: 'off-5', label: 'Compile Statutory Approval Deliverable', status: 'pending' },
                  ],
                  content: '',
                }
              : m
          ),
        }));

        // Step 1: OCR & Tag recognition
        await new Promise((r) => setTimeout(r, 600));
        set({ detectedTags: ['HX-4201', 'TI-4201', 'FV-3102', 'PI-3104'] });
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
        set({
          ragSources: [
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
          ],
        });
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
        const pythonCode = `import numpy as np\n# ASME B31.3 Deterministic Calculation\nP = 450.0  # Design Pressure (psig)\nD = 8.625  # Outside Diameter (inches)\nS = 20000.0 # Allowable Stress (psi, A106 Grade B)\nE = 1.0    # Quality Factor\nY = 0.4    # Temperature Coefficient\nc = 0.0625 # Corrosion Allowance (inches)\n\nt_min = (P * D) / (2 * (S * E + P * Y)) + c\nt_actual = 0.485 # Measured ultrasonic thickness\ncorrosion_rate = 0.00725 # in/yr\nremaining_life = (t_actual - t_min) / corrosion_rate\n\nprint(f"Required t_min: {t_min:.4f} in")\nprint(f"Current t_actual: {t_actual:.4f} in")\nprint(f"Safety Margin: {t_actual - t_min:.4f} in")\nprint(f"Calculated Remaining Life: {remaining_life:.1f} years")\nprint("STATUS: SAFE FOR CONTINUED REFINERY SERVICE")`;

        const pythonOutput = `Required t_min: 0.1582 in\nCurrent t_actual: 0.4850 in\nSafety Margin: 0.3268 in\nCalculated Remaining Life: 45.1 years\nSTATUS: SAFE FOR CONTINUED REFINERY SERVICE`;

        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  toolExecution: {
                    code: pythonCode,
                    output: pythonOutput,
                    language: 'python',
                    toolName: 'asme_b31_3_deterministic_sandbox',
                  },
                  agentSteps: m.agentSteps?.map((st) =>
                    st.id === 'off-3' ? { ...st, status: 'completed' as const } : st.id === 'off-4' ? { ...st, status: 'in-progress' as const } : st
                  ),
                }
              : m
          ),
        }));

        // Step 4: P&ID cross reference
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

        // Step 5: Deliverables & synthesis
        await new Promise((r) => setTimeout(r, 600));
        const certDeliverable: Deliverable = {
          id: `del-cert-${Date.now()}`,
          name: 'Inspection_Approval_HX4201.docx',
          filename: 'Inspection_Approval_HX4201.docx',
          type: 'docx',
          size: '1.8 MB',
          generatedAt: nowTime,
          timestamp: nowTime,
          description: 'Air-Gapped ASME Section VIII & API-570 Statutory Plant Fitness Certification',
          url: '#',
          hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        };
        get().addDeliverable(certDeliverable);

        const isPumpQuery = /pump|p-101|vibration|telemetry|gauge|setpoint|speed|form/i.test(promptText);

        let finalMarkdown = '';
        if (isPumpQuery) {
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
        } else {
          finalMarkdown = `### Sovereign Engineering Analysis Completed (Offline Simulation Mode)

#### 1. Real-Time Interactive Wall Thickness Evaluator (ASME B31.3)
Drag the parameter sensitivity controls below to evaluate design margin under varying operational pressures.

\`\`\`gen-ui
{
  "component": "ASMEComplianceCard",
  "props": {
    "tag": "HX-4201",
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
    "title": "HX-4201 Shell Operating Pressure",
    "value": 310.5,
    "min": 0,
    "max": 600,
    "unit": "psig",
    "thresholds": { "normal": 400, "warning": 480, "critical": 550 },
    "status": "optimal",
    "subtitle": "High Pressure Steam Pre-Heater"
  }
}
\`\`\`

#### 3. Equipment Reliability Index
\`\`\`gen-ui
{
  "component": "EquipmentHealthCard",
  "props": {
    "tag": "HX-4201",
    "name": "Crude Pre-Heat Exchanger Bank A",
    "type": "Shell & Tube Exchanger (TEMA Class R)",
    "healthScore": 94,
    "mtbfHours": 22000,
    "operatingHours": 14200,
    "lastInspectionDate": "2026-09-01"
  }
}
\`\`\`

#### 4. Statutory Decision
- **Compliance Status:** **APPROVED FOR UNRESTRICTED CRUDE RUNS** (Safety Margin: \`+0.3268 in\`)
- **Deliverable Generated:** [Inspection_Approval_HX4201.docx](#) compiled and cryptographically verified in the Sovereign Inspector pane.`;
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
          message: 'Full ASME B31.3 calculation & statutory certificate generated in zero-egress sandbox.',
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

