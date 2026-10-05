'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  FilePlus2,
  FileSearch,
  FolderOpen,
  KeyRound,
  Lightbulb,
  SearchX,
  UserPlus,
} from 'lucide-react';
import { backendJson, type Paginated } from '@/lib/api/backend';
import { cx, focusRing } from '@/lib/admin/cx';
import { plural } from '@/lib/admin/format';
import {
  DOCS_KEY,
  GRANTS_KEY,
  fileTypeOf,
  folderHref,
  invalidateDocs,
  isStricter,
  pathTo,
  type Confidentiality,
  type DocumentGrant,
  type FolderIndex,
  type PrivateDocument,
} from '@/lib/admin/private-docs';
import { PageHeader } from '../../page-header';
import {
  Badge,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  SearchInput,
  Skeleton,
  StatusChip,
  useConfirm,
  useDebouncedValue,
  useToast,
} from '../../ui';
import { Note } from '../dialog-parts';
import { FileIcon } from '../file-icon';
import { useFolders } from '../use-folders';
import {
  GrantPeopleDialog,
  type GrantPeopleTarget,
} from './grant-people-dialog';
import { AdminsNote, PersonRow, RightsTabs } from './rights-parts';

/** Ce qu'il faut savoir d'un document pour lui attacher un droit. */
interface DocumentRef {
  id: string;
  name: string;
  fileType: string;
  status: 'ACTIVE' | 'ARCHIVED';
  folderId: string | null;
  folderName: string | null;
  /** Confidentialité effective (surcharge, sinon dossier). */
  confidentiality: Confidentiality | null;
  folderConfidentiality: Confidentiality | null;
}

const refOfGrant = (grant: DocumentGrant): DocumentRef => ({
  id: grant.privateDocument.id,
  name: grant.privateDocument.name,
  fileType: grant.privateDocument.fileType,
  status: grant.privateDocument.status,
  folderId: grant.privateDocument.folder.id,
  folderName: grant.privateDocument.folder.name,
  confidentiality:
    grant.privateDocument.confidentiality ??
    grant.privateDocument.folder.confidentiality,
  folderConfidentiality: grant.privateDocument.folder.confidentiality,
});

const refOfDocument = (
  document: PrivateDocument,
  index: FolderIndex,
): DocumentRef => ({
  id: document.id,
  name: document.name,
  fileType: document.fileType,
  status: document.status,
  folderId: document.folderId,
  folderName: document.folderName,
  confidentiality: document.confidentiality,
  folderConfidentiality: document.folderId
    ? (index.byId.get(document.folderId)?.confidentiality ?? null)
    : null,
});

/**
 * Droits d'accès par document (Administrateur) : l'exception. Un droit de
 * document ouvre ce seul fichier — pour le partager à quelqu'un qui n'a pas
 * le dossier, ou pour ouvrir un document plus confidentiel que son dossier.
 * Arrivée possible depuis la fiche d'un document (`?document=<id>`).
 */
