import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - INDRA Sovereign AI Workbench',
  description: 'Sovereign on-premise privacy policy detailing zero-telemetry, zero-WAN egress, and client-side data custody architecture.',
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
