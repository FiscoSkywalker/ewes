'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  readThemePreference,
  systemTheme,
  writeThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from '@/lib/admin/theme';

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  /** `origin` : point (en px) d'où part la révélation circulaire. */
  setPreference: (
    preference: ThemePreference,
    origin?: { x: number; y: number },
  ) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function currentDomTheme(): ResolvedTheme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function applyTheme(next: ResolvedTheme, origin?: { x: number; y: number }) {
  const root = document.documentElement;
  if (root.dataset.theme === next) return;

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;
  if (!origin || reducedMotion || !document.startViewTransition) {
    root.dataset.theme = next;
    return;
  }

  // Rayon nécessaire pour couvrir l'écran depuis le point d'origine.
  const radius = Math.hypot(
    Math.max(origin.x, window.innerWidth - origin.x),
    Math.max(origin.y, window.innerHeight - origin.y),
  );
  root.style.setProperty('--theme-x', `${origin.x}px`);
  root.style.setProperty('--theme-y', `${origin.y}px`);
  root.style.setProperty('--theme-r', `${radius}px`);
  root.classList.add('theme-transition');

  const transition = document.startViewTransition(() => {
    root.dataset.theme = next;
  });
  transition.finished.finally(() => {
    root.classList.remove('theme-transition');
  });
}

/**
 * Thème clair/sombre du portail. Le thème initial est déjà posé sur <html>
 * par le script de `app/admin/layout.tsx` ; ce fournisseur ne fait que le
 * suivre (préférence enregistrée, changement du thème système).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    typeof window === 'undefined' ? 'system' : readThemePreference(),
  );
  const [resolved, setResolved] = useState<ResolvedTheme>(currentDomTheme);

  useEffect(() => {
    if (preference !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const next = systemTheme();
      applyTheme(next);
      setResolved(next);
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference]);

  const setPreference = useCallback<ThemeContextValue['setPreference']>(
    (next, origin) => {
      const nextResolved = next === 'system' ? systemTheme() : next;
      writeThemePreference(next);
      setPreferenceState(next);
      setResolved(nextResolved);
      applyTheme(nextResolved, origin);
    },
    [],
  );

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context)
    throw new Error('useTheme doit être utilisé sous ThemeProvider');
  return context;
}
