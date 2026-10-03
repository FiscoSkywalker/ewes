'use client';

import { useState } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { MailCheck, RefreshCw } from 'lucide-react';
import { backendJson, type Paginated } from '@/lib/api/backend';
import { invalidatePortalData } from '@/lib/admin/invalidate';
import { relativeTime } from '@/lib/admin/format';
import { PageHeader } from '@/components/admin/page-header';
import {
  Button,
  DataTable,
  EmptyState,
  Pagination,
  SegmentedControl,
  StatusChip,
  useToast,
  type Column,
} from '@/components/admin/ui';

type EmailStatus = 'sent' | 'pending' | 'failed';
type Filter = EmailStatus | 'all';

/** `GET /admin/notifications` : le texte du message reste en base, seul le sujet est exposé. */
interface EmailRow {
  id: string;
  type: string;
  recipientEmail: string;
  subject: string | null;
  status: EmailStatus;
  attempts: number;
  lastError: string | null;
  sentAt: string | null;
  failedAt: string | null;
  createdAt: string;
}

const PAGE_SIZE = 20;

const TYPE_LABELS: Record<string, string> = {
  CONTACT_RECEIVED: 'Alerte équipe — nouveau message',
  CONTACT_ACKNOWLEDGEMENT: 'Accusé de réception — visiteur',
  USER_INVITATION: 'Invitation au portail',
};

function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

function listPath(status: Filter, page: number, limit: number) {
  const filter = status === 'all' ? '' : `&status=${status}`;
  return `admin/notifications?page=${page}&limit=${limit}${filter}`;
}

function useEmailCount(status: Filter) {
  return useQuery({
    queryKey: ['emails', 'count', status],
    queryFn: () => backendJson<Paginated<EmailRow>>(listPath(status, 1, 1)),
    select: (page) => page.meta.total,
  });
}

export default function EmailTrackingPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ['emails', 'list', filter, page],
    queryFn: () =>
      backendJson<Paginated<EmailRow>>(listPath(filter, page, PAGE_SIZE)),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
  // Effectifs des seuls états qui demandent une action (peu de requêtes : l'API limite le débit).
  const counts = {
    failed: useEmailCount('failed'),
    pending: useEmailCount('pending'),
  };

  const total = list.data?.meta.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (list.data && page > lastPage) setPage(lastPage);

  // Le serveur rejoue l'envoi (jusqu'à 3 tentatives) et répond avec son résultat réel.
  const retry = useMutation({
    mutationFn: (id: string) =>
      backendJson<EmailRow>(`admin/notifications/${id}/retry`, {
        method: 'POST',
      }),
    onMutate: (id) => setRetryingId(id),
    onSuccess: async (row) => {
      await invalidatePortalData(queryClient);
      if (row.status === 'sent') toast.success('E-mail envoyé');
      else
        toast.warning('L’envoi a de nouveau échoué', {
          description: row.lastError ?? undefined,
        });
    },
    onError: (error) => toast.error(error),
    onSettled: () => setRetryingId(null),
  });

  const columns: Column<EmailRow>[] = [
    {
      id: 'subject',
      header: 'E-mail',
      className: 'min-w-56 max-w-md',
      cell: (row) => (
        <span className="block">
          <span className="block truncate font-medium text-ink">
            {row.subject ?? typeLabel(row.type)}
          </span>
          <span className="block truncate text-xs text-ink-subtle">
            {typeLabel(row.type)}
          </span>
          {row.status === 'failed' && row.lastError && (
            <span className="mt-1 block truncate text-xs text-bad">
              {row.lastError}
            </span>
          )}
        </span>
      ),
    },
    {
      id: 'recipient',
      header: 'Destinataire',
      hideBelow: 'md',
      className: 'break-all',
      cell: (row) => row.recipientEmail,
    },
    {
      id: 'attempts',
      header: 'Tentatives',
      hideBelow: 'lg',
      className: 'tabular-nums text-ink-muted',
      cell: (row) => row.attempts,
    },
    {
      id: 'date',
      header: 'Date',
      hideBelow: 'sm',
      className: 'whitespace-nowrap text-ink-muted',
      cell: (row) => {
        const at = row.sentAt ?? row.failedAt ?? row.createdAt;
        return (
          <time dateTime={at} title={new Date(at).toLocaleString('fr')}>
            {relativeTime(at)}
          </time>
        );
      },
    },
    {
      id: 'status',
      header: 'État',
      cell: (row) => <StatusChip kind="email" value={row.status} />,
    },
    {
      id: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'end',
      cell: (row) =>
        row.status === 'sent' ? null : (
          <Button
            size="sm"
            variant="secondary"
            icon={RefreshCw}
            loading={retryingId === row.id}
            disabled={retry.isPending}
            onClick={() => retry.mutate(row.id)}
          >
            Rejouer
          </Button>
        ),
    },
  ];

  const changeFilter = (next: Filter) => {
    setFilter(next);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Suivi des e-mails"
        description="État des e-mails envoyés par la plateforme (alertes à l’équipe, accusés de réception). Un envoi en échec n’est jamais silencieux : rejouez-le une fois le problème corrigé."
      />

      <SegmentedControl
        label="Filtrer par état"
        value={filter}
        onChange={changeFilter}
        options={[
          { value: 'all', label: 'Tous' },
          { value: 'failed', label: 'En échec', count: counts.failed.data },
          { value: 'pending', label: 'En attente', count: counts.pending.data },
          { value: 'sent', label: 'Envoyés' },
        ]}
      />

      <DataTable
        caption="Suivi des e-mails"
        columns={columns}
        rows={list.data?.data}
        getRowId={(row) => row.id}
        isLoading={list.isLoading}
        error={list.error}
        onRetry={() => list.refetch()}
        empty={
          <EmptyState
            icon={MailCheck}
            title={
              filter === 'failed'
                ? 'Aucun envoi en échec'
                : filter === 'pending'
                  ? 'Aucun envoi en attente'
                  : 'Aucun e-mail'
            }
            description={
              filter === 'failed'
                ? 'Tous les envois ont abouti.'
                : 'Les e-mails envoyés par la plateforme apparaîtront ici.'
            }
          />
        }
      />

      {list.data && total > 0 && (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
          itemLabel="e-mails"
        />
      )}
    </div>
  );
}
