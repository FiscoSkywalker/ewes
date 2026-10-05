'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CornerLeftUp,
  FolderOpen,
  FolderPlus,
  KeyRound,
  UserPlus,
  Users,
} from 'lucide-react';
import { backendJson } from '@/lib/api/backend';
import { cx, focusRing } from '@/lib/admin/cx';
import { plural } from '@/lib/admin/format';
import {
  GRANTS_KEY,
  classificationOf,
  folderHref,
  invalidateDocs,
  pathTo,
  subtreeIds,
  type FolderGrant,
  type FolderIndex,
  type GrantUser,
  type PrivateFolder,
} from '@/lib/admin/private-docs';
import { PageHeader } from '../../page-header';
import {
  Badge,
  Button,
  ButtonLink,
  EmptyState,
  ErrorState,
  Skeleton,
  StatusChip,
  useConfirm,
  useToast,
} from '../../ui';
import { UserAvatar } from '../../users/user-avatar';
import { FolderIcon } from '../file-icon';
import { FolderTree } from '../folder-tree';
import { useFolders } from '../use-folders';
import {
  GrantPeopleDialog,
  type GrantPeopleTarget,
} from './grant-people-dialog';
import {
  AdminsNote,
  PersonRow,
  RightsTabs,
  folderEffect,
} from './rights-parts';

const rightsHref = (id: string | null) =>
  id ? `/admin/documents/droits?dossier=${id}` : '/admin/documents/droits';

/**
 * Droits d'accès par dossier (Administrateur). À gauche l'arborescence avec
 * le nombre de droits posés sur chaque dossier ; à droite, pour le dossier
 * choisi, qui y accède : directement (retirable ici) ou par héritage d'un
 * dossier parent (à retirer là-bas). Sans dossier choisi : qui accède à quoi,
 * personne par personne. Sur petit écran, on passe de la liste au détail.
 */
export function FolderRights() {
  const router = useRouter();
  const folderId = useSearchParams().get('dossier');
  const folders = useFolders();
  const { index } = folders;
  const grants = useQuery({
    queryKey: [...GRANTS_KEY, 'folders'],
    queryFn: () =>
      backendJson<{ data: FolderGrant[] }>('admin/access-grants/folders'),
  });

  const byFolder = useMemo(() => {
    const map = new Map<string, FolderGrant[]>();
    for (const grant of grants.data?.data ?? []) {
      const list = map.get(grant.folderId) ?? [];
      list.push(grant);
      map.set(grant.folderId, list);
    }
    for (const list of map.values())
      list.sort((a, b) => a.user.fullName.localeCompare(b.user.fullName, 'fr'));
    return map;
  }, [grants.data]);

  const folder = folderId ? (index.byId.get(folderId) ?? null) : null;
  const loading = folders.isLoading || grants.isLoading;
  const error = folders.error ?? grants.error;

  const header = (
    <>
      <PageHeader
        eyebrow="Espace documentaire"
        title="Droits d’accès"
        description={
          // Petit écran, dossier choisi : la place va à ses accès, pas au rappel général.
          <span className={folder ? 'hidden lg:inline' : undefined}>
            Qui voit quoi. Un droit est toujours donné à une personne précise ;
            il prend effet immédiatement et chaque attribution ou retrait est
            inscrit au journal d’audit.
          </span>
        }
      />
      <RightsTabs />
    </>
  );

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true">
        {header}
        <div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="hidden h-72 rounded-2xl lg:block" />
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="space-y-6">
        {header}
        <div className="rounded-2xl border border-line bg-panel">
          <ErrorState
            error={error}
            onRetry={() => {
              void folders.refetch();
              void grants.refetch();
            }}
          />
        </div>
      </div>
    );
  }
  if (folders.folders.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <div className="rounded-2xl border border-line bg-panel">
          <EmptyState
            icon={FolderPlus}
            tone="brand"
            size="page"
            title="Aucun dossier à partager"
            description="Créez d’abord un dossier dans l’espace documentaire : vous pourrez ensuite choisir qui y accède."
            action={
              <ButtonLink href="/admin/documents" icon={FolderOpen}>
                Ouvrir l’espace documentaire
              </ButtonLink>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}
      <div className="grid items-start gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <aside
          aria-label="Dossiers"
          className={cx(
            'portal-scroll rounded-2xl border border-line bg-panel p-2 lg:sticky lg:top-6 lg:block lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto',
            // Petit écran : la liste s'efface devant le détail du dossier choisi.
            folder && 'hidden',
          )}
        >
          <p className="px-3 pb-1.5 pt-2 text-xs font-medium uppercase tracking-[0.12em] text-ink-subtle">
            Choisir un dossier
          </p>
          <FolderTree
            label="Dossiers"
            index={index}
            selectedId={folder?.id ?? null}
            onSelect={(id) => router.push(rightsHref(id))}
            defaultExpanded={
              folders.folders.length <= 12
                ? (index.children.get(null) ?? []).map((root) => root.id)
                : undefined
            }
            meta={(item) => {
              const count = byFolder.get(item.id)?.length ?? 0;
              return count > 0 ? (
                <span
                  className="inline-flex items-center gap-1"
                  title={plural(count, 'droit direct', 'droits directs')}
                >
                  <Users size={12} aria-hidden="true" />
                  {count}
                  <span className="sr-only">
                    {count > 1 ? ' personnes' : ' personne'}
                  </span>
                </span>
              ) : null;
            }}
          />
        </aside>

        <div className="min-w-0">
          {folderId && !folder ? (
            <div className="rounded-2xl border border-line bg-panel">
              <EmptyState
                icon={FolderOpen}
                title="Dossier introuvable"
                description="Il a peut-être été supprimé."
                action={
                  <ButtonLink
                    href={rightsHref(null)}
                    variant="secondary"
                    size="sm"
                  >
                    Voir tous les dossiers
                  </ButtonLink>
                }
              />
            </div>
          ) : folder ? (
            <FolderPanel
              key={folder.id}
              folder={folder}
              index={index}
              byFolder={byFolder}
            />
          ) : (
            <Overview grants={grants.data?.data ?? []} index={index} />
          )}
        </div>
      </div>
    </div>
  );
}

