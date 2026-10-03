'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  MailPlus,
  RefreshCw,
  SearchX,
  Trash2,
  UserPlus,
  UserRoundCheck,
  Users,
} from 'lucide-react';
import { ApiError, backendJson } from '@/lib/api/backend';
import { cx, focusRing } from '@/lib/admin/cx';
import { invalidatePortalData } from '@/lib/admin/invalidate';
import { normalizeText, plural, relativeTime } from '@/lib/admin/format';
import { ALL_ROLES, type Role } from '@/lib/admin/roles';
import {
  ROLE_PROFILES,
  type Invitation,
  type InviteResult,
  type UserSummary,
} from '@/lib/admin/users';
import { PageHeader } from '@/components/admin/page-header';
import { useSession } from '@/components/admin/session';
import { ActivationLink } from '@/components/admin/users/activation-link';
import {
  AccountCard,
  CardList,
  InvitationCard,
} from '@/components/admin/users/mobile-cards';
import { UserAvatar } from '@/components/admin/users/user-avatar';
import {
  Badge,
  Button,
  ButtonLink,
  DataTable,
  Dialog,
  EmptyState,
  SearchInput,
  SegmentedControl,
  StatusChip,
  useConfirm,
  useToast,
  type Column,
  type SortState,
} from '@/components/admin/ui';

type View = 'active' | 'inactive' | 'invitations';
type RoleFilter = Role | 'ALL';

const ROLE_ORDER: Record<Role, number> = {
  ADMINISTRATEUR: 0,
  GESTIONNAIRE: 1,
  UTILISATEUR: 2,
};

