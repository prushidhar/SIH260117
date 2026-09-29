import type { Metadata } from 'next';
import KnowledgeBaseView from '@/components/views/KnowledgeBaseView';

export const metadata: Metadata = {
  title: 'Offline Knowledge Base (RAG) — INDRA',
  description: 'Local WASM vector database and air-gapped document RAG store.',
};

export default function KnowledgeBaseRoutePage() {
  return <KnowledgeBaseView />;
}
