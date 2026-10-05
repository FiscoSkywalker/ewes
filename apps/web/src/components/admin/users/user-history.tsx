'use client';

import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowRight, History, SearchX } from 'lucide-react';
import { backendJson, type Paginated } from '@/lib/api/backend';
import { cx } from '@/lib/admin/cx';
import { relativeTime } from '@/lib/admin/format';
import {
  USER_ACTION_LABELS,
  auditDetail,
  type AuditEntry,
} from '@/lib/admin/users';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingRegion,
  Pagination,
  SearchInput,
  Select,
  Skeleton,
  useDebouncedValue,
} from '../ui';

const PAGE_SIZE = 8;

/** Actions qui concernent un compte (entité `User`) : les choix du filtre. */
const ACTION_CHOICES = [
  'USER_ROLE_CHANGED',
  'USER_DEACTIVATED',
  'USER_REACTIVATED',
  'USER_UNLOCKED',
  'AUTH_ACCOUNT_LOCKED',
  'USER_INVITATION_ACCEPTED',
  'USER_PASSWORD_CHANGED',
  'AUTH_PASSWORD_CHANGE_FAILED',
  'USER_PROFILE_UPDATED',
] as const;

const PERIODS = {
  all: { label: 'Toute la période', days: null },
  '7': { label: '7 derniers jours', days: 7 },
  '30': { label: '30 derniers jours', days: 30 },
  '90': { label: '90 derniers jours', days: 90 },
} as const;
type Period = keyof typeof PERIODS;

const dayOffset = (days: number) =>
  new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

/**
 * Historique d'un compte, tiré du journal d'audit : recherche (auteur),
 * filtre par action et par période, pagination — tout se fait côté API, la
 * page affichée est la seule chargée. Les filtres remettent la page à 1.
 */
export function UserHistory({
  userId,
  name,
}: {
  userId: string;
  /** Nom du compte, repris par le journal complet pour nommer le filtre. */
  name: string;
}) {
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [period, setPeriod] = useState<Period>('all');
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim());
  const filtered = q !== '' || action !== '' || period !== 'all';

  const days = PERIODS[period].days;
  const params = new URLSearchParams({
    entityType: 'User',
    entityId: userId,
    page: String(page),
    limit: String(PAGE_SIZE),
  });
  if (q) params.set('q', q);
  if (action) params.set('action', action);
  if (days !== null) params.set('from', dayOffset(days));

  const history = useQuery({
    queryKey: ['users', 'history', userId, q, action, period, page],
    queryFn: () =>
      backendJson<Paginated<AuditEntry>>(`admin/audit-logs?${params}`),
    placeholderData: keepPreviousData,
  });

  const total = history.data?.meta.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // Après un filtre ou une suppression, ne jamais rester sur une page qui n'existe plus.
  if (history.data && page > lastPage) setPage(lastPage);

  // Un filtre change : retour à la première page.
  const change = <T,>(setter: (value: T) => void) => {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  };
  const reset = () => {
    setSearch('');
    setAction('');
    setPeriod('all');
    setPage(1);
  };

  return (
    <Card
      title="Historique"
      description="Les actions enregistrées sur ce compte, de la plus récente à la plus ancienne."
      padding="none"
      actions={
        <Link
          href={`/admin/audit?entityType=User&entityId=${userId}&label=${encodeURIComponent(name)}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
        >
          Journal complet
          <ArrowRight size={13} aria-hidden="true" />
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-2.5 border-b border-line p-4 sm:px-5">
        <SearchInput
          label="Rechercher dans l’historique"
          placeholder="Rechercher un auteur…"
          value={search}
          onValueChange={change(setSearch)}
          className="col-span-2"
        />
        <Select
          aria-label="Filtrer par action"
          value={action}
          onChange={(event) => change(setAction)(event.target.value)}
        >
          <option value="">Toutes actions</option>
          {ACTION_CHOICES.map((code) => (
            <option key={code} value={code}>
              {USER_ACTION_LABELS[code]}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filtrer par période"
          value={period}
          onChange={(event) => change(setPeriod)(event.target.value as Period)}
        >
          {(Object.keys(PERIODS) as Period[]).map((key) => (
            <option key={key} value={key}>
              {PERIODS[key].label}
            </option>
          ))}
        </Select>
      </div>

      {history.isLoading ? (
        <LoadingRegion>
          <div className="space-y-4 p-5">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        </LoadingRegion>
      ) : history.error && !history.data ? (
        <ErrorState
          error={history.error}
          onRetry={() => history.refetch()}
          retrying={history.isRefetching}
        />
      ) : !history.data?.data.length ? (
        filtered ? (
          <EmptyState
            icon={SearchX}
            title="Aucune action pour ces filtres"
            action={
              <Button variant="secondary" size="sm" onClick={reset}>
                Effacer les filtres
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={History}
            title="Aucune action enregistrée"
            description="Les changements de rôle et les désactivations de ce compte apparaîtront ici."
          />
        )
      ) : (
        <ol
          aria-label="Actions enregistrées"
          aria-busy={history.isPlaceholderData || undefined}
          className={cx(
            'px-5 py-4 transition-opacity',
            history.isPlaceholderData && 'opacity-60',
          )}
        >
          {history.data.data.map((entry, index, list) => {
            const detail = auditDetail(entry);
            return (
              <li key={entry.id} className="relative flex gap-3 pb-5 last:pb-0">
                {index < list.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute left-[15px] top-8 bottom-0 w-px bg-line-strong"
                  />
                )}
                <span className="relative grid size-8 shrink-0 place-items-center rounded-full bg-sunken text-ink-muted ring-4 ring-panel">
                  <History size={14} aria-hidden="true" />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-[13px] font-medium text-ink">
                    {USER_ACTION_LABELS[entry.action] ?? entry.action}
                    {detail && (
                      <span className="font-normal text-ink-muted">
                        {' '}
                        · {detail}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-ink-subtle">
                    {entry.actor ? `par ${entry.actor.fullName} · ` : ''}
                    <time
                      dateTime={entry.createdAt}
                      title={new Date(entry.createdAt).toLocaleString('fr')}
                    >
                      {relativeTime(entry.createdAt)}
                    </time>
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {history.data && history.data.meta.total > 0 && (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
          itemLabel={total > 1 ? 'actions' : 'action'}
          className="border-t border-line px-5 py-3"
        />
      )}
    </Card>
  );
}
