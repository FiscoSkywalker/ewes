export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

/** Préférence de thème du portail : confort par navigateur, rien de sensible. */
export const THEME_STORAGE_KEY = 'ewes.admin.theme';

/**
 * Exécuté de façon synchrone dans le <head> du portail, avant le premier
 * rendu : pose `data-theme` sur <html> d'après la préférence enregistrée (ou
 * celle du système), pour éviter tout flash de thème au chargement. En cas
 * d'accès refusé au stockage (navigation privée stricte), retombe sur le
 * thème du système.
 */
export const themeBootScript = `(function(){var d=document.documentElement,p;try{p=localStorage.getItem('${THEME_STORAGE_KEY}')}catch(e){}var dark=p==='dark'||(p!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);d.dataset.theme=dark?'dark':'light'})();`;

export function readThemePreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    if (value === 'light' || value === 'dark') return value;
  } catch {
    // Stockage indisponible : préférence système.
  }
  return 'system';
}

export function writeThemePreference(preference: ThemePreference) {
  try {
    if (preference === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Préférence non mémorisée : elle reste appliquée pour cette visite.
  }
}

export function systemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}
