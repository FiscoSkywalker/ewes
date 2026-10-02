'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, CircleDashed, Hammer } from 'lucide-react';
import { resolveRoute, type NavTone } from '@/lib/admin/navigation';
import { homePathFor } from '@/lib/admin/roles';
import { PageHeader } from '@/components/admin/page-header';
import { useSession } from '@/components/admin/session';
import { PortalNotFound } from '@/components/admin/states';
import { TopoLines } from '@/components/admin/topo-lines';

const TONE_TILE: Record<NavTone, string> = {
  brand: 'from-brand to-[#2f7f86] text-white dark:text-[#06161b]',
  env: 'from-env to-[#2f7f86] text-white dark:text-[#06161b]',
  ing: 'from-ing to-[#c47a3c] text-white dark:text-[#2a1206]',
  neutral: 'from-ink-muted to-ink-subtle text-white dark:text-[#06161b]',
};

const TONE_TEXT: Record<NavTone, string> = {
  brand: 'text-brand',
  env: 'text-env',
  ing: 'text-ing',
  neutral: 'text-ink-muted',
};

/**
 * Écran d'attente des modules du portail : chaque entrée de la navigation a
 * déjà son adresse, son fil d'Ariane et ses règles d'accès ; tant que l'écran
 * réel n'existe pas, cette page présente honnêtement ce qu'il permettra de
 * faire. Un écran réel (`app/admin/(portal)/<module>/page.tsx`) remplace
 * automatiquement cette route attrape-tout pour son adresse.
 */
export default function ModulePlaceholderPage() {
  const pathname = usePathname();
  const session = useSession();
  const route = resolveRoute(pathname);

  if (!route) return <PortalNotFound homeHref={homePathFor(session.role)} />;

  const { group, item, leaf, isDetail } = route;
  const entry = leaf ?? item;
  const tone = item.tone ?? 'brand';
  const Icon = item.icon;
  const features = entry.features ?? item.features ?? [];
  const siblings = (item.children ?? []).filter(
    (child) => child.id !== leaf?.id,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={[group?.label, leaf ? item.label : null]
          .filter(Boolean)
          .join(' · ')}
        title={isDetail ? `${entry.label} — détail` : entry.label}
        description={entry.description ?? item.description}
      />

      <section className="animate-rise-in relative overflow-hidden rounded-3xl border border-line bg-panel [animation-delay:80ms]">
        <TopoLines
          className={`pointer-events-none absolute inset-0 h-full w-full opacity-[0.12] ${TONE_TEXT[tone]}`}
        />
        <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[auto_1fr] lg:items-center">
          <div className="relative mx-auto lg:mx-0">
            <span
              className={`grid size-28 place-items-center rounded-[28px] bg-gradient-to-br shadow-pop ${TONE_TILE[tone]}`}
            >
              <Icon size={44} strokeWidth={1.6} aria-hidden="true" />
            </span>
            <span className="absolute -bottom-2 -right-2 grid size-10 place-items-center rounded-2xl border border-line bg-raised text-ink-muted shadow-panel">
              <Hammer size={18} aria-hidden="true" />
            </span>
          </div>

          <div>
            <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-warn-soft px-2.5 text-xs font-medium text-warn">
              <CircleDashed size={13} aria-hidden="true" />
              Écran en préparation
            </span>
            <h2 className="mt-3 text-lg font-semibold text-ink">
              Cet écran arrive dans une prochaine version du portail
            </h2>
            {features.length > 0 && (
              <>
                <p className="mt-1 text-sm text-ink-muted">
                  Vous pourrez ici :
                </p>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 rounded-xl border border-line bg-sunken/60 px-3.5 py-2.5 text-[13px] text-ink"
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-1.5 size-1.5 shrink-0 rounded-full bg-current ${TONE_TEXT[tone]}`}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </section>

      {siblings.length > 0 && (
        <section
          aria-labelledby="siblings-title"
          className="animate-rise-in [animation-delay:160ms]"
        >
          <h2
            id="siblings-title"
            className="mb-3 text-sm font-semibold text-ink"
          >
            Dans la rubrique « {item.label} »
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {siblings.map((child) => (
              <Link
                key={child.id}
                href={child.href}
                className="group flex items-center gap-3 rounded-2xl border border-line bg-panel p-4 transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-panel"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-ink">
                    {child.label}
                  </span>
                  {child.description && (
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">
                      {child.description}
                    </span>
                  )}
                </span>
                <ArrowRight
                  size={16}
                  aria-hidden="true"
                  className="shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
