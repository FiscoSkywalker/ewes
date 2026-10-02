'use client';

import Link from 'next/link';
import { useQueries, useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  FilePlus2,
  History,
  Inbox,
  Library,
  MailWarning,
  Newspaper,
  Plus,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { backendJson, type Paginated } from '@/lib/api/backend';
import { formatLongDate, plural, relativeTime } from '@/lib/admin/format';
import {
  firstNameOf,
  initialsOf,
  useSession,
} from '@/components/admin/session';
import { TopoLines } from '@/components/admin/topo-lines';
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingRegion,
  Skeleton,
  SkeletonText,
  StatusChip,
} from '@/components/admin/ui';

type Tone = 'brand' | 'env' | 'ing' | 'bad';

const TONE: Record<Tone, { tile: string; glow: string }> = {
  brand: { tile: 'bg-brand-soft text-brand', glow: 'from-brand/12' },
  env: { tile: 'bg-env-soft text-env', glow: 'from-env/12' },
  ing: { tile: 'bg-ing-soft text-ing', glow: 'from-ing/12' },
  bad: { tile: 'bg-bad-soft text-bad', glow: 'from-bad/12' },
};

interface Pending {
  id: string;
  label: string;
  caption: string;
  doneCaption: string;
  href: string;
  icon: LucideIcon;
  tone: Tone;
  /** Chemin d'API renvoyant une liste paginée ; seul `meta.total` est lu. */
  source: string;
  adminOnly?: boolean;
}

/**
 * « Le tableau de bord affiche par défaut les éléments nécessitant une
 * action » (blueprint/14_Admin_Backoffice.md §5) : messages non traités,
 * brouillons en attente, incidents d'envoi.
 */
const PENDING: Pending[] = [
  {
    id: 'contacts',
    label: 'Messages à traiter',
    caption: 'reçus via le formulaire de contact',
    doneCaption: 'Aucun message en attente',
    href: '/admin/contacts',
    icon: Inbox,
    tone: 'brand',
    source: 'admin/contacts?status=NOUVEAU&limit=1',
  },
  {
    id: 'realisations',
    label: 'Réalisations en brouillon',
    caption: 'à relire avant publication',
    doneCaption: 'Aucun brouillon',
    href: '/admin/realisations',
    icon: BriefcaseBusiness,
    tone: 'ing',
    source: 'admin/realisations?status=DRAFT&limit=1',
  },
  {
    id: 'articles',
    label: 'Articles en brouillon',
    caption: 'actualités et publications',
    doneCaption: 'Aucun brouillon',
    href: '/admin/actualites',
    icon: Newspaper,
    tone: 'brand',
    source: 'admin/articles?status=DRAFT&limit=1',
  },
  {
    id: 'documents',
    label: 'Documents en brouillon',
    caption: 'documents publics non publiés',
    doneCaption: 'Aucun brouillon',
    href: '/admin/documents-publics',
    icon: Library,
    tone: 'env',
    source: 'admin/documents-publics?status=DRAFT&limit=1',
  },
  {
    id: 'emails',
    label: 'E-mails en échec',
    caption: 'envois à rejouer',
    doneCaption: 'Tous les envois ont abouti',
    href: '/admin/emails',
    icon: MailWarning,
    tone: 'bad',
    source: 'admin/notifications?status=failed&limit=1',
    adminOnly: true,
  },
];

const QUICK_ACTIONS: {
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}[] = [
  {
    label: 'Nouvelle réalisation',
    href: '/admin/realisations/nouvelle',
    icon: Plus,
  },
  {
    label: 'Nouvel article',
    href: '/admin/actualites/nouveau',
    icon: FilePlus2,
  },
  {
    label: 'Publier un document',
    href: '/admin/documents-publics/nouveau',
    icon: Library,
  },
  {
    label: 'Inviter un utilisateur',
    href: '/admin/utilisateurs/nouveau',
    icon: UserPlus,
    adminOnly: true,
  },
];

