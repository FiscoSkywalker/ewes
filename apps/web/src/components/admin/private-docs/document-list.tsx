'use client';

import { useState, type ReactNode } from 'react';
import {
  Archive,
  ArchiveRestore,
  Download,
  FileUp,
  FolderInput,
  Info,
  Loader2,
  PenLine,
  Trash2,
} from 'lucide-react';
import { cx, focusRing } from '@/lib/admin/cx';
import { normalizeText } from '@/lib/admin/format';
import {
  fileTypeOf,
  formatBytes,
  formatShortDate,
  pathTo,
  type FolderIndex,
  type PrivateDocument,
} from '@/lib/admin/private-docs';
import { useSession } from '../session';
import {
  Badge,
  Button,
  ErrorState,
  Menu,
  Skeleton,
  StatusChip,
  type MenuItem,
} from '../ui';
import {
  DocumentEditDialog,
  DocumentMoveDialog,
  DocumentReplaceDialog,
} from './document-dialogs';
import { DocumentSheet } from './document-sheet';
import { FileIcon } from './file-icon';
import { useDocumentActions } from './use-document-actions';

export interface DocumentListProps {
  /** Nom accessible de la liste (« Documents du dossier Fiscalité »). */
  label: string;
  documents: PrivateDocument[] | undefined;
  index: FolderIndex;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  empty: ReactNode;
  /** Affiche l'emplacement sous le nom (recherche, archives, ajouts récents). */
  showFolder?: boolean;
  /** Signale les documents archivés (recherche tous statuts). */
  showStatus?: boolean;
  /** Bouton « Restaurer » directement sur la ligne (écran Archives). */
  quickRestore?: boolean;
  /** Termes recherchés, surlignés dans le nom. */
  highlight?: string;
  className?: string;
}

/**
 * Liste de documents commune à l'explorateur, à la recherche et aux archives.
 * Une ligne = un document : toute la ligne ouvre sa fiche, le téléchargement
 * reste à un geste. Sous 640 px la ligne devient une carte compacte (type,
 * poids et date sous le nom) ; au-delà, poids et date passent en colonnes et
 * un menu « ⋯ » donne les actions sans ouvrir la fiche.
 */