const dateTime = new Intl.DateTimeFormat('fr', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** « Active il y a 5 minutes » : la précision est celle du renouvellement de session (15 min). */
function ActivityCell({ user }: { user: UserSummary }) {
  if (!user.lastActiveAt) {
    return <span className="text-ink-subtle">Jamais connecté</span>;
  }
  return (
    <time
      dateTime={user.lastActiveAt}
      title={new Date(user.lastActiveAt).toLocaleString('fr')}
      className="text-ink-muted"
    >
      {relativeTime(user.lastActiveAt)}
    </time>
  );
}

export default function UsersPage() {
  const session = useSession();
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [view, setView] = useState<View>('active');
  const [role, setRole] = useState<RoleFilter>('ALL');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState>({ id: 'name', direction: 'asc' });
  const [resent, setResent] = useState<InviteResult | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const users = useQuery({
    queryKey: ['users', 'list'],
    queryFn: () => backendJson<UserSummary[]>('admin/users'),
  });
  const invitations = useQuery({
    queryKey: ['users', 'invitations'],
    queryFn: () => backendJson<Invitation[]>('admin/users/invitations'),
  });

  const resend = useMutation({
    mutationFn: (invitation: Invitation) =>
      backendJson<InviteResult>(
        `admin/users/invitations/${invitation.id}/resend`,
        { method: 'POST' },
      ),
    onMutate: (invitation) => setBusyId(invitation.id),
    onSuccess: async (result) => {
      await invalidatePortalData(queryClient);
      setResent(result);
    },
    onError: (error) =>
      // Renvoi trop rapproché : le message de l'API dit combien de secondes attendre.
      error instanceof ApiError && error.code === 'INVITATION_RECENTLY_SENT'
        ? toast.warning('Invitation déjà envoyée à l’instant', {
            description: error.message,
          })
        : toast.error(error),
    onSettled: () => setBusyId(null),
  });

  async function revoke(invitation: Invitation) {
    const done = await confirm({
      title: 'Retirer cette invitation ?',
      tone: 'danger',
      confirmLabel: 'Retirer l’invitation',
      description: (
        <>
          Le lien envoyé à{' '}
          <strong className="font-medium text-ink [overflow-wrap:anywhere]">
            {invitation.email}
          </strong>{' '}
          cessera de fonctionner. Vous pourrez inviter de nouveau cette adresse
          plus tard.
        </>
      ),
      onConfirm: async () => {
        await backendJson<void>(`admin/users/invitations/${invitation.id}`, {
          method: 'DELETE',
        });
        await invalidatePortalData(queryClient);
      },
    });
    if (done) toast.success('Invitation retirée');
  }

  const all = users.data ?? [];
  const active = all.filter((user) => user.isActive);
  const inactive = all.filter((user) => !user.isActive);
  const accounts = view === 'inactive' ? inactive : active;
  const countByRole = (value: Role) =>
    active.filter((user) => user.role === value).length;

  const q = normalizeText(search.trim());
  const matches = (name: string, email: string, value: Role) =>
    (role === 'ALL' || value === role) &&
    (!q || normalizeText(`${name} ${email}`).includes(q));

  const shownUsers = accounts
    .filter((user) => matches(user.fullName, user.email, user.role))
    .sort((a, b) => {
      const sign = sort.direction === 'asc' ? 1 : -1;
      if (sort.id === 'role') {
        return (
          sign * (ROLE_ORDER[a.role] - ROLE_ORDER[b.role]) ||
          a.fullName.localeCompare(b.fullName, 'fr')
        );
      }
      if (sort.id === 'activity') {
        // Jamais connecté en dernier, quel que soit le sens.
        const left = a.lastActiveAt ? Date.parse(a.lastActiveAt) : null;
        const right = b.lastActiveAt ? Date.parse(b.lastActiveAt) : null;
        if (left === null || right === null) {
          return left === right ? 0 : left === null ? 1 : -1;
        }
        return sign * (left - right);
      }
      return sign * a.fullName.localeCompare(b.fullName, 'fr');
    });
  const shownInvitations = (invitations.data ?? []).filter((invitation) =>
    matches(invitation.fullName, invitation.email, invitation.role),
  );
  const filtered = role !== 'ALL' || q !== '';

  const userColumns: Column<UserSummary>[] = [
    {
      id: 'name',
      header: 'Compte',
      sortable: true,
      className: 'min-w-60',
      cell: (user) => (
        <span className="flex items-center gap-3">
          <UserAvatar
            name={user.fullName}
            role={user.role}
            inactive={!user.isActive}
          />
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="truncate text-sm font-medium text-ink">
                {user.fullName}
              </span>
              {user.id === session.id && <Badge tone="brand">Vous</Badge>}
            </span>
            <span className="block truncate text-xs text-ink-subtle">
              {user.email}
            </span>
          </span>
        </span>
      ),
    },
    {
      id: 'role',
      header: 'Rôle',
      sortable: true,
      cell: (user) => <StatusChip kind="role" value={user.role} />,
    },
    {
      id: 'state',
      header: 'État',
      cell: (user) =>
        user.isActive ? (
          <Badge tone="ok" dot>
            Actif
          </Badge>
        ) : (
          <Badge>Désactivé</Badge>
        ),
    },
    {
      id: 'activity',
      header: 'Dernière activité',
      sortable: true,
      firstDirection: 'desc',
      hideBelow: 'md',
      className: 'whitespace-nowrap',
      cell: (user) => <ActivityCell user={user} />,
    },
  ];

  const invitationStatus = (invitation: Invitation) =>
    invitation.status === 'EXPIRED' ? (
      <span className="block">
        <Badge tone="warn" icon={Clock}>
          Expirée
        </Badge>
        <span className="mt-1 block text-xs text-ink-subtle">
          Depuis le {dateTime.format(new Date(invitation.expiresAt))}
        </span>
      </span>
    ) : (
      <span className="block">
        <Badge tone="brand" dot>
          En attente
        </Badge>
        <span className="mt-1 block text-xs text-ink-subtle">
          Expire le {dateTime.format(new Date(invitation.expiresAt))}
        </span>
      </span>
    );

  const invitationActions = (invitation: Invitation) => (
    <span className="inline-flex items-center gap-1.5">
      <Button
        size="sm"
        variant="secondary"
        icon={RefreshCw}
        loading={busyId === invitation.id}
        onClick={() => resend.mutate(invitation)}
        aria-label={`Renvoyer l’invitation à ${invitation.fullName}`}
      >
        Renvoyer
      </Button>
      <Button
        size="sm"
        variant="ghost"
        icon={Trash2}
        onClick={() => void revoke(invitation)}
        aria-label={`Retirer l’invitation de ${invitation.fullName}`}
      >
        Retirer
      </Button>
    </span>
  );

  const invitationColumns: Column<Invitation>[] = [
    {
      id: 'invitee',
      header: 'Invité(e)',
      className: 'min-w-60',
      cell: (invitation) => (
        <span className="flex items-center gap-3">
          <UserAvatar
            name={invitation.fullName}
            role={invitation.role}
            inactive={invitation.status === 'EXPIRED'}
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-ink">
              {invitation.fullName}
            </span>
            <span className="block truncate text-xs text-ink-subtle">
              {invitation.email}
            </span>
          </span>
        </span>
      ),
    },
    {
      id: 'role',
      header: 'Rôle',
      cell: (invitation) => <StatusChip kind="role" value={invitation.role} />,
    },
    {
      id: 'status',
      header: 'Invitation',
      cell: invitationStatus,
    },
    {
      id: 'sent',
      header: 'Envoyée',
      hideBelow: 'lg',
      className: 'whitespace-nowrap',
      cell: (invitation) => (
        <span className="block text-ink-muted">
          {relativeTime(invitation.lastSentAt)}
          {invitation.invitedBy && (
            <span className="block text-xs text-ink-subtle">
              par {invitation.invitedBy.fullName}
            </span>
          )}
        </span>
      ),
    },
    {
      id: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'end',
      className: 'whitespace-nowrap',
      cell: invitationActions,
    },
  ];

  const resetFilters = () => {
    setRole('ALL');
    setSearch('');
  };

  const noResults = (
    <EmptyState
      icon={SearchX}
      title="Aucun résultat pour ces filtres"
      action={
        <Button variant="secondary" size="sm" onClick={resetFilters}>
          Effacer les filtres
        </Button>
      }
    />
  );

  const invitationsEmpty = filtered ? (
    noResults
  ) : (
    <EmptyState
      icon={MailPlus}
      title="Aucune invitation en attente"
      description="Les personnes invitées apparaissent ici jusqu’à ce qu’elles aient activé leur compte."
      action={
        <ButtonLink
          href="/admin/utilisateurs/nouveau"
          icon={UserPlus}
          size="sm"
        >
          Inviter un utilisateur
        </ButtonLink>
      }
    />
  );
  const accountsEmpty = filtered ? (
    noResults
  ) : view === 'inactive' ? (
    <EmptyState
      icon={UserRoundCheck}
      title="Aucun compte désactivé"
      description="Un compte désactivé ne peut plus se connecter ; son historique et ses droits sont conservés."
    />
  ) : (
    <EmptyState icon={Users} title="Aucun compte" />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Utilisateurs & rôles"
        description="Qui a accès au portail, et avec quel rôle. Chaque invitation, changement de rôle ou désactivation est enregistré dans le journal d’audit."
        actions={
          <ButtonLink href="/admin/utilisateurs/nouveau" icon={UserPlus}>
            Inviter un utilisateur
          </ButtonLink>
        }
      />

      {/* Les trois rôles : repère de lecture et filtre rapide (comptes actifs). */}
      <section aria-label="Répartition par rôle">
        <ul className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {ALL_ROLES.map((value) => {
            const profile = ROLE_PROFILES[value];
            const Icon = profile.icon;
            const selected = role === value;
            return (
              <li key={value}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setRole(selected ? 'ALL' : value);
                    if (view === 'invitations') setView('active');
                  }}
                  className={cx(
                    'flex h-full w-full flex-col items-start gap-2 rounded-2xl border p-3 text-left transition-[border-color,background-color] sm:flex-row sm:gap-3.5 sm:p-4',
                    focusRing,
                    selected
                      ? 'border-brand bg-brand-soft/45'
                      : 'border-line bg-panel hover:border-brand/40',
                  )}
                >
                  <span
                    className={cx(
                      'grid size-9 shrink-0 place-items-center rounded-xl sm:size-10',
                      profile.tile,
                    )}
                  >
                    <Icon size={19} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-col-reverse sm:flex-row sm:items-baseline sm:gap-2">
                      <span className="text-[11.5px] font-semibold leading-tight text-ink sm:text-sm">
                        {profile.label}s
                      </span>
                      <span
                        className="text-xl font-semibold leading-tight tabular-nums text-ink sm:text-lg"
                        aria-label={
                          users.data
                            ? plural(
                                countByRole(value),
                                'compte actif',
                                'comptes actifs',
                              )
                            : undefined
                        }
                      >
                        {users.data ? countByRole(value) : '–'}
                      </span>
                    </span>
                    <span className="mt-0.5 hidden text-xs leading-snug text-ink-subtle sm:block">
                      {profile.tagline}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SegmentedControl<View>
          label="Afficher"
          value={view}
          onChange={setView}
          className="w-full sm:w-auto"
          options={[
            {
              value: 'active',
              label: 'Actifs',
              count: users.data ? active.length : undefined,
            },
            {
              value: 'inactive',
              label: 'Désactivés',
              count: users.data ? inactive.length : undefined,
            },
            {
              value: 'invitations',
              label: 'Invitations',
              count: invitations.data?.length,
            },
          ]}
        />
        <SearchInput
          label="Rechercher un compte"
          placeholder="Nom ou e-mail…"
          value={search}
          onValueChange={setSearch}
          className="w-full sm:w-64"
        />
        {role !== 'ALL' && (
          <Button variant="ghost" size="sm" onClick={() => setRole('ALL')}>
            Rôle : {ROLE_PROFILES[role].label} · Retirer
          </Button>
        )}
      </div>

      {view === 'invitations' ? (
        <>
          <CardList<Invitation>
            className="sm:hidden"
            label="Invitations en attente"
            rows={filtered ? shownInvitations : invitations.data}
            getId={(invitation) => invitation.id}
            isLoading={invitations.isLoading}
            error={invitations.error}
            onRetry={() => invitations.refetch()}
            empty={invitationsEmpty}
            render={(invitation) => (
              <InvitationCard
                invitation={invitation}
                busy={busyId === invitation.id}
                onResend={() => resend.mutate(invitation)}
                onRevoke={() => void revoke(invitation)}
              />
            )}
          />
          <DataTable<Invitation>
            className="hidden sm:block"
            caption="Invitations en attente"
            columns={invitationColumns}
            rows={filtered ? shownInvitations : invitations.data}
            getRowId={(invitation) => invitation.id}
            isLoading={invitations.isLoading}
            error={invitations.error}
            onRetry={() => invitations.refetch()}
            empty={invitationsEmpty}
          />
        </>
      ) : (
        <>
          <CardList<UserSummary>
            className="sm:hidden"
            label={view === 'active' ? 'Comptes actifs' : 'Comptes désactivés'}
            rows={users.data ? shownUsers : undefined}
            getId={(user) => user.id}
            isLoading={users.isLoading}
            error={users.error}
            onRetry={() => users.refetch()}
            empty={accountsEmpty}
            render={(user) => (
              <AccountCard user={user} isSelf={user.id === session.id} />
            )}
          />
          <DataTable<UserSummary>
            className="hidden sm:block"
            caption={
              view === 'active' ? 'Comptes actifs' : 'Comptes désactivés'
            }
            columns={userColumns}
            rows={users.data ? shownUsers : undefined}
            getRowId={(user) => user.id}
            rowHref={(user) => `/admin/utilisateurs/${user.id}`}
            sort={sort}
            onSortChange={setSort}
            isLoading={users.isLoading}
            error={users.error}
            onRetry={() => users.refetch()}
            empty={accountsEmpty}
          />
        </>
      )}

      {users.data && view !== 'invitations' && (
        <p className="text-xs text-ink-subtle" role="status">
          {plural(shownUsers.length, 'compte')}
          {filtered ? ' pour ces filtres' : ''}
        </p>
      )}

      <Dialog
        open={resent !== null}
        onClose={() => setResent(null)}
        title="Invitation renvoyée"
        description={
          resent && (
            <>
              Un nouvel e-mail part vers{' '}
              <strong className="font-medium text-ink [overflow-wrap:anywhere]">
                {resent.invitation.email}
              </strong>
              . Le lien précédent ne fonctionne plus.
            </>
          )
        }
        footer={
          <Button onClick={() => setResent(null)} data-autofocus>
            Terminer
          </Button>
        }
      >
        {resent && <ActivationLink url={resent.activationUrl} />}
      </Dialog>
    </div>
  );
}