export default function AdminDashboardPage() {
  const session = useSession();
  const isAdmin = session.role === 'ADMINISTRATEUR';
  const pending = PENDING.filter((item) => isAdmin || !item.adminOnly);

  return (
    <div className="space-y-8">
      <Hero
        firstName={firstNameOf(session.fullName)}
        pending={pending}
        actions={QUICK_ACTIONS.filter((a) => isAdmin || !a.adminOnly)}
      />

      <section aria-labelledby="pending-title">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="pending-title" className="text-sm font-semibold text-ink">
            À traiter
          </h2>
          <span className="text-xs text-ink-subtle">
            Mis à jour automatiquement
          </span>
        </div>
        <div
          className={`grid grid-cols-2 gap-3 lg:grid-cols-3 ${pending.length > 4 ? 'xl:grid-cols-5' : 'xl:grid-cols-4'}`}
        >
          {pending.map((item, index) => (
            <PendingCard key={item.id} item={item} index={index} />
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <LatestMessages />
        {isAdmin ? <RecentActivity /> : <ContentShortcuts />}
      </div>
    </div>
  );
}

function pendingQuery(item: Pending) {
  return {
    queryKey: ['dashboard', 'pending', item.id],
    queryFn: () => backendJson<Paginated<unknown>>(item.source),
    select: (page: Paginated<unknown>) => page.meta.total,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  };
}

function Hero({
  firstName,
  pending,
  actions,
}: {
  firstName: string;
  pending: Pending[];
  actions: typeof QUICK_ACTIONS;
}) {
  return (
    <section className="animate-rise-in relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-sunken via-panel to-panel px-6 py-7 sm:px-8 sm:py-9">
      <TopoLines className="pointer-events-none absolute inset-0 h-full w-full text-brand opacity-[0.16] dark:opacity-[0.22]" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-env/10 blur-3xl"
      />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-subtle first-letter:uppercase">
            {formatLongDate(new Date())}
          </p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-ink sm:text-[34px]">
            Bonjour, {firstName}
          </h1>
          <PendingSummary pending={pending} />
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map(({ label, href, icon: Icon }, index) => (
            <Link
              key={href}
              href={href}
              className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-[13px] font-medium transition-all hover:-translate-y-px ${
                index === 0
                  ? 'bg-brand text-on-brand shadow-[0_8px_20px_-8px_var(--ui-brand)] hover:bg-brand-strong'
                  : 'border border-line-strong bg-panel/70 text-ink backdrop-blur hover:border-brand/40 hover:bg-panel'
              }`}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/** « 4 éléments attendent votre attention » — somme des compteurs déjà chargés. */
function PendingSummary({ pending }: { pending: Pending[] }) {
  const counts = useQueries({ queries: pending.map(pendingQuery) });
  const loading = counts.some((c) => c.isLoading);
  const total = counts.reduce((sum, c) => sum + (c.data ?? 0), 0);
  const failed = counts.some((c) => c.isError);

  let text: string;
  if (loading) text = 'Chargement de votre synthèse…';
  else if (total > 0)
    text = `${plural(total, 'élément attend', 'éléments attendent')} votre attention.`;
  else if (failed)
    text = 'Une partie de la synthèse est momentanément indisponible.';
  else text = 'Tout est à jour. Bonne journée !';

  return (
    <p className="mt-2 text-sm text-ink-muted" aria-live="polite">
      {text}
    </p>
  );
}

function PendingCard({ item, index }: { item: Pending; index: number }) {
  const { data, isLoading, isError } = useQuery(pendingQuery(item));
  const tone = TONE[item.tone];
  const Icon = item.icon;
  const done = data === 0;

  return (
    <Link
      href={item.href}
      style={{ animationDelay: `${60 + index * 50}ms` }}
      className={`animate-rise-in group relative overflow-hidden rounded-2xl border border-line bg-panel p-3.5 transition-all duration-200 sm:p-4 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-panel`}
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone.glow} to-transparent to-60% opacity-0 transition-opacity group-hover:opacity-100`}
      />
      <div className="relative flex items-start justify-between">
        <span
          className={`grid size-9 place-items-center rounded-xl ${tone.tile}`}
        >
          <Icon size={18} aria-hidden="true" />
        </span>
        <ArrowUpRight
          size={16}
          aria-hidden="true"
          className="text-ink-subtle opacity-0 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100"
        />
      </div>
      <div className="relative mt-4">
        {isLoading ? (
          <span className="portal-skeleton block h-8 w-12 rounded-md" />
        ) : (
          <span className="block text-[30px] font-semibold leading-none tracking-tight text-ink tabular-nums">
            {isError ? '—' : data}
          </span>
        )}
        <p className="mt-2 text-[13px] font-medium text-ink">{item.label}</p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-subtle">
          {isError ? (
            'Indisponible pour le moment'
          ) : done ? (
            <>
              <CheckCircle2 size={13} aria-hidden="true" className="text-ok" />
              {item.doneCaption}
            </>
          ) : (
            item.caption
          )}
        </p>
      </div>
    </Link>
  );
}

// --- Derniers messages ---

interface ContactRow {
  id: string;
  name: string;
  organization: string | null;
  message: string;
  status: 'NOUVEAU' | 'TRAITE';
  createdAt: string;
}

/** Carte du tableau de bord : `Card` du kit + lien « Tout voir ». */
function Panel({
  title,
  href,
  hrefLabel,
  children,
}: {
  title: string;
  href?: string;
  hrefLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <Card
      title={title}
      padding="none"
      className="animate-rise-in [animation-delay:200ms]"
      actions={
        href && (
          <Link
            href={href}
            className="text-xs font-medium text-brand hover:text-brand-strong"
          >
            {hrefLabel}
          </Link>
        )
      }
    >
      {children}
    </Card>
  );
}

function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <LoadingRegion>
      <ul className="divide-y divide-line">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="flex items-center gap-3 px-5 py-3.5">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <span className="flex-1">
              <SkeletonText lines={2} />
            </span>
          </li>
        ))}
      </ul>
    </LoadingRegion>
  );
}

