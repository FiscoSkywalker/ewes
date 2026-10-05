'use client';

import { useState } from 'react';
import { useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { LogOut, Monitor, MonitorSmartphone, Smartphone } from 'lucide-react';
import { relativeTime } from '@/lib/admin/format';
import {
  accountKey,
  closeOtherSessions,
  closeSession,
  type Account,
  type AccountSession,
} from '@/lib/admin/profile';
import { SettingsSection } from '../settings/settings-section';
import {
  Badge,
  Button,
  ErrorState,
  IconButton,
  LoadingRegion,
  Skeleton,
  useConfirm,
  useToast,
} from '../ui';

const isPhone = (device: string) => /Android|iOS/.test(device);

function SessionRow({
  session,
  busy,
  onClose,
}: {
  session: AccountSession;
  busy: boolean;
  onClose: () => void;
}) {
  const Icon = isPhone(session.device) ? Smartphone : Monitor;
  return (
    <li className="flex items-center gap-3.5 py-3.5 first:pt-0 last:pb-0">
      <span
        aria-hidden="true"
        className={`grid size-10 shrink-0 place-items-center rounded-xl ${
          session.current ? 'bg-ok-soft text-ok' : 'bg-sunken text-ink-muted'
        }`}
      >
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium text-ink">
          {session.device}
          {session.current && (
            <Badge tone="ok" dot>
              Cet appareil
            </Badge>
          )}
        </p>
        <p className="mt-0.5 text-xs text-ink-subtle">
          {session.current
            ? 'Active maintenant'
            : `Dernière activité ${relativeTime(session.lastActiveAt)}`}
          {session.ipAddress && ` · ${session.ipAddress}`}
        </p>
      </div>
      {!session.current && (
        <IconButton
          icon={LogOut}
          label={`Déconnecter ${session.device}`}
          size="sm"
          disabled={busy}
          onClick={onClose}
        />
      )}
    </li>
  );
}

/**
 * Appareils connectés au compte. Si l'un d'eux n'est pas le vôtre, fermez-le
 * puis changez le mot de passe (ce qui ferme aussi tous les autres). L'API
 * n'agit que sur les sessions de la personne connectée.
 */
export function SessionsCard({ query }: { query: UseQueryResult<Account> }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: accountKey });
  const sessions = query.data?.sessions ?? [];
  const others = sessions.filter((session) => !session.current);

  async function close(session: AccountSession) {
    setBusyId(session.id);
    try {
      await closeSession(session.id);
      await refresh();
      toast.success('Appareil déconnecté', { description: session.device });
    } catch (error) {
      toast.error(error);
    } finally {
      setBusyId(null);
    }
  }

  async function closeAll() {
    const done = await confirm({
      title: 'Déconnecter tous les autres appareils ?',
      description: `${others.length} appareil${others.length > 1 ? 's seront déconnectés' : ' sera déconnecté'}. Vous restez connecté ici, et ils pourront se reconnecter avec votre mot de passe.`,
      confirmLabel: 'Déconnecter',
      tone: 'danger',
      onConfirm: async () => {
        await closeOtherSessions();
        await refresh();
      },
    });
    if (done) toast.success('Autres appareils déconnectés');
  }

  return (
    <SettingsSection
      icon={MonitorSmartphone}
      tone="brand"
      title="Appareils connectés"
      description="Les navigateurs où votre compte est ouvert. Un appareil que vous ne reconnaissez pas ? Déconnectez-le, puis changez votre mot de passe."
    >
      {query.isLoading ? (
        <LoadingRegion>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </LoadingRegion>
      ) : query.error ? (
        <ErrorState
          error={query.error}
          onRetry={() => query.refetch()}
          retrying={query.isRefetching}
        />
      ) : (
        <div className="space-y-4">
          <ul className="divide-y divide-line">
            {sessions.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                busy={busyId === session.id}
                onClose={() => void close(session)}
              />
            ))}
          </ul>
          {others.length > 0 && (
            <Button
              variant="secondary"
              icon={LogOut}
              block
              onClick={() => void closeAll()}
            >
              Déconnecter les autres appareils
            </Button>
          )}
        </div>
      )}
    </SettingsSection>
  );
}
