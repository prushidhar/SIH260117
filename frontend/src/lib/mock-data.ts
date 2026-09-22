// Zero mock data - All data is fetched dynamically from the live FastAPI backend (http://localhost:8000)
import type { NetworkEvent, ModelStatus, Deliverable, RAGSource } from '@/store/indra-store';

export const INITIAL_MODELS: ModelStatus[] = [];
export const DEMO_NETWORK_EVENTS: NetworkEvent[] = [];
export const DEMO_RAG_SOURCES: RAGSource[] = [];
export const DEMO_DELIVERABLES: Deliverable[] = [];
