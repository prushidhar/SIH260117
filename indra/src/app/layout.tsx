import type { Metadata } from 'next';
import './globals.css';
import 'katex/dist/katex.min.css';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import QueryProvider from '@/providers/QueryProvider';
import WebSocketProvider from '@/providers/WebSocketProvider';
import { VoiceCommandProvider } from '@/providers/VoiceCommandProvider';
import AppShell from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: {
    default: 'INDRA — Industrial Neural Decision & Reasoning Assistant',
    template: '%s — INDRA',
  },
  description: 'Air-gapped, on-premise sovereign AI workbench for industrial plant operations',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-[#f8fafc] dark:bg-[#0a0a0a]">
      <body className="h-full bg-[#f8fafc] dark:bg-[#0a0a0a] text-slate-900 dark:text-zinc-100 antialiased overflow-hidden select-none">
        <ErrorBoundary>
          <QueryProvider>
            <WebSocketProvider>
              <VoiceCommandProvider>
                <AppShell>
                  {children}
                </AppShell>
              </VoiceCommandProvider>
            </WebSocketProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
