'use client';

import { useLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import { usePathname, useRouter } from '@/i18n/navigation';

/**
 * Seul élément interactif de la coquille publique : composant client
 * ciblé, jamais la page/layout entière (blueprint/06_Application_Architecture.md §4).
 */
export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <select
      aria-label="Langue / Language"
      className="rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) px-2 py-1 text-sm"
      value={locale}
      onChange={(event) => {
        router.replace(pathname, { locale: event.target.value });
      }}
    >
      {routing.locales.map((loc) => (
        <option key={loc} value={loc}>
          {loc.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
