'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { ApiError, backendJson } from '@/lib/api/backend';
import { invalidatePortalData } from '@/lib/admin/invalidate';
import { homePathFor } from '@/lib/admin/roles';
import {
  TYPE_LABELS,
  coverOf,
  publicationDate,
  toFormValues,
  toPayload,
  type Article,
} from '@/lib/admin/articles';
import { PageHeader } from '@/components/admin/page-header';
import { useSession } from '@/components/admin/session';
import { PortalNotFound } from '@/components/admin/states';
import { ArticleForm } from '@/components/admin/articles/article-form';
import { CoverCard } from '@/components/admin/articles/cover-card';
import {
  PublicationBadge,
  isScheduled,
} from '@/components/admin/content/publication-badge';
import {
  PublicationPanel,
  type ChecklistItem,
} from '@/components/admin/content/publication-panel';
import { TranslationCard } from '@/components/admin/content/translation-card';
import {
  Badge,
  ErrorState,
  Field,
  Input,
  LoadingRegion,
  Skeleton,
  useToast,
} from '@/components/admin/ui';

const detailKey = (id: string) => ['articles', 'detail', id];

export default function ArticleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const session = useSession();
  const query = useQuery({
    queryKey: detailKey(id),
    queryFn: () => backendJson<Article>(`admin/articles/${id}`),
    retry: (count, error) =>
      !(error instanceof ApiError && [400, 404].includes(error.status)) &&
      count < 2,
  });

  if (
    query.error instanceof ApiError &&
    [400, 404].includes(query.error.status)
  ) {
    return <PortalNotFound homeHref={homePathFor(session.role)} />;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/actualites"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Actualités & publications
      </Link>
      {query.isLoading ? (
        <LoadingRegion>
          <Skeleton className="h-8 w-96" />
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <Skeleton className="h-[32rem] rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
          </div>
        </LoadingRegion>
      ) : query.error || !query.data ? (
        <ErrorState
          error={query.error}
          onRetry={() => query.refetch()}
          retrying={query.isRefetching}
          size="page"
        />
      ) : (
        <Detail article={query.data} />
      )}
    </div>
  );
}

/** Après une écriture : la fiche reçoit la réponse du serveur, le reste du portail se rafraîchit. */
async function applySaved(queryClient: QueryClient, saved: Article) {
  queryClient.setQueryData(detailKey(saved.id), saved);
  await invalidatePortalData(queryClient);
}

/** Valeur d'un `<input type="datetime-local">` : « 2026-10-02T09:30 », en heure locale. */
function isFuture(localValue: string) {
  return localValue !== '' && new Date(localValue).getTime() > Date.now();
}

function Detail({ article: a }: { article: Article }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  // Date de parution choisie à la publication (vide : maintenant ; future : programmation).
  const [publishAt, setPublishAt] = useState('');
  const date = publicationDate(a);
  const scheduled = isScheduled(a.status, a.publishedAt);

  const checklist: ChecklistItem[] = [
    { label: 'Titre en français', done: a.titleFr.trim() !== '' },
    {
      label: 'Un résumé ou un contenu',
      done: Boolean(a.excerptFr?.trim()) || a.contentFr.trim() !== '',
      hint: 'Rédigez-en un dans « Article », puis enregistrez.',
    },
    {
      label: 'Une image de couverture',
      done: coverOf(a) !== null,
      hint: 'Recommandée : elle illustre l’article dans les listes.',
      optional: true,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex flex-wrap items-center gap-2">
            <PublicationBadge status={a.status} publishedAt={a.publishedAt} />
            <Badge>{TYPE_LABELS[a.type]}</Badge>
          </span>
        }
        title={a.titleFr}
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {date && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={14} aria-hidden="true" />
                {scheduled ? `Parution le ${date}` : date}
              </span>
            )}
            {a.contextFr && <span>{a.contextFr}</span>}
          </span>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* `key` : après un enregistrement, le formulaire repart des valeurs du serveur. */}
        <ArticleForm
          key={a.updatedAt}
          mode="edit"
          defaults={toFormValues(a)}
          slugLocked={a.publishedAt !== null}
          submitLabel="Enregistrer les modifications"
          cancelHref="/admin/actualites"
          onSubmit={async (values) => {
            const saved = await backendJson<Article>(`admin/articles/${a.id}`, {
              method: 'PATCH',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(toPayload(values)),
            });
            await applySaved(queryClient, saved);
            toast.success('Modifications enregistrées');
          }}
        />

        <div className="space-y-6 lg:sticky lg:top-4">
          <PublicationPanel<Article>
            endpoint={`admin/articles/${a.id}`}
            status={a.status}
            publishedAt={a.publishedAt}
            updatedAt={a.updatedAt}
            slug={a.slug}
            noun={{ label: 'article', feminine: false }}
            checklist={checklist}
            publishLabel={
              isFuture(publishAt) ? 'Programmer la parution' : undefined
            }
            publishBody={() =>
              publishAt
                ? { publishedAt: new Date(publishAt).toISOString() }
                : {}
            }
            publicHref={`/fr/actualites/${a.slug}`}
            unpublishImpact="Il disparaît immédiatement du site public. Il reste en brouillon dans le portail ; republiez-le avec une nouvelle date si besoin."
            afterDeleteHref="/admin/actualites"
            onPublished={(saved) => applySaved(queryClient, saved)}
          >
            <Field
              label="Date de parution"
              hint="Laissez vide pour publier maintenant. Une date passée antidate l’article, une date future programme sa parution : il reste invisible jusque-là."
            >
              <Input
                type="datetime-local"
                value={publishAt}
                onChange={(event) => setPublishAt(event.target.value)}
              />
            </Field>
          </PublicationPanel>

          <CoverCard
            article={a}
            onSaved={(saved) => applySaved(queryClient, saved)}
          />

          <TranslationCard
            pairs={[
              ['Titre', a.titleFr, a.titleEn],
              ['Résumé', a.excerptFr, a.excerptEn],
              ['Contexte', a.contextFr, a.contextEn],
              ['Contenu', a.contentFr, a.contentEn],
            ]}
          />
        </div>
      </div>
    </>
  );
}