// --- Détail d'un dossier ---

function FolderPanel({
  folder,
  index,
  byFolder,
}: {
  folder: PrivateFolder;
  index: FolderIndex;
  byFolder: Map<string, FolderGrant[]>;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [granting, setGranting] = useState<GrantPeopleTarget | null>(null);

  const path = pathTo(index, folder.id);
  const direct = byFolder.get(folder.id) ?? [];
  const directIds = new Set(direct.map((grant) => grant.userId));
  // Héritage : droits posés sur un dossier parent, du plus proche au plus lointain.
  const inherited = path
    .slice(0, -1)
    .reverse()
    .flatMap((ancestor) =>
      (byFolder.get(ancestor.id) ?? []).map((grant) => ({ grant, ancestor })),
    );
  const people = new Set([
    ...directIds,
    ...inherited.map(({ grant }) => grant.userId),
  ]);
  const subfolders = subtreeIds(index, folder.id).size - 1;
  const scope =
    subfolders > 0
      ? `ce dossier et ses ${plural(subfolders, 'sous-dossier')}`
      : 'ce dossier';

  const openGrant = () =>
    setGranting({
      title: `Donner l’accès à « ${folder.name} »`,
      scope: (
        <>
          Les personnes choisies verront {scope} et leurs documents — sauf ceux
          classés plus confidentiels que leur dossier.
        </>
      ),
      effect: folderEffect,
      alreadyGranted: directIds,
      grant: (userId) =>
        backendJson('admin/access-grants/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderId: folder.id, userId }),
        }),
    });

  async function revoke(grant: FolderGrant) {
    const stillVia = inherited.find(
      (item) => item.grant.userId === grant.userId,
    );
    const done = await confirm({
      title: `Retirer l’accès de ${grant.user.fullName} ?`,
      description: stillVia ? (
        <>
          Le droit donné sur « {folder.name} » sera retiré, mais{' '}
          {grant.user.fullName} continuera d’y accéder par le droit hérité de «{' '}
          {stillVia.ancestor.name} ».
        </>
      ) : (
        <>
          {grant.user.fullName} ne verra plus {scope}, ni leurs documents.
          L’effet est immédiat et inscrit au journal d’audit.
        </>
      ),
      tone: 'danger',
      confirmLabel: 'Retirer l’accès',
      onConfirm: async () => {
        await backendJson(`admin/access-grants/folders/${grant.id}`, {
          method: 'DELETE',
        });
        await invalidateDocs(queryClient);
      },
    });
    if (done)
      toast.success('Accès retiré', {
        description: `${grant.user.fullName} · ${folder.name}`,
      });
  }

  return (
    <div className="animate-rise-in space-y-5">
      <Link
        href={rightsHref(null)}
        className={cx(
          'inline-flex h-10 items-center gap-2 rounded-xl border border-line-strong bg-panel px-3.5 text-[13px] font-medium text-ink-muted hover:text-ink lg:hidden',
          focusRing,
        )}
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Tous les dossiers
      </Link>

      <section className="rounded-2xl border border-line bg-panel p-4 sm:p-5">
        <div className="flex items-start gap-4">
          <FolderIcon confidentiality={folder.confidentiality} size="lg" />
          <div className="min-w-0 flex-1">
            {path.length > 1 && (
              <p className="truncate text-xs text-ink-subtle">
                {path
                  .slice(0, -1)
                  .map((item) => item.name)
                  .join(' › ')}
              </p>
            )}
            <h2 className="text-lg font-semibold tracking-tight text-ink [overflow-wrap:anywhere]">
              {folder.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <StatusChip
                kind="confidentiality"
                value={folder.confidentiality}
              />
              {classificationOf(folder)
                .slice(0, 2)
                .map((part) => (
                  <Badge key={part}>{part}</Badge>
                ))}
            </div>
          </div>
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">
          {people.size === 0 ? (
            <>Seuls les administrateurs accèdent à {scope} pour l’instant.</>
          ) : (
            <>
              <strong className="font-semibold text-ink">
                {plural(people.size, 'personne')}
              </strong>{' '}
              {people.size > 1 ? 'accèdent' : 'accède'} à {scope}, en plus des
              administrateurs.
            </>
          )}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
          <Button
            icon={UserPlus}
            onClick={openGrant}
            className="flex-1 sm:flex-none"
          >
            Donner l’accès
          </Button>
          <ButtonLink
            href={folderHref(folder.id)}
            variant="secondary"
            icon={FolderOpen}
            className="flex-1 sm:flex-none"
          >
            Ouvrir le dossier
          </ButtonLink>
        </div>
      </section>

      <section aria-labelledby="direct-grants">
        <h3
          id="direct-grants"
          className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-ink"
        >
          Accès donné sur ce dossier
          <span className="rounded-full bg-ink/[0.07] px-2 text-[11px] font-medium leading-5 tabular-nums text-ink-muted">
            {direct.length}
          </span>
        </h3>
        {direct.length === 0 && inherited.length > 0 ? (
          <p className="rounded-2xl border border-dashed border-line-strong bg-panel px-4 py-3.5 text-[13px] leading-relaxed text-ink-muted">
            Aucun droit n’a été donné sur ce dossier lui-même : les accès
            ci-dessous viennent d’un dossier parent.
          </p>
        ) : direct.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line-strong bg-panel">
            <EmptyState
              icon={KeyRound}
              title="Aucun droit donné sur ce dossier"
              description="Donnez l’accès aux personnes qui doivent le consulter ou y déposer des documents."
              action={
                <Button size="sm" icon={UserPlus} onClick={openGrant}>
                  Donner l’accès
                </Button>
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-line rounded-2xl border border-line bg-panel">
            {direct.map((grant) => (
              <PersonRow
                key={grant.id}
                user={grant.user}
                detail={folderEffect(grant.user.role)}
                since={grant.createdAt}
                onRevoke={() => void revoke(grant)}
              />
            ))}
          </ul>
        )}
      </section>

      {inherited.length > 0 && (
        <section aria-labelledby="inherited-grants">
          <h3
            id="inherited-grants"
            className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink"
          >
            Accès hérité d’un dossier parent
            <span className="rounded-full bg-ink/[0.07] px-2 text-[11px] font-medium leading-5 tabular-nums text-ink-muted">
              {inherited.length}
            </span>
          </h3>
          <p className="mb-2.5 text-xs text-ink-subtle">
            Un droit sur un dossier vaut pour tous ses sous-dossiers. Pour le
            retirer, ouvrez le dossier où il a été donné.
          </p>
          <ul className="divide-y divide-line rounded-2xl border border-line bg-panel">
            {inherited.map(({ grant, ancestor }) => (
              <PersonRow
                key={grant.id}
                user={grant.user}
                detail={folderEffect(grant.user.role)}
                aside={
                  <Link
                    href={rightsHref(ancestor.id)}
                    className={cx(
                      'inline-flex h-10 items-center gap-1.5 self-start rounded-lg border border-line-strong bg-panel px-3 text-xs font-medium text-ink-muted hover:border-brand/40 hover:text-ink sm:h-8 sm:self-center',
                      focusRing,
                    )}
                  >
                    <CornerLeftUp size={13} aria-hidden="true" />
                    <span className="max-w-40 truncate">
                      Via « {ancestor.name} »
                    </span>
                  </Link>
                }
              />
            ))}
          </ul>
        </section>
      )}

      <AdminsNote />

      <GrantPeopleDialog
        target={granting}
        onClose={() => setGranting(null)}
        onGranted={(count) => {
          void invalidateDocs(queryClient);
          toast.success(
            count > 1 ? `Accès donné à ${count} personnes` : 'Accès donné',
            { description: folder.name },
          );
        }}
      />
    </div>
  );
}

// --- Vue d'ensemble : qui accède à quoi ---

function Overview({
  grants,
  index,
}: {
  grants: FolderGrant[];
  index: FolderIndex;
}) {
  const people = useMemo(() => {
    const map = new Map<string, { user: GrantUser; folders: FolderGrant[] }>();
    for (const grant of grants) {
      const entry = map.get(grant.userId) ?? { user: grant.user, folders: [] };
      entry.folders.push(grant);
      map.set(grant.userId, entry);
    }
    return [...map.values()].sort((a, b) =>
      a.user.fullName.localeCompare(b.user.fullName, 'fr'),
    );
  }, [grants]);

  if (people.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-panel">
        <EmptyState
          icon={KeyRound}
          tone="brand"
          size="page"
          title="Aucun droit attribué pour le moment"
          description="Tant qu’aucun droit n’est donné, seuls les administrateurs voient l’espace documentaire. Choisissez un dossier pour décider qui y accède."
        />
      </div>
    );
  }

  return (
    <section aria-labelledby="overview-title" className="space-y-3">
      <div>
        <h2 id="overview-title" className="text-sm font-semibold text-ink">
          Qui accède à quoi
        </h2>
        <p className="mt-0.5 text-xs text-ink-subtle">
          {plural(people.length, 'personne')} ·{' '}
          {plural(grants.length, 'droit de dossier', 'droits de dossier')}.
          Choisissez un dossier pour modifier ses accès.
        </p>
      </div>
      <ul className="divide-y divide-line rounded-2xl border border-line bg-panel">
        {people.map(({ user, folders }) => (
          <li
            key={user.id}
            className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-start"
          >
            <div className="flex min-w-0 items-center gap-3 sm:w-64 sm:shrink-0">
              <UserAvatar name={user.fullName} role={user.role} />
              <div className="min-w-0">
                <Link
                  href={`/admin/utilisateurs/${user.id}`}
                  className={cx(
                    'block truncate rounded text-[13.5px] font-medium text-ink hover:underline',
                    focusRing,
                  )}
                >
                  {user.fullName}
                </Link>
                <StatusChip kind="role" value={user.role} className="mt-1" />
              </div>
            </div>
            <ul
              aria-label={`Dossiers ouverts à ${user.fullName}`}
              className="flex min-w-0 flex-1 flex-wrap gap-1.5"
            >
              {folders
                .map((grant) => ({
                  grant,
                  name:
                    index.byId.get(grant.folderId)?.name ?? grant.folder.name,
                }))
                .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
                .map(({ grant, name }) => (
                  <li key={grant.id} className="min-w-0">
                    <Link
                      href={rightsHref(grant.folderId)}
                      className={cx(
                        'inline-flex h-9 max-w-full items-center gap-1.5 rounded-lg border border-line-strong bg-panel px-2.5 text-xs font-medium text-ink hover:border-brand/40 hover:bg-sunken sm:h-8',
                        focusRing,
                      )}
                    >
                      <FolderOpen
                        size={13}
                        aria-hidden="true"
                        className="shrink-0 text-brand"
                      />
                      <span className="truncate">{name}</span>
                    </Link>
                  </li>
                ))}
            </ul>
          </li>
        ))}
      </ul>
      <AdminsNote />
    </section>
  );
}
