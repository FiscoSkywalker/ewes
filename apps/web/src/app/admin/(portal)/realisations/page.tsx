'use client';

import { useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  Briefcase,
  Building2,
  CalendarRange,
  EyeOff,
  LayoutGrid,
  List,
  MapPin,
  Plus,
  SearchX,
  Star,
} from 'lucide-react';
import { backendJson, type Paginated } from '@/lib/api/backend';
import { cx, focusRing } from '@/lib/admin/cx';
import { relativeTime } from '@/lib/admin/format';
import type { ContentStatus } from '@/lib/admin/public-documents';
import {
  REALISATION_TYPES,
  TYPE_LABELS,
  periodLabel,
  type Realisation,
  type RealisationType,
} from '@/lib/admin/realisations';
import { PageHeader } from '@/components/admin/page-header';
import {
  Badge,
  Button,
  ButtonLink,
  DataTable,
  EmptyState,
  ErrorState,
  Pagination,
  SearchInput,
  SegmentedControl,
  Select,
  Skeleton,
  StatusChip,
  useDebouncedValue,
  type BadgeTone,
  type Column,
  type SortState,
} from '@/components/admin/ui';

const PAGE_SIZE = 18;
const VIEW_KEY = 'ewes.admin.realisations.view';

type StatusFilter = ContentStatus | 'ALL';
type View = 'table' | 'cards';

/** `meta.statuses` : effectifs par statut, hors filtre de statut (recherche et type compris). */
type RealisationsPage = Paginated<Realisation> & {
  meta: { statuses: Partial<Record<ContentStatus, number>> };
};

/** Colonne triable → champ de tri de l'API (`sort` de `GET /admin/realisations`). */
const SORT_FIELDS: Record<string, string> = {
  title: 'titleFr',
  type: 'projectType',
  period: 'year',
  updatedAt: 'updatedAt',
};

const DEFAULT_SORT: SortState = { id: 'period', direction: 'desc' };

/** Tris proposés en vue cartes (la vue tableau trie par ses en-têtes). */
const CARD_SORTS: { value: string; label: string; sort: SortState }[] = [
  { value: 'recent', label: 'Plus récentes', sort: DEFAULT_SORT },
  {
    value: 'updated',
    label: 'Modifiées récemment',
    sort: { id: 'updatedAt', direction: 'desc' },
  },
  {
    value: 'title',
    label: 'Titre (A → Z)',
    sort: { id: 'title', direction: 'asc' },
  },
];

const TYPE_TONE: Record<RealisationType, BadgeTone> = {
  EIES: 'env',
  AUDIT: 'ing',
  MONITORING: 'brand',
  AGREMENT: 'ok',
  FORMATION: 'warn',
  ETUDE: 'neutral',
};

function TypeBadge({ type }: { type: RealisationType | null }) {
  return type ? (
    <Badge tone={TYPE_TONE[type]}>{TYPE_LABELS[type].tag}</Badge>
  ) : (
    <Badge tone="warn">Type à préciser</Badge>
  );
}

const COLUMNS: Column<Realisation>[] = [
  {
    id: 'title',
    header: 'Mission',
    sortable: true,
    className: 'min-w-64 max-w-lg',
    cell: (r) => (
      <span className="block">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-medium text-ink">{r.titleFr}</span>
          {r.isFeatured && (
            <Star
              size={13}
              aria-label="En vitrine"
              className="shrink-0 fill-warn text-warn"
            />
          )}
        </span>
        <span className="block truncate text-xs text-ink-subtle">
          {[r.clientName, r.location].filter(Boolean).join(' · ') || r.slug}
        </span>
      </span>
    ),
  },
  {
    id: 'type',
    header: 'Type',
    sortable: true,
    hideBelow: 'md',
    cell: (r) => <TypeBadge type={r.projectType} />,
  },
  {
    id: 'period',
    header: 'Période',
    sortable: true,
    firstDirection: 'desc',
    hideBelow: 'sm',
    className: 'whitespace-nowrap tabular-nums text-ink-muted',
    cell: (r) => periodLabel(r) ?? '—',
  },
  {
    id: 'updatedAt',
    header: 'Modifiée',
    sortable: true,
    firstDirection: 'desc',
    hideBelow: 'lg',
    className: 'whitespace-nowrap text-ink-muted',
    cell: (r) => (
      <time
        dateTime={r.updatedAt}
        title={new Date(r.updatedAt).toLocaleString('fr')}
      >
        {relativeTime(r.updatedAt)}
      </time>
    ),
  },
  {
    id: 'status',
    header: 'Statut',
    align: 'end',
    cell: (r) => <StatusChip kind="content" value={r.status} feminine />,
  },
];

function readView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'cards' ? 'cards' : 'table';
  } catch {
    return 'table';
  }
}

