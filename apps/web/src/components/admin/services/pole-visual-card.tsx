'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useMutation } from '@tanstack/react-query';
import { CircleAlert, ImageIcon, Images, RotateCcw } from 'lucide-react';
import { ApiError, backendJson } from '@/lib/api/backend';
import { thumbOf, type MediaItem } from '@/lib/admin/media';
import { poleOf, type Service } from '@/lib/admin/services';
import { POLE_DEFAULT_IMAGES } from '@/lib/poles';
import { Badge, Button, Card, Field, Input, useToast } from '../ui';
import { MediaPicker } from '../media/media-picker';

/** Visuel en cours de modification (`url: null` : le visuel d'origine du site). */
interface Draft {
  url: string | null;
  thumbUrl: string | null;
  altFr: string;
  altEn: string;
}

const fromServer = (service: Service): Draft => ({
  url: service.imageUrl,
  thumbUrl: service.imageUrl ? thumbOf(service.imageUrl) : null,
  altFr: service.imageAltFr ?? '',
  altEn: service.imageAltEn ?? '',
});

const signature = (d: Draft) =>
  JSON.stringify([d.url, d.altFr.trim(), d.altEn.trim()]);

/**
 * Visuel du pôle, affiché dans son chapitre de la page Nos services (cadrage
 * 4:3, comme sur le site). Une image de la médiathèque (existante ou ajoutée à
 * la volée) avec son texte alternatif ; sans choix, le site garde son visuel
 * d'origine. Les changements s'accumulent puis s'enregistrent d'un coup.
 *
 * À monter avec une `key` qui change après chaque enregistrement.
 */
export function PoleVisualCard({
  service,
  onSaved,
}: {
  service: Service;
  onSaved: (saved: Service) => Promise<unknown> | unknown;
}) {
  const toast = useToast();
  const pole = poleOf(service);
  const [initial] = useState(() => fromServer(service));
  const [draft, setDraft] = useState<Draft>(initial);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = signature(draft) !== signature(initial);
  const custom = draft.url !== null;

  const save = useMutation({
    mutationFn: () =>
      backendJson<Service>(`admin/services/${service.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          imageUrl: draft.url,
          imageAltFr: draft.url ? draft.altFr.trim() || null : null,
          imageAltEn: draft.url ? draft.altEn.trim() || null : null,
        }),
      }),
    onSuccess: async (saved) => {
      await onSaved(saved);
      toast.success('Visuel enregistré');
    },
    onError: (caught) =>
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Le visuel n’a pas pu être enregistré. Réessayez.',
      ),
  });

  function choose([media]: MediaItem[]) {
    if (!media) return;
    setDraft((d) => ({
      url: media.url,
      thumbUrl: media.thumbUrl,
      // Une autre image : l'ancienne description ne vaut plus.
      altFr: media.url === d.url ? d.altFr : '',
      altEn: media.url === d.url ? d.altEn : '',
    }));
    setError(null);
  }

  return (
    <Card
      title="Visuel"
      description="L’image qui accompagne le pôle sur la page Nos services."
      actions={
        <Button
          variant="secondary"
          size="sm"
          icon={Images}
          onClick={() => setPicking(true)}
        >
          {custom ? 'Remplacer' : 'Choisir une image'}
        </Button>
      }
    >
      <div className="grid gap-5 sm:grid-cols-[minmax(0,15rem)_1fr]">
        <figure className="relative aspect-[4/3] overflow-hidden rounded-xl border border-line bg-sunken">
          {custom && draft.thumbUrl ? (
            // Image publique servie par l'API via `/uploads/*` : pas d'optimisation Next nécessaire dans le portail.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={draft.thumbUrl}
              alt={draft.altFr || ''}
              className="size-full object-cover"
            />
          ) : pole ? (
            <Image
              src={POLE_DEFAULT_IMAGES[pole]}
              alt=""
              fill
              sizes="240px"
              className="object-cover"
            />
          ) : (
            <span className="grid size-full place-items-center text-ink-subtle">
              <ImageIcon size={28} aria-hidden="true" />
            </span>
          )}
          <figcaption className="absolute bottom-2 left-2 rounded-full bg-panel shadow-sm">
            <Badge tone={custom ? 'brand' : 'neutral'}>
              {custom ? 'Image choisie' : 'Visuel d’origine du site'}
            </Badge>
          </figcaption>
        </figure>

        <div className="min-w-0 space-y-3">
          {custom ? (
            <>
              <Field
                label="Description de l’image (FR)"
                hint={
                  draft.altFr.trim()
                    ? 'Lue par les lecteurs d’écran : décrivez ce que l’on voit.'
                    : 'Sans description, le site utilise le nom du pôle.'
                }
              >
                <Input
                  maxLength={300}
                  value={draft.altFr}
                  onChange={(event) =>
                    setDraft({ ...draft, altFr: event.target.value })
                  }
                />
              </Field>
              <Field label="Description de l’image (EN)">
                <Input
                  maxLength={300}
                  value={draft.altEn}
                  onChange={(event) =>
                    setDraft({ ...draft, altEn: event.target.value })
                  }
                />
              </Field>
              <Button
                variant="ghost"
                size="sm"
                icon={RotateCcw}
                onClick={() =>
                  setDraft({ url: null, thumbUrl: null, altFr: '', altEn: '' })
                }
              >
                Revenir au visuel d’origine
              </Button>
            </>
          ) : (
            <p className="text-[13px] leading-relaxed text-ink-muted">
              Le site affiche pour l’instant le visuel d’origine du pôle.
              Choisissez une image de la médiathèque (ou ajoutez-en une depuis
              votre ordinateur) pour la remplacer — par exemple une photo de
              terrain d’EWES. Format paysage conseillé, JPEG, PNG ou WebP.
            </p>
          )}
        </div>
      </div>

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
              setDraft(initial);
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
            Enregistrer le visuel
          </Button>
        </div>
      )}

      <MediaPicker
        open={picking}
        onClose={() => setPicking(false)}
        onConfirm={choose}
        title="Choisir le visuel du pôle"
        confirmLabel="Utiliser cette image"
      />
    </Card>
  );
}
