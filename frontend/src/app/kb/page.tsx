import type { Metadata } from 'next';
import KnowledgeBaseView from '@/components/views/KnowledgeBaseView';

export const metadata: Metadata = {
  title: 'Offline Knowledge Base (RAG)',
};

export default function KnowledgeBasePage() {
  return <KnowledgeBaseView />;
}