export default function RealisationsPage() {
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [type, setType] = useState<RealisationType | ''>('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  // Le portail ne s'affiche qu'une fois la session connue (côté navigateur) : lecture directe sans risque d'écart serveur.
  const [view, setView] = useState<View>(readView);
  const q = useDebouncedValue(search.trim());

  const list = useQuery({
    queryKey: ['realisations', 'list', status, type, q, sort, page],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        sort: SORT_FIELDS[sort.id],
        order: sort.direction,
      });
      if (status !== 'ALL') params.set('status', status);
      if (type) params.set('projectType', type);
      if (q) params.set('q', q);
      return backendJson<RealisationsPage>(`admin/realisations?${params}`);
    },
    placeholderData: keepPreviousData,
  });

  const total = list.data?.meta.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (list.data && page > lastPage) setPage(lastPage);

  const counts = list.data?.meta.statuses;
  const countOf = (value: ContentStatus) =>
    counts ? (counts[value] ?? 0) : undefined;
  const all = counts
    ? (counts.DRAFT ?? 0) + (counts.PUBLISHED ?? 0) + (counts.ARCHIVED ?? 0)
    : undefined;

  const filtered = status !== 'ALL' || type !== '' || q !== '';
  const resetFilters = () => {
    setStatus('ALL');
    setType('');
    setSearch('');
    setPage(1);
  };
  const changeView = (next: View) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // Préférence non mémorisée : elle vaut pour cette visite.
    }
  };

  const empty = q ? (
    <EmptyState
      icon={SearchX}
      title="Aucun résultat"
      description={`Aucune réalisation ne correspond à « ${q} » avec ces filtres.`}
      action={
        <Button variant="secondary" size="sm" onClick={resetFilters}>
          Effacer la recherche et les filtres
        </Button>
      }
    />
  ) : filtered ? (
    <EmptyState
      icon={Briefcase}
      title="Aucune réalisation pour ces filtres"
      action={
        <Button variant="secondary" size="sm" onClick={resetFilters}>
          Effacer les filtres
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={Briefcase}
      title="Aucune réalisation pour le moment"
      description="Créez une première fiche : elle restera en brouillon jusqu’à sa publication."
      action={
        <ButtonLink href="/admin/realisations/nouvelle" icon={Plus} size="sm">
          Nouvelle réalisation
        </ButtonLink>
      }
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Contenus du site"
        title="Réalisations"
        description="Le portfolio d’EWES : missions menées, classées par type, année et lieu. Une fiche reste en brouillon tant que vous ne l’avez pas publiée."
        actions={
          <ButtonLink href="/admin/realisations/nouvelle" icon={Plus}>
            Nouvelle réalisation
          </ButtonLink>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          label="Rechercher une réalisation"
          placeholder="Titre, client, lieu ou slug…"
          value={search}
          onValueChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          className="w-full sm:w-72"
        />
        <Select
          aria-label="Filtrer par type de mission"
          value={type}
          onChange={(event) => {
            setType(event.target.value as RealisationType | '');
            setPage(1);
          }}
          className="w-52"
        >
          <option value="">Tous les types</option>
          {REALISATION_TYPES.map((value) => (
            <option key={value} value={value}>
              {TYPE_LABELS[value].label}
            </option>
          ))}
        </Select>
        <SegmentedControl<StatusFilter>
          label="Filtrer par statut"
          value={status}
          onChange={(next) => {
            setStatus(next);
            setPage(1);
          }}
          options={[
            { value: 'ALL', label: 'Toutes', count: all },
            { value: 'DRAFT', label: 'Brouillons', count: countOf('DRAFT') },
            {
              value: 'PUBLISHED',
              label: 'Publiées',
              count: countOf('PUBLISHED'),
            },
            {
              value: 'ARCHIVED',
              label: 'Archivées',
              count: countOf('ARCHIVED'),
            },
          ]}
        />
        <div className="ml-auto flex items-center gap-2">
          {view === 'cards' && (
            <Select
              aria-label="Trier les réalisations"
              value={
                CARD_SORTS.find(
                  (s) =>
                    s.sort.id === sort.id &&
                    s.sort.direction === sort.direction,
                )?.value ?? ''
              }
              onChange={(event) => {
                const next = CARD_SORTS.find(
                  (s) => s.value === event.target.value,
                );
                if (next) {
                  setSort(next.sort);
                  setPage(1);
                }
              }}
              className="w-48"
            >
              {!CARD_SORTS.some(
                (s) =>
                  s.sort.id === sort.id && s.sort.direction === sort.direction,
              ) && <option value="">Tri personnalisé</option>}
              {CARD_SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          )}
          <ViewToggle view={view} onChange={changeView} />
        </div>
      </div>

      {view === 'table' ? (
        <DataTable
          caption="Réalisations"
          columns={COLUMNS}
          rows={list.data?.data}
          getRowId={(r) => r.id}
          rowHref={(r) => `/admin/realisations/${r.id}`}
          sort={sort}
          onSortChange={(next) => {
            setSort(next);
            setPage(1);
          }}
          isLoading={list.isLoading}
          error={list.error}
          onRetry={() => list.refetch()}
          empty={empty}
        />
      ) : (
        <CardGrid
          rows={list.data?.data}
          isLoading={list.isLoading}
          error={list.error}
          onRetry={() => list.refetch()}
          empty={empty}
        />
      )}

      {list.data && total > 0 && (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
          itemLabel="réalisations"
        />
      )}
    </div>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: View;
  onChange: (view: View) => void;
}) {
  const options = [
    { value: 'table', label: 'Vue liste', icon: List },
    { value: 'cards', label: 'Vue cartes', icon: LayoutGrid },
  ] as const;
  return (
    <div
      role="group"
      aria-label="Affichage"
      className="inline-flex gap-0.5 rounded-lg bg-sunken p-1"
    >
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={view === value}
          aria-label={label}
          title={label}
          onClick={() => onChange(value)}
          className={cx(
            'grid size-8 place-items-center rounded-md transition-[background-color,color,box-shadow]',
            focusRing,
            view === value
              ? 'bg-raised text-ink shadow-[0_1px_2px_rgba(16,42,52,.12)]'
              : 'text-ink-muted hover:text-ink',
          )}
        >
          <Icon size={16} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

function CardGrid({
  rows,
  isLoading,
  error,
  onRetry,
  empty,
}: {
  rows: Realisation[] | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  empty: React.ReactNode;
}) {
  if (isLoading && !rows?.length) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Chargement"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
    );
  }
  if (error && !rows?.length) {
    return (
      <div className="rounded-2xl border border-line bg-panel">
        <ErrorState error={error} onRetry={onRetry} />
      </div>
    );
  }
  if (rows && rows.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-panel">{empty}</div>
    );
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {rows?.map((r, index) => (
        <li key={r.id}>
          <RealisationCard realisation={r} index={index} />
        </li>
      ))}
    </ul>
  );
}

function RealisationCard({
  realisation: r,
  index,
}: {
  realisation: Realisation;
  index: number;
}) {
  const period = periodLabel(r);
  return (
    <Link
      href={`/admin/realisations/${r.id}`}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      className={cx(
        'animate-rise-in group flex h-full flex-col rounded-2xl border border-line bg-panel p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-panel',
        focusRing,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex flex-col gap-2">
          <span className="text-[26px] font-semibold leading-none tracking-tight text-ink tabular-nums">
            {period ?? <span className="text-ink-subtle">—</span>}
          </span>
          <TypeBadge type={r.projectType} />
        </span>
        <span className="flex items-center gap-2">
          {r.isFeatured && (
            <Star
              size={16}
              aria-label="En vitrine"
              className="fill-warn text-warn"
            />
          )}
          <StatusChip kind="content" value={r.status} feminine />
        </span>
      </div>

      <h3 className="mt-4 line-clamp-3 text-[15px] font-semibold leading-snug text-ink">
        {r.titleFr}
      </h3>

      <ul className="mt-3 space-y-1.5 text-xs text-ink-muted">
        {r.location && (
          <li className="flex items-center gap-2">
            <MapPin
              size={13}
              aria-hidden="true"
              className="shrink-0 text-ink-subtle"
            />
            <span className="truncate">{r.location}</span>
          </li>
        )}
        {r.clientName && (
          <li className="flex items-center gap-2">
            <Building2
              size={13}
              aria-hidden="true"
              className="shrink-0 text-ink-subtle"
            />
            <span className="truncate">{r.clientName}</span>
            {!r.isClientPublic && (
              <span
                title="Le nom du client n’est pas affiché sur le site"
                className="inline-flex shrink-0 items-center gap-1 text-ink-subtle"
              >
                <EyeOff size={12} aria-hidden="true" />
                <span className="sr-only">Nom non affiché sur le site</span>
              </span>
            )}
          </li>
        )}
        {!r.location && !r.clientName && (
          <li className="flex items-center gap-2 text-ink-subtle">
            <CalendarRange size={13} aria-hidden="true" className="shrink-0" />
            Localisation et client non renseignés
          </li>
        )}
      </ul>

      <div className="mt-auto flex items-center justify-between pt-4 text-[11.5px] text-ink-subtle">
        <span>Modifiée {relativeTime(r.updatedAt)}</span>
        <ArrowUpRight
          size={15}
          aria-hidden="true"
          className="opacity-0 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100"
        />
      </div>
    </Link>
  );
}
