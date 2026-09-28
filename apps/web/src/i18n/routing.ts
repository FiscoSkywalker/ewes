import { defineRouting } from 'next-intl/routing';

/**
 * FR est la langue de référence (blueprint/09_Business_Rules.md §2) :
 * une traduction EN manquante ne bloque jamais l'affichage, elle est
 * gérée au niveau du contenu (repli sur le FR), pas au niveau du routing.
 */
export const routing = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
});

export type AppLocale = (typeof routing.locales)[number];
