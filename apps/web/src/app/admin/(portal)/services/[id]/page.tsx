'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { ApiError, backendJson } from '@/lib/api/backend';
import { invalidatePortalData } from '@/lib/admin/invalidate';
import { homePathFor } from '@/lib/admin/roles';
import {
  hasEnglish,
  poleOf,
  publicHrefOf,
  toPoleFormValues,
  toPolePayload,
  type Service,
} from '@/lib/admin/services';
import { PageHeader } from '@/components/admin/page-header';
import { useSession } from '@/components/admin/session';
import { PortalNotFound } from '@/components/admin/states';
import {
  PublicationPanel,
  type ChecklistItem,
} from '@/components/admin/content/publication-panel';
import { TranslationCard } from '@/components/admin/content/translation-card';
import { OfferingsCard } from '@/components/admin/services/offerings-card';
import {
  PoleForm,
  PoleIdentityCard,
} from '@/components/admin/services/pole-form';
import { PoleTag } from '@/components/admin/services/pole-mark';
import { PoleVisualCard } from '@/components/admin/services/pole-visual-card';
import {
  ErrorState,
  LoadingRegion,
  Skeleton,
  StatusChip,
  useToast,
} from '@/components/admin/ui';
import ModulePlaceholderPage from '../../[...slug]/page';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const detailKey = (id: string) => ['services', 'detail', id];

/**
 * `/admin/services/<id>` : un pôle d'expertise. Les autres adresses de cette
 * rubrique (ex. `experts`) sont des écrans à venir : l'écran « en
 * préparation » prend le relais plutôt qu'une fausse fiche introuvable.
 */
export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  if (!UUID.test(id)) return <ModulePlaceholderPage />;
  return <ServiceDetail id={id} />;
}

function ServiceDetail({ id }: { id: string }) {
  const session = useSession();
  const query = useQuery({
    queryKey: detailKey(id),
    queryFn: () => backendJson<Service>(`admin/services/${id}`),
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
        href="/admin/services"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Pôles & services
      </Link>
      {query.isLoading ? (
        <LoadingRegion>
          <Skeleton className="h-8 w-96" />
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
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
        <Detail service={query.data} />
      )}
    </div>
  );
}

/** Après une écriture : la fiche reçoit la réponse du serveur, le reste du portail se rafraîchit. */
async function applySaved(queryClient: QueryClient, saved: Service) {
  queryClient.setQueryData(detailKey(saved.id), saved);
  await invalidatePortalData(queryClient);
}

function Detail({ service: s }: { service: Service }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const pole = poleOf(s);
  const saved = (next: Service) => applySaved(queryClient, next);

  // Prérequis de publication : mêmes que l'API (nom et présentation en français).
  const checklist: ChecklistItem[] = [
    { label: 'Nom en français', done: s.nameFr.trim() !== '' },
    { label: 'Présentation en français', done: s.descriptionFr.trim() !== '' },
    {
      label: 'Au moins une prestation',
      done: s.offerings.length > 0,
      optional: true,
      hint: 'Sans prestation, le chapitre n’affiche que la présentation.',
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusChip kind="content" value={s.status} />
            {pole && <PoleTag pole={pole} />}
          </span>
        }
        title={s.nameFr}
        description={s.taglineFr ?? undefined}
        actions={
          <Link
            href={publicHrefOf(s)}
            target="_blank"
            rel="noopener"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong bg-panel px-4 text-[13px] font-medium text-ink transition-colors hover:border-brand/40 hover:bg-sunken"
          >
            <ExternalLink size={16} aria-hidden="true" />
            Voir le chapitre sur le site
          </Link>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          {/* `key` : après un enregistrement, le formulaire repart des valeurs du serveur. */}
          <PoleForm
            key={s.updatedAt}
            defaults={toPoleFormValues(s)}
            onSubmit={async (values) => {
              const next = await backendJson<Service>(
                `admin/services/${s.id}`,
                {
                  method: 'PATCH',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify(toPolePayload(values)),
                },
              );
              await saved(next);
              toast.success('Présentation enregistrée');
            }}
          />
          <PoleVisualCard
            key={`visual:${s.imageUrl ?? ''}:${s.imageAltFr ?? ''}:${s.imageAltEn ?? ''}`}
            service={s}
            onSaved={saved}
          />
          <OfferingsCard service={s} />
          <PoleIdentityCard pole={pole} slug={s.slug} />
        </div>

        <div className="space-y-6 lg:sticky lg:top-4">
          <PublicationPanel<Service>
            endpoint={`admin/services/${s.id}`}
            status={s.status}
            publishedAt={s.publishedAt}
            updatedAt={s.updatedAt}
            slug={s.slug}
            noun={{ label: 'pôle', feminine: false }}
            checklist={checklist}
            publicHref={publicHrefOf(s)}
            allowArchive={false}
            allowDelete={false}
            unpublishImpact="Le chapitre de ce pôle disparaît de la page Nos services et de l’Accueil : le site retrouve alors les textes d’origine. Le pôle reste enregistré en brouillon dans le portail."
            onPublished={saved}
          />
          <TranslationCard
            pairs={[
              ['Nom', s.nameFr, s.nameEn],
              ['Accroche', s.taglineFr, s.taglineEn],
              ['Présentation', s.descriptionFr, s.descriptionEn],
              // Une prestation compte comme traduite quand son titre et sa description le sont.
              ...s.offerings.map<[string, string | null, string | null]>(
                (o) => [
                  `Prestation « ${o.titleFr} »`,
                  o.titleFr,
                  hasEnglish(o) ? o.titleEn : null,
                ],
              ),
            ]}
          />
        </div>
      </div>
    </>
  );
}
