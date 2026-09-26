import { getLocalDB, type DBSession, type DBMessage, type DBDeliverable } from './indra-db';
import type { ConversationSession, Message, Deliverable } from '@/store/indra-store';

/**
 * Saves or updates a full ConversationSession in IndexedDB.
 */
export async function saveSessionToDB(session: ConversationSession): Promise<void> {
  const db = getLocalDB();
  if (!db) return;

  try {
    await db.transaction('rw', db.sessions, db.messages, db.deliverables, db.metadata, async () => {
      const now = new Date().toISOString();
      const dbSession: DBSession = {
        id: session.id,
        title: session.title || 'Sovereign Session',
        createdAt: session.createdAt || now,
        updatedAt: now,
        currentTaskId: session.currentTaskId || null,
        messageCount: session.messages?.length || 0,
        deliverableCount: session.deliverables?.length || 0,
      };

      await db.sessions.put(dbSession);

      if (session.messages && session.messages.length > 0) {
        const dbMessages: DBMessage[] = session.messages.map((m, idx) => ({
          ...m,
          sessionId: session.id,
          orderIndex: (m as any).orderIndex ?? idx,
        }));
        await db.messages.bulkPut(dbMessages);
      }

      if (session.deliverables && session.deliverables.length > 0) {
        const dbDeliverables: DBDeliverable[] = session.deliverables.map((d) => ({
          ...d,
          sessionId: session.id,
        }));
        await db.deliverables.bulkPut(dbDeliverables);
      }

      await db.metadata.put({ key: 'lastActiveSessionId', value: session.id });
    });
  } catch (err) {
    console.warn('[IndexedDB] Failed to save session:', err);
  }
}

/**
 * Loads a specific session with all its messages and deliverables from IndexedDB.
 */
export async function loadSessionFromDB(sessionId: string): Promise<ConversationSession | null> {
  const db = getLocalDB();
  if (!db) return null;

  try {
    const s = await db.sessions.get(sessionId);
    if (!s) return null;

    const messages = await db.messages.where('sessionId').equals(sessionId).toArray();
    messages.sort((a: any, b: any) => {
      if (typeof a.orderIndex === 'number' && typeof b.orderIndex === 'number') {
        return a.orderIndex - b.orderIndex;
      }
      const matchA = a.id?.match(/\d{10,15}/);
      const matchB = b.id?.match(/\d{10,15}/);
      const tsA = matchA ? parseInt(matchA[0], 10) + (a.role === 'agent' ? 0.5 : 0) : 0;
      const tsB = matchB ? parseInt(matchB[0], 10) + (b.role === 'agent' ? 0.5 : 0) : 0;
      return tsA - tsB;
    });
    const deliverables = await db.deliverables.where('sessionId').equals(sessionId).toArray();

    return {
      id: s.id,
      title: s.title,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      currentTaskId: s.currentTaskId || null,
      messages: (messages as Message[]) || [],
      deliverables: (deliverables as Deliverable[]) || [],
    };
  } catch (err) {
    console.warn('[IndexedDB] Failed to load session:', err);
    return null;
  }
}

/**
 * Loads the most recently active session on boot for zero-latency UI rendering.
 */
export async function loadLastActiveSession(): Promise<ConversationSession | null> {
  const db = getLocalDB();
  if (!db) return null;

  try {
    const meta = await db.metadata.get('lastActiveSessionId');
    if (meta && meta.value) {
      const active = await loadSessionFromDB(meta.value);
      if (active) return active;
    }

    // Fallback: most recently updated session
    const lastSession = await db.sessions.orderBy('updatedAt').last();
    if (lastSession) {
      return await loadSessionFromDB(lastSession.id);
    }
  } catch (err) {
    console.warn('[IndexedDB] Failed to load last active session:', err);
  }

  return null;
}

/**
 * Lists all stored sessions for the sidebar conversation history.
 */
export async function listAllSessions(): Promise<DBSession[]> {
  const db = getLocalDB();
  if (!db) return [];

  try {
    return await db.sessions.orderBy('updatedAt').reverse().toArray();
  } catch (err) {
    console.warn('[IndexedDB] Failed to list sessions:', err);
    return [];
  }
}

/**
 * Deletes a session and its associated messages and deliverables.
 */
export async function deleteSessionFromDB(sessionId: string): Promise<void> {
  const db = getLocalDB();
  if (!db) return;

  try {
    await db.transaction('rw', db.sessions, db.messages, db.deliverables, async () => {
      await db.sessions.delete(sessionId);
      await db.messages.where('sessionId').equals(sessionId).delete();
      await db.deliverables.where('sessionId').equals(sessionId).delete();
    });
  } catch (err) {
    console.warn('[IndexedDB] Failed to delete session:', err);
  }
}

/**
 * Clears all sessions, messages, and deliverables from IndexedDB.
 */
export async function clearAllSessionsFromDB(): Promise<void> {
  const db = getLocalDB();
  if (!db) return;

  try {
    await db.transaction('rw', db.sessions, db.messages, db.deliverables, db.metadata, async () => {
      await db.sessions.clear();
      await db.messages.clear();
      await db.deliverables.clear();
      await db.metadata.clear();
    });
  } catch (err) {
    console.warn('[IndexedDB] Failed to clear all sessions:', err);
  }
}

/**
 * Appends or updates a single message directly in IndexedDB.
 */
export async function appendMessageToDB(sessionId: string, message: Message): Promise<void> {
  const db = getLocalDB();
  if (!db) return;

  try {
    const dbMsg: DBMessage = {
      ...message,
      sessionId,
    };
    await db.messages.put(dbMsg);
    await db.sessions.where('id').equals(sessionId).modify({ updatedAt: new Date().toISOString() });
  } catch (err) {
    console.warn('[IndexedDB] Failed to append message:', err);
  }
}

/**
 * Appends a deliverable directly into IndexedDB.
 */
export async function appendDeliverableToDB(sessionId: string, deliverable: Deliverable): Promise<void> {
  const db = getLocalDB();
  if (!db) return;

  try {
    const dbDeliv: DBDeliverable = {
      ...deliverable,
      sessionId,
    };
    await db.deliverables.put(dbDeliv);
    await db.sessions.where('id').equals(sessionId).modify({ updatedAt: new Date().toISOString() });
  } catch (err) {
    console.warn('[IndexedDB] Failed to append deliverable:', err);
  }
}
