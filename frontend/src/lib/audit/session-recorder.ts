/**
 * INDRA DCS Session Audit Recorder
 * Captures UI interactions, parameter changes, agent invocations, and voice commands
 * Serializes into standardized .jsonl audit records conforming to ISA-101 / IEC 62443 compliance.
 */

export interface SessionAuditEvent {
  id: string;
  timestamp: string; // ISO 8601 UTC
  epoch_ms: number;
  category: 'UI_NAVIGATION' | 'PARAMETER_CHANGE' | 'HITL_ACTION' | 'AGENT_INVOCATION' | 'VOICE_COMMAND' | 'SYSTEM_EVENT';
  action: string;
  route: string;
  payload?: Record<string, unknown>;
  actor: string;
  sequence_id: number;
}

type Listener = () => void;

class SessionRecorder {
  private isRecording: boolean = false;
  private events: SessionAuditEvent[] = [];
  private startTime: number | null = null;
  private listeners: Set<Listener> = new Set();
  private sequenceCounter: number = 0;
  private storageKey = 'indra_dcs_audit_session';

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(this.storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          this.events = parsed.events || [];
          this.sequenceCounter = this.events.length;
          this.isRecording = Boolean(parsed.isRecording);
          this.startTime = parsed.startTime || null;
        }
      } catch {
        // Ignore JSON parsing errors
      }
    }
  }

  private persist() {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(this.storageKey, JSON.stringify({
          isRecording: this.isRecording,
          startTime: this.startTime,
          events: this.events,
        }));
      } catch {
        // Storage limit or private mode
      }
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  public getIsRecording(): boolean {
    return this.isRecording;
  }

  public getStartTime(): number | null {
    return this.startTime;
  }

  public getEventsCount(): number {
    return this.events.length;
  }

  public getEvents(): SessionAuditEvent[] {
    return [...this.events];
  }

  public startRecording(currentRoute: string = '/workbench') {
    if (this.isRecording) return;
    this.isRecording = true;
    this.startTime = Date.now();
    this.recordEvent({
      category: 'SYSTEM_EVENT',
      action: 'DCS_SESSION_RECORDING_STARTED',
      route: currentRoute,
      payload: { mode: 'AIR_GAP_SCADA_LOG', station: 'CONTROL_ROOM_CONSOLE_1' },
      actor: 'DCS_CHIEF_OPERATOR',
    });
    this.persist();
    this.notify();
  }

  public stopRecording(currentRoute: string = '/workbench') {
    if (!this.isRecording) return;
    this.recordEvent({
      category: 'SYSTEM_EVENT',
      action: 'DCS_SESSION_RECORDING_STOPPED',
      route: currentRoute,
      payload: { total_events: this.events.length + 1 },
      actor: 'DCS_CHIEF_OPERATOR',
    });
    this.isRecording = false;
    this.startTime = null;
    this.persist();
    this.notify();
  }

  public toggleRecording(currentRoute: string = '/workbench'): boolean {
    if (this.isRecording) {
      this.stopRecording(currentRoute);
      return false;
    } else {
      this.startRecording(currentRoute);
      return true;
    }
  }

  public recordEvent(event: {
    category: SessionAuditEvent['category'];
    action: string;
    route: string;
    payload?: Record<string, unknown>;
    actor?: string;
  }) {
    if (!this.isRecording) return;

    this.sequenceCounter += 1;
    const auditEvent: SessionAuditEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      epoch_ms: Date.now(),
      category: event.category,
      action: event.action,
      route: event.route,
      payload: event.payload || {},
      actor: event.actor || 'DCS_OPERATOR',
      sequence_id: this.sequenceCounter,
    };

    this.events.push(auditEvent);
    this.persist();
    this.notify();
  }

  public exportToJsonl(): { count: number; filename: string } {
    if (typeof window === 'undefined') return { count: 0, filename: '' };

    const lines = this.events.map(e => JSON.stringify(e));
    const jsonlContent = lines.join('\n');
    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `indra-dcs-audit-${timestampStr}.jsonl`;

    const blob = new Blob([jsonlContent], { type: 'application/x-jsonlines;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { count: this.events.length, filename };
  }

  public clearEvents() {
    this.events = [];
    this.sequenceCounter = 0;
    this.persist();
    this.notify();
  }
}

// Global singleton instance
export const sessionRecorder = new SessionRecorder();
