'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  FileUp,
  FolderInput,
  FolderOpen,
  KeyRound,
  Lock,
  PenLine,
  ScrollText,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { describeError } from '@/lib/api/backend';
import { cx, focusRing } from '@/lib/admin/cx';
import { relativeTime } from '@/lib/admin/format';
import {
  fetchDocumentFile,
  fileTypeOf,
  folderHref,
  formatBytes,
  formatShortDate,
  isStricter,
  pathTo,
  type FolderIndex,
  type PrivateDocument,
} from '@/lib/admin/private-docs';
import { useSession } from '../session';
import { Badge, Button, Sheet, StatusChip } from '../ui';
import { Note } from './dialog-parts';
import { FileIcon } from './file-icon';
import type { DocumentActions } from './use-document-actions';

/**
 * Fiche d'un document : feuille montante sur téléphone, volet latéral
 * au-delà. Le téléchargement reste collé en bas, sous le pouce ; les autres
 * actions n'apparaissent que si le serveur a dit qu'elles sont permises
 * (`canWrite`) ou si le compte est administrateur — et le serveur revérifie.
 */
export function DocumentSheet({
  document,
  index,
  actions,
  onClose,
  onEdit,
  onMove,
  onReplace,
}: {
  document: PrivateDocument | null;
  index: FolderIndex;
  actions: DocumentActions;
  onClose: () => void;
  onEdit: (document: PrivateDocument) => void;
  onMove: (document: PrivateDocument) => void;
  onReplace: (document: PrivateDocument) => void;
}) {
  const type = document ? fileTypeOf(document.fileType) : null;
  return (
    <Sheet
      open={Boolean(document)}
      onClose={onClose}
      title={document ? `Document : ${document.name}` : 'Document'}
      header={
        document && (
          <div className="flex items-start gap-3.5">
            <FileIcon mimeType={document.fileType} size="lg" />
            <div className="min-w-0 pt-0.5">
              <p className="text-base font-semibold leading-snug tracking-tight text-ink [overflow-wrap:anywhere]">
                {document.name}
              </p>
              <p className="mt-1 text-xs text-ink-subtle">
                {type?.label ?? 'Fichier'} ·{' '}
                {formatBytes(document.fileSizeBytes)}
              </p>
            </div>
          </div>
        )
      }
      footer={
        document && (
          <Button
            size="lg"
            block
            icon={Download}
            loading={actions.downloadingId === document.id}
            onClick={() => actions.download(document)}
          >
            Télécharger
          </Button>
        )
      }
    >
      {document && (
        <SheetBody
          key={document.id}
          document={document}
          index={index}
          actions={actions}
          onClose={onClose}
          onEdit={onEdit}
          onMove={onMove}
          onReplace={onReplace}
        />
      )}
    </Sheet>
  );
}

