'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  ImagePlus,
  Star,
  Trash2,
} from 'lucide-react';
import { ApiError, backendJson } from '@/lib/api/backend';
import { cx, focusRing } from '@/lib/admin/cx';
import { plural } from '@/lib/admin/format';
import { thumbOf, type MediaItem } from '@/lib/admin/media';
import {
  MAX_REALISATION_IMAGES,
  type Realisation,
} from '@/lib/admin/realisations';
import { Button, Card, Field, Input, useToast } from '../ui';
import { MediaPicker } from '../media/media-picker';

/** Image de la galerie en cours de modification (texte alternatif en saisie). */
interface DraftImage {
  url: string;
  thumbUrl: string;
  altFr: string;
  altEn: string;
}

const fromServer = (realisation: Realisation): DraftImage[] =>
  realisation.images.map((image) => ({
    url: image.url,
    thumbUrl: thumbOf(image.url),
    altFr: image.altFr ?? '',
    altEn: image.altEn ?? '',
  }));

const signature = (images: DraftImage[]) =>
  JSON.stringify(images.map((i) => [i.url, i.altFr.trim(), i.altEn.trim()]));

/**
 * Galerie d'une réalisation : images de la médiathèque, dans l'ordre
 * d'affichage ; la première est l'image principale du site. Les changements
 * (ajout, ordre, textes alternatifs, retrait) s'accumulent localement et
 * s'enregistrent d'un coup (`PUT :id/images`) — la galerie entière est
 * remplacée, jamais fusionnée.
 *
 * À monter avec une `key` qui change après chaque enregistrement : le brouillon
 * repart alors de ce que le serveur a renvoyé.
 */
