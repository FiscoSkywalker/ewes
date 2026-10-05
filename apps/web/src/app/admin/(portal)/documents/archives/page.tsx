'use client';

import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Archive, ArchiveRestore, SearchX } from 'lucide-react';
import { backendJson, type Paginated } from '@/lib/api/backend';
import { plural } from '@/lib/admin/format';
import { DOCS_KEY, type PrivateDocument } from '@/lib/admin/private-docs';
import { PageHeader } from '@/components/admin/page-header';
import { Note } from '@/components/admin/private-docs/dialog-parts';
import { DocumentList } from '@/components/admin/private-docs/document-list';
import { useFolders } from '@/components/admin/private-docs/use-folders';
import {
  Button,
  ButtonLink,
  EmptyState,
  Pagination,
  SearchInput,
  Select,
  useDebouncedValue,
} from '@/components/admin/ui';

const PAGE_SIZE = 20;

const SORTS = {
  recent: { label: 'Archivés récemment', sort: 'updatedAt', order: 'desc' },
  old: { label: 'Archivés depuis longtemps', sort: 'updatedAt', order: 'asc' },
  nameAsc: { label: 'Nom (A → Z)', sort: 'name', order: 'asc' },
  largest: { label: 'Plus lourds', sort: 'fileSizeBytes', order: 'desc' },
} as const;
type SortKey = keyof typeof SORTS;

/**
 * Archives : les documents sortis de leur dossier mais conservés. Ils restent
 * consultables et téléchargeables selon les mêmes droits ; qui peut écrire
 * dans le dossier d'origine peut les restaurer (blueprint/11 §5).
 */
export default function PrivateArchivesPage() {
  const { index } = useFolders();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim(), 350);
  // Une recherche passe par la route plein texte (classée par pertinence), sinon par la liste triable.
  const searching = q.length >= 2;

  const list = useQuery({
    queryKey: [DOCS_KEY, 'archives', searching ? q : '', sort, page],
    queryFn: () => {
      const params = new URLSearchParams({
        status: 'ARCHIVED',
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (searching) {
        params.set('q', q);
        return backendJson<Paginated<PrivateDocument>>(
          `documents-prives/search?${params}`,
        );
      }
      params.set('sort', SORTS[sort].sort);
      params.set('order', SORTS[sort].order);
      return backendJson<Paginated<PrivateDocument>>(
        `documents-prives/files?${params}`,
      );
    },
    placeholderData: keepPreviousData,
  });

  const total = list.data?.meta.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (list.data && page > lastPage) setPage(lastPage);
  const canRestore = list.data?.data.some((document) => document.canWrite);
  // Rien d'archivé du tout : ni barre d'outils ni encadré, un seul état vide.
  const none = Boolean(list.data) && total === 0 && !searching;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Espace documentaire"
        title="Archives"
        description="Les documents archivés quittent leur dossier mais restent consultables et téléchargeables, avec les mêmes droits d’accès."
      />

      {!none && (
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            label="Rechercher dans les archives"
            placeholder="Rechercher dans les archives…"
            value={search}
            onValueChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            enterKeyHint="search"
            className="w-full sm:w-80"
          />
          {!searching && total > 1 && (
            <Select
              aria-label="Trier les archives"
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as SortKey);
                setPage(1);
              }}
              className="w-full sm:w-60"
            >
              {Object.entries(SORTS).map(([key, option]) => (
                <option key={key} value={key}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
          {list.data && total > 0 && (
            <p
              className="text-[13px] text-ink-muted sm:ml-auto"
              role="status"
              aria-live="polite"
            >
              {plural(total, 'document archivé', 'documents archivés')}
            </p>
          )}
        </div>
      )}

      <DocumentList
        label="Documents archivés"
        documents={list.data?.data}
        index={index}
        isLoading={list.isLoading}
        error={list.error}
        onRetry={() => list.refetch()}
        showFolder
        quickRestore
        highlight={searching ? q : undefined}
        empty={
          searching ? (
            <EmptyState
              icon={SearchX}
              title={`Aucune archive pour « ${q} »`}
              description="Le document est peut-être encore actif : cherchez-le dans tout l’espace documentaire."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSearch('')}
                  >
                    Effacer la recherche
                  </Button>
                  <ButtonLink
                    href={`/admin/documents/recherche?q=${encodeURIComponent(q)}`}
                    variant="secondary"
                    size="sm"
                  >
                    Chercher partout
                  </ButtonLink>
                </div>
              }
            />
          ) : (
            <EmptyState
              icon={Archive}
              size="page"
              title="Aucun document archivé"
              description="Quand un document n’est plus d’actualité, archivez-le depuis son dossier : il quitte la liste courante sans être perdu, et se retrouve ici."
              action={
                <ButtonLink href="/admin/documents" variant="secondary">
                  Ouvrir les dossiers
                </ButtonLink>
              }
            />
          )
        }
      />

      {total > PAGE_SIZE && (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
          itemLabel="documents archivés"
        />
      )}

      {canRestore && (
        <Note icon={ArchiveRestore}>
          <strong className="font-semibold text-ink">Restaurer</strong> remet un
          document dans son dossier d’origine. Sur téléphone, ouvrez la fiche du
          document pour le restaurer.
        </Note>
      )}
    </div>
  );
}
