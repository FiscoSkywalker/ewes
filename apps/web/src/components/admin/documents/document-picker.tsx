'use client';

import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { FileText, SearchX } from 'lucide-react';
import { backendJson, type Paginated } from '@/lib/api/backend';
import { cx, focusRing } from '@/lib/admin/cx';
import { plural } from '@/lib/admin/format';
import {
  CATEGORY_LABELS,
  type PublicDocument,
} from '@/lib/admin/public-documents';
import {
  Badge,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  LoadingRegion,
  Pagination,
  SearchInput,
  Skeleton,
  StatusChip,
  useDebouncedValue,
} from '../ui';

const PAGE_SIZE = 10;

export interface DocumentPickerProps {
  open: boolean;
  onClose: () => void;
  /** Reçoit les documents cochés, dans l'ordre où ils l'ont été. */
  onConfirm: (documents: PublicDocument[]) => void;
  title?: string;
  /** Identifiants déjà associés par l'appelant : montrés « Déjà associé », non sélectionnables. */
  disabledIds?: readonly string[];
  /** Nombre de documents encore acceptables (plafond) ; sans limite si absent. */
  maxSelectable?: number;
}

/**
 * « Associer des documents » : la bibliothèque des documents publics en
 * fenêtre (recherche, pagination), tous statuts confondus — un brouillon peut
 * être associé d'avance, il n'apparaît sur le site qu'une fois publié. Le
 * contenu n'est monté qu'à l'ouverture : chaque ouverture repart à zéro.
 */
export function DocumentPicker(props: DocumentPickerProps) {
  if (!props.open) return null;
  return <PickerDialog {...props} />;
}

function PickerDialog({
  onClose,
  onConfirm,
  title = 'Associer des documents',
  disabledIds = [],
  maxSelectable,
}: DocumentPickerProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  // Les documents eux-mêmes : la sélection survit au changement de page.
  const [selected, setSelected] = useState<PublicDocument[]>([]);
  const q = useDebouncedValue(search.trim());
  const limit = maxSelectable ?? Infinity;
  const disabled = new Set(disabledIds);

  const list = useQuery({
    queryKey: ['documents', 'picker', q, page],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        sort: 'updatedAt',
        order: 'desc',
      });
      if (q) params.set('q', q);
      return backendJson<Paginated<PublicDocument>>(
        `admin/documents-publics?${params}`,
      );
    },
    placeholderData: keepPreviousData,
  });

  const items = list.data?.data;
  const total = list.data?.meta.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (list.data && page > lastPage) setPage(lastPage);
  const atLimit = selected.length >= limit;
  const isSelected = (d: PublicDocument) => selected.some((s) => s.id === d.id);

  const toggle = (document: PublicDocument) =>
    setSelected((current) =>
      current.some((d) => d.id === document.id)
        ? current.filter((d) => d.id !== document.id)
        : current.length < limit
          ? [...current, document]
          : current,
    );

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={title}
      description="Cochez les documents à associer. Un document en brouillon n’apparaîtra sur le site qu’une fois publié."
      footer={
        <>
          <span
            role="status"
            className="flex-1 self-center text-xs text-ink-subtle max-sm:hidden"
          >
            {selected.length === 0
              ? 'Aucun document sélectionné'
              : plural(
                  selected.length,
                  'document sélectionné',
                  'documents sélectionnés',
                )}
            {atLimit && Number.isFinite(limit) && ' (maximum atteint)'}
          </span>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button
            disabled={selected.length === 0}
            onClick={() => {
              onConfirm(selected);
              onClose();
            }}
          >
            {selected.length > 1
              ? `Associer ${selected.length} documents`
              : 'Associer ce document'}
          </Button>
        </>
      }
    >
      <div className="space-y-3 pb-2">
        <SearchInput
          label="Rechercher un document"
          placeholder="Titre, description ou identifiant…"
          value={search}
          onValueChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          data-autofocus
        />

        {list.isLoading ? (
          <LoadingRegion
            label="Chargement des documents…"
            className="space-y-2"
          >
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </LoadingRegion>
        ) : list.error && !list.data ? (
          <ErrorState
            error={list.error}
            onRetry={() => list.refetch()}
            retrying={list.isRefetching}
          />
        ) : items && items.length === 0 ? (
          <EmptyState
            icon={q ? SearchX : FileText}
            title={q ? 'Aucun résultat' : 'Aucun document public'}
            description={
              q
                ? `Aucun document ne correspond à « ${q} ».`
                : 'Publiez d’abord un document depuis « Documents publics ».'
            }
          />
        ) : (
          <ul
            role="list"
            aria-label="Documents publics"
            aria-busy={list.isFetching || undefined}
            className={cx(
              'space-y-2',
              list.isPlaceholderData && 'opacity-60 transition-opacity',
            )}
          >
            {items?.map((document) => {
              const taken = disabled.has(document.id);
              const checked = isSelected(document);
              const inactive = taken || (atLimit && !checked);
              return (
                <li key={document.id}>
                  <button
                    type="button"
                    onClick={() => toggle(document)}
                    disabled={inactive}
                    aria-pressed={checked}
                    className={cx(
                      'flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                      focusRing,
                      checked
                        ? 'border-brand bg-brand-soft/40'
                        : 'border-line hover:border-line-strong hover:bg-sunken',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cx(
                        'grid size-5 shrink-0 place-items-center rounded-md border text-[11px] font-bold',
                        checked
                          ? 'border-brand bg-brand text-on-brand'
                          : 'border-line-strong bg-panel text-transparent',
                      )}
                    >
                      ✓
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-ink">
                        {document.titleFr}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-subtle">
                        <Badge>{CATEGORY_LABELS[document.category]}</Badge>
                        {document.year && <span>{document.year}</span>}
                        {taken && (
                          <span className="font-medium text-ink-muted">
                            Déjà associé
                          </span>
                        )}
                      </span>
                    </span>
                    <StatusChip kind="content" value={document.status} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {list.data && total > PAGE_SIZE && (
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={setPage}
            itemLabel="documents"
          />
        )}
      </div>
    </Dialog>
  );
}
