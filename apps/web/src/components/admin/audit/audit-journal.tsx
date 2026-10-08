'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  ChevronRight,
  KeyRound,
  RefreshCw,
  ScrollText,
  SearchX,
  ShieldAlert,
  Sunrise,
  X,
} from 'lucide-react';
import { backendJson, type Paginated } from '@/lib/api/backend';
import { cx, focusRing } from '@/lib/admin/cx';
import { relativeTime } from '@/lib/admin/format';
import {
  CATEGORIES,
  actionLabel,
  actionTone,
  actorName,
  attemptedEmail,
  categoryOf,
  dayOffset,
  entityHref,
  entityName,
  entityTypeLabel,
  type AuditCategory,
  type AuditFacets,
  type AuditRow,
} from '@/lib/admin/audit';
import { PageHeader } from '../page-header';
import {
  Badge,
  Button,
  CardList,
  DataTable,
  EmptyState,
  Field,
  Input,
  Pagination,
  SearchInput,
  SegmentedControl,
  Select,
  useDebouncedValue,
  type Column,
} from '../ui';
import { AuditDetail } from './audit-detail';

const PAGE_SIZE = 25;

type CategoryFilter = AuditCategory | 'all';
type Period = 'all' | 'today' | '7' | '30' | 'custom';

const PERIODS: Record<Period, string> = {
  all: 'Toute la période',
  today: 'Aujourd’hui',
  '7': '7 derniers jours',
  '30': '30 derniers jours',
  custom: 'Dates précises…',
};

