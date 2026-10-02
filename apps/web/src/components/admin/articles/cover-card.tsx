'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Trash2 } from 'lucide-react';
import { ApiError, backendJson } from '@/lib/api/backend';
import { invalidatePortalData } from '@/lib/admin/invalidate';
import { coverOf, type Article } from '@/lib/admin/articles';
import { imageProblem } from '@/lib/admin/media';
import { Button, Card, Field, Input, useConfirm, useToast } from '../ui';
import { FilePicker } from '../content/file-picker';

interface MediaView {
  id: string;
  url: string;
}

/**
 * Visuel de couverture d'un article : image téléversée dans la médiathèque
 * (`POST /admin/media`), puis attachée à l'article (`PUT :id/cover`). Le
 * contenu de l'image est vérifié par l'API, pas d'après son nom.
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

  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [altFr, setAltFr] = useState('');
  const [altEn, setAltEn] = useState('');
  // Le sélecteur est remonté à neuf après un envoi (vide le champ natif).
  const [pickerKey, setPickerKey] = useState(0);

  const save = useMutation({
    mutationFn: async (image: File) => {
      const data = new FormData();
      data.append('file', image);
      const media = await backendJson<MediaView>('admin/media', {
        method: 'POST',
        body: data,
      });
      return backendJson<Article>(`admin/articles/${article.id}/cover`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mediaId: media.id,
          ...(altFr.trim() && { altFr: altFr.trim() }),
          ...(altEn.trim() && { altEn: altEn.trim() }),
        }),
      });
    },
    onSuccess: async (saved) => {
      await onSaved(saved);
      setFile(null);
      setAltFr('');
      setAltEn('');
      setPickerKey((key) => key + 1);
      toast.success('Couverture enregistrée');
    },
    onError: (error) =>
      setFileError(
        error instanceof ApiError
          ? error.message
          : 'L’image n’a pas pu être envoyée. Réessayez.',
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

  return (
    <Card title="Couverture">
      {cover && (
        <div className="mb-5 overflow-hidden rounded-xl border border-line bg-sunken">
          {/* Image publique servie par l'API via `/uploads/*` : pas d'optimisation Next nécessaire dans le portail. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover.url}
            alt={cover.altFr ?? ''}
            className="aspect-[16/9] w-full object-cover"
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

      <div className="space-y-3">
        <p className="text-[13px] font-medium text-ink">
          {cover ? 'Remplacer la couverture' : 'Ajouter une couverture'}
        </p>
        <FilePicker
          key={pickerKey}
          file={file}
          error={fileError}
          kind="image"
          accept="image/jpeg,image/png,image/webp"
          idleLabel="Choisir une image"
          disabled={save.isPending}
          onChange={(next) => {
            setFile(next);
            setFileError(next ? imageProblem(next) : null);
          }}
        />
        <p className="text-xs text-ink-subtle">
          JPEG, PNG ou WebP, 5 Mo au plus.
        </p>

        {file && !fileError && (
          <>
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
            <Button
              icon={ImagePlus}
              loading={save.isPending}
              onClick={() => save.mutate(file)}
              block
            >
              Enregistrer la couverture
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
