'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  CheckCircle2,
  Circle,
  EyeOff,
  Send,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { backendJson } from '@/lib/api/backend';
import { invalidatePortalData } from '@/lib/admin/invalidate';
import { cx } from '@/lib/admin/cx';
import type { ContentStatus } from '@/lib/admin/public-documents';
import { ButtonLink, Button, Card, useConfirm, useToast } from '../ui';
import { PublicationBadge, isScheduled } from './publication-badge';

const dateTime = new Intl.DateTimeFormat('fr', {
  dateStyle: 'long',
  timeStyle: 'short',
});

export interface ChecklistItem {
  label: string;
  done: boolean;
  /** Précision affichée sous un élément manquant. */
  hint?: string;
  /** Recommandé mais non bloquant : la publication reste possible sans lui. */
  optional?: boolean;
}

export interface PublicationPanelProps<T extends { id: string }> {
  /** Chemin de l'API de la fiche sans préfixe, ex. `admin/realisations/<id>`. */
  endpoint: string;
  status: ContentStatus;
  publishedAt: string | null;
  updatedAt: string;
  /** Texte à recopier pour confirmer la suppression. */
  slug: string;
  noun: { label: string; feminine: boolean };
  /** Prérequis de publication : le bouton reste inactif tant qu'un élément manque. */
  checklist?: ChecklistItem[];
  /** Contenu inséré avant les boutons (ex. choix de la date de publication). */
  children?: React.ReactNode;
  /** Corps JSON de la publication (ex. `{ publishedAt }`). */
  publishBody?: () => unknown;
  /** Reçoit la fiche renvoyée par le serveur après publication. */
  onPublished: (saved: T) => Promise<unknown> | unknown;
  /** Libellé du bouton de publication (ex. « Programmer la parution »). */
  publishLabel?: string;
  /** Page publique du contenu : proposée tant qu'il est en ligne. */
  publicHref?: string;
  /** Adresse où revenir une fois la fiche supprimée. */
  afterDeleteHref: string;
  /** Texte de la confirmation de dépublication (ce que le site cesse d'afficher). */
  unpublishImpact: string;
}

/**
 * Cycle de vie d'un contenu éditorial (blueprint/09 §1) : publier,
 * dépublier, archiver, supprimer. Chaque action attend la réponse du serveur
 * (aucun succès présumé) et rafraîchit le reste du portail ; les actions
 * destructives passent par une confirmation (blueprint/14 §4).
 */
