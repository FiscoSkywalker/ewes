'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, FilePlus2 } from 'lucide-react';
import { backendJson } from '@/lib/api/backend';
import { invalidatePortalData } from '@/lib/admin/invalidate';
import { homePathFor } from '@/lib/admin/roles';
import {
  PAGE_STATE_LABELS,
  bySlug,
  pageState,
  toFormValues,
  toPayload,
  type AdminPage,
} from '@/lib/admin/pages';
import {
  sitePageOf,
  type SitePage,
  type SitePageDefaults,
} from '@/lib/site-pages';
import { PageHeader } from '@/components/admin/page-header';
import { useSession } from '@/components/admin/session';
import { PortalNotFound } from '@/components/admin/states';
import {
  PublicationPanel,
  type ChecklistItem,
} from '@/components/admin/content/publication-panel';
import { TranslationCard } from '@/components/admin/content/translation-card';
import { PageEditor } from '@/components/admin/pages/page-editor';
import {
  Badge,
  Card,
  ErrorState,
  LoadingRegion,
  Skeleton,
  useToast,
} from '@/components/admin/ui';

const LIST_KEY = ['pages', 'list'];

/**
 * `/admin/pages/<slug>` : l'en-tête d'une page du site. Tant qu'aucune page
 * n'est enregistrée, le formulaire part des textes d'origine du site ; le
 * premier enregistrement crée un brouillon, la publication est une action à
 * part (le site continue d'afficher le texte d'origine d'ici là).
 */
export default function PageDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const session = useSession();
  const sitePage = sitePageOf(slug);
  if (!sitePage) {
    return <PortalNotFound homeHref={homePathFor(session.role)} />;
  }
  return <PageDetail sitePage={sitePage} />;
}

