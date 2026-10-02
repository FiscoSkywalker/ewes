'use client';

import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { FilePlus2, Library, SearchX } from 'lucide-react';
import { backendJson, type Paginated } from '@/lib/api/backend';
import { relativeTime } from '@/lib/admin/format';
import {
  CATEGORY_LABELS,
  DOCUMENT_CATEGORIES,
  type ContentStatus,
  type DocumentCategory,
  type PublicDocument,
} from '@/lib/admin/public-documents';
import { PageHeader } from '@/components/admin/page-header';
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
  StatusChip,
  useDebouncedValue,
  type Column,
  type SortState,
} from '@/components/admin/ui';

const PAGE_SIZE = 20;

type StatusFilter = ContentStatus | 'ALL';

/** `meta.statuses` : effectifs par statut, hors filtre de statut (recherche et catégorie comprises). */
type DocumentsPage = Paginated<PublicDocument> & {
  meta: { statuses: Partial<Record<ContentStatus, number>> };
};

/** Colonne triable → champ de tri de l'API (`sort` de `GET /admin/documents-publics`). */
const SORT_FIELDS: Record<string, string> = {
  title: 'titleFr',
  category: 'category',
  year: 'year',
  updatedAt: 'updatedAt',
};

const DEFAULT_SORT: SortState = { id: 'updatedAt', direction: 'desc' };

const COLUMNS: Column<PublicDocument>[] = [
  {
    id: 'title',
    header: 'Document',
    sortable: true,
    className: 'min-w-56 max-w-md',
    cell: (doc) => (
      <span className="block">
        <span className="block truncate font-medium text-ink">
          {doc.titleFr}
        </span>
        <span className="block truncate font-mono text-[11.5px] text-ink-subtle">
          {doc.slug}
        </span>
      </span>
    ),
  },
  {
    id: 'category',
    header: 'Catégorie',
    sortable: true,
    hideBelow: 'md',
    cell: (doc) => <Badge>{CATEGORY_LABELS[doc.category]}</Badge>,
  },
  {
    id: 'year',
    header: 'Année',
    sortable: true,
    firstDirection: 'desc',
    hideBelow: 'lg',
    className: 'tabular-nums text-ink-muted',
    cell: (doc) => doc.year ?? '—',
  },
  {
    id: 'updatedAt',
    header: 'Modifié',
    sortable: true,
    firstDirection: 'desc',
    hideBelow: 'sm',
    className: 'whitespace-nowrap text-ink-muted',
    cell: (doc) => (
      <time
        dateTime={doc.updatedAt}
        title={new Date(doc.updatedAt).toLocaleString('fr')}
      >
        {relativeTime(doc.updatedAt)}
      </time>
    ),
  },
  {
    id: 'status',
    header: 'Statut',
    align: 'end',
    cell: (doc) => <StatusChip kind="content" value={doc.status} />,
  },
];

export default function PublicDocumentsPage() {
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [category, setCategory] = useState<DocumentCategory | ''>('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim());

  const list = useQuery({
    queryKey: ['documents', 'list', status, category, q, sort, page],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        sort: SORT_FIELDS[sort.id],
        order: sort.direction,
      });
      if (status !== 'ALL') params.set('status', status);
      if (category) params.set('category', category);
      if (q) params.set('q', q);
      return backendJson<DocumentsPage>(`admin/documents-publics?${params}`);
    },
    placeholderData: keepPreviousData,
  });

  const total = list.data?.meta.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (list.data && page > lastPage) setPage(lastPage);

  // Effectifs de la même requête que la liste : aucune requête de plus par onglet.
  const counts = list.data?.meta.statuses;
  const countOf = (value: ContentStatus) =>
    counts ? (counts[value] ?? 0) : undefined;
  const all = counts
    ? (counts.DRAFT ?? 0) + (counts.PUBLISHED ?? 0) + (counts.ARCHIVED ?? 0)
    : undefined;

  const filtered = status !== 'ALL' || category !== '' || q !== '';
  const resetFilters = () => {
    setStatus('ALL');
    setCategory('');
    setSearch('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Contenus du site"
        title="Documents publics"
        description="Rapports, guides, fiches techniques, brochures et certificats téléchargeables sur le site. Un document reste en brouillon tant que vous ne l’avez pas publié."
        actions={
          <ButtonLink href="/admin/documents-publics/nouveau" icon={FilePlus2}>
            Publier un document
          </ButtonLink>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          label="Rechercher un document"
          placeholder="Rechercher par titre, slug ou description…"
          value={search}
          onValueChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          className="w-full sm:w-80"
        />
        <Select
          aria-label="Filtrer par catégorie"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value as DocumentCategory | '');
            setPage(1);
          }}
          className="w-52"
        >
          <option value="">Toutes les catégories</option>
          {DOCUMENT_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {CATEGORY_LABELS[value]}
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
        caption="Documents publics"
        columns={COLUMNS}
        rows={list.data?.data}
        getRowId={(doc) => doc.id}
        rowHref={(doc) => `/admin/documents-publics/${doc.id}`}
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
              description={`Aucun document ne correspond à « ${q} » avec ces filtres.`}
              action={
                <Button variant="secondary" size="sm" onClick={resetFilters}>
                  Effacer la recherche et les filtres
                </Button>
              }
            />
          ) : filtered ? (
            <EmptyState
              icon={Library}
              title="Aucun document pour ces filtres"
              action={
                <Button variant="secondary" size="sm" onClick={resetFilters}>
                  Effacer les filtres
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Library}
              title="Aucun document pour le moment"
              description="Téléversez un premier PDF : il restera en brouillon jusqu’à sa publication."
              action={
                <ButtonLink
                  href="/admin/documents-publics/nouveau"
                  icon={FilePlus2}
                  size="sm"
                >
                  Publier un document
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
          itemLabel="documents"
        />
      )}
    </div>
  );
}
