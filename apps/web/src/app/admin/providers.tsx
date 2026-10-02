'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/admin/theme-provider';

/**
 * `retry: false` : la seule tentative de récupération sur 401 (rotation du
 * jeton) est déjà gérée par `adminFetch` — un retry TanStack Query
 * supplémentaire ferait doublon (blueprint/16_Rendering_State_Strategy.md §5).
 *
 * Mutations `networkMode: 'always'` : hors connexion, TanStack Query mettrait
 * sinon l'envoi en pause (bouton bloqué sur « en cours », sans message) ; ici
 * il échoue aussitôt avec une erreur réseau explicite et le formulaire garde
 * sa saisie (blueprint/05_UI_UX_System.md §5).
 */
export function AdminProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false },
          mutations: { retry: false, networkMode: 'always' },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}
