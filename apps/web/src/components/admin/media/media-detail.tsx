'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Info,
  Layers,
  Newspaper,
  Trash2,
  UserRound,
  Hammer,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, backendJson } from '@/lib/api/backend';
import { cx, focusRing } from '@/lib/admin/cx';
import { formatLongDate } from '@/lib/admin/format';
import { invalidatePortalData } from '@/lib/admin/invalidate';
import { formatBytes } from '@/lib/admin/public-documents';
import {
  MAX_ALT_LENGTH,
  USAGE_TYPE_LABELS,
  absoluteUrl,
  formatLabel,
  mediaName,
  usageHref,
  type MediaItem,
} from '@/lib/admin/media';
import {
  Button,
  Dialog,
  Field,
  IconButton,
  Input,
  useConfirm,
  useToast,
} from '../ui';

/** Pictogramme du type de contenu qui utilise l'image. */
const USAGE_ICONS = {
  ARTICLE: Newspaper,
  REALISATION: Hammer,
  SERVICE: Layers,
  EXPERT: UserRound,
} as const;

/**
 * Texte alternatif par défaut de l'image. Il pré-remplit celui d'un contenu
 * qui choisit l'image ; les contenus qui l'utilisent déjà gardent le leur.
 * Remonté par `key` à chaque image : les champs repartent de la valeur
 * enregistrée quand on passe à l'image voisine.
 */