export function DocumentRights() {
  const router = useRouter();
  const pathname = usePathname();
  const linkedId = useSearchParams().get('document');
  const toast = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { index } = useFolders();

  const grants = useQuery({
    queryKey: [...GRANTS_KEY, 'documents'],
    queryFn: () =>
      backendJson<{ data: DocumentGrant[] }>('admin/access-grants/documents'),
  });
  // Document désigné par l'adresse : sa fenêtre d'attribution s'ouvre d'elle-même.
  const linked = useQuery({
    queryKey: [DOCS_KEY, 'files', 'one', linkedId],
    queryFn: () =>
      backendJson<PrivateDocument>(`documents-prives/files/${linkedId}`),
    enabled: Boolean(linkedId),
    retry: false,
  });

  const [picking, setPicking] = useState(false);
  const [chosen, setChosen] = useState<DocumentRef | null>(null);

  const groups = useMemo(() => {
    const map = new Map<
      string,
      { document: DocumentRef; grants: DocumentGrant[] }
    >();
    for (const grant of grants.data?.data ?? []) {
      const entry = map.get(grant.privateDocumentId) ?? {
        document: refOfGrant(grant),
        grants: [],
      };
      entry.grants.push(grant);
      map.set(grant.privateDocumentId, entry);
    }
    return [...map.values()].sort((a, b) =>
      a.document.name.localeCompare(b.document.name, 'fr'),
    );
  }, [grants.data]);

  const target: DocumentRef | null =
    chosen ?? (linked.data ? refOfDocument(linked.data, index) : null);
  const closeGrant = () => {
    setChosen(null);
    if (linkedId) router.replace(pathname, { scroll: false });
  };

  const grantTarget: GrantPeopleTarget | null = target
    ? {
        title: `Donner l’accès à « ${target.name} »`,
        scope: (
          <>
            Les personnes choisies pourront consulter et télécharger ce seul
            document. Son dossier et les autres documents qu’il contient leur
            restent invisibles.
          </>
        ),
        effect: () => 'Consulte et télécharge ce document',
        alreadyGranted: new Set(
          (grants.data?.data ?? [])
            .filter((grant) => grant.privateDocumentId === target.id)
            .map((grant) => grant.userId),
        ),
        grant: (userId) =>
          backendJson('admin/access-grants/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documentId: target.id, userId }),
          }),
      }
    : null;

  async function revoke(grant: DocumentGrant) {
    const done = await confirm({
      title: `Retirer l’accès de ${grant.user.fullName} ?`,
      description: (
        <>
          Le droit sur « {grant.privateDocument.name} » sera retiré. Si{' '}
          {grant.user.fullName} a par ailleurs accès au dossier, le document lui
          restera visible tant qu’il n’est pas plus confidentiel que ce dossier.
          L’effet est immédiat et inscrit au journal d’audit.
        </>
      ),
      tone: 'danger',
      confirmLabel: 'Retirer l’accès',
      onConfirm: async () => {
        await backendJson(`admin/access-grants/documents/${grant.id}`, {
          method: 'DELETE',
        });
        await invalidateDocs(queryClient);
      },
    });
    if (done)
      toast.success('Accès retiré', {
        description: `${grant.user.fullName} · ${grant.privateDocument.name}`,
      });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Espace documentaire"
        title="Droits d’accès"
        description="Qui voit quoi. Un droit est toujours donné à une personne précise ; il prend effet immédiatement et chaque attribution ou retrait est inscrit au journal d’audit."
        actions={
          <Button icon={FilePlus2} onClick={() => setPicking(true)}>
            Partager un document
          </Button>
        }
      />
      <RightsTabs />

      <Note icon={Lightbulb}>
        <strong className="font-semibold text-ink">
          Un droit par document est une exception.
        </strong>{' '}
        Il sert à partager un seul fichier avec une personne qui n’a pas accès
        au dossier, ou à ouvrir un document classé plus confidentiel que son
        dossier. Dans les autres cas, donnez l’accès{' '}
        <Link
          href="/admin/documents/droits"
          className={cx(
            'rounded font-medium text-brand hover:underline',
            focusRing,
          )}
        >
          au dossier
        </Link>
        .
      </Note>

      {linkedId && linked.error ? (
        <div role="alert">
          <Note tone="warn" icon={SearchX}>
            Le document désigné par ce lien est introuvable : il a peut-être été
            supprimé.
          </Note>
        </div>
      ) : null}

      {grants.isLoading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : grants.error ? (
        <div className="rounded-2xl border border-line bg-panel">
          <ErrorState error={grants.error} onRetry={() => grants.refetch()} />
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-line bg-panel">
          <EmptyState
            icon={KeyRound}
            size="page"
            title="Aucun document partagé isolément"
            description="Tous les accès passent aujourd’hui par les dossiers — c’est le cas le plus simple à suivre."
            action={
              <Button
                variant="secondary"
                icon={FilePlus2}
                onClick={() => setPicking(true)}
              >
                Partager un document
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <p className="text-[13px] text-ink-muted" role="status">
            {plural(groups.length, 'document partagé', 'documents partagés')}{' '}
            isolément
          </p>
          <ul className="space-y-4">
            {groups.map(({ document, grants: documentGrants }) => (
              <li
                key={document.id}
                className="rounded-2xl border border-line bg-panel"
              >
                <DocumentHeader
                  document={document}
                  index={index}
                  action={
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={UserPlus}
                      onClick={() => setChosen(document)}
                      aria-label={`Ajouter une personne à ${document.name}`}
                      className="h-10 w-full sm:h-8 sm:w-auto"
                    >
                      Ajouter une personne
                    </Button>
                  }
                />
                <ul className="divide-y divide-line border-t border-line">
                  {documentGrants.map((grant) => (
                    <PersonRow
                      key={grant.id}
                      user={grant.user}
                      detail="Consulte et télécharge ce document"
                      since={grant.createdAt}
                      onRevoke={() => void revoke(grant)}
                    />
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <AdminsNote />
        </>
      )}

      <DocumentPickerDialog
        open={picking}
        index={index}
        onClose={() => setPicking(false)}
        onPick={(document) => {
          setPicking(false);
          setChosen(refOfDocument(document, index));
        }}
      />
      <GrantPeopleDialog
        target={grantTarget}
        onClose={closeGrant}
        onGranted={(count) => {
          void invalidateDocs(queryClient);
          toast.success(
            count > 1 ? `Accès donné à ${count} personnes` : 'Accès donné',
            { description: target?.name },
          );
        }}
      />
    </div>
  );
}

function DocumentHeader({
  document,
  index,
  action,
}: {
  document: DocumentRef;
  index: FolderIndex;
  action?: React.ReactNode;
}) {
  const path = document.folderId
    ? pathTo(index, document.folderId)
        .map((folder) => folder.name)
        .join(' › ') || document.folderName
    : null;
  const stricter =
    document.confidentiality && document.folderConfidentiality
      ? isStricter(document.confidentiality, document.folderConfidentiality)
      : false;
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3.5">
        <FileIcon mimeType={document.fileType} />
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold text-ink [overflow-wrap:anywhere]">
            {document.name}
          </p>
          {path && document.folderId && (
            <Link
              href={folderHref(document.folderId)}
              className={cx(
                'mt-0.5 inline-flex max-w-full items-center gap-1.5 rounded text-xs text-ink-subtle hover:text-brand hover:underline',
                focusRing,
              )}
            >
              <FolderOpen size={12} aria-hidden="true" className="shrink-0" />
              <span className="truncate">{path}</span>
            </Link>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {document.confidentiality && (
              <StatusChip
                kind="confidentiality"
                value={document.confidentiality}
              />
            )}
            {stricter && <Badge tone="warn">Plus strict que son dossier</Badge>}
            {document.status === 'ARCHIVED' && (
              <Badge icon={Archive}>Archivé</Badge>
            )}
          </div>
        </div>
      </div>
      {action}
    </div>
  );
}

// --- Choix du document à partager ---

function DocumentPickerDialog({
  open,
  index,
  onClose,
  onPick,
}: {
  open: boolean;
  index: FolderIndex;
  onClose: () => void;
  onPick: (document: PrivateDocument) => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Quel document partager ?"
      description="Cherchez le document, puis choisissez les personnes qui y auront accès."
    >
      {open && <DocumentPicker index={index} onPick={onPick} />}
    </Dialog>
  );
}

function DocumentPicker({
  index,
  onPick,
}: {
  index: FolderIndex;
  onPick: (document: PrivateDocument) => void;
}) {
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim(), 300);
  const active = q.length >= 2;
  const results = useQuery({
    queryKey: [DOCS_KEY, 'search', 'picker', q],
    queryFn: () =>
      backendJson<Paginated<PrivateDocument>>(
        `documents-prives/search?q=${encodeURIComponent(q)}&limit=20`,
      ),
    enabled: active,
  });
  const documents = results.data?.data ?? [];

  return (
    <div className="flex min-h-64 flex-col gap-3 pb-2">
      <SearchInput
        label="Chercher un document"
        placeholder="Nom du document, projet, catégorie…"
        value={search}
        onValueChange={setSearch}
        data-autofocus
      />
      {!active ? (
        <EmptyState
          icon={FileSearch}
          title="Cherchez le document à partager"
          description="Saisissez au moins deux caractères de son nom."
        />
      ) : results.isLoading ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : results.error ? (
        <ErrorState error={results.error} onRetry={() => results.refetch()} />
      ) : documents.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={`Aucun document pour « ${q} »`}
          description="Vérifiez l’orthographe ou essayez un autre mot."
        />
      ) : (
        <ul aria-label="Documents trouvés" className="flex flex-col gap-2">
          {documents.map((document) => {
            const path = document.folderId
              ? pathTo(index, document.folderId)
                  .map((folder) => folder.name)
                  .join(' › ') || document.folderName
              : null;
            return (
              <li key={document.id}>
                <button
                  type="button"
                  onClick={() => onPick(document)}
                  className={cx(
                    'flex min-h-16 w-full items-center gap-3 rounded-xl border border-line-strong bg-panel px-3.5 py-2.5 text-left transition-colors hover:border-brand/40 hover:bg-sunken',
                    focusRing,
                  )}
                >
                  <FileIcon mimeType={document.fileType} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-ink">
                      {document.name}
                    </span>
                    <span className="block truncate text-xs text-ink-subtle">
                      {[fileTypeOf(document.fileType)?.label, path]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  {document.confidentiality &&
                    document.confidentiality !== 'PUBLIC_INTERNE' && (
                      <StatusChip
                        kind="confidentiality"
                        value={document.confidentiality}
                        className="hidden sm:inline-flex"
                      />
                    )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
