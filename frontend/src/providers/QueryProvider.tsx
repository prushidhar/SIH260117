'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { setGlobalQueryClient } from '@/lib/queries';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30 * 1000,
          refetchOnWindowFocus: false,
          retry: 1,
        },
      },
    });
    setGlobalQueryClient(client);
    return client;
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
