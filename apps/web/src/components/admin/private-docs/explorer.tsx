'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  ArrowLeft,
  ChevronRight,
  Eye,
  FolderOpen,
  FolderPlus,
  FolderSearch,
  FolderTree as FolderTreeIcon,
  FolderX,
  Home,
  KeyRound,
  PenLine,
  Trash2,
  Upload,
  UploadCloud,
} from 'lucide-react';
import { backendJson, type Paginated } from '@/lib/api/backend';
import { cx, focusRing } from '@/lib/admin/cx';
import { plural } from '@/lib/admin/format';
import {
  ACCEPTED_LABEL,
  DOCS_KEY,
  PRIVATE_FILE_ACCEPT,
  classificationOf,
  folderHref,
  invalidateDocs,
  pathTo,
  type FolderIndex,
  type PrivateDocument,
  type PrivateFolder,
} from '@/lib/admin/private-docs';
import { PageHeader } from '../page-header';
import { useSession } from '../session';
import {
  Badge,
  Button,
  ButtonLink,
  EmptyState,
  ErrorState,
  Menu,
  Pagination,
  SearchInput,
  Select,
  Sheet,
  Skeleton,
  StatusChip,
  useConfirm,
  useToast,
  type MenuItem,
} from '../ui';
import { DocumentList } from './document-list';
import { FolderIcon } from './file-icon';
import { FolderCard, folderSummary } from './folder-card';
import { FolderDialog, type FolderDialogTarget } from './folder-dialog';
import { FolderTree } from './folder-tree';
import { UploadTray } from './upload-tray';
import { useFolders } from './use-folders';
import { usePrivateUpload } from './use-private-upload';

const PAGE_SIZE = 50;

const SORTS = {
  newest: { label: 'Plus récents', sort: 'createdAt', order: 'desc' },
  oldest: { label: 'Plus anciens', sort: 'createdAt', order: 'asc' },
  nameAsc: { label: 'Nom (A → Z)', sort: 'name', order: 'asc' },
  nameDesc: { label: 'Nom (Z → A)', sort: 'name', order: 'desc' },
  largest: { label: 'Plus lourds', sort: 'fileSizeBytes', order: 'desc' },
} as const;
type SortKey = keyof typeof SORTS;

/**
 * Explorateur de l'espace documentaire. Le dossier ouvert est porté par
 * l'adresse (`?dossier=<id>`) : le bouton Précédent remonte d'un niveau et
 * un lien se partage. Grand écran : arborescence à gauche, contenu à droite.
 * Petit écran : on descend de dossier en dossier, l'arborescence complète
 * s'ouvre en feuille à la demande.
 */
