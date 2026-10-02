'use client';

import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Newspaper, Plus, SearchX } from 'lucide-react';
import { backendJson, type Paginated } from '@/lib/api/backend';
import { relativeTime } from '@/lib/admin/format';
import {
  ARTICLE_TYPES,
  TYPE_LABELS,
  coverOf,
  publicationDate,
  type Article,
  type ArticleType,
} from '@/lib/admin/articles';
import { thumbOf } from '@/lib/admin/media';
import type { ContentStatus } from '@/lib/admin/public-documents';
import { PageHeader } from '@/components/admin/page-header';
import { PublicationBadge } from '@/components/admin/content/publication-badge';
import {
  Badge,
  Button,
  ButtonLink,
  DataTable,
  EmptyState,
  Pagination,
  SearchInput,
  SegmentedControl,
  Select,
  useDebouncedValue,
  type Column,
  type SortState,
} from '@/components/admin/ui';

const PAGE_SIZE = 20;

type StatusFilter = ContentStatus | 'ALL';

/** `meta.statuses` : effectifs par statut, hors filtre de statut (recherche et rubrique comprises). */
type ArticlesPage = Paginated<Article> & {
  meta: { statuses: Partial<Record<ContentStatus, number>> };
};

/** Colonne triable → champ de tri de l'API (`sort` de `GET /admin/articles`). */
const SORT_FIELDS: Record<string, string> = {
  title: 'titleFr',
  type: 'type',
  published: 'publishedAt',
  updatedAt: 'updatedAt',
};

const DEFAULT_SORT: SortState = { id: 'updatedAt', direction: 'desc' };

const COLUMNS: Column<Article>[] = [
  {
    id: 'title',
    header: 'Article',
    sortable: true,
    className: 'min-w-64 max-w-lg',
    cell: (a) => {
      const cover = coverOf(a);
      return (
        <span className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-sunken text-ink-subtle">
            {cover ? (
              // Image publique servie par l'API via `/uploads/*` : pas d'optimisation Next nécessaire dans le portail.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbOf(cover.url)}
                alt=""
                loading="lazy"
                className="size-full object-cover"
              />
            ) : (
              <Newspaper size={18} aria-hidden="true" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium text-ink">
              {a.titleFr}
            </span>
            <span className="block truncate text-xs text-ink-subtle">
              {a.contextFr ?? a.slug}
            </span>
          </span>
        </span>
      );
    },
  },
  {
    id: 'type',
    header: 'Rubrique',
    sortable: true,
    hideBelow: 'md',
    cell: (a) => <Badge>{TYPE_LABELS[a.type]}</Badge>,
  },
  {
    id: 'published',
    header: 'Parution',
    sortable: true,
    firstDirection: 'desc',
    hideBelow: 'sm',
    className: 'whitespace-nowrap text-ink-muted',
    cell: (a) => publicationDate(a) ?? '—',
  },
  {
    id: 'updatedAt',
    header: 'Modifié',
    sortable: true,
    firstDirection: 'desc',
    hideBelow: 'lg',
    className: 'whitespace-nowrap text-ink-muted',
    cell: (a) => (
      <time
        dateTime={a.updatedAt}
        title={new Date(a.updatedAt).toLocaleString('fr')}
      >
        {relativeTime(a.updatedAt)}
      </time>
    ),
  },
  {
    id: 'status',
    header: 'Statut',
    align: 'end',
    cell: (a) => (
      <PublicationBadge status={a.status} publishedAt={a.publishedAt} />
    ),
  },
];

export default function ArticlesPage() {
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [type, setType] = useState<ArticleType | ''>('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim());

  const list = useQuery({
    queryKey: ['articles', 'list', status, type, q, sort, page],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        sort: SORT_FIELDS[sort.id],
        order: sort.direction,
      });
      if (status !== 'ALL') params.set('status', status);
      if (type) params.set('type', type);
      if (q) params.set('q', q);
      return backendJson<ArticlesPage>(`admin/articles?${params}`);
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Contenus du site"
        title="Actualités & publications"
        description="Actualités, événements, formations, communiqués, enquêtes et publications. Un article reste en brouillon tant que vous ne l’avez pas publié ; une date future programme sa parution."
        actions={
          <ButtonLink href="/admin/actualites/nouveau" icon={Plus}>
            Nouvel article
          </ButtonLink>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          label="Rechercher un article"
          placeholder="Titre, résumé, contexte ou slug…"
          value={search}
          onValueChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          className="w-full sm:w-72"
        />
        <Select
          aria-label="Filtrer par rubrique"
          value={type}
          onChange={(event) => {
            setType(event.target.value as ArticleType | '');
            setPage(1);
          }}
          className="w-48"
        >
          <option value="">Toutes les rubriques</option>
          {ARTICLE_TYPES.map((value) => (
            <option key={value} value={value}>
              {TYPE_LABELS[value]}
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
            { value: 'ALL', label: 'Tous', count: all },
            { value: 'DRAFT', label: 'Brouillons', count: countOf('DRAFT') },
            {
              value: 'PUBLISHED',
              label: 'Publiés',
              count: countOf('PUBLISHED'),
            },
            {
              value: 'ARCHIVED',
              label: 'Archivés',
              count: countOf('ARCHIVED'),
            },
          ]}
        />
      </div>

      <DataTable
        caption="Actualités et publications"
        columns={COLUMNS}
        rows={list.data?.data}
        getRowId={(a) => a.id}
        rowHref={(a) => `/admin/actualites/${a.id}`}
        sort={sort}
        onSortChange={(next) => {
          setSort(next);
          setPage(1);
        }}
        isLoading={list.isLoading}
        error={list.error}
        onRetry={() => list.refetch()}
        empty={
          q ? (
            <EmptyState
              icon={SearchX}
              title="Aucun résultat"
              description={`Aucun article ne correspond à « ${q} » avec ces filtres.`}
              action={
                <Button variant="secondary" size="sm" onClick={resetFilters}>
                  Effacer la recherche et les filtres
                </Button>
              }
            />
          ) : filtered ? (
            <EmptyState
              icon={Newspaper}
              title="Aucun article pour ces filtres"
              action={
                <Button variant="secondary" size="sm" onClick={resetFilters}>
                  Effacer les filtres
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Newspaper}
              title="Aucun article pour le moment"
              description="Rédigez un premier article : il restera en brouillon jusqu’à sa publication."
              action={
                <ButtonLink
                  href="/admin/actualites/nouveau"
                  icon={Plus}
                  size="sm"
                >
                  Nouvel article
                </ButtonLink>
              }
            />
          )
        }
      />

      {list.data && total > 0 && (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
          itemLabel="articles"
        />
      )}
    </div>
  );
}
