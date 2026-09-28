'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * `retry: false` : la seule tentative de récupération sur 401 (rotation du
 * jeton) est déjà gérée par `adminFetch` — un retry TanStack Query
 * supplémentaire ferait doublon (blueprint/16_Rendering_State_Strategy.md §5).
 */
export function AdminProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
