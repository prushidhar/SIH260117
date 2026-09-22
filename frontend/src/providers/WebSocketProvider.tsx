'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketClient, type WebSocketStatus } from '@/lib/websocket/WebSocketClient';
import useIndraStore, { 
  WS_BASE, 
  API_BASE, 
  type Message, 
  type NetworkEvent, 
  type AgentStep, 
  type Deliverable, 
  type RAGSource 
} from '@/store/indra-store';
import type { GenerativeUISpec } from '@/components/generative-ui/types';
import { getGlobalQueryClient, queryKeys } from '@/lib/queries';

export type TaskStreamStatus = 'idle' | 'submitted' | 'streaming' | 'completed' | 'error';

interface WebSocketContextType {
  networkStatus: WebSocketStatus;
  taskStatus: TaskStreamStatus;
  isAgentWorking: boolean;
  sendMessage: (content: string, attachments?: { id?: string; name: string; type: string; size: string; url?: string }[]) => Promise<void>;
  abortTask: () => void;
  retryMessage: (messageId: string) => Promise<void>;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function useWebSocket(): WebSocketContextType {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

export default function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [networkStatus, setNetworkStatus] = useState<WebSocketStatus>('disconnected');
  const [taskStatus, setTaskStatus] = useState<TaskStreamStatus>('idle');

  const {
    addNetworkEvent,
    incrementBlockedCount,
    activeModel,
    setActiveModel,
    isAgentWorking,
    currentTaskId,
  } = useIndraStore();

  const networkClientRef = useRef<WebSocketClient | null>(null);
  const taskClientRef = useRef<WebSocketClient | null>(null);

  // Throttled Token Buffer (prevents React re-render flooding during fast LLM token emission)
  const tokenBufferRef = useRef<{ messageId: string; chunks: string[] } | null>(null);
  const tokenFlushTimerRef = useRef<any>(null);

  const flushTokenBuffer = useCallback(() => {
    if (!tokenBufferRef.current || tokenBufferRef.current.chunks.length === 0) return;

    const { messageId, chunks } = tokenBufferRef.current;
    const combined = chunks.join('');
    tokenBufferRef.current.chunks = [];

    useIndraStore.setState((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, content: (m.content || '') + combined } : m
      ),
    }));
  }, []);

  const appendTokenChunk = useCallback((messageId: string, chunk: string) => {
    if (!tokenBufferRef.current || tokenBufferRef.current.messageId !== messageId) {
      // Flush previous buffer if target message changed
      flushTokenBuffer();
      tokenBufferRef.current = { messageId, chunks: [chunk] };
    } else {
      tokenBufferRef.current.chunks.push(chunk);
    }

    // Schedule flush via 50ms batching window (~20 updates/sec maximum)
    if (!tokenFlushTimerRef.current) {
      tokenFlushTimerRef.current = setTimeout(() => {
        tokenFlushTimerRef.current = null;
        flushTokenBuffer();
      }, 50);
    }
  }, [flushTokenBuffer]);

  // ==========================================
  // 1. Persistent Sovereign Network Monitor Socket
  // ==========================================
  useEffect(() => {
    const client = new WebSocketClient({
      url: `${WS_BASE}/ws/network`,
      initialDelay: 1000,
      maxDelay: 15000,
      factor: 1.5,
      jitter: 1000,
      heartbeatInterval: 20000,
      onStatusChange: (status) => {
        setNetworkStatus(status);
        useIndraStore.setState({ 
          isNetworkSocketConnected: status === 'connected',
          isBackendConnected: status === 'connected' || useIndraStore.getState().isBackendConnected,
        });
      },
      onMessage: (data) => {
        try {
          if (!data || typeof data !== 'object') return;
          const netEvent: NetworkEvent = {
            id: data.id || `net-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            timestamp: data.timestamp || new Date().toLocaleTimeString('en-US', { hour12: false }),
            action: data.action || data.method || 'CONTAIN_EGRESS',
            destination: data.destination || data.target || data.host || 'blocked-wan-egress',
            status: (data.status === 'contained' || data.status === 'blocked') ? data.status : 'blocked',
            protocol: data.protocol || 'TCP/IP',
            source: data.source || '0.0.0.0 (Air-Gap Filter)',
          };

          addNetworkEvent(netEvent);
          incrementBlockedCount();
        } catch (e) {
          console.error('[WebSocketProvider] Failed to parse network event:', e);
        }
      },
    });

    networkClientRef.current = client;
    client.connect();

    return () => {
      client.close();
      networkClientRef.current = null;
    };
  }, [addNetworkEvent, incrementBlockedCount]);

  // ==========================================
  // 2. Abort Task
  // ==========================================
  const abortTask = useCallback(() => {
    flushTokenBuffer();
    if (tokenFlushTimerRef.current) {
      clearTimeout(tokenFlushTimerRef.current);
      tokenFlushTimerRef.current = null;
    }

    if (taskClientRef.current) {
      taskClientRef.current.close();
      taskClientRef.current = null;
    }

    const state = useIndraStore.getState();
    const activeTaskId = state.currentTaskId;

    if (activeTaskId) {
      fetch(`${API_BASE}/api/tasks/${activeTaskId}/abort`, {
        method: 'POST',
      }).catch((err) => {
        console.warn('Backend task abort request error:', err);
      });
    }

    useIndraStore.setState((s) => ({
      isAgentWorking: false,
      messages: s.messages.map((m, idx) =>
        idx === s.messages.length - 1 && m.role === 'agent'
          ? {
              ...m,
              content: m.content ? `${m.content}\n\n*[Execution aborted by operator]*` : '*[Execution aborted by operator]*',
              agentSteps: m.agentSteps?.map((step) =>
                step.status === 'in-progress'
                  ? { ...step, status: 'failed' as const, detail: 'Aborted by operator' }
                  : step
              ),
            }
          : m
      ),
    }));

    setTaskStatus('idle');
  }, [flushTokenBuffer]);

  // ==========================================
  // 3. Send Task & Open Resilient Task Stream
  // ==========================================
  const sendMessage = useCallback(
    async (
      content: string,
      attachments?: { id?: string; name: string; type: string; size: string; url?: string }[]
    ) => {
      if (!content.trim() && (!attachments || attachments.length === 0)) return;

      // Close previous task stream if still open
      if (taskClientRef.current) {
        taskClientRef.current.close();
        taskClientRef.current = null;
      }

      const now = Date.now();
      const currentCount = useIndraStore.getState().messages.length;
      const userMessage: Message = {
        id: `msg-${now}-0-user`,
        role: 'user',
        content,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        attachments,
        ...({ orderIndex: currentCount } as any),
      };

      const agentMessageId = `msg-${now}-1-agent`;
      const agentMessage: Message = {
        id: agentMessageId,
        role: 'agent',
        content: '',
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        modelUsed: activeModel,
        agentSteps: [],
        ...({ orderIndex: currentCount + 1 } as any),
      };

      useIndraStore.setState((state) => ({
        messages: [...state.messages, userMessage, agentMessage],
        inputValue: '',
        isAgentWorking: true,
      }));

      setTaskStatus('submitted');

      try {
        const payload: Record<string, any> = {
          text: content,
          prompt: content,
          input: content,
          model: activeModel,
        };

        if (attachments && attachments.length > 0) {
          payload.attachments = attachments.map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type,
            url: a.url,
          }));
          const primary = attachments[0];
          if (primary.id) payload.document_id = primary.id;
          if (primary.url) payload.document_url = primary.url;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);

        const res = await fetch(`${API_BASE}/api/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`Failed to create task on backend (HTTP ${res.status})`);
        }

        const taskData = await res.json();
        const taskId = taskData.taskId || taskData.task_id || taskData.id;

        if (!taskId) {
          throw new Error('Backend did not return a valid taskId');
        }

        useIndraStore.setState({ currentTaskId: taskId, isBackendConnected: true });
        setTaskStatus('streaming');

        // Connect resilient task client
        const client = new WebSocketClient({
          url: `${WS_BASE}/ws/tasks/${taskId}`,
          initialDelay: 1000,
          maxDelay: 10000,
          factor: 1.5,
          jitter: 500,
          heartbeatInterval: 15000,
          onMessage: (ev) => {
            if (!ev || typeof ev !== 'object') return;
            const type = ev.type || ev.event;

            // Model selected
            if (type === 'model_selected') {
              const modelName = ev.model || ev.name || ev.model_name || 'Resident Model';
              setActiveModel(modelName);
              useIndraStore.setState((state) => ({
                messages: state.messages.map((m) =>
                  m.id === agentMessageId ? { ...m, modelUsed: modelName } : m
                ),
              }));
            }

            // Plan event
            else if (type === 'plan') {
              const rawSteps = ev.steps || ev.data || [];
              const steps: AgentStep[] = rawSteps.map((s: any, idx: number) => ({
                id: s.id || `step-${idx}`,
                label: typeof s === 'string' ? s : (s.label || s.name || s.title || `Execution Step ${idx + 1}`),
                status: (s.status || (idx === 0 ? 'in-progress' : 'pending')) as any,
                detail: s.detail || s.description,
              }));

              useIndraStore.setState((state) => ({
                messages: state.messages.map((m) =>
                  m.id === agentMessageId ? { ...m, agentSteps: steps } : m
                ),
              }));
            }

            // Tool call event
            else if (type === 'tool_call') {
              // Flush any buffered tokens immediately before showing tool call
              flushTokenBuffer();

              const toolName = ev.tool || ev.name || ev.tool_name || 'deterministic_tool';
              const toolArguments = ev.arguments !== undefined ? ev.arguments : (ev.args !== undefined ? ev.args : {});
              const argsStr = typeof toolArguments === 'string' ? toolArguments : JSON.stringify(toolArguments, null, 2);

              useIndraStore.setState((state) => ({
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
                          detail: 'Authorizing & executing with deterministic solver',
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

              // Invalidate pending approvals query
              getGlobalQueryClient()?.invalidateQueries({ queryKey: queryKeys.approvals });
            }

            // Tool result event
            else if (type === 'tool_result') {
              flushTokenBuffer();
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
                  useIndraStore.setState({ ragSources: newSources });
                }
              }

              useIndraStore.setState((state) => ({
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

            // Streaming Token Chunk (Throttled through token buffer)
            else if (type === 'token') {
              const chunk = ev.content !== undefined ? ev.content : (ev.token || ev.text || ev.chunk || '');
              appendTokenChunk(agentMessageId, chunk);
            }

            // Deliverable event
            else if (type === 'deliverable') {
              flushTokenBuffer();
              const filename = ev.filename || ev.name || 'deliverable.docx';
              const fileType = (ev.file_type || ev.type || (filename.endsWith('.xlsx') ? 'xlsx' : 'docx')).toLowerCase() as any;
              const title = ev.title || ev.name || filename.replace(/_/g, ' ').replace(/\.[^/.]+$/, '');
              const desc = ev.description || (fileType === 'xlsx' ? 'Deterministic Equipment Health Workbook' : 'Statutory Plant Approval Note');
              const now = new Date().toLocaleTimeString();

              const newDeliverable: Deliverable = {
                id: ev.id || `deliv-${Date.now()}`,
                name: title,
                filename,
                type: fileType,
                size: ev.size || '38.4 KB',
                generatedAt: now,
                timestamp: now,
                description: desc,
                url: ev.url || ev.download_url || `${API_BASE}/files/${filename}`,
                hash: ev.hash || 'SHA256:AUTHENTICATED',
              };

              useIndraStore.getState().addDeliverable(newDeliverable);
            }

            // Generative UI event (Server-Driven Micro-Frontends)
            else if (type === 'generative_ui' || type === 'ui_component' || type === 'ui') {
              flushTokenBuffer();
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

              useIndraStore.setState((state) => ({
                messages: state.messages.map((m) => {
                  if (m.id !== agentMessageId) return m;
                  return {
                    ...m,
                    generativeUI: [...(m.generativeUI || []), spec],
                  };
                }),
              }));
            }

            // Complete event
            else if (type === 'complete' || type === 'done') {
              flushTokenBuffer();
              useIndraStore.setState((state) => ({
                isAgentWorking: false,
                messages: state.messages.map((m) => {
                  if (m.id !== agentMessageId) return m;
                  return {
                    ...m,
                    agentSteps: m.agentSteps?.map((s) => ({ ...s, status: 'completed' as const })),
                  };
                }),
              }));
              setTaskStatus('completed');
              useIndraStore.getState().saveCurrentSession();
              client.close();
            }

            // Error event
            else if (type === 'error') {
              flushTokenBuffer();
              const errMsg = ev.message || ev.detail || 'Task execution encountered an error';
              useIndraStore.setState((state) => ({
                isAgentWorking: false,
                messages: state.messages.map((m) =>
                  m.id === agentMessageId
                    ? {
                        ...m,
                        isError: true,
                        errorDetails: {
                          message: errMsg,
                          endpoint: `${WS_BASE}/ws/tasks`,
                          canRetry: true,
                        },
                      }
                    : m
                ),
              }));
              setTaskStatus('error');
              client.close();
            }
          },
          onError: () => {
            flushTokenBuffer();
          },
          onClose: () => {
            flushTokenBuffer();
            useIndraStore.setState({ isAgentWorking: false });
          },
        });

        taskClientRef.current = client;
        client.connect();
      } catch (err: any) {
        flushTokenBuffer();
        console.warn('Backend task execution error:', err);
        useIndraStore.setState((state) => ({
          isAgentWorking: false,
          messages: state.messages.map((m) =>
            m.id === agentMessageId
              ? {
                  ...m,
                  content: `⚠️ **Connection Error**: Unable to reach backend task scheduler at \`${API_BASE}\`.\n\n*Error: ${err.message || 'Network unreachable'}*`,
                  isError: true,
                  error: err.message,
                }
              : m
          ),
        }));
        setTaskStatus('error');
      }
    },
    [activeModel, setActiveModel, appendTokenChunk, flushTokenBuffer]
  );

  // Retry message
  const retryMessage = useCallback(
    async (messageId: string) => {
      const state = useIndraStore.getState();
      const msgIndex = state.messages.findIndex((m) => m.id === messageId);
      if (msgIndex <= 0) return;

      const prevUserMsg = state.messages[msgIndex - 1];
      if (prevUserMsg && prevUserMsg.role === 'user') {
        useIndraStore.setState({
          messages: state.messages.slice(0, msgIndex - 1),
        });
        await sendMessage(prevUserMsg.content, prevUserMsg.attachments);
      }
    },
    [sendMessage]
  );

  const value = {
    networkStatus,
    taskStatus,
    isAgentWorking,
    sendMessage,
    abortTask,
    retryMessage,
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}
