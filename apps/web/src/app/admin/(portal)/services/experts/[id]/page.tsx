'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { ApiError, backendJson } from '@/lib/api/backend';
import { invalidatePortalData } from '@/lib/admin/invalidate';
import { homePathFor } from '@/lib/admin/roles';
import { toFormValues, toPayload, type Expert } from '@/lib/admin/experts';
import { poleOfSlug } from '@/lib/poles';
import { PageHeader } from '@/components/admin/page-header';
import { useSession } from '@/components/admin/session';
import { PortalNotFound } from '@/components/admin/states';
import {
  PublicationPanel,
  type ChecklistItem,
} from '@/components/admin/content/publication-panel';
import { TranslationCard } from '@/components/admin/content/translation-card';
import { ExpertEditor } from '@/components/admin/experts/expert-editor';
import { PoleTag } from '@/components/admin/services/pole-mark';
import {
  ErrorState,
  LoadingRegion,
  Skeleton,
  StatusChip,
  useToast,
} from '@/components/admin/ui';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const detailKey = (id: string) => ['experts', 'detail', id];

/** `/admin/services/experts/<id>` : le profil d'un expert. */
export default function ExpertDetailPage() {
  const { id } = useParams<{ id: string }>();
  const session = useSession();
  if (!UUID.test(id)) {
    return <PortalNotFound homeHref={homePathFor(session.role)} />;
  }
  return <ExpertDetail id={id} />;
}

function ExpertDetail({ id }: { id: string }) {
  const session = useSession();
  const query = useQuery({
    queryKey: detailKey(id),
    queryFn: () => backendJson<Expert>(`admin/experts/${id}`),
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
        href="/admin/services/experts"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Experts
      </Link>
      {query.isLoading ? (
        <LoadingRegion>
          <Skeleton className="h-8 w-80" />
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <Skeleton className="h-[28rem] rounded-2xl" />
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
        <Detail expert={query.data} />
      )}
    </div>
  );
}

/** Après une écriture : la fiche reçoit la réponse du serveur, le reste du portail se rafraîchit. */
async function applySaved(queryClient: QueryClient, saved: Expert) {
  queryClient.setQueryData(detailKey(saved.id), saved);
  await invalidatePortalData(queryClient);
}

function Detail({ expert: e }: { expert: Expert }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const pole = e.service ? poleOfSlug(e.service.slug) : null;
  const saved = (next: Expert) => applySaved(queryClient, next);

  // Prérequis de publication : mêmes que l'API (nom et fonction en français).
  const checklist: ChecklistItem[] = [
    { label: 'Nom', done: e.fullName.trim() !== '' },
    { label: 'Fonction en français', done: e.roleFr.trim() !== '' },
    {
      label: 'Portrait',
      done: e.photoUrl !== null,
      optional: true,
      hint: 'Sans photo, le site affiche les initiales.',
    },
    {
      label: 'Version anglaise de la fonction',
      done: Boolean(e.roleEn?.trim()),
      optional: true,
      hint: 'Sans elle, le site en anglais affiche le français.',
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusChip kind="content" value={e.status} />
            {pole && <PoleTag pole={pole} />}
          </span>
        }
        title={e.fullName}
        description={e.roleFr}
      />

      {/* `key` : après un enregistrement, le formulaire repart des valeurs du serveur. */}
      <ExpertEditor
        key={e.updatedAt}
        mode="edit"
        defaults={toFormValues(e)}
        submitLabel="Enregistrer les modifications"
        onSubmit={async (values) => {
          const next = await backendJson<Expert>(`admin/experts/${e.id}`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(toPayload(values)),
          });
          await saved(next);
          toast.success('Modifications enregistrées');
        }}
        sidebar={
          <>
            <PublicationPanel<Expert>
              endpoint={`admin/experts/${e.id}`}
              status={e.status}
              publishedAt={e.publishedAt}
              updatedAt={e.updatedAt}
              slug={e.fullName}
              noun={{ label: 'expert', feminine: false }}
              checklist={checklist}
              publicHref="/fr/a-propos#equipe"
              allowArchive={false}
              afterDeleteHref="/admin/services/experts"
              unpublishImpact="Il disparaît immédiatement de la page À propos. Le profil reste en brouillon dans le portail."
              onPublished={saved}
            />
            <TranslationCard
              pairs={[
                ['Fonction', e.roleFr, e.roleEn],
                ['Présentation', e.bioFr, e.bioEn],
                [
                  'Spécialités',
                  e.specialtiesFr.join(', '),
                  e.specialtiesEn.join(', '),
                ],
              ]}
            />
          </>
        }
      />
    </>
  );
}
