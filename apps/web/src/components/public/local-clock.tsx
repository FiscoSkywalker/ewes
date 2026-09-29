'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { useLocale } from 'next-intl';

function subscribe(onChange: () => void) {
  const id = window.setInterval(onChange, 30_000);
  return () => window.clearInterval(id);
}

/**
 * Heure locale de Lubumbashi (CAT). Rendu serveur neutre (`--:--`) puis
 * heure réelle côté client, sans écart d'hydratation.
 */
export function LocalClock() {
  const locale = useLocale();
  const getSnapshot = useCallback(
    () =>
      new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Africa/Lubumbashi',
      }).format(new Date()),
    [locale],
  );
  const time = useSyncExternalStore(subscribe, getSnapshot, () => '--:--');

  return <time suppressHydrationWarning>{time} CAT</time>;
}
