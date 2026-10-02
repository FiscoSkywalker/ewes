'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import {
  ArrowLeft,
  Building2,
  CalendarRange,
  Languages,
  MapPin,
  Star,
} from 'lucide-react';
import { ApiError, backendJson } from '@/lib/api/backend';
import { invalidatePortalData } from '@/lib/admin/invalidate';
import { homePathFor } from '@/lib/admin/roles';
import {
  TYPE_LABELS,
  periodLabel,
  toFormValues,
  toPayload,
  type Realisation,
} from '@/lib/admin/realisations';
import { PageHeader } from '@/components/admin/page-header';
import { useSession } from '@/components/admin/session';
import { PortalNotFound } from '@/components/admin/states';
import {
  PublicationPanel,
  type ChecklistItem,
} from '@/components/admin/content/publication-panel';
import { RealisationForm } from '@/components/admin/realisations/realisation-form';
import {
  Badge,
  Card,
  ErrorState,
  LoadingRegion,
  Skeleton,
  StatusChip,
  useToast,
} from '@/components/admin/ui';
import ModulePlaceholderPage from '../../[...slug]/page';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const detailKey = (id: string) => ['realisations', 'detail', id];

/**
 * `/admin/realisations/<id>` : la fiche d'une réalisation. Les autres adresses
 * de cette rubrique (ex. `partenaires`) sont des écrans à venir : l'écran
 * « en préparation » prend le relais plutôt qu'une fausse fiche introuvable.
 */
export default function RealisationDetailPage() {
  const { id } = useParams<{ id: string }>();
  if (!UUID.test(id)) return <ModulePlaceholderPage />;
  return <RealisationDetail id={id} />;
}

function RealisationDetail({ id }: { id: string }) {
  const session = useSession();
  const query = useQuery({
    queryKey: detailKey(id),
    queryFn: () => backendJson<Realisation>(`admin/realisations/${id}`),
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
        href="/admin/realisations"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Réalisations
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
        <Detail realisation={query.data} />
      )}
    </div>
  );
}

/** Après une écriture : la fiche reçoit la réponse du serveur, le reste du portail se rafraîchit. */
async function applySaved(queryClient: QueryClient, saved: Realisation) {
  queryClient.setQueryData(detailKey(saved.id), saved);
  await invalidatePortalData(queryClient);
}

function Detail({ realisation: r }: { realisation: Realisation }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const period = periodLabel(r);

  // Prérequis de publication : mêmes que l'API (blueprint/12 §3, écart assumé).
  const checklist: ChecklistItem[] = [
    { label: 'Intitulé en français', done: r.titleFr.trim() !== '' },
    {
      label: 'Année de la mission',
      done: r.year !== null,
      hint: 'Renseignez-la dans « Classement », puis enregistrez.',
    },
    {
      label: 'Type de mission',
      done: r.projectType !== null,
      hint: 'Renseignez-le dans « Classement », puis enregistrez.',
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusChip kind="content" value={r.status} feminine />
            {r.projectType && <Badge>{TYPE_LABELS[r.projectType].tag}</Badge>}
            {r.isFeatured && (
              <Badge tone="warn" icon={Star}>
                En vitrine
              </Badge>
            )}
          </span>
        }
        title={r.titleFr}
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {period && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarRange size={14} aria-hidden="true" />
                {period}
              </span>
            )}
            {r.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={14} aria-hidden="true" />
                {r.location}
              </span>
            )}
            {r.clientName && (
              <span className="inline-flex items-center gap-1.5">
                <Building2 size={14} aria-hidden="true" />
                {r.clientName}
              </span>
            )}
          </span>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* `key` : après un enregistrement, le formulaire repart des valeurs du serveur. */}
        <RealisationForm
          key={r.updatedAt}
          mode="edit"
          defaults={toFormValues(r)}
          slugLocked={r.publishedAt !== null}
          submitLabel="Enregistrer les modifications"
          cancelHref="/admin/realisations"
          onSubmit={async (values) => {
            const saved = await backendJson<Realisation>(
              `admin/realisations/${r.id}`,
              {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(toPayload(values)),
              },
            );
            await applySaved(queryClient, saved);
            toast.success('Modifications enregistrées');
          }}
        />

        <div className="space-y-6 lg:sticky lg:top-4">
          <PublicationPanel<Realisation>
            endpoint={`admin/realisations/${r.id}`}
            status={r.status}
            publishedAt={r.publishedAt}
            updatedAt={r.updatedAt}
            slug={r.slug}
            noun={{ label: 'réalisation', feminine: true }}
            checklist={checklist}
            unpublishImpact="Elle disparaît immédiatement du site public. Elle reste en brouillon dans le portail."
            afterDeleteHref="/admin/realisations"
            onPublished={(saved) => applySaved(queryClient, saved)}
          />
          <TranslationCard realisation={r} />
        </div>
      </div>
    </>
  );
}

/** Avancement de la version anglaise : seuls comptent les textes déjà rédigés en français. */
function TranslationCard({ realisation: r }: { realisation: Realisation }) {
  const pairs: [string, string | null, string | null][] = [
    ['Intitulé', r.titleFr, r.titleEn],
    ['Description', r.descriptionFr, r.descriptionEn],
    ['Objectifs', r.objectivesFr, r.objectivesEn],
    ['Résultats', r.resultsFr, r.resultsEn],
  ];
  const expected = pairs.filter(([, fr]) => fr && fr.trim() !== '');
  const done = expected.filter(([, , en]) => en && en.trim() !== '');
  const percent = expected.length
    ? Math.round((done.length / expected.length) * 100)
    : 0;
  const missing = expected.filter(([, , en]) => !en || en.trim() === '');

  return (
    <Card title="Version anglaise">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
          <Languages size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">
            {done.length} texte{done.length > 1 ? 's' : ''} sur{' '}
            {expected.length} traduit{done.length > 1 ? 's' : ''}
          </p>
          <div
            role="progressbar"
            aria-label="Avancement de la traduction"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunken"
          >
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ink-subtle">
        {missing.length > 0
          ? `À traduire : ${missing.map(([label]) => label.toLowerCase()).join(', ')}. Sans version anglaise, le site en anglais affiche le texte français.`
          : 'Toutes les versions anglaises sont renseignées.'}
      </p>
    </Card>
  );
}
