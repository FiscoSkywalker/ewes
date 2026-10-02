'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CheckCheck, Inbox } from 'lucide-react';
import { backendJson, type Paginated } from '@/lib/api/backend';
import {
  contactTopic,
  type ContactMessage,
  type ContactStatus,
} from '@/lib/admin/contacts';
import { relativeTime } from '@/lib/admin/format';
import { PageHeader } from '../page-header';
import {
  DataTable,
  EmptyState,
  Pagination,
  SegmentedControl,
  StatusChip,
  type Column,
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

const COLUMNS: Column<ContactMessage>[] = [
  {
    id: 'sender',
    header: 'Expéditeur',
    className: 'min-w-44',
    cell: (m) => (
      <span className="block">
        <span className="block font-medium text-ink">{m.name}</span>
        <span className="block text-xs text-ink-subtle">
          {m.organization ?? m.email}
        </span>
      </span>
    ),
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
  const view = VIEWS[status];

  const list = useQuery({
    queryKey: ['contacts', 'list', status, page],
    queryFn: () =>
      backendJson<Paginated<ContactMessage>>(
        `admin/contacts?status=${status}&page=${page}&limit=${PAGE_SIZE}`,
      ),
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

      <DataTable
        caption={view.title}
        columns={COLUMNS}
        rows={list.data?.data}
        getRowId={(m) => m.id}
        rowHref={(m) => `/admin/contacts/${m.id}`}
        isLoading={list.isLoading}
        error={list.error}
        onRetry={() => list.refetch()}
        empty={
          status === 'NOUVEAU' ? (
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
