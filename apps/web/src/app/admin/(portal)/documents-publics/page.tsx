'use client';

import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { FilePlus2, Library } from 'lucide-react';
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
  SegmentedControl,
  Select,
  StatusChip,
  type Column,
} from '@/components/admin/ui';

const PAGE_SIZE = 20;

type StatusFilter = ContentStatus | 'ALL';

const COLUMNS: Column<PublicDocument>[] = [
  {
    id: 'title',
    header: 'Document',
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
    hideBelow: 'md',
    cell: (doc) => <Badge>{CATEGORY_LABELS[doc.category]}</Badge>,
  },
  {
    id: 'year',
    header: 'Année',
    hideBelow: 'lg',
    className: 'tabular-nums text-ink-muted',
    cell: (doc) => doc.year ?? '—',
  },
  {
    id: 'updatedAt',
    header: 'Modifié',
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
  const [page, setPage] = useState(1);

  const list = useQuery({
    queryKey: ['documents', 'list', status, category, page],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (status !== 'ALL') params.set('status', status);
      if (category) params.set('category', category);
      return backendJson<Paginated<PublicDocument>>(
        `admin/documents-publics?${params}`,
      );
    },
    placeholderData: keepPreviousData,
  });

  const total = list.data?.meta.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (list.data && page > lastPage) setPage(lastPage);

  const filtered = status !== 'ALL' || category !== '';
  const resetFilters = () => {
    setStatus('ALL');
    setCategory('');
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
        <SegmentedControl<StatusFilter>
          label="Filtrer par statut"
          value={status}
          onChange={(next) => {
            setStatus(next);
            setPage(1);
          }}
          options={[
            { value: 'ALL', label: 'Tous' },
            { value: 'DRAFT', label: 'Brouillons' },
            { value: 'PUBLISHED', label: 'Publiés' },
            { value: 'ARCHIVED', label: 'Archivés' },
          ]}
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
      </div>

      <DataTable
        caption="Documents publics"
        columns={COLUMNS}
        rows={list.data?.data}
        getRowId={(doc) => doc.id}
        rowHref={(doc) => `/admin/documents-publics/${doc.id}`}
        isLoading={list.isLoading}
        error={list.error}
        onRetry={() => list.refetch()}
        empty={
          filtered ? (
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
