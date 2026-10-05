'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx, focusRing } from '@/lib/admin/cx';
import { navigationFor, resolveRoute } from '@/lib/admin/navigation';
import { useSession } from '../session';

/**
 * Raccourcis entre les écrans de l'espace documentaire, sur petit écran
 * seulement : la barre latérale y est repliée dans un tiroir, et passer de
 * l'explorateur à la recherche ne doit pas coûter deux gestes. Les entrées
 * viennent de la navigation du portail (mêmes adresses, mêmes rôles).
 */
export function DocsNav() {
  const pathname = usePathname();
  const session = useSession();
  const items =
    navigationFor(session.role).find((group) => group.id === 'documentaire')
      ?.items ?? [];
  const activeId = resolveRoute(pathname)?.item.id;

  if (items.length < 2) return null;
  return (
    <nav
      aria-label="Espace documentaire"
      className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:hidden"
    >
      <ul className="flex w-max gap-1.5">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'flex h-10 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-medium transition-colors',
                  focusRing,
                  active
                    ? 'border-transparent bg-brand text-on-brand'
                    : 'border-line-strong bg-panel text-ink-muted hover:text-ink',
                )}
              >
                <item.icon size={15} aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