function DefaultAltForm({ media }: { media: MediaItem }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [altFr, setAltFr] = useState(media.altFr ?? '');
  const [altEn, setAltEn] = useState(media.altEn ?? '');
  const [error, setError] = useState<string | null>(null);

  const dirty =
    altFr.trim() !== (media.altFr ?? '') ||
    altEn.trim() !== (media.altEn ?? '');

  const save = useMutation({
    mutationFn: () =>
      backendJson<MediaItem>(`admin/media/${media.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ altFr: altFr.trim(), altEn: altEn.trim() }),
      }),
    onSuccess: async (saved) => {
      setAltFr(saved.altFr ?? '');
      setAltEn(saved.altEn ?? '');
      setError(null);
      await invalidatePortalData(queryClient);
      toast.success('Texte alternatif enregistré');
    },
    onError: (caught) =>
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Le texte alternatif n’a pas pu être enregistré. Réessayez.',
      ),
  });

  return (
    <form
      aria-labelledby="media-alt"
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (dirty && !save.isPending) save.mutate();
      }}
    >
      <div>
        <h3 id="media-alt" className="text-[13px] font-semibold text-ink">
          Texte alternatif par défaut
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-ink-subtle">
          Décrit l’image pour les personnes qui ne la voient pas. Il est proposé
          quand l’image est choisie dans un article, une réalisation ou un pôle
          ; chaque contenu peut ensuite l’adapter. Les contenus qui l’utilisent
          déjà ne changent pas.
        </p>
      </div>
      <Field label="Français">
        <Input
          maxLength={MAX_ALT_LENGTH}
          value={altFr}
          onChange={(event) => setAltFr(event.target.value)}
        />
      </Field>
      <Field label="Anglais">
        <Input
          maxLength={MAX_ALT_LENGTH}
          value={altEn}
          onChange={(event) => setAltEn(event.target.value)}
        />
      </Field>
      {error && (
        <p role="alert" className="text-xs font-medium text-bad">
          {error}
        </p>
      )}
      <Button
        type="submit"
        size="sm"
        disabled={!dirty}
        loading={save.isPending}
      >
        Enregistrer
      </Button>
    </form>
  );
}

/**
 * Fiche d'une image : aperçu en grand, informations, contenus où elle est
 * utilisée (liens vers leur édition), copie de l'adresse, téléchargement et
 * suppression. Flèches ← → pour passer à l'image voisine de la page affichée.
 * Une image utilisée ne se supprime pas : le bouton l'explique au lieu de
 * laisser échouer l'action.
 */
export function MediaDetail({
  media,
  position,
  count,
  onClose,
  onStep,
  onDeleted,
}: {
  media: MediaItem | null;
  /** Rang de l'image parmi celles de la page affichée, et leur nombre. */
  position: number;
  count: number;
  onClose: () => void;
  /** -1 / +1 : image précédente / suivante. */
  onStep: (direction: -1 | 1) => void;
  onDeleted: (media: MediaItem) => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  // Dimensions lues sur l'image chargée (l'API ne les stocke pas).
  const [size, setSize] = useState<{
    url: string;
    w: number;
    h: number;
  } | null>(null);

  const open = media !== null;
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable]')) return;
      // Une confirmation est ouverte par-dessus : les flèches ne regardent pas la fiche.
      if (document.querySelectorAll('dialog[open]').length > 1) return;
      if (event.key === 'ArrowLeft') onStep(-1);
      if (event.key === 'ArrowRight') onStep(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onStep]);

  async function copyLink(item: MediaItem) {
    try {
      await navigator.clipboard.writeText(absoluteUrl(item.url));
      toast.success('Adresse de l’image copiée');
    } catch {
      toast.error('La copie a échoué : votre navigateur l’a refusée.');
    }
  }

  async function remove(item: MediaItem) {
    const ok = await confirm({
      title: 'Supprimer cette image ?',
      description: `« ${mediaName(item)} » sera supprimée définitivement de la médiathèque. Cette action est irréversible.`,
      confirmLabel: 'Supprimer l’image',
      tone: 'danger',
      onConfirm: () =>
        backendJson<void>(`admin/media/${item.id}`, { method: 'DELETE' }),
    });
    if (ok) {
      toast.success('Image supprimée');
      onDeleted(item);
    }
  }

  const used = media ? media.usages.length > 0 : false;
  const dimensions = media && size?.url === media.url ? size : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xl"
      title={media ? mediaName(media) : ''}
      description={
        media
          ? [
              formatLabel(media.mimeType),
              dimensions && `${dimensions.w} × ${dimensions.h} px`,
              formatBytes(media.sizeBytes),
            ]
              .filter(Boolean)
              .join(' · ')
          : undefined
      }
      footer={
        media && (
          <>
            <span className="flex-1 self-center text-xs text-ink-subtle max-sm:hidden">
              Image {position + 1} sur {count}
            </span>
            <Button variant="secondary" onClick={onClose} data-autofocus>
              Fermer
            </Button>
          </>
        )
      }
    >
      {media && (
        <div className="grid gap-5 pb-2 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="relative flex items-center overflow-hidden rounded-xl border border-line bg-sunken">
            {/* Image publique servie par l'API via `/uploads/*` : pas d'optimisation Next nécessaire dans le portail. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={media.id}
              src={media.url}
              alt={`Aperçu de ${mediaName(media)}`}
              onLoad={(event) =>
                setSize({
                  url: media.url,
                  w: event.currentTarget.naturalWidth,
                  h: event.currentTarget.naturalHeight,
                })
              }
              className="mx-auto max-h-[55dvh] min-h-48 w-full object-contain"
            />
            {count > 1 && (
              <>
                <IconButton
                  icon={ChevronLeft}
                  label="Image précédente"
                  variant="secondary"
                  disabled={position === 0}
                  onClick={() => onStep(-1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 shadow-panel"
                />
                <IconButton
                  icon={ChevronRight}
                  label="Image suivante"
                  variant="secondary"
                  disabled={position === count - 1}
                  onClick={() => onStep(1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 shadow-panel"
                />
              </>
            )}
          </div>

          <div className="min-w-0 space-y-5">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
              <dt className="text-ink-subtle">Ajoutée le</dt>
              <dd className="text-ink">
                {formatLongDate(new Date(media.createdAt))}
              </dd>
              <dt className="text-ink-subtle">Par</dt>
              <dd className="text-ink">{media.uploadedByName ?? 'Inconnu'}</dd>
              <dt className="text-ink-subtle">Nom d’origine</dt>
              <dd className="break-all text-ink">{mediaName(media)}</dd>
            </dl>

            <DefaultAltForm key={media.id} media={media} />

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={Copy}
                onClick={() => copyLink(media)}
              >
                Copier l’adresse
              </Button>
              <a
                href={media.url}
                target="_blank"
                rel="noreferrer"
                className={cx(
                  'inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong bg-panel px-3 text-xs font-medium text-ink hover:border-brand/40 hover:bg-sunken',
                  focusRing,
                )}
              >
                <ExternalLink size={14} aria-hidden="true" />
                Ouvrir l’original
                <span className="sr-only"> (nouvel onglet)</span>
              </a>
              <a
                href={media.url}
                download={mediaName(media)}
                className={cx(
                  'inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong bg-panel px-3 text-xs font-medium text-ink hover:border-brand/40 hover:bg-sunken',
                  focusRing,
                )}
              >
                <Download size={14} aria-hidden="true" />
                Télécharger
              </a>
            </div>

            <section aria-labelledby="media-usage">
              <h3
                id="media-usage"
                className="mb-2 text-[13px] font-semibold text-ink"
              >
                Où cette image est utilisée
              </h3>
              {used ? (
                <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                  {media.usages.map((usage) => {
                    const Icon = USAGE_ICONS[usage.type];
                    return (
                      <li key={`${usage.type}-${usage.id}`}>
                        <Link
                          href={usageHref(usage)}
                          className={cx(
                            'flex items-center gap-3 px-3 py-2.5 hover:bg-sunken',
                            focusRing,
                          )}
                        >
                          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                            <Icon size={15} aria-hidden="true" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[13px] font-medium text-ink">
                              {usage.title}
                            </span>
                            <span className="block text-xs text-ink-subtle">
                              {USAGE_TYPE_LABELS[usage.type]}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="flex items-start gap-2 rounded-xl bg-sunken px-3 py-2.5 text-xs leading-relaxed text-ink-muted">
                  <Info
                    size={14}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0"
                  />
                  Cette image n’illustre aucun contenu pour l’instant. Vous
                  pouvez la supprimer sans conséquence sur le site.
                </p>
              )}
            </section>

            <div className="border-t border-line pt-4">
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                disabled={used}
                onClick={() => remove(media)}
              >
                Supprimer l’image
              </Button>
              {used && (
                <p className="mt-2 text-xs text-ink-subtle">
                  Retirez d’abord l’image des contenus ci-dessus pour pouvoir la
                  supprimer.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
