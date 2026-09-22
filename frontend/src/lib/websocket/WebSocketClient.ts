export type WebSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface WebSocketClientOptions {
  url: string;
  initialDelay?: number;
  maxDelay?: number;
  factor?: number;
  jitter?: number;
  maxRetries?: number;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
  autoReconnect?: boolean;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onMessage?: (data: any) => void;
  onStatusChange?: (status: WebSocketStatus) => void;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private options: Required<WebSocketClientOptions>;
  private status: WebSocketStatus = 'disconnected';
  private retryCount = 0;
  private reconnectTimer: any = null;
  private heartbeatIntervalTimer: any = null;
  private heartbeatTimeoutTimer: any = null;
  private messageQueue: string[] = [];
  private isIntentionallyClosed = false;

  constructor(options: WebSocketClientOptions) {
    this.options = {
      url: options.url,
      initialDelay: options.initialDelay ?? 1000,
      maxDelay: options.maxDelay ?? 15000,
      factor: options.factor ?? 1.5,
      jitter: options.jitter ?? 1000,
      maxRetries: options.maxRetries ?? 15,
      heartbeatInterval: options.heartbeatInterval ?? 20000,
      heartbeatTimeout: options.heartbeatTimeout ?? 35000,
      autoReconnect: options.autoReconnect ?? true,
      onOpen: options.onOpen ?? (() => {}),
      onClose: options.onClose ?? (() => {}),
      onError: options.onError ?? (() => {}),
      onMessage: options.onMessage ?? (() => {}),
      onStatusChange: options.onStatusChange ?? (() => {}),
    };
  }

  private setStatus(status: WebSocketStatus) {
    if (this.status !== status) {
      this.status = status;
      this.options.onStatusChange(status);
    }
  }

  public getStatus(): WebSocketStatus {
    return this.status;
  }

  public connect(): void {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isIntentionallyClosed = false;
    this.clearTimers();
    this.setStatus(this.retryCount > 0 ? 'reconnecting' : 'connecting');

    try {
      this.ws = new WebSocket(this.options.url);

      this.ws.onopen = () => {
        this.retryCount = 0;
        this.setStatus('connected');
        this.startHeartbeat();
        this.drainQueue();
        this.options.onOpen();
      };

      this.ws.onmessage = (event) => {
        this.resetHeartbeatWatchdog();
        try {
          const data = JSON.parse(event.data);
          // If message is a pong response, absorb it
          if (data && (data.type === 'pong' || data.event === 'pong')) {
            return;
          }
          this.options.onMessage(data);
        } catch {
          // Plain text or non-json message
          this.options.onMessage(event.data);
        }
      };

      this.ws.onerror = (event) => {
        this.options.onError(event);
      };

      this.ws.onclose = (event) => {
        this.stopHeartbeat();
        this.options.onClose(event);

        if (!this.isIntentionallyClosed && this.options.autoReconnect) {
          this.scheduleReconnect();
        } else {
          this.setStatus('disconnected');
        }
      };
    } catch (err) {
      console.warn(`[WebSocketClient] Failed to instantiate WebSocket for ${this.options.url}:`, err);
      if (this.options.autoReconnect && !this.isIntentionallyClosed) {
        this.scheduleReconnect();
      } else {
        this.setStatus('error');
      }
    }
  }

  public send(payload: string | object): boolean {
    const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(raw);
        return true;
      } catch (err) {
        console.warn(`[WebSocketClient] Send failed on ${this.options.url}, enqueueing:`, err);
        this.messageQueue.push(raw);
        return false;
      }
    } else {
      // Buffer outgoing messages while disconnected or reconnecting
      this.messageQueue.push(raw);
      if (this.status === 'disconnected' && !this.isIntentionallyClosed) {
        this.connect();
      }
      return false;
    }
  }

  private drainQueue(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift();
      if (msg) {
        try {
          this.ws.send(msg);
        } catch (err) {
          console.warn(`[WebSocketClient] Failed to drain queued message, re-queueing:`, err);
          this.messageQueue.unshift(msg);
          break;
        }
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.retryCount >= this.options.maxRetries) {
      console.warn(`[WebSocketClient] Max reconnect retries (${this.options.maxRetries}) reached for ${this.options.url}`);
      this.setStatus('error');
      return;
    }

    this.retryCount++;
    this.setStatus('reconnecting');

    // Exponential backoff with randomized jitter
    const exponential = this.options.initialDelay * Math.pow(this.options.factor, this.retryCount - 1);
    const delay = Math.min(exponential, this.options.maxDelay) + Math.random() * this.options.jitter;

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    if (this.options.heartbeatInterval <= 0) return;

    this.heartbeatIntervalTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        } catch {
          // Socket write failed
        }
      }
    }, this.options.heartbeatInterval);

    this.resetHeartbeatWatchdog();
  }

  private resetHeartbeatWatchdog(): void {
    if (this.heartbeatTimeoutTimer) clearTimeout(this.heartbeatTimeoutTimer);
    if (this.options.heartbeatTimeout <= 0) return;

    this.heartbeatTimeoutTimer = setTimeout(() => {
      console.warn(`[WebSocketClient] Heartbeat timeout on ${this.options.url}. Terminating dead socket.`);
      if (this.ws) {
        try {
          this.ws.close(4000, 'Heartbeat timeout');
        } catch {}
      }
    }, this.options.heartbeatTimeout);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatIntervalTimer) clearInterval(this.heartbeatIntervalTimer);
    if (this.heartbeatTimeoutTimer) clearTimeout(this.heartbeatTimeoutTimer);
    this.heartbeatIntervalTimer = null;
    this.heartbeatTimeoutTimer = null;
  }

  private clearTimers(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.stopHeartbeat();
  }

  public close(): void {
    this.isIntentionallyClosed = true;
    this.clearTimers();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.setStatus('disconnected');
    this.messageQueue = [];
  }
}
