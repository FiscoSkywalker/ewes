'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Mail, SlidersHorizontal, type LucideIcon } from 'lucide-react';
import { backendJson } from '@/lib/api/backend';
import { cx, focusRing } from '@/lib/admin/cx';
import { NAV_GROUPS } from '@/lib/admin/navigation';
import { MAIL_QUERY_KEY } from '@/lib/admin/settings-queries';
import type { MailOverview } from '@/lib/admin/settings';

const ICONS: Record<string, LucideIcon> = {
  'settings-general': SlidersHorizontal,
  'settings-mail': Mail,
};

/** Sections affichées : celles de la navigation du portail, seule source d'adresses et de libellés. */
const SECTIONS =
  NAV_GROUPS.flatMap((group) => group.items)
    .find((item) => item.id === 'settings')
    ?.children?.map((leaf) => ({
      id: leaf.id,
      label: leaf.label,
      href: leaf.href,
      description: leaf.description,
      icon: ICONS[leaf.id] ?? SlidersHorizontal,
    })) ?? [];

/**
 * Menu des sections de Paramètres : colonne à gauche sur grand écran (avec
 * la description de chaque section), rangée défilante sous le titre sur petit
 * écran. La section Messagerie signale d'un point (et d'un texte lu par les
 * lecteurs d'écran) un envoi d'e-mails à vérifier, sans qu'il faille ouvrir
 * l'écran pour s'en apercevoir.
 */
export function SettingsNav() {
  const pathname = usePathname();
  const mail = useQuery({
    queryKey: MAIL_QUERY_KEY,
    queryFn: () => backendJson<MailOverview>('admin/settings/mail'),
    staleTime: 30_000,
  });
  const attention = mail.data
    ? !mail.data.transport.configured || mail.data.summary.failed > 0
    : false;

  return (
    <nav aria-label="Sections des paramètres" className="lg:sticky lg:top-24">
      <ul className="flex gap-1 overflow-x-auto rounded-2xl border border-line bg-panel p-1.5 lg:flex-col lg:overflow-visible lg:p-2">
        {SECTIONS.map((section) => {
          const active = pathname === section.href;
          const Icon = section.icon;
          const flagged = section.id === 'settings-mail' && attention;
          return (
            <li key={section.id} className="shrink-0 lg:shrink">
              <Link
                href={section.href}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
                  focusRing,
                  active
                    ? 'bg-brand-soft text-brand'
                    : 'text-ink-muted hover:bg-ink/5 hover:text-ink',
                )}
              >
                <span
                  className={cx(
                    'relative grid size-8 shrink-0 place-items-center rounded-lg transition-colors',
                    active
                      ? 'bg-brand text-on-brand'
                      : 'bg-sunken text-ink-subtle group-hover:text-ink',
                  )}
                >
                  <Icon size={16} aria-hidden="true" />
                  {flagged && (
                    <span
                      aria-hidden="true"
                      className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-panel bg-warn"
                    />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block whitespace-nowrap text-[13px] font-medium">
                    {section.label}
                    {flagged && <span className="sr-only"> — à vérifier</span>}
                  </span>
                  {section.description && (
                    <span className="mt-0.5 hidden text-xs leading-snug text-ink-subtle lg:block">
                      {section.description}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
