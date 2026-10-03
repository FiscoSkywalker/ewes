'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { FALLBACK_SITE_SETTINGS } from '@/data/contact';
import type { PublicSiteSettings } from '@/lib/site-settings';

const SiteSettingsContext = createContext<PublicSiteSettings>(
  FALLBACK_SITE_SETTINGS,
);

/**
 * Transmet aux composants client du site (bloc Contact de l'accueil, formulaire,
 * carte d'horaires) les coordonnées lues une fois côté serveur par le layout
 * public : ils n'appellent pas l'API eux-mêmes.
 */
export function SiteSettingsProvider({
  value,
  children,
}: {
  value: PublicSiteSettings;
  children: ReactNode;
}) {
  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export const useSiteSettings = () => useContext(SiteSettingsContext);
