'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  History,
  KeyRound,
  Mail,
  UserRoundCheck,
  UserRoundX,
} from 'lucide-react';
import { ApiError, backendJson, type Paginated } from '@/lib/api/backend';
import { invalidatePortalData } from '@/lib/admin/invalidate';
import { relativeTime } from '@/lib/admin/format';
import { homePathFor } from '@/lib/admin/roles';
import {
  ROLE_PROFILES,
  USER_ACTION_LABELS,
  auditDetail,
  type AuditEntry,
  type UserDetail,
} from '@/lib/admin/users';
import { useSession } from '@/components/admin/session';
import { PortalNotFound } from '@/components/admin/states';
import { RoleDialog } from '@/components/admin/users/role-dialog';
import { RoleScope } from '@/components/admin/users/role-scope';
import { UserAvatar } from '@/components/admin/users/user-avatar';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingRegion,
  Skeleton,
  StatusChip,
  useConfirm,
  useToast,
} from '@/components/admin/ui';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const detailKey = (id: string) => ['users', 'detail', id];
const historyKey = (id: string) => ['users', 'history', id];

const longDate = new Intl.DateTimeFormat('fr', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** `/admin/utilisateurs/<id>` : la fiche d'un compte. */
export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const session = useSession();
  if (!UUID.test(id)) {
    return <PortalNotFound homeHref={homePathFor(session.role)} />;
  }
  return <UserDetailScreen id={id} />;
}

function UserDetailScreen({ id }: { id: string }) {
  const session = useSession();
  const query = useQuery({
    queryKey: detailKey(id),
    queryFn: () => backendJson<UserDetail>(`admin/users/${id}`),
    retry: (count, error) =>
      !(error instanceof ApiError && [400, 404].includes(error.status)) &&
      count < 2,
  });

  if (
    query.error instanceof ApiError &&
    [400, 404].includes(query.error.status)
  ) {
    return <PortalNotFound homeHref={homePathFor(session.role)} />;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/utilisateurs"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Utilisateurs & rôles
      </Link>
      {query.isLoading ? (
        <LoadingRegion>
          <Skeleton className="h-8 w-80" />
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <Skeleton className="h-80 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </LoadingRegion>
      ) : query.error || !query.data ? (
        <ErrorState
          error={query.error}
          onRetry={() => query.refetch()}
          retrying={query.isRefetching}
          size="page"
        />
      ) : (
        <Detail user={query.data} />
      )}
    </div>
  );
}

/** Après une écriture : la fiche reçoit la réponse du serveur, le reste du portail se rafraîchit. */
async function applySaved(queryClient: QueryClient, saved: UserDetail) {
  queryClient.setQueryData(detailKey(saved.id), saved);
  await Promise.all([
    invalidatePortalData(queryClient),
    queryClient.invalidateQueries({ queryKey: historyKey(saved.id) }),
  ]);
}

