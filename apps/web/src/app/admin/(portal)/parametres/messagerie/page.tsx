'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { backendJson } from '@/lib/api/backend';
import { invalidatePortalData } from '@/lib/admin/invalidate';
import {
  toMailPayload,
  type MailFormValues,
  type MailOverview,
} from '@/lib/admin/settings';
import { MAIL_QUERY_KEY } from '@/lib/admin/settings-queries';
import { MailForm } from '@/components/admin/settings/mail-form';
import { MailStatus } from '@/components/admin/settings/mail-status';
import { useSession } from '@/components/admin/session';
import {
  ErrorState,
  LoadingRegion,
  Skeleton,
  useToast,
} from '@/components/admin/ui';

/** `/admin/parametres/messagerie` : état de l'envoi d'e-mails, test, destinataire des messages de contact. */
export default function MailSettingsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const session = useSession();
  const overview = useQuery({
    queryKey: MAIL_QUERY_KEY,
    queryFn: () => backendJson<MailOverview>('admin/settings/mail'),
    // L'état d'envoi évolue hors de cet écran (nouveaux envois, échecs).
    refetchInterval: 60_000,
  });

  async function save(values: MailFormValues) {
    const saved = await backendJson<MailOverview>('admin/settings/mail', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(toMailPayload(values)),
    });
    queryClient.setQueryData(MAIL_QUERY_KEY, saved);
    await invalidatePortalData(queryClient);
    toast.success('Réglages enregistrés', {
      description: 'Appliqués dès le prochain message reçu.',
    });
  }

  if (overview.isLoading) {
    return (
      <LoadingRegion>
        <div className="space-y-5">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      </LoadingRegion>
    );
  }
  if (overview.error || !overview.data) {
    return (
      <ErrorState
        error={overview.error}
        onRetry={() => overview.refetch()}
        retrying={overview.isRefetching}
      />
    );
  }

  return (
    <div className="space-y-5">
      <MailStatus overview={overview.data} adminEmail={session.email} />
      {/* `key` : après un enregistrement, le formulaire repart des valeurs du serveur. */}
      <MailForm
        key={overview.data.updatedAt ?? 'original'}
        overview={overview.data}
        onSubmit={save}
      />
    </div>
  );
}