export function Explorer() {
  const router = useRouter();
  const folderId = useSearchParams().get('dossier');
  const session = useSession();
  const isAdmin = session.role === 'ADMINISTRATEUR';
  const folders = useFolders();
  const { index } = folders;
  const uploads = usePrivateUpload();

  const [dialog, setDialog] = useState<FolderDialogTarget | null>(null);
  const [treeOpen, setTreeOpen] = useState(false);

  const folder = folderId ? (index.byId.get(folderId) ?? null) : null;

  // Changer de dossier ramène en haut de l'écran (descente de dossier en dossier sur mobile).
  useEffect(() => {
    document.getElementById('portal-main')?.scrollTo({ top: 0 });
  }, [folderId]);

  // Quitter la page pendant un envoi le ferait échouer : le navigateur demande confirmation.
  useEffect(() => {
    if (!uploads.busy) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [uploads.busy]);

  const open = (id: string | null) => {
    setTreeOpen(false);
    router.push(folderHref(id));
  };

  const tree = (
    <>
      <button
        type="button"
        onClick={() => open(null)}
        aria-current={folderId ? undefined : 'page'}
        className={cx(
          'mb-0.5 flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-[13px] transition-colors lg:min-h-9',
          focusRing,
          folderId
            ? 'text-ink hover:bg-ink/5'
            : 'bg-brand-soft font-semibold text-brand',
        )}
      >
        <Home size={15} aria-hidden="true" />
        Tous les dossiers
      </button>
      <FolderTree
        label="Arborescence des dossiers"
        index={index}
        selectedId={folder?.id ?? null}
        onSelect={open}
        defaultExpanded={
          // Peu de dossiers : tout le premier niveau est ouvert d'emblée.
          folders.folders.length <= 12
            ? (index.children.get(null) ?? []).map((root) => root.id)
            : undefined
        }
        meta={(item) => (item.documentCount > 0 ? item.documentCount : null)}
      />
    </>
  );

  let content: React.ReactNode;
  if (folders.isLoading) {
    content = <ExplorerSkeleton />;
  } else if (folders.error) {
    content = (
      <div className="rounded-2xl border border-line bg-panel">
        <ErrorState error={folders.error} onRetry={() => folders.refetch()} />
      </div>
    );
  } else if (folderId && !folder) {
    // Supprimé ou hors périmètre : le même message, on ne distingue pas (blueprint/11 §3).
    content = (
      <div className="rounded-2xl border border-line bg-panel">
        <EmptyState
          icon={FolderX}
          size="page"
          asPageTitle
          title="Dossier indisponible"
          description="Il a peut-être été supprimé, ou vous n’y avez pas accès. Si vous pensez devoir y accéder, adressez-vous à un administrateur."
          action={
            <ButtonLink href={folderHref(null)} variant="secondary">
              Revenir à mes dossiers
            </ButtonLink>
          }
        />
      </div>
    );
  } else if (folder) {
    content = (
      <FolderView
        key={folder.id}
        folder={folder}
        index={index}
        isAdmin={isAdmin}
        uploads={uploads}
        onBrowse={() => setTreeOpen(true)}
        onDialog={setDialog}
        onDeleted={(parentId) => router.replace(folderHref(parentId))}
      />
    );
  } else {
    content = (
      <RootView
        index={index}
        isAdmin={isAdmin}
        onCreate={() => setDialog({ mode: 'create', parent: null })}
        onBrowse={() => setTreeOpen(true)}
      />
    );
  }

  const hasTree = folders.folders.length > 0;
  return (
    <>
      <div
        className={cx(
          'grid items-start gap-6',
          hasTree && 'xl:grid-cols-[17.5rem_minmax(0,1fr)]',
        )}
      >
        {hasTree && (
          <aside
            aria-label="Dossiers"
            className="portal-scroll sticky top-6 hidden max-h-[calc(100dvh-8rem)] overflow-y-auto rounded-2xl border border-line bg-panel p-2 xl:block"
          >
            {tree}
          </aside>
        )}
        <div className="min-w-0 space-y-6">
          {content}
          <UploadTrayDock uploads={uploads} />
        </div>
      </div>

      <Sheet
        open={treeOpen}
        onClose={() => setTreeOpen(false)}
        title="Parcourir les dossiers"
      >
        {tree}
      </Sheet>

      <FolderDialog
        target={dialog}
        index={index}
        onClose={() => setDialog(null)}
        onSaved={(saved) => {
          // Un dossier créé s'ouvre aussitôt : on y dépose ses fichiers dans la foulée.
          if (dialog?.mode === 'create') router.push(folderHref(saved.id));
        }}
      />
    </>
  );
}

type Uploads = ReturnType<typeof usePrivateUpload>;

/** Suivi des envois, collé en bas de l'écran tant qu'il y a quelque chose à dire. */
function UploadTrayDock({ uploads }: { uploads: Uploads }) {
  if (uploads.items.length === 0) return null;
  return (
    <div className="sticky bottom-4 z-10 shadow-pop [border-radius:1rem]">
      <UploadTray
        items={uploads.items}
        onRetry={uploads.retry}
        onDismiss={uploads.dismiss}
        onClose={uploads.clearFinished}
      />
    </div>
  );
}

function BrowseButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="secondary"
      icon={FolderTreeIcon}
      onClick={onClick}
      className="xl:hidden"
    >
      Parcourir
    </Button>
  );
}