const cell = new Intl.DateTimeFormat('fr', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

interface EntityScope {
  type: string;
  id: string;
  label: string | null;
}

/** Filtres de départ transmis par l'adresse (lien depuis une fiche) : lus une fois, jamais réécrits. */
function useInitialFilters() {
  const params = useSearchParams();
  return useMemo(() => {
    const type = params.get('entityType');
    const id = params.get('entityId');
    const category = params.get('category');
    return {
      entity:
        type && id
          ? ({ type, id, label: params.get('label') } satisfies EntityScope)
          : null,
      actorId: params.get('actorId') ?? '',
      category: (CATEGORIES.some((c) => c.id === category)
        ? category
        : 'all') as CategoryFilter,
    };
    // Lecture unique au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

const tile =
  'flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-[border-color,background-color] md:gap-3.5 md:p-4';

export function AuditJournal() {
  const initial = useInitialFilters();
  // Journal courant (12 derniers mois) ou archive (plus anciennes entrées, en lecture seule).
  const [archived, setArchived] = useState(false);
  const [category, setCategory] = useState<CategoryFilter>(initial.category);
  const [action, setAction] = useState('');
  const [actorId, setActorId] = useState(initial.actorId);
  const [entity, setEntity] = useState<EntityScope | null>(initial.entity);
  const [period, setPeriod] = useState<Period>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const q = useDebouncedValue(search.trim());

  const liveFacets = useQuery({
    queryKey: ['audit', 'facets'],
    queryFn: () => backendJson<AuditFacets>('admin/audit-logs/facets'),
    staleTime: 60_000,
  });
  const archiveFacets = useQuery({
    queryKey: ['audit', 'facets', 'archive'],
    queryFn: () =>
      backendJson<AuditFacets>('admin/audit-logs/facets?archived=true'),
    enabled: archived,
    staleTime: 60_000,
  });
  const facets = archived ? archiveFacets : liveFacets;
  const known = facets.data?.actions ?? [];
  const inCategory = (value: CategoryFilter) =>
    known.filter((a) => value === 'all' || categoryOf(a.action) === value);
  // Les repères du haut décrivent toujours le journal courant, jamais l'archive.
  const deniedCodes = (liveFacets.data?.actions ?? [])
    .filter((a) => categoryOf(a.action) === 'security')
    .map((a) => a.action);

  // Action effective : celle choisie, sinon toutes celles de la catégorie.
  const categoryCodes = category === 'all' ? [] : inCategory(category);
  const actionParam =
    action || categoryCodes.map((a) => a.action).join(',') || '';
  // Catégorie choisie mais aucune action de ce genre dans le journal : rien à chercher.
  const categoryEmpty =
    !action && category !== 'all' && facets.data && categoryCodes.length === 0;
  const waitingFacets = !action && category !== 'all' && !facets.data;

  const range =
    period === 'today'
      ? { from: dayOffset(0), to: dayOffset(0) }
      : period === '7'
        ? { from: dayOffset(6), to: '' }
        : period === '30'
          ? { from: dayOffset(29), to: '' }
          : period === 'custom'
            ? { from, to }
            : { from: '', to: '' };

  const buildParams = (extra: Record<string, string>) => {
    const params = new URLSearchParams(extra);
    if (actorId) params.set('actorId', actorId);
    if (entity) {
      params.set('entityType', entity.type);
      params.set('entityId', entity.id);
    }
    if (q) params.set('q', q);
    return params;
  };

  const params = buildParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (archived) params.set('archived', 'true');
  if (actionParam) params.set('action', actionParam);
  if (range.from) params.set('from', range.from);
  if (range.to) params.set('to', range.to);

  const list = useQuery({
    queryKey: ['audit', 'list', params.toString()],
    queryFn: () =>
      backendJson<Paginated<AuditRow>>(`admin/audit-logs?${params}`),
    placeholderData: keepPreviousData,
    enabled: !categoryEmpty && !waitingFacets,
    refetchInterval: 60_000,
  });

  // Repères du haut de page (hors filtres : « où en est-on », pas « que cherche-t-on »).
  const todayCount = useQuery({
    queryKey: ['audit', 'tile', 'today'],
    queryFn: () =>
      backendJson<Paginated<AuditRow>>(
        `admin/audit-logs?limit=1&from=${dayOffset(0)}`,
      ),
    refetchInterval: 60_000,
  });
  const deniedCount = useQuery({
    queryKey: ['audit', 'tile', 'denied', deniedCodes.join(',')],
    queryFn: () =>
      backendJson<Paginated<AuditRow>>(
        `admin/audit-logs?limit=1&from=${dayOffset(6)}&action=${deniedCodes.join(',')}`,
      ),
    enabled: deniedCodes.length > 0,
    refetchInterval: 60_000,
  });
  const failedCount = useQuery({
    queryKey: ['audit', 'tile', 'failed-logins'],
    queryFn: () =>
      backendJson<Paginated<AuditRow>>(
        `admin/audit-logs?limit=1&from=${dayOffset(0)}&action=AUTH_LOGIN_FAILED`,
      ),
    refetchInterval: 60_000,
  });

  const total = list.data?.meta.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (list.data && page > lastPage) setPage(lastPage);

  const rows = categoryEmpty ? [] : list.data?.data;
  const opened = rows?.findIndex((row) => row.id === openId) ?? -1;

  const filtered =
    category !== 'all' ||
    action !== '' ||
    actorId !== '' ||
    entity !== null ||
    period !== 'all' ||
    q !== '';
  const reset = () => {
    setCategory('all');
    setAction('');
    setActorId('');
    setEntity(null);
    setPeriod('all');
    setFrom('');
    setTo('');
    setSearch('');
    setPage(1);
  };
  // Un filtre change : retour à la première page.
  const pick =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setPage(1);
    };

  const actionOptions = (
    category === 'all'
      ? CATEGORIES.map((c) => c.id)
      : [category as AuditCategory]
  ).map((id) => ({
    id,
    label: CATEGORIES.find((c) => c.id === id)!.label,
    items: known
      .filter((a) => categoryOf(a.action) === id)
      .sort((a, b) =>
        actionLabel(a.action).localeCompare(actionLabel(b.action), 'fr'),
      ),
  }));

  const columns: Column<AuditRow>[] = [
    {
      id: 'date',
      header: 'Date',
      className: 'whitespace-nowrap',
      cell: (row) => (
        <span className="block">
          <time dateTime={row.createdAt} className="text-ink">
            {cell.format(new Date(row.createdAt))}
          </time>
          <span className="block text-xs text-ink-subtle">
            {relativeTime(row.createdAt)}
          </span>
        </span>
      ),
    },
    {
      id: 'action',
      header: 'Action',
      className: 'min-w-52',
      cell: (row) => (
        <Badge tone={actionTone(row.action)}>{actionLabel(row.action)}</Badge>
      ),
    },
    {
      id: 'entity',
      header: 'Élément',
      className: 'min-w-48 max-w-xs',
      cell: (row) => <EntityCell row={row} />,
    },
    {
      id: 'actor',
      header: 'Auteur',
      hideBelow: 'md',
      cell: (row) =>
        row.actor ? (
          <span className="text-ink">{row.actor.fullName}</span>
        ) : (
          <span className="text-ink-subtle">{actorName(row)}</span>
        ),
    },
    {
      id: 'details',
      header: <span className="sr-only">Détails</span>,
      align: 'end',
      cell: (row) => (
        <Button
          size="sm"
          variant="ghost"
          iconRight={ChevronRight}
          onClick={() => setOpenId(row.id)}
          aria-label={`Détails : ${actionLabel(row.action)}, ${cell.format(new Date(row.createdAt))}`}
        >
          Détails
        </Button>
      ),
    },
  ];

  const empty = filtered ? (
    <EmptyState
      icon={SearchX}
      title="Aucune entrée pour ces filtres"
      description="Élargissez la période ou retirez un filtre."
      action={
        <Button variant="secondary" size="sm" onClick={reset}>
          Effacer les filtres
        </Button>
      }
    />
  ) : archived ? (
    <EmptyState
      icon={ScrollText}
      title="Aucune entrée archivée"
      description="Les entrées du journal de plus de 12 mois sont déplacées ici automatiquement."
    />
  ) : (
    <EmptyState
      icon={ScrollText}
      title="Aucune action enregistrée"
      description="Les actions sensibles (droits, documents, publications, comptes) seront tracées ici."
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Journal d’audit"
        description="La trace inaltérable des actions sensibles : qui a fait quoi, sur quoi, quand, d’où, avec l’ancienne et la nouvelle valeur. Une entrée ne peut être ni modifiée ni supprimée."
        actions={
          <Button
            variant="secondary"
            icon={RefreshCw}
            loading={list.isFetching && !list.isPlaceholderData}
            onClick={() => {
              void list.refetch();
              void todayCount.refetch();
              void deniedCount.refetch();
              void failedCount.refetch();
              void facets.refetch();
            }}
          >
            Actualiser
          </Button>
        }
      />

      <div className="space-y-2">
        <SegmentedControl<'current' | 'archive'>
          label="Source du journal"
          value={archived ? 'archive' : 'current'}
          onChange={(value) => {
            setArchived(value === 'archive');
            // Les actions et auteurs présents diffèrent d'une source à l'autre.
            reset();
          }}
          options={[
            { value: 'current', label: 'Journal courant' },
            { value: 'archive', label: 'Archives' },
          ]}
          className="w-full sm:w-auto"
        />
        {archived ? (
          <p className="text-sm text-ink-muted">
            Entrées de plus de 12 mois, déplacées automatiquement du journal
            courant. Elles restent inaltérables et consultables ici.
          </p>
        ) : null}
      </div>

      <section aria-label="Repères" hidden={archived}>
        <ul className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3">
          <li>
            <button
              type="button"
              onClick={() => {
                reset();
                setPeriod('today');
              }}
              className={cx(
                tile,
                focusRing,
                'border-line bg-panel hover:border-brand/40',
              )}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl md:size-10 bg-brand-soft text-brand">
                <Sunrise size={19} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-xs text-ink-subtle">
                  Actions aujourd’hui
                </span>
                <span className="block text-xl font-semibold tabular-nums text-ink">
                  {todayCount.data ? todayCount.data.meta.total : '–'}
                </span>
              </span>
            </button>
          </li>
          <li>
            {(() => {
              const count = deniedCount.data?.meta.total ?? 0;
              const alert = count > 0;
              return (
                <button
                  type="button"
                  disabled={deniedCodes.length === 0}
                  onClick={() => {
                    reset();
                    setCategory('security');
                    setPeriod('7');
                  }}
                  className={cx(
                    tile,
                    focusRing,
                    'disabled:cursor-default',
                    alert
                      ? 'border-bad/35 bg-bad-soft/50 hover:border-bad/60'
                      : 'border-line bg-panel hover:border-brand/40',
                  )}
                >
                  <span
                    className={cx(
                      'grid size-9 shrink-0 place-items-center rounded-xl md:size-10',
                      alert
                        ? 'bg-bad-soft text-bad'
                        : 'bg-sunken text-ink-subtle',
                    )}
                  >
                    <ShieldAlert size={19} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-xs text-ink-subtle">
                      Accès refusés · 7 jours
                    </span>
                    <span className="block text-xl font-semibold tabular-nums text-ink">
                      {deniedCodes.length === 0
                        ? '0'
                        : deniedCount.data
                          ? count
                          : '–'}
                    </span>
                  </span>
                </button>
              );
            })()}
          </li>
          <li className="col-span-2 md:col-span-1">
            {(() => {
              const count = failedCount.data?.meta.total ?? 0;
              const alert = count > 0;
              return (
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setCategory('auth');
                    setAction('AUTH_LOGIN_FAILED');
                    setPeriod('today');
                  }}
                  className={cx(
                    tile,
                    focusRing,
                    alert
                      ? 'border-warn/40 bg-warn-soft/50 hover:border-warn/70'
                      : 'border-line bg-panel hover:border-brand/40',
                  )}
                >
                  <span
                    className={cx(
                      'grid size-9 shrink-0 place-items-center rounded-xl md:size-10',
                      alert
                        ? 'bg-warn-soft text-warn'
                        : 'bg-sunken text-ink-subtle',
                    )}
                  >
                    <KeyRound size={19} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-xs text-ink-subtle">
                      Échecs de connexion · aujourd’hui
                    </span>
                    <span className="block text-xl font-semibold tabular-nums text-ink">
                      {failedCount.data ? count : '–'}
                    </span>
                  </span>
                </button>
              );
            })()}
          </li>
        </ul>
      </section>

      <div className="space-y-3">
        <SegmentedControl<CategoryFilter>
          label="Catégorie d’actions"
          value={category}
          onChange={(value) => {
            setCategory(value);
            setAction('');
            setPage(1);
          }}
          options={[
            { value: 'all', label: 'Toutes' },
            ...CATEGORIES.map((c) => ({ value: c.id, label: c.label })),
          ]}
          className="w-full sm:w-auto"
        />

        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <SearchInput
            label="Rechercher dans le journal"
            placeholder="Auteur, action…"
            value={search}
            onValueChange={pick(setSearch)}
            className="col-span-2 lg:col-span-1"
          />
          <Select
            aria-label="Filtrer par action"
            value={action}
            onChange={(event) => pick(setAction)(event.target.value)}
          >
            <option value="">Toutes les actions</option>
            {actionOptions.map(
              (group) =>
                group.items.length > 0 && (
                  <optgroup key={group.id} label={group.label}>
                    {group.items.map((item) => (
                      <option key={item.action} value={item.action}>
                        {actionLabel(item.action)} ({item.count})
                      </option>
                    ))}
                  </optgroup>
                ),
            )}
          </Select>
          <Select
            aria-label="Filtrer par auteur"
            value={actorId}
            onChange={(event) => pick(setActorId)(event.target.value)}
          >
            <option value="">Tous les auteurs</option>
            {facets.data?.actors.map((actor) => (
              <option key={actor.id} value={actor.id}>
                {actor.fullName}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filtrer par période"
            value={period}
            onChange={(event) => pick(setPeriod)(event.target.value as Period)}
            className="col-span-2 lg:col-span-1"
          >
            {(Object.keys(PERIODS) as Period[]).map((key) => (
              <option key={key} value={key}>
                {PERIODS[key]}
              </option>
            ))}
          </Select>
        </div>

        {period === 'custom' && (
          <div className="grid max-w-md grid-cols-2 gap-2.5">
            <Field label="Du" required={false}>
              <Input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(event) => pick(setFrom)(event.target.value)}
              />
            </Field>
            <Field label="Au" required={false}>
              <Input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(event) => pick(setTo)(event.target.value)}
              />
            </Field>
          </div>
        )}

        {(entity || filtered) && (
          <div className="flex flex-wrap items-center gap-2">
            {entity && (
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-brand-soft py-1 pl-3 pr-1.5 text-xs font-medium text-brand">
                <span className="truncate">
                  {entityTypeLabel(entity.type)} ·{' '}
                  {entity.label ?? `${entity.id.slice(0, 8)}…`}
                </span>
                <button
                  type="button"
                  aria-label="Retirer le filtre sur cet élément"
                  onClick={() => pick(setEntity)(null)}
                  className="grid size-5 place-items-center rounded-full hover:bg-brand/15"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </span>
            )}
            {filtered && (
              <Button variant="ghost" size="sm" onClick={reset}>
                Effacer les filtres
              </Button>
            )}
          </div>
        )}
      </div>

      <CardList<AuditRow>
        className="sm:hidden"
        label="Entrées du journal"
        rows={rows}
        getId={(row) => row.id}
        isLoading={list.isLoading || waitingFacets}
        error={list.error}
        onRetry={() => list.refetch()}
        empty={empty}
        render={(row) => (
          <button
            type="button"
            onClick={() => setOpenId(row.id)}
            className={cx(
              'block w-full rounded-2xl border border-line bg-panel p-4 text-left active:bg-sunken',
              focusRing,
            )}
          >
            <span className="flex items-start justify-between gap-3">
              <Badge tone={actionTone(row.action)}>
                {actionLabel(row.action)}
              </Badge>
              <ChevronRight
                size={16}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-ink-subtle"
              />
            </span>
            <span className="mt-2.5 block">
              <EntityCell row={row} />
            </span>
            <span className="mt-2 block text-xs text-ink-subtle">
              {row.actor ? `Par ${row.actor.fullName}` : actorName(row)} ·{' '}
              <time dateTime={row.createdAt}>
                {cell.format(new Date(row.createdAt))}
              </time>
            </span>
          </button>
        )}
      />
      <DataTable<AuditRow>
        className="hidden sm:block"
        caption="Journal d’audit"
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        isLoading={list.isLoading || waitingFacets}
        error={list.error}
        onRetry={() => list.refetch()}
        empty={empty}
      />

      {list.data && total > 0 && (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
          itemLabel={total > 1 ? 'entrées' : 'entrée'}
        />
      )}

      <AuditDetail
        row={opened >= 0 && rows ? rows[opened] : null}
        position={
          opened >= 0 && rows
            ? { index: (page - 1) * PAGE_SIZE + opened + 1, total }
            : undefined
        }
        onClose={() => setOpenId(null)}
        onPrevious={
          opened > 0 && rows ? () => setOpenId(rows[opened - 1].id) : undefined
        }
        onNext={
          rows && opened >= 0 && opened < rows.length - 1
            ? () => setOpenId(rows[opened + 1].id)
            : undefined
        }
      />
    </div>
  );
}

/** Élément concerné : type, nom (lien si l'écran existe), bénéficiaire d'un droit. */
function EntityCell({ row }: { row: AuditRow }) {
  if (!row.entityId) {
    const attempted = attemptedEmail(row);
    return attempted ? (
      <span className="block min-w-0">
        <span className="block text-xs text-ink-subtle">
          Compte inconnu · adresse saisie
        </span>
        <span className="block truncate text-[13px] font-medium text-ink">
          {attempted}
        </span>
      </span>
    ) : (
      <span className="text-ink-subtle">—</span>
    );
  }
  const name = entityName(row);
  const href = entityHref(row);
  return (
    <span className="block min-w-0">
      <span className="block text-xs text-ink-subtle">
        {entityTypeLabel(row.entityType)}
        {row.entity && !row.entity.exists && ' · supprimé'}
      </span>
      {name ? (
        href ? (
          <Link
            href={href}
            className={cx(
              'block truncate text-[13px] font-medium text-ink hover:underline',
              focusRing,
            )}
          >
            {name}
          </Link>
        ) : (
          <span className="block truncate text-[13px] font-medium text-ink">
            {name}
          </span>
        )
      ) : (
        <span className="block font-mono text-xs text-ink-muted">
          {row.entityId.slice(0, 8)}…
        </span>
      )}
      {row.subject && (
        <span className="block truncate text-xs text-ink-muted">
          pour {row.subject.fullName}
        </span>
      )}
    </span>
  );
}