export function GalleryCard({
  realisation,
  onSaved,
}: {
  realisation: Realisation;
  onSaved: (saved: Realisation) => Promise<unknown> | unknown;
}) {
  const toast = useToast();
  const [initial] = useState(() => fromServer(realisation));
  const [images, setImages] = useState<DraftImage[]>(initial);
  const [active, setActive] = useState<number | null>(null);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = signature(images) !== signature(initial);
  const room = MAX_REALISATION_IMAGES - images.length;
  const current = active !== null ? images[active] : undefined;

  const update = (index: number, change: Partial<DraftImage>) =>
    setImages((list) =>
      list.map((image, i) => (i === index ? { ...image, ...change } : image)),
    );

  function move(index: number, target: number) {
    if (target < 0 || target >= images.length) return;
    setImages((list) => {
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setActive(target);
  }

  function remove(index: number) {
    setImages((list) => list.filter((_, i) => i !== index));
    setActive(null);
  }

  function add(items: MediaItem[]) {
    const fresh = items
      .filter((m) => !images.some((i) => i.url === m.url))
      .map<DraftImage>((m) => ({
        url: m.url,
        thumbUrl: m.thumbUrl,
        // Le texte alternatif par défaut de l'image, modifiable pour cette fiche.
        altFr: m.altFr ?? '',
        altEn: m.altEn ?? '',
      }));
    setImages((list) => [...list, ...fresh].slice(0, MAX_REALISATION_IMAGES));
    // La première nouvelle image est ouverte : on y décrit tout de suite l'image.
    if (fresh.length > 0) setActive(images.length);
  }

  const save = useMutation({
    mutationFn: () =>
      backendJson<Realisation>(`admin/realisations/${realisation.id}/images`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          images: images.map((image) => ({
            url: image.url,
            altFr: image.altFr.trim(),
            altEn: image.altEn.trim(),
          })),
        }),
      }),
    onSuccess: async (saved) => {
      await onSaved(saved);
      toast.success('Galerie enregistrée');
    },
    onError: (caught) =>
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'La galerie n’a pas pu être enregistrée. Réessayez.',
      ),
  });

  return (
    <Card
      title="Images"
      description={
        images.length === 0
          ? 'Aucune image pour l’instant : le site affiche une couverture générée.'
          : `${plural(images.length, 'image')} sur ${MAX_REALISATION_IMAGES} — la première est l’image principale.`
      }
      actions={
        <Button
          variant="secondary"
          size="sm"
          icon={ImagePlus}
          disabled={room <= 0}
          onClick={() => setPicking(true)}
        >
          Ajouter des images
        </Button>
      }
    >
      {images.length === 0 ? (
        <button
          type="button"
          onClick={() => setPicking(true)}
          className={cx(
            'flex w-full flex-col items-center rounded-xl border border-dashed border-line-strong px-4 py-8 text-center transition-colors hover:border-brand/60 hover:bg-brand-soft/30',
            focusRing,
          )}
        >
          <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand">
            <ImagePlus size={20} aria-hidden="true" />
          </span>
          <span className="mt-3 text-[13px] font-medium text-ink">
            Choisir des images dans la médiathèque
          </span>
          <span className="mt-1 text-xs text-ink-subtle">
            Ou en ajouter de nouvelles depuis votre ordinateur
          </span>
        </button>
      ) : (
        <ul
          role="list"
          aria-label="Images de la réalisation"
          className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-3"
        >
          {images.map((image, index) => (
            <li key={image.url}>
              <button
                type="button"
                onClick={() => setActive(active === index ? null : index)}
                aria-pressed={active === index}
                aria-label={`Image ${index + 1}${index === 0 ? ' (principale)' : ''}${image.altFr.trim() ? '' : ', sans description'}`}
                className={cx(
                  'group relative block aspect-[4/3] w-full overflow-hidden rounded-xl border bg-sunken',
                  focusRing,
                  active === index
                    ? 'border-brand ring-2 ring-brand'
                    : 'border-line hover:border-line-strong',
                )}
              >
                {/* Image publique servie par l'API via `/uploads/*` : pas d'optimisation Next nécessaire dans le portail. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.thumbUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover"
                />
                {index === 0 && (
                  <span className="absolute left-1.5 top-1.5 inline-flex h-5 items-center gap-1 rounded-full bg-panel/95 px-1.5 text-[10.5px] font-medium text-ink shadow-sm">
                    <Star size={10} aria-hidden="true" className="text-warn" />
                    Principale
                  </span>
                )}
                {!image.altFr.trim() && (
                  <span className="absolute bottom-1.5 left-1.5 inline-flex h-5 items-center rounded-full bg-warn-soft px-1.5 text-[10.5px] font-medium text-warn">
                    Sans description
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {current && active !== null && (
        <div
          role="group"
          aria-label={`Réglages de l’image ${active + 1}`}
          className="mt-4 grid gap-4 rounded-xl border border-line bg-sunken/50 p-4 sm:grid-cols-[10rem_1fr]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.thumbUrl}
            alt=""
            className="aspect-[4/3] w-full rounded-lg border border-line object-cover"
          />
          <div className="min-w-0 space-y-3">
            <Field
              label="Description de l’image (FR)"
              hint="Lue par les lecteurs d’écran : décrivez ce que l’on voit."
            >
              <Input
                maxLength={300}
                value={current.altFr}
                onChange={(event) =>
                  update(active, { altFr: event.target.value })
                }
              />
            </Field>
            <Field label="Description de l’image (EN)">
              <Input
                maxLength={300}
                value={current.altEn}
                onChange={(event) =>
                  update(active, { altEn: event.target.value })
                }
              />
            </Field>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={ArrowLeft}
                disabled={active === 0}
                onClick={() => move(active, active - 1)}
              >
                Avancer
              </Button>
              <Button
                variant="secondary"
                size="sm"
                iconRight={ArrowRight}
                disabled={active === images.length - 1}
                onClick={() => move(active, active + 1)}
              >
                Reculer
              </Button>
              {active > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Star}
                  onClick={() => move(active, 0)}
                >
                  Définir comme principale
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                icon={Trash2}
                className="sm:ml-auto"
                onClick={() => remove(active)}
              >
                <span className="text-bad">Retirer</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-4 flex items-start gap-1.5 text-xs font-medium text-bad"
        >
          <CircleAlert
            size={14}
            aria-hidden="true"
            className="mt-px shrink-0"
          />
          {error}
        </p>
      )}

      {dirty && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <p role="status" className="mr-auto text-xs text-ink-muted">
            Modifications non enregistrées
          </p>
          <Button
            variant="secondary"
            size="sm"
            disabled={save.isPending}
            onClick={() => {
              setImages(initial);
              setActive(null);
              setError(null);
            }}
          >
            Annuler
          </Button>
          <Button
            size="sm"
            loading={save.isPending}
            onClick={() => {
              setError(null);
              save.mutate();
            }}
          >
            Enregistrer les images
          </Button>
        </div>
      )}

      <MediaPicker
        open={picking}
        onClose={() => setPicking(false)}
        onConfirm={add}
        multiple
        title="Ajouter des images à la réalisation"
        disabledUrls={images.map((i) => i.url)}
        maxSelectable={room}
      />
    </Card>
  );
}
