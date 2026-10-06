'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Images, Trash2, X } from 'lucide-react';
import { ApiError, backendJson } from '@/lib/api/backend';
import { invalidatePortalData } from '@/lib/admin/invalidate';
import { coverOf, type Article } from '@/lib/admin/articles';
import { mediaName, thumbOf, type MediaItem } from '@/lib/admin/media';
import { Button, Card, Field, Input, useConfirm, useToast } from '../ui';
import { MediaPicker } from '../media/media-picker';

/**
 * Visuel de couverture d'un article : une image de la médiathèque (existante
 * ou ajoutée à la volée dans le sélecteur), attachée à l'article
 * (`PUT :id/cover`) avec son texte alternatif. Le contenu de l'image est
 * vérifié par l'API à l'envoi, pas d'après son nom.
 */
export function CoverCard({
  article,
  onSaved,
}: {
  article: Article;
  /** Reçoit l'article renvoyé par le serveur après un changement de couverture. */
  onSaved: (article: Article) => Promise<unknown> | unknown;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const cover = coverOf(article);

  const [picking, setPicking] = useState(false);
  // Image choisie, pas encore enregistrée comme couverture.
  const [chosen, setChosen] = useState<MediaItem | null>(null);
  const [altFr, setAltFr] = useState('');
  const [altEn, setAltEn] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (media: MediaItem) =>
      backendJson<Article>(`admin/articles/${article.id}/cover`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mediaId: media.id,
          ...(altFr.trim() && { altFr: altFr.trim() }),
          ...(altEn.trim() && { altEn: altEn.trim() }),
        }),
      }),
    onSuccess: async (saved) => {
      await onSaved(saved);
      await invalidatePortalData(queryClient);
      setChosen(null);
      setAltFr('');
      setAltEn('');
      setError(null);
      toast.success('Couverture enregistrée');
    },
    onError: (caught) =>
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'La couverture n’a pas pu être enregistrée. Réessayez.',
      ),
  });

  async function remove() {
    const ok = await confirm({
      title: 'Retirer la couverture ?',
      description:
        'L’image n’illustre plus cet article. Elle reste disponible dans la médiathèque.',
      confirmLabel: 'Retirer',
      onConfirm: () =>
        backendJson<Article>(`admin/articles/${article.id}/cover`, {
          method: 'DELETE',
        }),
    });
    if (!ok) return;
    await invalidatePortalData(queryClient);
    toast.success('Couverture retirée');
  }

  const cancelChoice = () => {
    setChosen(null);
    setAltFr('');
    setAltEn('');
    setError(null);
  };

  return (
    <Card title="Couverture">
      {cover && !chosen && (
        <div className="mb-5 overflow-hidden rounded-xl border border-line bg-sunken">
          {/* Image publique servie par l'API via `/uploads/*` : pas d'optimisation Next nécessaire dans le portail. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbOf(cover.url)}
            alt={cover.altFr ?? ''}
            className="aspect-video w-full object-cover"
          />
          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
            <p className="min-w-0 truncate text-xs text-ink-muted">
              {cover.altFr ? cover.altFr : 'Sans texte alternatif'}
            </p>
            <Button variant="ghost" size="sm" icon={Trash2} onClick={remove}>
              <span className="text-bad">Retirer</span>
            </Button>
          </div>
        </div>
      )}

      {chosen ? (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border border-brand/40 bg-sunken">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={chosen.thumbUrl}
              alt={`Aperçu de ${mediaName(chosen)}`}
              className="aspect-video w-full object-cover"
            />
            <p className="truncate px-3.5 py-2.5 text-xs text-ink-muted">
              {mediaName(chosen)}
            </p>
          </div>
          <Field
            label="Texte alternatif (FR)"
            hint="Décrit l’image pour les personnes qui ne la voient pas."
          >
            <Input
              maxLength={300}
              value={altFr}
              onChange={(event) => setAltFr(event.target.value)}
            />
          </Field>
          <Field label="Texte alternatif (EN)">
            <Input
              maxLength={300}
              value={altEn}
              onChange={(event) => setAltEn(event.target.value)}
            />
          </Field>
          {error && (
            <p role="alert" className="text-xs font-medium text-bad">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              loading={save.isPending}
              onClick={() => save.mutate(chosen)}
              className="flex-1"
            >
              Enregistrer la couverture
            </Button>
            <Button
              variant="secondary"
              icon={X}
              onClick={cancelChoice}
              disabled={save.isPending}
            >
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Button
            variant="secondary"
            icon={Images}
            onClick={() => setPicking(true)}
            block
          >
            {cover ? 'Remplacer la couverture' : 'Choisir dans la médiathèque'}
          </Button>
          <p className="text-xs text-ink-subtle">
            Une image existante, ou une nouvelle (JPEG, PNG ou WebP, 5 Mo au
            plus).
          </p>
        </div>
      )}

      <MediaPicker
        open={picking}
        onClose={() => setPicking(false)}
        onConfirm={([media]) => {
          setChosen(media);
          // Le texte alternatif par défaut de l'image, modifiable pour cet article.
          setAltFr(media.altFr ?? '');
          setAltEn(media.altEn ?? '');
          setError(null);
        }}
        title="Choisir la couverture"
        confirmLabel="Utiliser cette image"
      />
    </Card>
  );
}