export function DocumentList({
  label,
  documents,
  index,
  isLoading,
  error,
  onRetry,
  empty,
  showFolder = false,
  showStatus = false,
  quickRestore = false,
  highlight,
  className,
}: DocumentListProps) {
  const session = useSession();
  const isAdmin = session.role === 'ADMINISTRATEUR';
  const actions = useDocumentActions();
  const [opened, setOpened] = useState<PrivateDocument | null>(null);
  const [editing, setEditing] = useState<PrivateDocument | null>(null);
  const [moving, setMoving] = useState<PrivateDocument | null>(null);
  const [replacing, setReplacing] = useState<PrivateDocument | null>(null);

  const frame = cx('rounded-2xl border border-line bg-panel', className);

  if (isLoading && !documents?.length) {
    return (
      <div className={cx(frame, 'divide-y divide-line')} aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3.5 px-4 py-3.5">
            <Skeleton className="size-11 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (error && !documents?.length) {
    return (
      <div className={frame}>
        <ErrorState error={error} onRetry={onRetry} />
      </div>
    );
  }
  if (!documents?.length) return <div className={frame}>{empty}</div>;

  const menuFor = (document: PrivateDocument): MenuItem[] => [
    {
      id: 'details',
      label: 'Voir la fiche',
      icon: Info,
      onSelect: () => setOpened(document),
    },
    ...(document.canWrite
      ? [
          {
            id: 'edit',
            label: 'Modifier',
            icon: PenLine,
            onSelect: () => setEditing(document),
          },
          ...(document.status === 'ARCHIVED'
            ? []
            : [
                {
                  id: 'replace',
                  label: 'Remplacer le fichier',
                  icon: FileUp,
                  onSelect: () => setReplacing(document),
                },
              ]),
          {
            id: 'move',
            label: 'Déplacer',
            icon: FolderInput,
            onSelect: () => setMoving(document),
          },
          document.status === 'ARCHIVED'
            ? {
                id: 'restore',
                label: 'Restaurer',
                icon: ArchiveRestore,
                onSelect: () => void actions.restore(document),
              }
            : {
                id: 'archive',
                label: 'Archiver',
                icon: Archive,
                onSelect: () => void actions.archive(document),
              },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            id: 'delete',
            label: 'Supprimer',
            icon: Trash2,
            danger: true,
            separated: true,
            onSelect: () => void actions.remove(document),
          },
        ]
      : []),
  ];

  return (
    <>
      <ul aria-label={label} className={cx(frame, 'divide-y divide-line')}>
        {documents.map((document) => {
          const type = fileTypeOf(document.fileType);
          const location = document.folderId
            ? pathTo(index, document.folderId)
                .map((folder) => folder.name)
                .join(' › ') || document.folderName
            : 'Partagé avec vous';
          const downloading = actions.downloadingId === document.id;
          return (
            <li
              key={document.id}
              className="group relative flex items-center gap-3 px-3 py-3 transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-ink/[0.03] sm:gap-3.5 sm:px-4"
            >
              <FileIcon mimeType={document.fileType} />
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setOpened(document)}
                  className={cx(
                    // Zone de clic étirée sur toute la ligne ; les autres boutons passent au-dessus.
                    'block max-w-full truncate rounded text-left text-[13.5px] font-medium text-ink after:absolute after:inset-0 after:rounded-[inherit]',
                    focusRing,
                  )}
                >
                  <Highlighted text={document.name} terms={highlight} />
                </button>
                <p className="mt-0.5 truncate text-xs text-ink-subtle">
                  <span className="md:hidden">
                    {type?.label ?? 'Fichier'} ·{' '}
                    {formatBytes(document.fileSizeBytes)} ·{' '}
                    {formatShortDate(document.createdAt)}
                  </span>
                  <span className="hidden md:inline">
                    {showFolder
                      ? location
                      : (document.description ?? type?.label ?? 'Fichier')}
                  </span>
                </p>
                {showFolder && (
                  <p className="mt-0.5 truncate text-xs text-ink-subtle md:hidden">
                    {location}
                  </p>
                )}
                <Chips
                  document={document}
                  showStatus={showStatus}
                  className="mt-1.5 md:hidden"
                />
              </div>

              <Chips
                document={document}
                showStatus={showStatus}
                className="hidden shrink-0 md:flex"
              />
              <span className="hidden w-20 shrink-0 text-right text-xs tabular-nums text-ink-muted md:block">
                {formatBytes(document.fileSizeBytes)}
              </span>
              <time
                dateTime={document.createdAt}
                title={new Date(document.createdAt).toLocaleString('fr')}
                className="hidden w-24 shrink-0 text-right text-xs text-ink-muted lg:block"
              >
                {formatShortDate(document.createdAt)}
              </time>

              {/* Sur téléphone, ces actions sont dans la fiche : la ligne reste lisible. */}
              {quickRestore && document.canWrite && (
                <span className="relative z-10 hidden sm:block">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={ArchiveRestore}
                    onClick={() => void actions.restore(document)}
                    aria-label={`Restaurer ${document.name}`}
                  >
                    Restaurer
                  </Button>
                </span>
              )}
              <button
                type="button"
                onClick={() => void actions.download(document)}
                disabled={downloading}
                aria-busy={downloading || undefined}
                aria-label={`Télécharger ${document.name}`}
                title="Télécharger"
                className={cx(
                  'relative z-10 grid size-11 shrink-0 place-items-center rounded-xl text-ink-muted transition-colors hover:bg-brand-soft hover:text-brand sm:size-9 sm:rounded-lg',
                  focusRing,
                )}
              >
                {downloading ? (
                  <Loader2
                    size={18}
                    aria-hidden="true"
                    className="animate-spin text-brand"
                  />
                ) : (
                  <Download size={18} aria-hidden="true" />
                )}
              </button>
              {/* Pas de z-index ici : il enfermerait le panneau du menu sous les boutons de la ligne suivante. */}
              <span className="relative hidden sm:block">
                <Menu
                  label={`Actions sur ${document.name}`}
                  items={menuFor(document)}
                />
              </span>
            </li>
          );
        })}
      </ul>

      <DocumentSheet
        document={opened}
        index={index}
        actions={actions}
        onClose={() => setOpened(null)}
        onEdit={setEditing}
        onMove={setMoving}
        onReplace={setReplacing}
      />
      <DocumentEditDialog
        document={editing}
        index={index}
        onClose={() => setEditing(null)}
      />
      <DocumentMoveDialog
        document={moving}
        index={index}
        onClose={() => setMoving(null)}
      />
      <DocumentReplaceDialog
        document={replacing}
        onClose={() => setReplacing(null)}
      />
    </>
  );
}

function Chips({
  document,
  showStatus,
  className,
}: {
  document: PrivateDocument;
  showStatus: boolean;
  className?: string;
}) {
  // Le niveau n'est rappelé que s'il est propre au document ou dès qu'il est sensible.
  const level =
    document.confidentiality &&
    (document.confidentialityOverride ||
      document.confidentiality !== 'PUBLIC_INTERNE')
      ? document.confidentiality
      : null;
  const archived = showStatus && document.status === 'ARCHIVED';
  if (!level && !archived) return null;
  return (
    <span className={cx('flex flex-wrap items-center gap-1.5', className)}>
      {level && <StatusChip kind="confidentiality" value={level} />}
      {archived && <Badge icon={Archive}>Archivé</Badge>}
    </span>
  );
}

/** Nom avec les termes recherchés surlignés (insensible à la casse et aux accents). */
function Highlighted({ text, terms }: { text: string; terms?: string }) {
  const words = normalizeText(terms ?? '')
    .split(/\s+/)
    .filter((word) => word.length >= 2);
  if (words.length === 0) return <>{text}</>;

  // `normalizeText` peut changer la longueur (accents décomposés) : on compare lettre à lettre.
  const letters = [...text];
  const plain = letters.map((letter) => normalizeText(letter).charAt(0) || ' ');
  const haystack = plain.join('');
  const marked = new Array<boolean>(letters.length).fill(false);
  for (const word of words) {
    let from = haystack.indexOf(word);
    while (from !== -1) {
      marked.fill(true, from, from + word.length);
      from = haystack.indexOf(word, from + word.length);
    }
  }

  const parts: { text: string; marked: boolean }[] = [];
  letters.forEach((letter, i) => {
    const last = parts[parts.length - 1];
    if (last && last.marked === marked[i]) last.text += letter;
    else parts.push({ text: letter, marked: marked[i] });
  });
  return (
    <>
      {parts.map((part, i) =>
        part.marked ? (
          <mark
            key={i}
            className="rounded-[3px] bg-warn-soft text-inherit [box-decoration-break:clone]"
          >
            {part.text}
          </mark>
        ) : (
          part.text
        ),
      )}
    </>
  );
}
