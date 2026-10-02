'use client';

import { useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Check, ImagePlus, Images, SearchX } from 'lucide-react';
import { backendJson } from '@/lib/api/backend';
import { cx, focusRing } from '@/lib/admin/cx';
import { plural } from '@/lib/admin/format';
import { formatBytes } from '@/lib/admin/public-documents';
import {
  IMAGE_ACCEPT,
  mediaName,
  type MediaItem,
  type MediaPage,
} from '@/lib/admin/media';
import {
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  LoadingRegion,
  Pagination,
  SearchInput,
  Skeleton,
  useDebouncedValue,
} from '../ui';
import { UploadTray } from './upload-tray';
import { useMediaUpload } from './use-media-upload';

const PAGE_SIZE = 18;

const GRID =
  'grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-x-3 gap-y-4';

export interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  /** Reçoit les images choisies, dans l'ordre où elles ont été cochées. */
  onConfirm: (items: MediaItem[]) => void;
  /** Plusieurs images (galerie) ou une seule (couverture). */
  multiple?: boolean;
  title?: string;
  confirmLabel?: string;
  /** Adresses déjà utilisées par l'appelant : montrées « Déjà ajoutée », non sélectionnables. */
  disabledUrls?: readonly string[];
  /** Nombre d'images encore acceptables (plafond d'une galerie) ; sans limite si absent. */
  maxSelectable?: number;
}

/**
 * « Choisir dans la médiathèque » : la même grille que la médiathèque, en
 * fenêtre, avec la recherche et l'envoi d'une nouvelle image sans quitter
 * l'écran (l'image envoyée est aussitôt cochée). Le contenu n'est monté qu'à
 * l'ouverture : chaque ouverture repart d'une sélection vide.
 */
export function MediaPicker(props: MediaPickerProps) {
  if (!props.open) return null;
  return <PickerDialog {...props} />;
}

function PickerDialog({
  onClose,
  onConfirm,
  multiple = false,
  title = multiple ? 'Choisir des images' : 'Choisir une image',
  confirmLabel,
  disabledUrls = [],
  maxSelectable,
}: MediaPickerProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  // Les médias eux-mêmes (pas seulement leurs identifiants) : la sélection survit au changement de page.
  const [selected, setSelected] = useState<MediaItem[]>([]);
  const q = useDebouncedValue(search.trim());
  const fileInput = useRef<HTMLInputElement>(null);

  const limit = multiple ? (maxSelectable ?? Infinity) : 1;
  const disabled = new Set(disabledUrls);

  const select = (media: MediaItem) =>
    setSelected((current) => {
      if (!multiple) return [media];
      if (current.some((m) => m.id === media.id)) return current;
      return current.length < limit ? [...current, media] : current;
    });
  const toggle = (media: MediaItem) =>
    setSelected((current) =>
      current.some((m) => m.id === media.id)
        ? current.filter((m) => m.id !== media.id)
        : multiple
          ? current.length < limit
            ? [...current, media]
            : current
          : [media],
    );

  const upload = useMediaUpload({ onUploaded: select });

  const list = useQuery({
    queryKey: ['media', 'picker', q, page],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (q) params.set('q', q);
      return backendJson<MediaPage>(`admin/media?${params}`);
    },
    placeholderData: keepPreviousData,
  });

  const items = list.data?.data;
  const total = list.data?.meta.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (list.data && page > lastPage) setPage(lastPage);
  const libraryEmpty = list.data?.meta.usage.all === 0 && q === '';
  const atLimit = multiple && selected.length >= limit;

  const confirm = () => {
    onConfirm(selected);
    onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      size="xl"
      title={title}
      description={
        multiple
          ? 'Cochez une ou plusieurs images, ou ajoutez-en de nouvelles depuis votre ordinateur.'
          : 'Choisissez une image de la médiathèque, ou ajoutez-en une depuis votre ordinateur.'
      }
      footer={
        <>
          <span
            role="status"
            className="flex-1 self-center text-xs text-ink-subtle max-sm:hidden"
          >
            {selected.length === 0
              ? 'Aucune image sélectionnée'
              : plural(
                  selected.length,
                  'image sélectionnée',
                  'images sélectionnées',
                )}
            {atLimit && Number.isFinite(limit) && ' (maximum atteint)'}
          </span>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button disabled={selected.length === 0} onClick={confirm}>
            {confirmLabel ??
              (multiple && selected.length > 1
                ? `Ajouter ${selected.length} images`
                : 'Choisir cette image')}
          </Button>
        </>
      }
    >
      <input
        ref={fileInput}
        type="file"
        multiple={multiple}
        accept={IMAGE_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          upload.add(Array.from(event.target.files ?? []));
          event.target.value = '';
        }}
      />

      <div className="space-y-4 pb-2">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            label="Rechercher une image"
            placeholder="Nom du fichier…"
            value={search}
            onValueChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            className="w-full sm:w-72"
            data-autofocus
          />
          <Button
            variant="secondary"
            icon={ImagePlus}
            onClick={() => fileInput.current?.click()}
            className="sm:ml-auto"
          >
            {multiple ? 'Ajouter des images' : 'Ajouter une image'}
          </Button>
        </div>

        <UploadTray
          items={upload.items}
          onRetry={upload.retry}
          onDismiss={upload.dismiss}
          onClose={upload.clearAll}
        />

        {list.isLoading ? (
          <LoadingRegion label="Chargement des images…" className={GRID}>
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i}>
                <Skeleton className="aspect-[4/3] rounded-xl" />
                <Skeleton className="mt-2 h-3 w-3/4" />
              </div>
            ))}
          </LoadingRegion>
        ) : list.error && !list.data ? (
          <ErrorState
            error={list.error}
            onRetry={() => list.refetch()}
            retrying={list.isRefetching}
          />
        ) : libraryEmpty ? (
          <EmptyState
            icon={Images}
            title="La médiathèque est vide"
            description="Ajoutez une première image depuis votre ordinateur : elle sera aussitôt sélectionnée."
            action={
              <Button
                icon={ImagePlus}
                size="sm"
                onClick={() => fileInput.current?.click()}
              >
                Ajouter une image
              </Button>
            }
          />
        ) : items && items.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Aucun résultat"
            description={`Aucune image ne porte un nom contenant « ${q} ».`}
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
              >
                Effacer la recherche
              </Button>
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
              <PickerTile
                key={media.id}
                media={media}
                selected={selected.some((m) => m.id === media.id)}
                unavailable={disabled.has(media.url)}
                full={atLimit && !selected.some((m) => m.id === media.id)}
                onToggle={() => toggle(media)}
              />
            ))}
          </ul>
        )}

        {list.data && total > PAGE_SIZE && (
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={setPage}
            itemLabel="images"
          />
        )}
      </div>
    </Dialog>
  );
}

