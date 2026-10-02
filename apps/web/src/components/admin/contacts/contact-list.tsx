'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CheckCheck, Inbox, SearchX } from 'lucide-react';
import { backendJson, type Paginated } from '@/lib/api/backend';
import {
  contactTopic,
  type ContactMessage,
  type ContactStatus,
} from '@/lib/admin/contacts';
import { relativeTime } from '@/lib/admin/format';
import { PageHeader } from '../page-header';
import {
  Button,
  DataTable,
  EmptyState,
  Pagination,
  SearchInput,
  SegmentedControl,
  StatusChip,
  useDebouncedValue,
  type Column,
  type SortState,
} from '../ui';

const PAGE_SIZE = 20;

const VIEWS: Record<
  ContactStatus,
  { href: string; title: string; description: string }
> = {
  NOUVEAU: {
    href: '/admin/contacts',
    title: 'Messages à traiter',
    description:
      'Demandes reçues par le formulaire de contact du site, pas encore traitées.',
  },
  TRAITE: {
    href: '/admin/contacts/traites',
    title: 'Messages traités',
    description: 'Historique des demandes déjà traitées.',
  },
};

/**
 * Nombre de messages d'un statut : alimente les effectifs du sélecteur.
 * Pas de sondage : le compteur se met à jour au retour sur l'onglet et après
 * chaque action (l'API limite le débit, et tout le portail partage une IP).
 */
function useContactCount(status: ContactStatus) {
  return useQuery({
    queryKey: ['contacts', 'count', status],
    queryFn: () =>
      backendJson<Paginated<ContactMessage>>(
        `admin/contacts?status=${status}&limit=1`,
      ),
    select: (page) => page.meta.total,
  });
}

/** Colonne triable → champ de tri de l'API (`sort` de `GET /admin/contacts`). */
const SORT_FIELDS: Record<string, string> = {
  sender: 'name',
  organization: 'organization',
  receivedAt: 'createdAt',
};

const DEFAULT_SORT: SortState = { id: 'receivedAt', direction: 'desc' };

const COLUMNS: Column<ContactMessage>[] = [
  {
    id: 'sender',
    header: 'Expéditeur',
    sortable: true,
    className: 'min-w-44',
    cell: (m) => (
      <span className="block">
        <span className="block font-medium text-ink">{m.name}</span>
        <span className="block text-xs text-ink-subtle">{m.email}</span>
      </span>
    ),
  },
  {
    id: 'organization',
    header: 'Organisation',
    sortable: true,
    hideBelow: 'lg',
    className: 'max-w-48 truncate text-ink-muted',
    cell: (m) => m.organization ?? '—',
  },
  {
    id: 'message',
    header: 'Demande',
    hideBelow: 'md',
    className: 'max-w-md',
    cell: (m) => {
      const topic = contactTopic(m);
      return (
        <span className="block">
          {topic && (
            <span className="block truncate text-[13px] text-ink">{topic}</span>
          )}
          <span className="block truncate text-xs text-ink-muted">
            {m.message}
          </span>
        </span>
      );
    },
  },
  {
    id: 'receivedAt',
    header: 'Reçu',
    sortable: true,
    firstDirection: 'desc',
    hideBelow: 'sm',
    className: 'whitespace-nowrap text-ink-muted',
    cell: (m) => (
      <time
        dateTime={m.createdAt}
        title={new Date(m.createdAt).toLocaleString('fr')}
      >
        {relativeTime(m.createdAt)}
      </time>
    ),
  },
  {
    id: 'status',
    header: 'Statut',
    align: 'end',
    cell: (m) => <StatusChip kind="contact" value={m.status} />,
  },
];

/**
 * Liste des messages de contact d'un statut (`GET /admin/contacts`),
 * paginée par l'API. « À traiter » et « Traités » sont deux adresses de la
 * navigation qui montent ce même écran.
 */
export function ContactList({ status }: { status: ContactStatus }) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const view = VIEWS[status];
  const q = useDebouncedValue(search.trim());

  const list = useQuery({
    queryKey: ['contacts', 'list', status, page, q, sort],
    queryFn: () => {
      const params = new URLSearchParams({
        status,
        page: String(page),
        limit: String(PAGE_SIZE),
        sort: SORT_FIELDS[sort.id],
        order: sort.direction,
      });
      if (q) params.set('q', q);
      return backendJson<Paginated<ContactMessage>>(`admin/contacts?${params}`);
    },
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
  const pending = useContactCount('NOUVEAU');
  const done = useContactCount('TRAITE');

  const total = list.data?.meta.total ?? 0;
  // La page demandée n'existe plus (messages traités entre-temps) : retour à la dernière.
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (list.data && page > lastPage) setPage(lastPage);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Relation client"
        title={view.title}
        description={view.description}
        actions={
          <SegmentedControl
            label="Filtrer par statut"
            value={status}
            onChange={(next) => router.push(VIEWS[next].href)}
            options={[
              { value: 'NOUVEAU', label: 'À traiter', count: pending.data },
              { value: 'TRAITE', label: 'Traités', count: done.data },
            ]}
          />
        }
      />

      <SearchInput
        label="Rechercher un message"
        placeholder="Rechercher par nom, organisation, e-mail, téléphone ou texte…"
        value={search}
        onValueChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        className="max-w-xl"
      />

      <DataTable
        caption={view.title}
        sort={sort}
        onSortChange={(next) => {
          setSort(next);
          setPage(1);
        }}
        columns={COLUMNS}
        rows={list.data?.data}
        getRowId={(m) => m.id}
        rowHref={(m) => `/admin/contacts/${m.id}`}
        isLoading={list.isLoading}
        error={list.error}
        onRetry={() => list.refetch()}
        empty={
          q ? (
            <EmptyState
              icon={SearchX}
              title="Aucun résultat"
              description={`Aucun message ne correspond à « ${q} ».`}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSearch('')}
                >
                  Effacer la recherche
                </Button>
              }
            />
          ) : status === 'NOUVEAU' ? (
            <EmptyState
              icon={CheckCheck}
              title="Aucun message à traiter"
              description="Tout est à jour. Les nouvelles demandes envoyées depuis la page Contact du site apparaîtront ici."
            />
          ) : (
            <EmptyState
              icon={Inbox}
              title="Aucun message traité"
              description="Les messages marqués comme traités sont archivés ici."
            />
          )
        }
      />

      {list.data && total > 0 && (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
          itemLabel="messages"
        />
      )}
    </div>
  );
}