function SheetBody({
  document,
  index,
  actions,
  onClose,
  onEdit,
  onMove,
  onReplace,
}: {
  document: PrivateDocument;
  index: FolderIndex;
  actions: DocumentActions;
  onClose: () => void;
  onEdit: (document: PrivateDocument) => void;
  onMove: (document: PrivateDocument) => void;
  onReplace: (document: PrivateDocument) => void;
}) {
  const session = useSession();
  const isAdmin = session.role === 'ADMINISTRATEUR';
  const folder = document.folderId ? index.byId.get(document.folderId) : null;
  const path = folder ? pathTo(index, folder.id) : [];
  const stricter =
    folder && document.confidentiality
      ? isStricter(document.confidentiality, folder.confidentiality)
      : false;
  const archived = document.status === 'ARCHIVED';

  const rows: {
    id: string;
    label: string;
    hint?: string;
    icon: LucideIcon;
    onSelect?: () => void;
    href?: string;
    danger?: boolean;
  }[] = [];
  if (document.canWrite) {
    rows.push(
      {
        id: 'edit',
        label: 'Modifier',
        hint: 'Nom, description, confidentialité',
        icon: PenLine,
        onSelect: () => {
          onClose();
          onEdit(document);
        },
      },
      ...(archived
        ? []
        : [
            {
              id: 'replace',
              label: 'Remplacer le fichier',
              hint: 'Nouvelle version, mêmes accès',
              icon: FileUp,
              onSelect: () => {
                onClose();
                onReplace(document);
              },
            },
          ]),
      {
        id: 'move',
        label: 'Déplacer',
        hint: 'Vers un autre dossier',
        icon: FolderInput,
        onSelect: () => {
          onClose();
          onMove(document);
        },
      },
      archived
        ? {
            id: 'restore',
            label: 'Restaurer',
            hint: 'Le remettre dans son dossier',
            icon: ArchiveRestore,
            onSelect: async () => {
              if (await actions.restore(document)) onClose();
            },
          }
        : {
            id: 'archive',
            label: 'Archiver',
            hint: 'Reste consultable dans les Archives',
            icon: Archive,
            onSelect: async () => {
              if (await actions.archive(document)) onClose();
            },
          },
    );
  }
  if (isAdmin) {
    rows.push(
      {
        id: 'rights',
        label: 'Gérer les accès',
        hint: 'Donner accès à ce seul document',
        icon: KeyRound,
        href: `/admin/documents/droits/documents?document=${document.id}`,
      },
      {
        id: 'audit',
        label: 'Historique',
        hint: 'Téléchargements et modifications',
        icon: ScrollText,
        href: `/admin/audit?entityType=PrivateDocument&entityId=${document.id}&label=${encodeURIComponent(document.name)}`,
      },
      {
        id: 'delete',
        label: 'Supprimer',
        icon: Trash2,
        danger: true,
        onSelect: async () => {
          if (await actions.remove(document)) onClose();
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-1.5">
        {document.confidentiality && (
          <StatusChip kind="confidentiality" value={document.confidentiality} />
        )}
        {archived && <Badge icon={Archive}>Archivé</Badge>}
        {!document.canWrite && <Badge icon={Eye}>Lecture seule</Badge>}
      </div>

      {stricter && (
        <Note tone="warn" icon={Lock}>
          Plus confidentiel que son dossier : seules les personnes disposant
          d’un droit sur ce document y accèdent, pas toutes celles du dossier.
        </Note>
      )}

      {fileTypeOf(document.fileType)?.family === 'image' && (
        <ImagePreview document={document} />
      )}
      {fileTypeOf(document.fileType)?.family === 'pdf' && (
        <PdfPreview document={document} />
      )}

      {document.description && (
        <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-ink-muted">
          {document.description}
        </p>
      )}

      <dl className="divide-y divide-line rounded-xl border border-line text-[13px]">
        <Detail label="Dossier">
          {folder ? (
            <Link
              href={folderHref(folder.id)}
              className={cx(
                'inline-flex items-start gap-1.5 rounded font-medium text-brand hover:underline',
                focusRing,
              )}
            >
              <FolderOpen
                size={14}
                aria-hidden="true"
                className="mt-0.5 shrink-0"
              />
              <span className="[overflow-wrap:anywhere]">
                {path.map((item) => item.name).join(' › ')}
              </span>
            </Link>
          ) : (
            <span className="text-ink-muted">
              Partagé avec vous seulement (dossier non accessible)
            </span>
          )}
        </Detail>
        <Detail label="Ajouté">
          <time
            dateTime={document.createdAt}
            title={new Date(document.createdAt).toLocaleString('fr')}
          >
            {formatShortDate(document.createdAt)}
          </time>
          {document.uploadedByName && ` par ${document.uploadedByName}`}
        </Detail>
        {document.updatedAt !== document.createdAt && (
          <Detail label="Modifié">
            <time
              dateTime={document.updatedAt}
              title={new Date(document.updatedAt).toLocaleString('fr')}
            >
              {relativeTime(document.updatedAt)}
            </time>
          </Detail>
        )}
      </dl>

      {rows.length > 0 && (
        <ul
          aria-label="Actions sur le document"
          className="divide-y divide-line overflow-hidden rounded-xl border border-line"
        >
          {rows.map((row) => {
            const content = (
              <>
                <span
                  aria-hidden="true"
                  className={cx(
                    'grid size-9 shrink-0 place-items-center rounded-lg',
                    row.danger
                      ? 'bg-bad-soft text-bad'
                      : 'bg-sunken text-ink-muted',
                  )}
                >
                  <row.icon size={16} />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span
                    className={cx(
                      'block text-[13.5px] font-medium',
                      row.danger ? 'text-bad' : 'text-ink',
                    )}
                  >
                    {row.label}
                  </span>
                  {row.hint && (
                    <span className="block truncate text-xs text-ink-subtle">
                      {row.hint}
                    </span>
                  )}
                </span>
                <ChevronRight
                  size={16}
                  aria-hidden="true"
                  className="shrink-0 text-ink-subtle"
                />
              </>
            );
            const className = cx(
              'flex min-h-14 w-full items-center gap-3 px-3 py-2 transition-colors hover:bg-ink/[0.04] active:bg-ink/[0.07]',
              focusRing,
              '-outline-offset-2',
            );
            return (
              <li key={row.id}>
                {row.href ? (
                  <Link href={row.href} className={className}>
                    {content}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={row.onSelect}
                    className={className}
                  >
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 px-3.5 py-2.5">
      <dt className="w-20 shrink-0 text-ink-subtle">{label}</dt>
      <dd className="min-w-0 flex-1 text-ink">{children}</dd>
    </div>
  );
}

/**
 * Chargement d'un aperçu, à la demande : le fichier passe par la même route
 * authentifiée que le téléchargement (droit revérifié, consultation tracée
 * `DOCUMENT_DOWNLOADED`), il n'est donc chargé que si la personne le demande.
 * L'adresse d'objet est libérée au retrait de l'aperçu et à la fermeture de la fiche.
 */
function usePreview(document: PrivateDocument, mimeType?: string) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { blob } = await fetchDocumentFile(document);
      // Le type est imposé : un aperçu ne dépend jamais de ce que le réseau a annoncé.
      setUrl(
        URL.createObjectURL(
          mimeType ? new Blob([blob], { type: mimeType }) : blob,
        ),
      );
    } catch (caught) {
      setError(describeError(caught).message);
    } finally {
      setLoading(false);
    }
  }

  return { url, setUrl, loading, error, setError, load };
}

/** Aperçu d'une image, à la demande. */
function ImagePreview({ document }: { document: PrivateDocument }) {
  const { url, setUrl, loading, error, setError, load } = usePreview(document);

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- image privée servie en blob, hors optimisation Next
      <img
        src={url}
        alt={`Aperçu de ${document.name}`}
        onError={() => {
          setUrl(null);
          setError(
            'Cette image ne peut pas être affichée ici. Téléchargez-la pour l’ouvrir.',
          );
        }}
        className="max-h-80 w-full rounded-xl border border-line bg-sunken object-contain"
      />
    );
  }
  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="secondary" icon={Eye} loading={loading} onClick={load}>
        Afficher l’aperçu
      </Button>
      {error && (
        <p role="alert" className="text-xs font-medium text-bad">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Aperçu d'un PDF, à la demande, dans la visionneuse du navigateur (aucune
 * bibliothèque ajoutée). Quand le navigateur n'affiche pas les PDF dans la
 * page (c'est le cas de la plupart des navigateurs Android), aucun bouton
 * trompeur : la fiche renvoie au téléchargement.
 */
function PdfPreview({ document }: { document: PrivateDocument }) {
  const { url, setUrl, loading, error, load } = usePreview(
    document,
    'application/pdf',
  );
  // `pdfViewerEnabled` n'existe pas partout : seule une réponse « non » explicite masque l'aperçu.
  const supported = navigator.pdfViewerEnabled !== false;

  if (!supported) {
    return (
      <p className="text-xs leading-relaxed text-ink-subtle">
        Ce navigateur n’affiche pas les PDF dans la page : téléchargez le
        document pour le lire.
      </p>
    );
  }
  if (url) {
    return (
      <div className="flex flex-col gap-2">
        <iframe
          src={url}
          title={`Aperçu de ${document.name}`}
          className="h-[60dvh] w-full rounded-xl border border-line bg-sunken"
        />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <a
            href={url}
            target="_blank"
            rel="noopener"
            className={cx(
              'inline-flex items-center gap-1.5 rounded text-xs font-medium text-brand hover:underline',
              focusRing,
            )}
          >
            <ExternalLink size={13} aria-hidden="true" />
            Ouvrir dans un onglet
          </a>
          <button
            type="button"
            onClick={() => setUrl(null)}
            className={cx(
              'rounded text-xs font-medium text-ink-muted hover:text-ink hover:underline',
              focusRing,
            )}
          >
            Fermer l’aperçu
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="secondary" icon={Eye} loading={loading} onClick={load}>
        Afficher l’aperçu
      </Button>
      {error && (
        <p role="alert" className="text-xs font-medium text-bad">
          {error}
        </p>
      )}
    </div>
  );
}
