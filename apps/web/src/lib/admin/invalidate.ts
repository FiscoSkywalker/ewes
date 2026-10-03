import type { QueryClient } from '@tanstack/react-query';

/**
 * Après un changement d'état (message traité, e-mail rejoué), rafraîchit ce
 * qui en dépend : les listes, la cloche et les pastilles du menu, les
 * compteurs du tableau de bord. Appelé une fois la réponse du serveur reçue.
 */
export function invalidatePortalData(queryClient: QueryClient) {
  return Promise.all(
    [
      'contacts',
      'emails',
      'documents',
      'realisations',
      'articles',
      'pages',
      'services',
      'key-figures',
      'experts',
      'media',
      'signals',
      'dashboard',
    ].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
  );
}
