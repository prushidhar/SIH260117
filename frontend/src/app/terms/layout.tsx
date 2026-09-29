import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms & Conditions - INDRA Sovereign AI Workbench',
  description: 'Statutory engineering terms of use, deterministic calculation disclaimers, and human-in-the-loop sign-off governance.',
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