function LatestMessages() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard', 'latest-contacts'],
    queryFn: () => backendJson<Paginated<ContactRow>>('admin/contacts?limit=5'),
    refetchInterval: 60_000,
  });

  return (
    <Panel
      title="Derniers messages"
      href="/admin/contacts"
      hrefLabel="Tout voir"
    >
      {isLoading ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorState
          error={error}
          onRetry={() => refetch()}
          retrying={isRefetching}
        />
      ) : !data?.data.length ? (
        <EmptyState
          icon={Inbox}
          title="Aucun message reçu"
          description="Les demandes envoyées depuis la page Contact du site apparaîtront ici."
        />
      ) : (
        <ul className="divide-y divide-line">
          {data.data.map((message) => (
            <li key={message.id}>
              <Link
                href={`/admin/contacts/${message.id}`}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-ink/[0.03]"
              >
                <span
                  aria-hidden="true"
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-sunken text-xs font-semibold text-ink-muted"
                >
                  {initialsOf(message.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-medium text-ink">
                      {message.name}
                    </span>
                    {message.organization && (
                      <span className="truncate text-xs text-ink-subtle">
                        · {message.organization}
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-xs text-ink-muted">
                    {message.message}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <StatusChip kind="contact" value={message.status} />
                  <span className="text-[11px] text-ink-subtle">
                    {relativeTime(message.createdAt)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

// --- Activité récente (Administrateur) ---

interface AuditRow {
  id: string;
  action: string;
  entityType: string;
  /** `null` : action du système, ou compte supprimé depuis (acteur anonymisé). */
  actor: { id: string; fullName: string } | null;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  ACCESS_GRANTED: 'Droit d’accès attribué',
  ACCESS_REVOKED: 'Droit d’accès révoqué',
  CONTACT_STATUS_CHANGED: 'Statut d’un message modifié',
  DOCUMENT_UPLOADED: 'Document privé téléversé',
  DOCUMENT_UPDATED: 'Document privé modifié',
  DOCUMENT_DELETED: 'Document privé supprimé',
  DOCUMENT_DOWNLOADED: 'Document privé téléchargé',
  DOCUMENT_ARCHIVED: 'Document privé archivé',
  DOCUMENT_RESTORED: 'Document privé restauré',
  DOCUMENT_ACCESS_DENIED: 'Accès refusé à un document',
  FOLDER_ACCESS_DENIED: 'Accès refusé à un dossier',
  FOLDER_CREATED: 'Dossier créé',
  FOLDER_UPDATED: 'Dossier modifié',
  FOLDER_DELETED: 'Dossier supprimé',
  PUBLIC_DOCUMENT_PUBLISHED: 'Document public publié',
  PUBLIC_DOCUMENT_UNPUBLISHED: 'Document public dépublié',
  PUBLIC_DOCUMENT_ARCHIVED: 'Document public archivé',
  PUBLIC_DOCUMENT_DELETED: 'Document public supprimé',
  REALISATION_PUBLISHED: 'Réalisation publiée',
  REALISATION_UNPUBLISHED: 'Réalisation dépubliée',
  REALISATION_ARCHIVED: 'Réalisation archivée',
  REALISATION_DELETED: 'Réalisation supprimée',
  ARTICLE_PUBLISHED: 'Article publié',
  ARTICLE_UNPUBLISHED: 'Article dépublié',
  ARTICLE_ARCHIVED: 'Article archivé',
  ARTICLE_DELETED: 'Article supprimé',
};

function actionLabel(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  const text = action.toLowerCase().replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function RecentActivity() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard', 'audit'],
    queryFn: () => backendJson<Paginated<AuditRow>>('admin/audit-logs?limit=6'),
    refetchInterval: 60_000,
  });

  return (
    <Panel
      title="Activité récente"
      href="/admin/audit"
      hrefLabel="Journal complet"
    >
      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : error ? (
        <ErrorState
          error={error}
          onRetry={() => refetch()}
          retrying={isRefetching}
        />
      ) : !data?.data.length ? (
        <EmptyState
          icon={History}
          title="Aucune action enregistrée"
          description="Les actions sensibles (droits, documents, messages) seront tracées ici."
        />
      ) : (
        <ol className="px-5 py-3">
          {data.data.map((entry, index) => {
            const denied = entry.action.endsWith('_DENIED');
            return (
              <li key={entry.id} className="relative flex gap-3 pb-4 last:pb-1">
                {index < data.data.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute left-[15px] top-8 bottom-0 w-px bg-line-strong"
                  />
                )}
                <span
                  className={`relative grid size-8 shrink-0 place-items-center rounded-full ring-4 ring-panel ${
                    denied ? 'bg-bad-soft text-bad' : 'bg-sunken text-ink-muted'
                  }`}
                >
                  <History size={14} aria-hidden="true" />
                </span>
                <span className="min-w-0 pt-1">
                  <span className="block text-[13px] text-ink">
                    {actionLabel(entry.action)}
                  </span>
                  <span className="block text-[11px] text-ink-subtle">
                    {entry.actor?.fullName ?? 'Système'} ·{' '}
                    {relativeTime(entry.createdAt)}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}

// --- Raccourcis (Gestionnaire) ---

const SHORTCUTS: {
  label: string;
  href: string;
  icon: LucideIcon;
  tone: Tone;
}[] = [
  {
    label: 'Réalisations',
    href: '/admin/realisations',
    icon: BriefcaseBusiness,
    tone: 'ing',
  },
  {
    label: 'Actualités',
    href: '/admin/actualites',
    icon: Newspaper,
    tone: 'brand',
  },
  {
    label: 'Documents publics',
    href: '/admin/documents-publics',
    icon: Library,
    tone: 'env',
  },
  { label: 'Messages', href: '/admin/contacts', icon: Inbox, tone: 'brand' },
];

function ContentShortcuts() {
  return (
    <Panel title="Raccourcis">
      <div className="grid grid-cols-2 gap-3 p-4">
        {SHORTCUTS.map(({ label, href, icon: Icon, tone }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col gap-3 rounded-xl border border-line p-4 transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-panel"
          >
            <span
              className={`grid size-9 place-items-center rounded-xl ${TONE[tone].tile}`}
            >
              <Icon size={18} aria-hidden="true" />
            </span>
            <span className="text-[13px] font-medium text-ink">{label}</span>
          </Link>
        ))}
      </div>
    </Panel>
  );
}
