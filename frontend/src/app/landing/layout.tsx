import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'INDRA - Sovereign Air-Gapped Industrial AI Workbench',
  description: 'On-premise engineering intelligence system for multi-sector industrial asset integrity, power generation, chemical processing, advanced manufacturing, and critical infrastructure.',
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