function Detail({ user }: { user: UserDetail }) {
  const session = useSession();
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [roleOpen, setRoleOpen] = useState(false);
  const isSelf = session.id === user.id;
  const profile = ROLE_PROFILES[user.role];

  async function setActive(active: boolean) {
    const done = await confirm({
      title: active
        ? `Réactiver le compte de ${user.fullName} ?`
        : `Désactiver le compte de ${user.fullName} ?`,
      tone: active ? 'default' : 'danger',
      confirmLabel: active ? 'Réactiver le compte' : 'Désactiver le compte',
      description: active ? (
        'La personne pourra de nouveau se connecter avec son mot de passe actuel, avec le même rôle et les mêmes droits.'
      ) : (
        <>
          La personne est déconnectée de tous ses appareils et ne peut plus se
          connecter. Son historique et ses droits sont conservés, et vous
          pourrez réactiver le compte à tout moment.
        </>
      ),
      onConfirm: async () => {
        const saved = await backendJson<UserDetail>(
          `admin/users/${user.id}/${active ? 'reactivate' : 'deactivate'}`,
          { method: 'POST' },
        );
        await applySaved(queryClient, saved);
      },
    });
    if (done) toast.success(active ? 'Compte réactivé' : 'Compte désactivé');
  }

  return (
    <>
      <div className="animate-rise-in flex flex-col gap-5 sm:flex-row sm:items-center">
        <UserAvatar
          name={user.fullName}
          role={user.role}
          inactive={!user.isActive}
          size="lg"
        />
        <PageHeaderBlock user={user} isSelf={isSelf} />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card
            title="Rôle et accès"
            description="Ce que ce compte peut faire dans le portail."
            actions={
              <Button
                size="sm"
                variant="secondary"
                disabled={isSelf || !user.isActive}
                onClick={() => setRoleOpen(true)}
              >
                Changer le rôle
              </Button>
            }
          >
            <div className="space-y-5">
              <div className="flex items-start gap-3.5">
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-xl ${profile.tile}`}
                >
                  <profile.icon size={19} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {profile.label}
                  </p>
                  <p className="text-[13px] text-ink-muted">
                    {profile.tagline}
                  </p>
                </div>
              </div>
              <RoleScope role={user.role} />
              {isSelf ? (
                <Note>
                  Vous ne pouvez pas changer votre propre rôle : demandez-le à
                  un autre administrateur.
                </Note>
              ) : !user.isActive ? (
                <Note>Réactivez le compte pour pouvoir changer son rôle.</Note>
              ) : null}
            </div>
          </Card>

          <Card
            title="Droits documentaires"
            description="Accès explicites à l’espace documentaire privé."
            actions={
              <Link
                href="/admin/documents/droits"
                className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
              >
                Gérer les droits
                <ArrowRight size={13} aria-hidden="true" />
              </Link>
            }
          >
            <dl className="grid grid-cols-2 gap-4">
              <Stat label="Dossiers" value={user.grants.folders} />
              <Stat label="Documents isolés" value={user.grants.documents} />
            </dl>
            {user.role === 'UTILISATEUR' &&
              user.grants.folders + user.grants.documents === 0 && (
                <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">
                  Ce compte n’a encore accès à aucun document : un utilisateur
                  ne voit que ce qui lui est explicitement accordé.
                </p>
              )}
          </Card>

          <UserHistory userId={user.id} />
        </div>

        <aside className="space-y-6" aria-label="Compte">
          <Card title="Compte">
            <dl className="space-y-4 text-[13px]">
              <Row label="Adresse e-mail">
                <a
                  href={`mailto:${user.email}`}
                  className="inline-flex items-center gap-1.5 break-all font-medium text-brand hover:underline"
                >
                  <Mail size={13} aria-hidden="true" className="shrink-0" />
                  {user.email}
                </a>
              </Row>
              <Row label="Compte créé le">
                {longDate.format(new Date(user.createdAt))}
              </Row>
              <Row label="Dernière activité">
                {user.lastActiveAt ? (
                  <time
                    dateTime={user.lastActiveAt}
                    title={new Date(user.lastActiveAt).toLocaleString('fr')}
                  >
                    {relativeTime(user.lastActiveAt)}
                  </time>
                ) : (
                  'Jamais connecté'
                )}
              </Row>
              <Row label="Sessions ouvertes">
                {user.activeSessions === 0
                  ? 'Aucune'
                  : String(user.activeSessions)}
              </Row>
            </dl>
          </Card>

          <Card
            title={user.isActive ? 'Désactivation' : 'Compte désactivé'}
            description={
              user.isActive
                ? 'Suspendre l’accès sans rien supprimer.'
                : 'Ce compte ne peut plus se connecter.'
            }
          >
            <div className="space-y-4">
              <p className="text-[13px] leading-relaxed text-ink-muted">
                {user.isActive
                  ? 'Désactiver un compte le déconnecte partout et interdit toute nouvelle connexion. L’historique et les droits sont conservés ; l’opération est réversible.'
                  : 'Son historique et ses droits sont conservés. Réactivez-le pour qu’il puisse se reconnecter, avec son rôle actuel.'}
              </p>
              {isSelf ? (
                <Note>Vous ne pouvez pas désactiver votre propre compte.</Note>
              ) : user.isActive ? (
                <Button
                  variant="danger"
                  icon={UserRoundX}
                  block
                  onClick={() => void setActive(false)}
                >
                  Désactiver le compte
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  icon={UserRoundCheck}
                  block
                  onClick={() => void setActive(true)}
                >
                  Réactiver le compte
                </Button>
              )}
            </div>
          </Card>
        </aside>
      </div>

      <RoleDialog
        user={user}
        open={roleOpen}
        onClose={() => setRoleOpen(false)}
        onChanged={async (saved) => {
          await applySaved(queryClient, saved);
          toast.success(`Rôle modifié : ${ROLE_PROFILES[saved.role].label}`, {
            description: 'La personne est déconnectée de ses appareils.',
          });
        }}
      />
    </>
  );
}

function PageHeaderBlock({
  user,
  isSelf,
}: {
  user: UserDetail;
  isSelf: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 flex flex-wrap items-center gap-2 text-xs">
        <StatusChip kind="role" value={user.role} />
        {user.isActive ? (
          <Badge tone="ok" dot>
            Actif
          </Badge>
        ) : (
          <Badge>Désactivé</Badge>
        )}
        {isSelf && <Badge tone="brand">Vous</Badge>}
      </p>
      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
        {user.fullName}
      </h1>
      <p className="mt-1 break-all text-sm text-ink-muted">{user.email}</p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-ink-subtle">{label}</dt>
      <dd className="mt-0.5 text-ink">{children}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-sunken/70 px-4 py-3">
      <dt className="text-xs text-ink-subtle">{label}</dt>
      <dd className="mt-0.5 text-2xl font-semibold tabular-nums text-ink">
        {value}
      </dd>
    </div>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <p className="flex gap-2 rounded-xl bg-sunken/70 px-3.5 py-3 text-[13px] leading-relaxed text-ink-muted">
      <KeyRound
        size={15}
        aria-hidden="true"
        className="mt-0.5 shrink-0 text-ink-subtle"
      />
      <span>{children}</span>
    </p>
  );
}

/** Historique du compte (journal d'audit) : changements de rôle, désactivations, activation. */
function UserHistory({ userId }: { userId: string }) {
  const history = useQuery({
    queryKey: historyKey(userId),
    queryFn: () =>
      backendJson<Paginated<AuditEntry>>(
        `admin/audit-logs?entityType=User&entityId=${userId}&limit=20`,
      ),
  });

  return (
    <Card
      title="Historique"
      description="Les actions enregistrées sur ce compte, de la plus récente à la plus ancienne."
      padding="none"
    >
      {history.isLoading ? (
        <LoadingRegion>
          <div className="space-y-4 p-5">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        </LoadingRegion>
      ) : history.error ? (
        <ErrorState
          error={history.error}
          onRetry={() => history.refetch()}
          retrying={history.isRefetching}
        />
      ) : !history.data?.data.length ? (
        <EmptyState
          icon={History}
          title="Aucune action enregistrée"
          description="Les changements de rôle et les désactivations de ce compte apparaîtront ici."
        />
      ) : (
        <ol className="px-5 py-4">
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
    </Card>
  );
}