export function PublicationPanel<T extends { id: string }>({
  endpoint,
  status,
  publishedAt,
  updatedAt,
  slug,
  noun,
  checklist,
  children,
  publishBody,
  publishLabel,
  publicHref,
  onPublished,
  afterDeleteHref,
  unpublishImpact,
}: PublicationPanelProps<T>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();

  // Devant une voyelle : « cet article », « l’article ».
  const vowel = /^[aeiouyàâéèêëîïôûh]/i.test(noun.label);
  const demonstrative = noun.feminine ? 'cette' : vowel ? 'cet' : 'ce';
  const the = vowel ? 'l’' : noun.feminine ? 'la ' : 'le ';
  const pronoun = noun.feminine ? 'Elle' : 'Il';
  const agree = (word: string) => (noun.feminine ? `${word}e` : word);
  const capital = noun.label.charAt(0).toUpperCase() + noun.label.slice(1);
  const post = (action: string, body?: unknown) =>
    backendJson<T>(`${endpoint}/${action}`, {
      method: 'POST',
      ...(body !== undefined && {
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    });

  const publish = useMutation({
    mutationFn: () => post('publish', publishBody?.()),
    onSuccess: async (saved) => {
      await onPublished(saved);
      // Parution programmée : le contenu n'est pas encore en ligne, le message ne doit pas le prétendre.
      const at = (saved as { publishedAt?: string | null }).publishedAt ?? null;
      if (isScheduled('PUBLISHED', at)) {
        toast.success('Parution programmée', {
          description: `${pronoun} sera visible à partir du ${dateTime.format(new Date(at as string))}.`,
        });
        return;
      }
      toast.success(`${capital} ${agree('publié')}`, {
        description: `${pronoun} est visible sur le site public.`,
      });
    },
    onError: (error) => toast.error(error),
  });

  async function change(
    action: 'unpublish' | 'archive',
    options: { title: string; description: string; confirmLabel: string },
    done: string,
  ) {
    const ok = await confirm({ ...options, onConfirm: () => post(action) });
    if (!ok) return;
    await invalidatePortalData(queryClient);
    toast.success(done);
  }

  async function remove() {
    const ok = await confirm({
      title: `Supprimer ${demonstrative} ${noun.label} ?`,
      description: `${pronoun} disparaît du site et du portail. Cette action est tracée dans le journal d’audit.`,
      tone: 'danger',
      confirmLabel: `Supprimer ${the}${noun.label}`,
      confirmationText: slug,
      onConfirm: () => backendJson<void>(endpoint, { method: 'DELETE' }),
    });
    if (!ok) return;
    await invalidatePortalData(queryClient);
    toast.success(`${capital} ${agree('supprimé')}`);
    router.replace(afterDeleteHref);
  }

  const published = status === 'PUBLISHED';
  const scheduled = isScheduled(status, publishedAt);
  const missing =
    checklist?.filter((item) => !item.done && !item.optional) ?? [];
  const blocked = !published && missing.length > 0;

  return (
    <Card title="Publication">
      <div className="flex items-start justify-between gap-3">
        <div>
          <PublicationBadge
            status={status}
            publishedAt={publishedAt}
            feminine={noun.feminine}
          />
          <p className="mt-2 text-xs text-ink-subtle">
            {publishedAt
              ? `${scheduled ? 'Parution programmée le' : 'Première publication le'} ${dateTime.format(new Date(publishedAt))}`
              : `Jamais ${agree('publié')}`}
          </p>
          <p className="text-xs text-ink-subtle">
            Modifié le {dateTime.format(new Date(updatedAt))}
          </p>
        </div>
      </div>

      {checklist && !published && (
        <div className="mt-5 rounded-xl border border-line bg-sunken/60 p-3.5">
          <p className="mb-2.5 text-[13px] font-medium text-ink">
            {blocked ? 'Avant de publier' : 'Prêt à publier'}
          </p>
          <ul className="space-y-2">
            {checklist.map((item) => (
              <li
                key={item.label}
                className="flex items-start gap-2 text-[13px]"
              >
                {item.done ? (
                  <CheckCircle2
                    size={16}
                    aria-hidden="true"
                    className="mt-px shrink-0 text-ok"
                  />
                ) : (
                  <Circle
                    size={16}
                    aria-hidden="true"
                    className="mt-px shrink-0 text-ink-subtle"
                  />
                )}
                <span className={cx(item.done ? 'text-ink-muted' : 'text-ink')}>
                  {item.label}
                  <span className="sr-only">
                    {item.done ? ' — fait' : ' — à compléter'}
                  </span>
                  {!item.done && item.hint && (
                    <span className="block text-xs text-ink-subtle">
                      {item.hint}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {children && !published && <div className="mt-5">{children}</div>}

      <div className="mt-5 flex flex-col gap-2">
        {!published && (
          <Button
            icon={Send}
            loading={publish.isPending}
            disabled={blocked}
            onClick={() => publish.mutate()}
          >
            {publishLabel ??
              (status === 'ARCHIVED' ? 'Republier' : 'Publier sur le site')}
          </Button>
        )}
        {published && publicHref && !scheduled && (
          <ButtonLink
            href={publicHref}
            target="_blank"
            rel="noopener"
            variant="secondary"
            icon={ExternalLink}
          >
            Voir sur le site
          </ButtonLink>
        )}
        {published && (
          <Button
            variant="secondary"
            icon={EyeOff}
            onClick={() =>
              change(
                'unpublish',
                {
                  title: `Dépublier ${demonstrative} ${noun.label} ?`,
                  description: unpublishImpact,
                  confirmLabel: 'Dépublier',
                },
                `${capital} ${agree('dépublié')}`,
              )
            }
          >
            Dépublier
          </Button>
        )}
        {status !== 'ARCHIVED' && (
          <Button
            variant="secondary"
            icon={Archive}
            onClick={() =>
              change(
                'archive',
                {
                  title: `Archiver ${demonstrative} ${noun.label} ?`,
                  description: `${pronoun} est ${agree('retiré')} du site public et ${agree('conservé')} pour l’historique. Vous pourrez ${noun.feminine ? 'la' : 'le'} republier plus tard.`,
                  confirmLabel: 'Archiver',
                },
                `${capital} ${agree('archivé')}`,
              )
            }
          >
            Archiver
          </Button>
        )}
        <Button variant="ghost" icon={Trash2} onClick={remove}>
          <span className="text-bad">Supprimer</span>
        </Button>
      </div>
    </Card>
  );
}