function PageDetail({ sitePage }: { sitePage: SitePage }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const pages = useQuery({
    queryKey: LIST_KEY,
    queryFn: () => backendJson<AdminPage[]>('admin/pages'),
  });
  const defaults = useQuery({
    queryKey: ['site-pages', 'defaults'],
    queryFn: async () => {
      const res = await fetch('/api/site-pages/defaults');
      if (!res.ok) throw new Error('Textes d’origine indisponibles');
      return (await res.json()) as SitePageDefaults;
    },
    staleTime: Number.POSITIVE_INFINITY,
  });

  const back = (
    <Link
      href="/admin/pages"
      className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
    >
      <ArrowLeft size={14} aria-hidden="true" />
      Pages institutionnelles
    </Link>
  );

  if (pages.isLoading || defaults.isLoading) {
    return (
      <div className="space-y-6">
        {back}
        <LoadingRegion>
          <Skeleton className="h-8 w-72" />
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Skeleton className="h-[26rem] rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
          </div>
        </LoadingRegion>
      </div>
    );
  }

  const failure = pages.error ?? defaults.error;
  if (failure || !pages.data) {
    return (
      <div className="space-y-6">
        {back}
        <ErrorState
          error={failure}
          onRetry={() => {
            void pages.refetch();
            void defaults.refetch();
          }}
          retrying={pages.isRefetching || defaults.isRefetching}
          size="page"
        />
      </div>
    );
  }

  const record = bySlug(pages.data).get(sitePage.slug);
  const texts = defaults.data?.[sitePage.slug];

  /** Après une écriture : la liste reçoit la réponse du serveur, le reste du portail se rafraîchit. */
  const applySaved = async (saved: AdminPage) => {
    queryClient.setQueryData<AdminPage[]>(LIST_KEY, (list) =>
      list ? [...list.filter((page) => page.id !== saved.id), saved] : [saved],
    );
    await invalidatePortalData(queryClient);
  };

  return (
    <div className="space-y-6">
      {back}
      <PageHeader
        eyebrow={
          <span className="inline-flex flex-wrap items-center gap-2">
            {pageState(record) === 'live' ? (
              <Badge tone="ok" dot>
                {PAGE_STATE_LABELS.live}
              </Badge>
            ) : pageState(record) === 'draft' ? (
              <Badge tone="warn">{PAGE_STATE_LABELS.draft}</Badge>
            ) : (
              <Badge>{PAGE_STATE_LABELS.default}</Badge>
            )}
            <span className="font-mono normal-case tracking-normal">
              {sitePage.href}
            </span>
          </span>
        }
        title={sitePage.label}
        description={sitePage.purpose}
        actions={
          <Link
            href={`/fr${sitePage.href}`}
            target="_blank"
            rel="noopener"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong bg-panel px-4 text-[13px] font-medium text-ink transition-colors hover:border-brand/40 hover:bg-sunken"
          >
            <ExternalLink size={16} aria-hidden="true" />
            Voir la page sur le site
          </Link>
        }
      />

      {/* `key` : après un enregistrement, le formulaire repart des valeurs du serveur. */}
      <PageEditor
        key={record ? `${record.id}:${record.updatedAt}` : 'new'}
        sitePage={sitePage}
        mode={record ? 'edit' : 'create'}
        defaults={toFormValues(record ?? null, texts)}
        texts={texts}
        live={pageState(record) === 'live'}
        submitLabel={
          record ? 'Enregistrer les modifications' : 'Enregistrer le brouillon'
        }
        onSubmit={async (values) => {
          const saved = record
            ? await backendJson<AdminPage>(`admin/pages/${record.id}`, {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(toPayload(values)),
              })
            : await backendJson<AdminPage>('admin/pages', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                  slug: sitePage.slug,
                  ...toPayload(values),
                }),
              });
          await applySaved(saved);
          toast.success(
            record ? 'Modifications enregistrées' : 'Brouillon enregistré',
            record
              ? undefined
              : {
                  description:
                    'Le site affiche encore le texte d’origine : publiez la page pour la mettre en ligne.',
                },
          );
        }}
        sidebar={
          record ? (
            <>
              <PublicationPanel<AdminPage>
                endpoint={`admin/pages/${record.id}`}
                status={record.status}
                publishedAt={record.publishedAt}
                updatedAt={record.updatedAt}
                slug={record.slug}
                noun={{ label: 'page', feminine: true }}
                checklist={checklist(record)}
                publicHref={`/fr${sitePage.href}`}
                allowArchive={false}
                allowDelete={false}
                unpublishImpact="Le site affichera de nouveau le texte d’origine de cette page. Votre version reste enregistrée en brouillon."
                onPublished={applySaved}
              />
              <TranslationCard
                pairs={[
                  ['Titre', record.titleFr, record.titleEn],
                  ['Introduction', record.contentFr, record.contentEn],
                  [
                    'Description pour les moteurs de recherche',
                    record.metaDescriptionFr,
                    record.metaDescriptionEn,
                  ],
                ]}
              />
            </>
          ) : (
            <Card title="Publication">
              <div className="flex gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                  <FilePlus2 size={18} aria-hidden="true" />
                </span>
                <div className="space-y-1.5 text-[13px] leading-relaxed text-ink-muted">
                  <p className="font-medium text-ink">
                    Cette page affiche le texte d’origine du site.
                  </p>
                  <p>
                    Modifiez les textes, enregistrez un brouillon, puis publiez
                    : vos textes remplacent alors ceux d’origine. Tant que ce
                    n’est pas publié, les visiteurs ne voient rien de changé.
                  </p>
                </div>
              </div>
            </Card>
          )
        }
      />
    </div>
  );
}

/** Prérequis de publication : mêmes que l'API (titre et introduction en français). */
function checklist(page: AdminPage): ChecklistItem[] {
  return [
    { label: 'Titre en français', done: page.titleFr.trim() !== '' },
    { label: 'Introduction en français', done: page.contentFr.trim() !== '' },
    {
      label: 'Version anglaise du titre et de l’introduction',
      done: Boolean(page.titleEn?.trim() && page.contentEn?.trim()),
      optional: true,
      hint: 'Sans elle, le site en anglais affiche le texte français.',
    },
  ];
}
