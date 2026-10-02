'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  CheckCheck,
  ImagePlus,
  ImageUp,
  Images,
  SearchX,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { backendJson } from '@/lib/api/backend';
import { cx, focusRing } from '@/lib/admin/cx';
import { plural } from '@/lib/admin/format';
import { invalidatePortalData } from '@/lib/admin/invalidate';
import {
  IMAGE_ACCEPT,
  MEDIA_SORTS,
  type MediaPage,
  type MediaSortKey,
  type MediaUsageFilter,
} from '@/lib/admin/media';
import { PageHeader } from '../page-header';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingRegion,
  Pagination,
  SearchInput,
  SegmentedControl,
  Select,
  Skeleton,
  useConfirm,
  useDebouncedValue,
  useToast,
} from '../ui';
import { MediaDetail } from './media-detail';
import { MediaTile } from './media-tile';
import { UploadTray } from './upload-tray';
import { useMediaUpload } from './use-media-upload';

const PAGE_SIZE = 24;

const GRID =
  'grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-x-4 gap-y-6';

interface RemoveManyResult {
  deleted: string[];
  blocked: { id: string; reason: 'IN_USE' | 'NOT_FOUND' }[];
}

/** Vrai si le glisser porte des fichiers (et non du texte ou un lien de la page). */
const carriesFiles = (event: React.DragEvent) =>
  Array.from(event.dataTransfer.types).includes('Files');