function PickerTile({
  media,
  selected,
  unavailable,
  full,
  onToggle,
}: {
  media: MediaItem;
  selected: boolean;
  /** Déjà utilisée par l'appelant. */
  unavailable: boolean;
  /** Plafond atteint : seules les images déjà cochées restent actives. */
  full: boolean;
  onToggle: () => void;
}) {
  const name = mediaName(media);
  const inactive = unavailable || full;
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        disabled={inactive}
        aria-pressed={selected}
        aria-label={`${name}${unavailable ? ' — déjà ajoutée' : ''}`}
        className={cx(
          'group block w-full rounded-xl text-left disabled:cursor-not-allowed',
          focusRing,
        )}
      >
        <span
          className={cx(
            'relative block aspect-[4/3] overflow-hidden rounded-xl border bg-sunken transition-[border-color,box-shadow]',
            selected
              ? 'border-brand ring-2 ring-brand'
              : 'border-line group-enabled:group-hover:border-line-strong',
            inactive && 'opacity-45',
          )}
        >
          {/* Image publique servie par l'API via `/uploads/*` : pas d'optimisation Next nécessaire dans le portail. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={media.thumbUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
          {selected && (
            <span
              aria-hidden="true"
              className="absolute left-2 top-2 grid size-6 place-items-center rounded-full bg-brand text-on-brand shadow-sm"
            >
              <Check size={14} strokeWidth={3} />
            </span>
          )}
          {unavailable && (
            <span className="absolute bottom-2 left-2 inline-flex h-[22px] items-center rounded-full bg-panel/95 px-2 text-[11px] font-medium text-ink shadow-sm">
              Déjà ajoutée
            </span>
          )}
        </span>
        <span className="mt-1.5 block px-0.5">
          <span className="block truncate text-xs font-medium text-ink">
            {name}
          </span>
          <span className="block truncate text-[11px] text-ink-subtle">
            {formatBytes(media.sizeBytes)}
          </span>
        </span>
      </button>
    </li>
  );
}