// --- Accueil de l'espace documentaire ---

function RootView({
  index,
  isAdmin,
  onCreate,
  onBrowse,
}: {
  index: FolderIndex;
  isAdmin: boolean;
  onCreate: () => void;
  onBrowse: () => void;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const roots = index.children.get(null) ?? [];
  const hasFolders = roots.length > 0;

  const recent = useQuery({
    queryKey: [DOCS_KEY, 'files', 'recent'],
    queryFn: () =>
      backendJson<Paginated<PrivateDocument>>(
        'documents-prives/files?status=ACTIVE&limit=5',
      ),
  });
  // Documents partagés un par un, hors de tout dossier ouvert (jamais pour l'Administrateur, qui voit tout).
  const isolated = useQuery({
    queryKey: [DOCS_KEY, 'files', 'isolated'],
    queryFn: () =>
      backendJson<Paginated<PrivateDocument>>(
        'documents-prives/files?scope=isolated&limit=100',
      ),
    enabled: !isAdmin,
  });
  const shared = isolated.data?.data ?? [];
  const recentDocs = recent.data?.data ?? [];
  const nothing =
    !hasFolders &&
    shared.length === 0 &&
    !recent.isLoading &&
    !isolated.isLoading;

  return (
    <>
      <PageHeader
        eyebrow="Espace documentaire"
        title="Dossiers & fichiers"
        description={
          isAdmin
            ? 'Les documents internes d’EWES, classés par dossier. Chaque dossier n’est visible que des personnes à qui vous en avez donné l’accès.'
            : 'Les dossiers et documents internes auxquels vous avez accès.'
        }
        actions={
          <>
            {hasFolders && <BrowseButton onClick={onBrowse} />}
            {isAdmin && (
              <Button icon={FolderPlus} onClick={onCreate}>
                Nouveau dossier
              </Button>
            )}
          </>
        }
      />

      {!nothing && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const q = search.trim();
            if (q)
              router.push(
                `/admin/documents/recherche?q=${encodeURIComponent(q)}`,
              );
          }}
          className="flex gap-2"
        >
          <SearchInput
            label="Rechercher un document"
            placeholder="Rechercher un document…"
            value={search}
            onValueChange={setSearch}
            enterKeyHint="search"
            className="min-w-0 flex-1 sm:max-w-xl"
          />
          {/* Sur téléphone, la touche « Rechercher » du clavier valide. */}
          <span className="hidden sm:block">
            <Button type="submit" variant="secondary" disabled={!search.trim()}>
              Rechercher
            </Button>
          </span>
        </form>
      )}

      {nothing ? (
        <div className="rounded-2xl border border-line bg-panel">
          {isAdmin ? (
            <EmptyState
              icon={FolderPlus}
              tone="brand"
              size="page"
              title="Aucun dossier pour le moment"
              description="Créez un premier dossier (Administratif, Juridique, Projets…), déposez-y vos documents, puis donnez-en l’accès aux personnes concernées."
              action={
                <Button icon={FolderPlus} onClick={onCreate}>
                  Créer un dossier
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={FolderSearch}
              size="page"
              title="Aucun dossier ne vous est encore ouvert"
              description="L’accès à l’espace documentaire se donne dossier par dossier. Demandez à un administrateur de vous ouvrir ceux dont vous avez besoin : ils apparaîtront ici."
            />
          )}
        </div>
      ) : (
        <>
          {hasFolders && (
            <section aria-labelledby="root-folders">
              <SectionTitle id="root-folders" count={roots.length}>
                Dossiers
              </SectionTitle>
              <ul className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {roots.map((root) => (
                  <li key={root.id}>
                    <FolderCard folder={root} index={index} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {shared.length > 0 && (
            <section aria-labelledby="shared-docs">
              <SectionTitle
                id="shared-docs"
                count={shared.length}
                hint="Documents dont l’accès vous a été donné un par un."
              >
                Partagés avec vous
              </SectionTitle>
              <DocumentList
                label="Documents partagés avec vous"
                documents={shared}
                index={index}
                isLoading={false}
                error={null}
                onRetry={() => isolated.refetch()}
                empty={null}
                showStatus
              />
            </section>
          )}

          {(recent.isLoading || recent.error || recentDocs.length > 0) && (
            <section aria-labelledby="recent-docs">
              <SectionTitle id="recent-docs">Ajoutés récemment</SectionTitle>
              <DocumentList
                label="Documents ajoutés récemment"
                documents={recent.data?.data}
                index={index}
                isLoading={recent.isLoading}
                error={recent.error}
                onRetry={() => recent.refetch()}
                empty={null}
                showFolder
              />
            </section>
          )}
        </>
      )}
    </>
  );
}

function SectionTitle({
  id,
  count,
  hint,
  aside,
  children,
}: {
  id: string;
  count?: number;
  hint?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h2
          id={id}
          className="flex items-center gap-2 text-sm font-semibold text-ink"
        >
          {children}
          {count !== undefined && (
            <span className="rounded-full bg-ink/[0.07] px-2 text-[11px] font-medium leading-5 tabular-nums text-ink-muted">
              {count}
            </span>
          )}
        </h2>
        {hint && <p className="mt-0.5 text-xs text-ink-subtle">{hint}</p>}
      </div>
      {aside}
    </div>
  );
}

// --- Un dossier ---

function FolderView({
  folder,
  index,
  isAdmin,
  uploads,
  onBrowse,
  onDialog,
  onDeleted,
}: {
  folder: PrivateFolder;
  index: FolderIndex;
  isAdmin: boolean;
  uploads: Uploads;
  onBrowse: () => void;
  onDialog: (target: FolderDialogTarget) => void;
  onDeleted: (parentId: string | null) => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [sort, setSort] = useState<SortKey>('newest');
  const [page, setPage] = useState(1);
  const [dragging, setDragging] = useState(false);
  // Les événements de glisser se déclenchent à chaque élément survolé : on compte les entrées/sorties.
  const dragDepth = useRef(0);

  const path = pathTo(index, folder.id);
  const parent = path.length > 1 ? path[path.length - 2] : null;
  const children = index.children.get(folder.id) ?? [];

  const list = useQuery({
    queryKey: [DOCS_KEY, 'files', 'folder', folder.id, sort, page],
    queryFn: () => {
      const params = new URLSearchParams({
        folderId: folder.id,
        status: 'ACTIVE',
        sort: SORTS[sort].sort,
        order: SORTS[sort].order,
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      return backendJson<Paginated<PrivateDocument>>(
        `documents-prives/files?${params}`,
      );
    },
    placeholderData: keepPreviousData,
  });
  const total = list.data?.meta.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (list.data && page > lastPage) setPage(lastPage);

  const addFiles = (files: File[]) => {
    if (files.length > 0)
      uploads.add(files, { id: folder.id, name: folder.name });
  };

  const hasFiles = (event: DragEvent) =>
    Array.from(event.dataTransfer.types).includes('Files');
  const dropHandlers = folder.canWrite
    ? {
        onDragEnter: (event: DragEvent) => {
          if (!hasFiles(event)) return;
          event.preventDefault();
          dragDepth.current += 1;
          setDragging(true);
        },
        onDragOver: (event: DragEvent) => {
          if (hasFiles(event)) event.preventDefault();
        },
        onDragLeave: (event: DragEvent) => {
          if (!hasFiles(event)) return;
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
        },
        onDrop: (event: DragEvent) => {
          if (!hasFiles(event)) return;
          event.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          addFiles(Array.from(event.dataTransfer.files));
        },
      }
    : {};

  async function remove() {
    const done = await confirm({
      title: `Supprimer le dossier « ${folder.name} » ?`,
      description:
        'Seul un dossier vide peut être supprimé. Les droits d’accès qui lui sont attachés seront retirés. La suppression est inscrite au journal d’audit.',
      tone: 'danger',
      confirmLabel: 'Supprimer le dossier',
      onConfirm: async () => {
        await backendJson(`documents-prives/folders/${folder.id}`, {
          method: 'DELETE',
        });
      },
    });
    if (!done) return;
    toast.success('Dossier supprimé', { description: folder.name });
    onDeleted(parent?.id ?? null);
    void invalidateDocs(queryClient);
  }

  const menu: MenuItem[] = [
    ...(folder.canWrite
      ? [
          {
            id: 'edit',
            label: 'Modifier le dossier',
            icon: PenLine,
            onSelect: () => onDialog({ mode: 'edit', folder }),
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            id: 'delete',
            label: 'Supprimer le dossier',
            icon: Trash2,
            danger: true,
            separated: true,
            onSelect: () => void remove(),
          },
        ]
      : []),
  ];

  const classification = classificationOf(folder);
  const empty = children.length === 0 && total === 0 && !list.isLoading;

  return (
    <div {...dropHandlers} className="relative space-y-6">
      <nav aria-label="Emplacement" className="flex items-center gap-2">
        <Link
          href={folderHref(parent?.id ?? null)}
          aria-label={
            parent ? `Remonter à ${parent.name}` : 'Revenir à tous les dossiers'
          }
          className={cx(
            'grid size-10 shrink-0 place-items-center rounded-xl border border-line-strong bg-panel text-ink-muted transition-colors hover:border-brand/40 hover:text-ink',
            focusRing,
          )}
        >
          <ArrowLeft size={17} aria-hidden="true" />
        </Link>
        <ol
          // Chemin long : on montre sa fin (le dossier ouvert), le début se fait défiler.
          ref={(list) => list?.scrollTo({ left: list.scrollWidth })}
          className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto whitespace-nowrap text-[13px] [scrollbar-width:none]"
        >
          <li>
            <Link
              href={folderHref(null)}
              className={cx(
                'flex h-9 items-center rounded-lg px-2 text-ink-muted hover:bg-ink/5 hover:text-ink',
                focusRing,
              )}
            >
              Tous les dossiers
            </Link>
          </li>
          {path.map((item, i) => {
            const last = i === path.length - 1;
            return (
              <li key={item.id} className="flex items-center gap-0.5">
                <ChevronRight
                  size={14}
                  aria-hidden="true"
                  className="shrink-0 text-ink-subtle"
                />
                {last ? (
                  <span
                    aria-current="page"
                    className="px-2 font-medium text-ink"
                  >
                    {item.name}
                  </span>
                ) : (
                  <Link
                    href={folderHref(item.id)}
                    className={cx(
                      'flex h-9 items-center rounded-lg px-2 text-ink-muted hover:bg-ink/5 hover:text-ink',
                      focusRing,
                    )}
                  >
                    {item.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <header className="animate-rise-in rounded-2xl border border-line bg-panel p-4 sm:p-5">
        <div className="flex items-start gap-4">
          <span className="hidden sm:block">
            <FolderIcon confidentiality={folder.confidentiality} size="lg" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold tracking-tight text-ink [overflow-wrap:anywhere] sm:text-2xl">
              {folder.name}
            </h1>
            <p className="mt-1 text-[13px] text-ink-muted">
              {folderSummary(index, folder)}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <StatusChip
                kind="confidentiality"
                value={folder.confidentiality}
              />
              {!folder.canWrite && <Badge icon={Eye}>Lecture seule</Badge>}
              {classification.map((part) => (
                <Badge key={part}>{part}</Badge>
              ))}
            </div>
          </div>
          <Menu label={`Actions sur le dossier ${folder.name}`} items={menu} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
          {folder.canWrite && (
            <>
              <Button
                icon={Upload}
                onClick={() => fileInput.current?.click()}
                className="flex-1 sm:flex-none"
              >
                Téléverser
              </Button>
              <Button
                variant="secondary"
                icon={FolderPlus}
                onClick={() => onDialog({ mode: 'create', parent: folder })}
                className="flex-1 sm:flex-none"
              >
                Sous-dossier
              </Button>
              <input
                ref={fileInput}
                type="file"
                multiple
                accept={PRIVATE_FILE_ACCEPT}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(event) => {
                  addFiles(Array.from(event.target.files ?? []));
                  // Le même fichier doit pouvoir être rechoisi (après un refus corrigé).
                  event.target.value = '';
                }}
              />
            </>
          )}
          {isAdmin && (
            <ButtonLink
              href={`/admin/documents/droits?dossier=${folder.id}`}
              variant="secondary"
              icon={KeyRound}
              className="flex-1 sm:flex-none"
            >
              Droits d’accès
            </ButtonLink>
          )}
          <BrowseButton onClick={onBrowse} />
        </div>
      </header>

      {children.length > 0 && (
        <section aria-labelledby="subfolders">
          <SectionTitle id="subfolders" count={children.length}>
            Sous-dossiers
          </SectionTitle>
          <ul className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {children.map((child) => (
              <li key={child.id}>
                <FolderCard folder={child} index={index} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {empty ? (
        <div className="rounded-2xl border border-dashed border-line-strong bg-panel">
          <EmptyState
            icon={folder.canWrite ? UploadCloud : FolderOpen}
            tone={folder.canWrite ? 'brand' : 'neutral'}
            title="Ce dossier est vide"
            description={
              folder.canWrite
                ? `Glissez des fichiers ici ou choisissez-les sur votre appareil. Formats acceptés : ${ACCEPTED_LABEL}, 25 Mo au plus par fichier.`
                : 'Aucun document n’y a encore été déposé.'
            }
            action={
              folder.canWrite && (
                <Button
                  icon={Upload}
                  size="sm"
                  onClick={() => fileInput.current?.click()}
                >
                  Choisir des fichiers
                </Button>
              )
            }
          />
        </div>
      ) : (
        (total > 0 || list.isLoading || Boolean(list.error)) && (
          <section aria-labelledby="folder-docs">
            <SectionTitle
              id="folder-docs"
              count={list.data ? total : undefined}
              aside={
                total > 1 && (
                  <Select
                    aria-label="Trier les documents"
                    value={sort}
                    onChange={(event) => {
                      setSort(event.target.value as SortKey);
                      setPage(1);
                    }}
                    className="w-44"
                  >
                    {Object.entries(SORTS).map(([key, option]) => (
                      <option key={key} value={key}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                )
              }
            >
              Documents
            </SectionTitle>
            <DocumentList
              label={`Documents du dossier ${folder.name}`}
              documents={list.data?.data}
              index={index}
              isLoading={list.isLoading}
              error={list.error}
              onRetry={() => list.refetch()}
              empty={null}
            />
            {total > PAGE_SIZE && (
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                onPageChange={setPage}
                itemLabel="documents"
                className="mt-4"
              />
            )}
          </section>
        )
      )}

      {dragging && (
        <div
          aria-hidden="true"
          className="animate-fade-in pointer-events-none absolute -inset-2 z-20 grid place-items-center rounded-3xl border-2 border-dashed border-brand bg-brand-soft backdrop-blur-[2px]"
        >
          <p className="flex items-center gap-2.5 rounded-full bg-raised px-5 py-3 text-sm font-semibold text-brand shadow-pop">
            <UploadCloud size={18} />
            Déposez pour ajouter à « {folder.name} »
          </p>
        </div>
      )}
      <p className="sr-only" role="status">
        {dragging ? `Déposez pour ajouter à ${folder.name}` : ''}
      </p>
      {total > 0 && (
        <p className="sr-only" aria-live="polite">
          {plural(total, 'document')}
        </p>
      )}
    </div>
  );
}

function ExplorerSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[4.5rem] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