export function MediaLibrary() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();

  const [search, setSearch] = useState('');
  const [usage, setUsage] = useState<MediaUsageFilter>('all');
  const [sortKey, setSortKey] = useState<MediaSortKey>('newest');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const q = useDebouncedValue(search.trim());

  const upload = useMediaUpload();
  const { add: addFiles } = upload;

  const list = useQuery({
    queryKey: ['media', 'list', usage, sortKey, q, page],
    queryFn: () => {
      const { sort, order } = MEDIA_SORTS[sortKey];
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        sort,
        order,
      });
      if (usage !== 'all') params.set('usage', usage);
      if (q) params.set('q', q);
      return backendJson<MediaPage>(`admin/media?${params}`);
    },
    placeholderData: keepPreviousData,
  });

  const items = list.data?.data;
  const total = list.data?.meta.total ?? 0;
  const counts = list.data?.meta.usage;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (list.data && page > lastPage) setPage(lastPage);

  const filtered = usage !== 'all' || q !== '';
  const libraryEmpty = counts?.all === 0 && q === '';

  // Sélection et fiche ne portent que sur la page affichée.
  const selectedItems = (items ?? []).filter((m) => selected.has(m.id));
  const openIndex = items?.findIndex((m) => m.id === openId) ?? -1;
  const openMedia = openIndex >= 0 && items ? items[openIndex] : null;

  const resetSelection = () => setSelected(new Set());
  const changeView = (change: () => void) => {
    change();
    setPage(1);
    resetSelection();
  };

  const chooseFiles = () => fileInput.current?.click();

  // Coller une image (capture d'écran, copie depuis un autre site) l'ajoute aussi.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable]')) return;
      if (document.querySelector('dialog[open]')) return;
      const images = Array.from(event.clipboardData?.files ?? []).filter((f) =>
        f.type.startsWith('image/'),
      );
      if (images.length === 0) return;
      event.preventDefault();
      addFiles(images);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addFiles]);

  const step = useCallback(
    (direction: -1 | 1) => {
      if (!items) return;
      const next = items[openIndex + direction];
      if (next) setOpenId(next.id);
    },
    [items, openIndex],
  );

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  async function removeSelected() {
    const deletable = selectedItems.filter((m) => m.usages.length === 0);
    const skipped = selectedItems.length - deletable.length;
    let result: RemoveManyResult | undefined;

    const ok = await confirm({
      title: `Supprimer ${plural(deletable.length, 'image')} ?`,
      description: (
        <>
          {deletable.length > 1
            ? 'Ces images seront supprimées'
            : 'Cette image sera supprimée'}{' '}
          définitivement de la médiathèque. Cette action est irréversible.
          {skipped > 0 && (
            <span className="mt-2 block font-medium text-ink">
              {plural(
                skipped,
                'image utilisée est conservée',
                'images utilisées sont conservées',
              )}{' '}
              : retirez-la{skipped > 1 ? 's' : ''} d’abord des contenus qui
              l’affichent.
            </span>
          )}
        </>
      ),
      confirmLabel: `Supprimer ${plural(deletable.length, 'image')}`,
      tone: 'danger',
      onConfirm: async () => {
        result = await backendJson<RemoveManyResult>('admin/media/delete', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ids: deletable.map((m) => m.id) }),
        });
      },
    });
    if (!ok || !result) return;

    await invalidatePortalData(queryClient);
    resetSelection();
    const blocked = result.blocked.length;
    if (blocked > 0) {
      toast.warning(
        `${plural(result.deleted.length, 'image supprimée', 'images supprimées')}, ${plural(blocked, 'conservée', 'conservées')}`,
        {
          description:
            'Une image est devenue utilisée ou a déjà été supprimée entre-temps.',
        },
      );
    } else {
      toast.success(
        plural(result.deleted.length, 'image supprimée', 'images supprimées'),
      );
    }
  }

  async function afterDelete(deletedId: string) {
    // La fiche passe à l'image voisine ; plus aucune : elle se ferme.
    const neighbour = items?.[openIndex + 1] ?? items?.[openIndex - 1];
    setOpenId(neighbour && neighbour.id !== deletedId ? neighbour.id : null);
    resetSelection();
    await invalidatePortalData(queryClient);
  }

  return (
    <div
      className="relative space-y-6"
      onDragEnter={(event) => {
        if (!carriesFiles(event)) return;
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => {
        // Sans ce `preventDefault`, le navigateur refuse le dépôt.
        if (carriesFiles(event)) event.preventDefault();
      }}
      onDragLeave={(event) => {
        if (!carriesFiles(event)) return;
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
      }}
      onDrop={(event) => {
        if (!carriesFiles(event)) return;
        event.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        addFiles(Array.from(event.dataTransfer.files));
      }}
    >
      <PageHeader
        eyebrow="Contenus du site"
        title="Médiathèque"
        description="Les images du site, au même endroit. Ajoutez-les ici, puis choisissez-les dans vos articles et vos réalisations. Vous pouvez aussi les glisser-déposer sur cette page ou coller une capture d’écran."
        actions={
          <Button icon={ImagePlus} onClick={chooseFiles}>
            Ajouter des images
          </Button>
        }
      />

      <input
        ref={fileInput}
        type="file"
        multiple
        accept={IMAGE_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          addFiles(Array.from(event.target.files ?? []));
          // Permet de re-choisir le même fichier après un refus.
          event.target.value = '';
        }}
      />

      <UploadTray
        items={upload.items}
        onRetry={upload.retry}
        onDismiss={upload.dismiss}
        onClose={upload.clearAll}
      />

      {libraryEmpty ? (
        <button
          type="button"
          onClick={chooseFiles}
          className={cx(
            'group flex w-full flex-col items-center rounded-3xl border-2 border-dashed border-line-strong bg-panel px-6 py-16 text-center transition-colors hover:border-brand/60 hover:bg-brand-soft/30',
            focusRing,
          )}
        >
          <span className="grid size-16 place-items-center rounded-2xl bg-brand-soft text-brand transition-transform motion-safe:group-hover:-translate-y-0.5">
            <ImageUp size={28} aria-hidden="true" />
          </span>
          <span className="mt-5 text-lg font-semibold tracking-tight text-ink">
            Glissez vos images ici
          </span>
          <span className="mt-1.5 max-w-md text-sm leading-relaxed text-ink-muted">
            ou cliquez pour les choisir sur votre ordinateur. Vous pouvez en
            ajouter plusieurs à la fois.
          </span>
          <span className="mt-4 text-xs text-ink-subtle">
            JPEG, PNG ou WebP · 5 Mo au plus par image
          </span>
        </button>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput
              label="Rechercher une image"
              placeholder="Nom du fichier…"
              value={search}
              onValueChange={(value) => changeView(() => setSearch(value))}
              className="w-full sm:w-72"
            />
            <SegmentedControl<MediaUsageFilter>
              label="Filtrer selon l’usage"
              value={usage}
              onChange={(next) => changeView(() => setUsage(next))}
              options={[
                { value: 'all', label: 'Toutes', count: counts?.all },
                { value: 'used', label: 'Utilisées', count: counts?.used },
                {
                  value: 'unused',
                  label: 'Non utilisées',
                  count: counts?.unused,
                },
              ]}
            />
            <Select
              aria-label="Trier les images"
              value={sortKey}
              onChange={(event) =>
                changeView(() => setSortKey(event.target.value as MediaSortKey))
              }
              className="w-full sm:ml-auto sm:w-48"
            >
              {Object.entries(MEDIA_SORTS).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          {selectedItems.length > 0 && (
            <div
              role="region"
              aria-label="Actions sur la sélection"
              className="animate-rise-in sticky top-3 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-brand/30 bg-raised px-3 py-2 shadow-pop"
            >
              <p
                role="status"
                className="px-1 text-[13px] font-medium text-ink"
              >
                {plural(
                  selectedItems.length,
                  'image sélectionnée',
                  'images sélectionnées',
                )}
              </p>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                {selectedItems.length < (items?.length ?? 0) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={CheckCheck}
                    onClick={() =>
                      setSelected(new Set(items?.map((m) => m.id)))
                    }
                  >
                    Tout sélectionner
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Trash2}
                  disabled={selectedItems.every((m) => m.usages.length > 0)}
                  onClick={removeSelected}
                >
                  Supprimer
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={X}
                  onClick={resetSelection}
                >
                  Annuler
                </Button>
              </div>
            </div>
          )}

          {list.isLoading ? (
            <LoadingRegion label="Chargement des images…" className={GRID}>
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i}>
                  <Skeleton className="aspect-[4/3] rounded-xl" />
                  <Skeleton className="mt-2 h-3 w-3/4" />
                  <Skeleton className="mt-1.5 h-3 w-1/3" />
                </div>
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
              icon={q ? SearchX : Images}
              title={q ? 'Aucun résultat' : 'Aucune image pour ce filtre'}
              description={
                q
                  ? `Aucune image ne porte un nom contenant « ${q} ».`
                  : usage === 'unused'
                    ? 'Toutes vos images illustrent un contenu.'
                    : 'Aucune image n’illustre encore un contenu.'
              }
              action={
                filtered && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      changeView(() => {
                        setSearch('');
                        setUsage('all');
                      })
                    }
                  >
                    Effacer la recherche et les filtres
                  </Button>
                )
              }
            />
          ) : (
            <ul
              role="list"
              aria-label="Images de la médiathèque"
              aria-busy={list.isFetching || undefined}
              className={cx(
                GRID,
                list.isPlaceholderData && 'opacity-60 transition-opacity',
              )}
            >
              {items?.map((media) => (
                <MediaTile
                  key={media.id}
                  media={media}
                  selected={selected.has(media.id)}
                  selecting={selectedItems.length > 0}
                  onOpen={() => setOpenId(media.id)}
                  onToggle={() => toggle(media.id)}
                />
              ))}
            </ul>
          )}

          {list.data && total > 0 && (
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={(next) => {
                setPage(next);
                resetSelection();
              }}
              itemLabel="images"
            />
          )}
        </>
      )}

      <MediaDetail
        media={openMedia}
        position={openIndex}
        count={items?.length ?? 0}
        onClose={() => setOpenId(null)}
        onStep={step}
        onDeleted={(media) => void afterDelete(media.id)}
      />

      {dragging && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-3 z-50 grid place-items-center rounded-3xl border-2 border-dashed border-brand bg-panel/85 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center text-center">
            <span className="grid size-16 place-items-center rounded-2xl bg-brand text-on-brand shadow-pop">
              <Upload size={28} />
            </span>
            <p className="mt-4 text-lg font-semibold text-ink">
              Déposez vos images pour les ajouter
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              JPEG, PNG ou WebP · 5 Mo au plus par image
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
