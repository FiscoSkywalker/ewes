'use client';

import Link from 'next/link';
import { ChevronRight, Menu, Search } from 'lucide-react';
import type { ResolvedRoute } from '@/lib/admin/navigation';

interface Crumb {
  label: string;
  href?: string;
}

/** Fil d'Ariane déduit de la navigation : groupe › module › sous-entrée › détail. */
function crumbsFor(route: ResolvedRoute | null): Crumb[] {
  if (!route) return [{ label: 'Portail' }];
  const crumbs: Crumb[] = [];
  if (route.group) crumbs.push({ label: route.group.label });
  const showLeaf = route.leaf && route.leaf.href !== route.item.href;
  crumbs.push({
    label: route.item.label,
    href:
      showLeaf || route.isDetail || route.leaf ? route.item.href : undefined,
  });
  if (showLeaf) {
    crumbs.push({
      label: route.leaf!.label,
      href: route.isDetail ? route.leaf!.href : undefined,
    });
  }
  if (route.isDetail) crumbs.push({ label: 'Détail' });
  return crumbs;
}

interface TopbarProps {
  route: ResolvedRoute | null;
  onOpenMenu: () => void;
  onOpenPalette: () => void;
  /** Raccourci affiché : ⌘ sur Mac, Ctrl ailleurs. */
  modKey: string;
  actions: React.ReactNode;
}

export function Topbar({
  route,
  onOpenMenu,
  onOpenPalette,
  modKey,
  actions,
}: TopbarProps) {
  const crumbs = crumbsFor(route);
  const current = crumbs.length - 1;

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-panel/80 px-3 backdrop-blur-xl sm:px-4">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Ouvrir le menu"
        aria-controls="portal-sidebar"
        className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-ink/5 hover:text-ink lg:hidden"
      >
        <Menu size={19} aria-hidden="true" />
      </button>

      <nav aria-label="Fil d’Ariane" className="min-w-0 flex-1">
        <ol className="flex min-w-0 items-center gap-1 text-[13px]">
          {crumbs.map((crumb, index) => {
            const isCurrent = index === current;
            return (
              <li
                key={`${crumb.label}-${index}`}
                className={`flex min-w-0 items-center gap-1 ${
                  // Sur mobile, seul l'écran courant est affiché.
                  isCurrent ? '' : 'max-md:hidden'
                }`}
              >
                {index > 0 && (
                  <ChevronRight
                    size={14}
                    aria-hidden="true"
                    className="shrink-0 text-ink-subtle/70 max-md:hidden"
                  />
                )}
                {crumb.href && !isCurrent ? (
                  <Link
                    href={crumb.href}
                    className="truncate rounded px-1 text-ink-muted transition-colors hover:text-ink"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    aria-current={isCurrent ? 'page' : undefined}
                    className={`truncate px-1 ${isCurrent ? 'font-medium text-ink' : 'text-ink-subtle'}`}
                  >
                    {crumb.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <button
        type="button"
        onClick={onOpenPalette}
        aria-label="Rechercher ou aller à…"
        aria-keyshortcuts="Control+K Meta+K"
        className="group flex h-9 shrink-0 items-center gap-2 rounded-lg border border-line bg-sunken/70 px-2.5 text-[13px] text-ink-subtle transition-colors hover:border-line-strong hover:text-ink-muted max-sm:w-9 max-sm:justify-center max-sm:border-transparent max-sm:bg-transparent max-sm:px-0 sm:w-56 lg:w-72"
      >
        <Search size={16} aria-hidden="true" className="shrink-0" />
        <span className="hidden flex-1 text-left sm:block">
          Rechercher ou aller à…
        </span>
        <kbd className="hidden items-center gap-0.5 rounded-md border border-line-strong bg-raised px-1.5 py-0.5 font-mono text-[10px] text-ink-subtle sm:flex">
          {modKey} K
        </kbd>
      </button>

      <div className="flex shrink-0 items-center gap-1">{actions}</div>
    </header>
  );
}
