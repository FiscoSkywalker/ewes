'use client';

import { useQuery } from '@tanstack/react-query';
import {
  CircleCheck,
  FileText,
  Globe,
  Info,
  Languages,
  ListChecks,
} from 'lucide-react';
import { backendJson } from '@/lib/api/backend';
import { plural, relativeTime } from '@/lib/admin/format';
import {
  PAGE_STATE_LABELS,
  bySlug,
  pageState,
  type AdminPage,
} from '@/lib/admin/pages';
import {
  SITE_PAGES,
  type SitePage,
  type SitePageDefaults,
} from '@/lib/site-pages';
import { PageHeader } from '@/components/admin/page-header';
import { Badge, DataTable, type Column } from '@/components/admin/ui';

interface Row {
  sitePage: SitePage;
  record: AdminPage | undefined;
}

const TITLE_CLASS = 'block truncate font-medium text-ink';

export default function PagesPage() {
  const pages = useQuery({
    queryKey: ['pages', 'list'],
    queryFn: () => backendJson<AdminPage[]>('admin/pages'),
  });
  // Textes d'origine : ce que le site affiche tant qu'une page n'est pas publiée.
  const defaults = useQuery({
    queryKey: ['site-pages', 'defaults'],
    queryFn: async () => {
      const res = await fetch('/api/site-pages/defaults');
      if (!res.ok) throw new Error('Textes d’origine indisponibles');
      return (await res.json()) as SitePageDefaults;
    },
    staleTime: Number.POSITIVE_INFINITY,
  });

  const records = bySlug(pages.data);
  const rows: Row[] | undefined = pages.data
    ? SITE_PAGES.map((sitePage) => ({
        sitePage,
        record: records.get(sitePage.slug),
      }))
    : undefined;

  const liveCount =
    rows?.filter((row) => pageState(row.record) === 'live').length ?? 0;

  const columns: Column<Row>[] = [
    {
      id: 'page',
      header: 'Page',
      className: 'min-w-56',
      cell: ({ sitePage }) => (
        <span className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
            <FileText size={18} aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className={TITLE_CLASS}>{sitePage.label}</span>
            <span className="block truncate font-mono text-xs text-ink-subtle">
              {sitePage.href}
            </span>
          </span>
        </span>
      ),
    },
    {
      id: 'title',
      header: 'Titre affiché sur le site',
      hideBelow: 'md',
      className: 'max-w-md',
      cell: ({ sitePage, record }) => {
        const live = pageState(record) === 'live';
        const title = live
          ? record?.titleFr
          : defaults.data?.[sitePage.slug].fr.title;
        return (
          <span className="block min-w-0">
            <span
              className={`block truncate ${live ? 'text-ink' : 'text-ink-muted'}`}
            >
              {title ?? '…'}
            </span>
            <span className="block truncate text-xs text-ink-subtle">
              {live ? 'Modifié depuis le portail' : 'Texte d’origine du site'}
            </span>
          </span>
        );
      },
    },
    {
      id: 'english',
      header: 'Anglais',
      hideBelow: 'lg',
      cell: ({ record }) => {
        if (pageState(record) !== 'live') {
          return <span className="text-xs text-ink-subtle">—</span>;
        }
        return record?.titleEn && record.contentEn ? (
          <Badge tone="ok" icon={Languages}>
            Traduite
          </Badge>
        ) : (
          <Badge tone="warn" icon={Languages}>
            À traduire
          </Badge>
        );
      },
    },
    {
      id: 'updated',
      header: 'Modifiée',
      hideBelow: 'lg',
      className: 'whitespace-nowrap text-ink-muted',
      cell: ({ record }) =>
        record ? (
          <time
            dateTime={record.updatedAt}
            title={new Date(record.updatedAt).toLocaleString('fr')}
          >
            {relativeTime(record.updatedAt)}
          </time>
        ) : (
          '—'
        ),
    },
    {
      id: 'status',
      header: 'Statut',
      align: 'end',
      cell: ({ record }) => {
        const state = pageState(record);
        return state === 'live' ? (
          <Badge tone="ok" dot>
            {PAGE_STATE_LABELS.live}
          </Badge>
        ) : state === 'draft' ? (
          <Badge tone="warn">{PAGE_STATE_LABELS.draft}</Badge>
        ) : (
          <Badge>{PAGE_STATE_LABELS.default}</Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Contenus du site"
        title="Pages institutionnelles"
        description="Le titre, l’introduction et la description pour les moteurs de recherche de chaque page du site, en français et en anglais."
      />

      <div className="flex gap-3 rounded-2xl border border-line bg-brand-soft/50 p-4 text-[13px] leading-relaxed text-ink-muted">
        <Info
          size={18}
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-brand"
        />
        <div className="space-y-1.5">
          <p>
            <strong className="font-medium text-ink">
              Tant qu’une page n’est pas publiée ici, le site affiche son texte
              d’origine.
            </strong>{' '}
            Ouvrez une page : le formulaire part de ce que les visiteurs lisent
            déjà, vous modifiez, puis vous publiez.
          </p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-subtle">
            <span className="inline-flex items-center gap-1.5">
              <Globe size={13} aria-hidden="true" />
              Les chiffres clés, l’équipe, les références et l’Accueil sont
              composés à part.
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ListChecks size={13} aria-hidden="true" />
              Les pôles et leurs prestations : « Pôles & services ».
            </span>
          </p>
        </div>
      </div>

      <DataTable
        caption="Pages institutionnelles du site"
        columns={columns}
        rows={rows}
        getRowId={({ sitePage }) => sitePage.slug}
        rowHref={({ sitePage }) => `/admin/pages/${sitePage.slug}`}
        isLoading={pages.isLoading}
        error={pages.error}
        onRetry={() => pages.refetch()}
        loadingRows={SITE_PAGES.length}
      />

      {rows && (
        <p className="flex items-center gap-1.5 text-xs text-ink-subtle">
          <CircleCheck size={13} aria-hidden="true" />
          {plural(
            liveCount,
            'page personnalisée',
            'pages personnalisées',
          )} sur {rows.length}.
        </p>
      )}
    </div>
  );
}
