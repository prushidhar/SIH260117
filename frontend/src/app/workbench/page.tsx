import type { Metadata } from 'next';
import CenterPane from '@/components/center-pane/CenterPane';

export const metadata: Metadata = {
  title: 'Agent Workbench',
};

export default function WorkbenchPage() {
  return <CenterPane />;
}
