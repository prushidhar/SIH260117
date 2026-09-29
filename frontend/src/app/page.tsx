import type { Metadata } from 'next';
import CenterPane from '@/components/center-pane/CenterPane';

export const metadata: Metadata = {
  title: 'INDRA — Sovereign Industrial AI Workbench',
  description: 'Air-gapped deterministic engineering solver, multimodal ISA-5.1 P&ID vision, and statutory code verification.',
};

export default function HomePage() {
  return <CenterPane />;
}
