import Dexie, { type Table } from 'dexie';

export interface DBSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  currentTaskId?: string | null;
  messageCount?: number;
  deliverableCount?: number;
}

export interface DBMessage {
  id: string;
  sessionId: string;
  orderIndex?: number;
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
  modelUsed?: string;
  isError?: boolean;
  errorDetails?: {
    message: string;
    endpoint?: string;
    canRetry?: boolean;
    originalPrompt?: string;
  };
  agentSteps?: {
    id: string;
    label: string;
    status: 'completed' | 'in-progress' | 'pending' | 'failed';
    detail?: string;
  }[];
  toolExecution?: {
    code: string;
    output: string;
    language: string;
    toolName?: string;
  };
  attachments?: {
    id?: string;
    name: string;
    type: string;
    size: string;
    url?: string;
  }[];
}

export interface DBDeliverable {
  id: string;
  sessionId: string;
  name: string;
  filename: string;
  type: string;
  size: string;
  generatedAt: string;
  timestamp: string;
  description: string;
  url: string;
  hash?: string;
}

export interface DBToolExecution {
  id: string;
  sessionId: string;
  messageId: string;
  toolName: string;
  code: string;
  output: string;
  language: string;
  timestamp: string;
}

export interface DBNetworkEvent {
  id: string;
  timestamp: string;
  action: string;
  destination: string;
  status: 'blocked' | 'contained';
  protocol?: string;
  source?: string;
}

export interface DBMetadata {
  key: string;
  value: any;
}

export interface DBKBDocument {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  chunksCount: number;
  indexedAt: string;
  status: 'INDEXED' | 'PROCESSING' | 'ERROR';
  engine: 'WASM_VECTOR' | 'BACKEND_FASTAPI';
  contentSnippet?: string;
}

export interface DBKBChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  embedding: number[]; // 384-dimensional dense vector
  tokenCount: number;
  metadata?: Record<string, any>;
}

export class IndraLocalDB extends Dexie {
  sessions!: Table<DBSession, string>;
  messages!: Table<DBMessage, string>;
  deliverables!: Table<DBDeliverable, string>;
  toolExecutions!: Table<DBToolExecution, string>;
  networkEvents!: Table<DBNetworkEvent, string>;
  metadata!: Table<DBMetadata, string>;
  kbDocuments!: Table<DBKBDocument, string>;
  kbChunks!: Table<DBKBChunk, string>;

  constructor() {
    super('IndraLocalDB');
    this.version(1).stores({
      sessions: 'id, title, createdAt, updatedAt',
      messages: 'id, sessionId, role, timestamp, modelUsed, [sessionId+timestamp]',
      deliverables: 'id, sessionId, name, filename, type, timestamp',
      toolExecutions: 'id, sessionId, messageId, toolName, timestamp',
      networkEvents: 'id, timestamp, action, destination, status',
      metadata: 'key',
    });

    this.version(2).stores({
      sessions: 'id, title, createdAt, updatedAt',
      messages: 'id, sessionId, role, timestamp, modelUsed, [sessionId+timestamp]',
      deliverables: 'id, sessionId, name, filename, type, timestamp',
      toolExecutions: 'id, sessionId, messageId, toolName, timestamp',
      networkEvents: 'id, timestamp, action, destination, status',
      metadata: 'key',
      kbDocuments: 'id, filename, indexedAt, status, engine',
      kbChunks: 'id, documentId, chunkIndex, [documentId+chunkIndex]',
    });
  }
}

let dbInstance: IndraLocalDB | null = null;

export function getLocalDB(): IndraLocalDB | null {
  if (typeof window === 'undefined') return null;
  if (!dbInstance) {
    dbInstance = new IndraLocalDB();
  }
  return dbInstance;
}
