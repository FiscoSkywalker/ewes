import type { QueryClient } from '@tanstack/react-query';
import { adminFetch } from '@/lib/api/admin-fetch';
import { ApiError } from '@/lib/api/backend';
import { formatBytes } from './public-documents';
import type { Role } from './roles';

/**
 * Espace documentaire privé (blueprint/11_Document_Management_System.md).
 * Tout ce qui suit décrit et met en forme ce que l'API renvoie : le périmètre
 * (dossiers visibles, droit d'écrire, confidentialité) est décidé par le
 * serveur à chaque requête, jamais ici.
 */

export type Confidentiality = 'PUBLIC_INTERNE' | 'RESTREINT' | 'CONFIDENTIEL';
export type LifecycleStatus = 'ACTIVE' | 'ARCHIVED';

/** Dossier tel que renvoyé par `GET /documents-prives/folders`. */
export interface PrivateFolder {
  id: string;
  name: string;
  category: string;
  subCategory: string | null;
  projectRef: string | null;
  year: number | null;
  department: string | null;
  confidentiality: Confidentiality;
  /** `null` : premier niveau, ou parent hors de votre périmètre. */
  parentId: string | null;
  canWrite: boolean;
  /** Documents actifs que vous pouvez lire, directement dans ce dossier. */
  documentCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Document tel que renvoyé par `GET /documents-prives/files[/:id]` et la recherche. */
export interface PrivateDocument {
  id: string;
  name: string;
  description: string | null;
  /** `null` : document partagé isolément, son dossier ne vous est pas ouvert. */
  folderId: string | null;
  folderName: string | null;
  fileType: string;
  fileSizeBytes: number;
  /** Confidentialité effective (surcharge, sinon celle du dossier). */
  confidentiality: Confidentiality | null;
  /** Surcharge propre au document ; `null` : hérite du dossier. */
  confidentialityOverride: Confidentiality | null;
  status: LifecycleStatus;
  uploadedByName: string | null;
  canWrite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GrantUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

/** `GET /admin/access-grants/folders`. */
export interface FolderGrant {
  id: string;
  folderId: string;
  userId: string;
  createdAt: string;
  user: GrantUser;
  folder: { id: string; name: string };
}

/** `GET /admin/access-grants/documents`. */
export interface DocumentGrant {
  id: string;
  privateDocumentId: string;
  userId: string;
  createdAt: string;
  user: GrantUser;
  privateDocument: {
    id: string;
    name: string;
    fileType: string;
    status: LifecycleStatus;
    confidentiality: Confidentiality | null;
    folder: { id: string; name: string; confidentiality: Confidentiality };
  };
}

// --- Requêtes ---

/** Racine des clés TanStack Query de l'espace documentaire. */
export const DOCS_KEY = 'private-docs';
export const FOLDERS_KEY = [DOCS_KEY, 'folders'] as const;
export const GRANTS_KEY = [DOCS_KEY, 'grants'] as const;

/** Après une écriture : dossiers, listes, recherche et droits repartent du serveur. */
export const invalidateDocs = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({ queryKey: [DOCS_KEY] });

// --- Confidentialité ---

export const CONFIDENTIALITY_LEVELS: Confidentiality[] = [
  'PUBLIC_INTERNE',
  'RESTREINT',
  'CONFIDENTIEL',
];

export const CONFIDENTIALITY: Record<
  Confidentiality,
  { label: string; hint: string }
> = {
  PUBLIC_INTERNE: {
    label: 'Interne',
    hint: 'Usage courant, pour toute personne ayant accès au dossier.',
  },
  RESTREINT: {
    label: 'Restreint',
    hint: 'Diffusion limitée aux personnes concernées.',
  },
  CONFIDENTIEL: {
    label: 'Confidentiel',
    hint: 'Sensible : juridique, fiscal, ressources humaines…',
  },
};

const RANK: Record<Confidentiality, number> = {
  PUBLIC_INTERNE: 0,
  RESTREINT: 1,
  CONFIDENTIEL: 2,
};

/** Le document est-il plus confidentiel que son dossier (accès au cas par cas) ? */
export const isStricter = (level: Confidentiality, than: Confidentiality) =>
  RANK[level] > RANK[than];

// --- Types de fichiers ---

export type FileFamily = 'pdf' | 'image' | 'word' | 'excel' | 'powerpoint';

const OOXML = 'application/vnd.openxmlformats-officedocument';

const FILE_TYPES: Record<
  string,
  { family: FileFamily; label: string; ext: string }
> = {
  'application/pdf': { family: 'pdf', label: 'PDF', ext: 'pdf' },
  'image/jpeg': { family: 'image', label: 'Image JPEG', ext: 'jpg' },
  'image/png': { family: 'image', label: 'Image PNG', ext: 'png' },
  'image/webp': { family: 'image', label: 'Image WebP', ext: 'webp' },
  [`${OOXML}.wordprocessingml.document`]: {
    family: 'word',
    label: 'Word',
    ext: 'docx',
  },
  [`${OOXML}.spreadsheetml.sheet`]: {
    family: 'excel',
    label: 'Excel',
    ext: 'xlsx',
  },
  [`${OOXML}.presentationml.presentation`]: {
    family: 'powerpoint',
    label: 'PowerPoint',
    ext: 'pptx',
  },
};

export const fileTypeOf = (mimeType: string) => FILE_TYPES[mimeType] ?? null;

export const FILE_FAMILIES: { value: FileFamily; label: string }[] = [
  { value: 'pdf', label: 'PDF' },
  { value: 'word', label: 'Word' },
  { value: 'excel', label: 'Excel' },
  { value: 'powerpoint', label: 'PowerPoint' },
  { value: 'image', label: 'Images' },
];

/** Même plafond et mêmes types que l'API, qui reste juge du contenu réel. */
export const MAX_PRIVATE_FILE_BYTES = 25 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'docx',
  'xlsx',
  'pptx',
];
export const PRIVATE_FILE_ACCEPT = ACCEPTED_EXTENSIONS.map((e) => `.${e}`).join(
  ',',
);
export const ACCEPTED_LABEL = 'PDF, Word, Excel, PowerPoint, JPEG, PNG ou WebP';

/** Contrôle du fichier choisi, avant tout envoi ; `null` si acceptable. */
export function privateFileProblem(file: File): string | null {
  if (file.size === 0) return 'Ce fichier est vide.';
  if (file.size > MAX_PRIVATE_FILE_BYTES)
    return `Trop volumineux (${formatBytes(file.size)}) : 25 Mo au plus.`;
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  return ACCEPTED_EXTENSIONS.includes(extension)
    ? null
    : `Format non accepté. Formats possibles : ${ACCEPTED_LABEL}.`;
}

export { formatBytes };

const shortDate = new Intl.DateTimeFormat('fr', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
export const formatShortDate = (iso: string) => shortDate.format(new Date(iso));

// --- Arborescence ---

export interface FolderIndex {
  byId: Map<string, PrivateFolder>;
  /** Enfants de chaque dossier ; la clé `null` porte les racines visibles. */
  children: Map<string | null, PrivateFolder[]>;
}

const byName = (a: PrivateFolder, b: PrivateFolder) =>
  a.name.localeCompare(b.name, 'fr', { numeric: true, sensitivity: 'base' });

export function indexFolders(folders: PrivateFolder[]): FolderIndex {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const children = new Map<string | null, PrivateFolder[]>();
  for (const folder of folders) {
    // Parent absent de la liste : le dossier est une racine de votre périmètre.
    const key =
      folder.parentId && byId.has(folder.parentId) ? folder.parentId : null;
    const siblings = children.get(key) ?? [];
    siblings.push(folder);
    children.set(key, siblings);
  }
  for (const siblings of children.values()) siblings.sort(byName);
  return { byId, children };
}

/** Du premier niveau visible jusqu'au dossier (fil d'Ariane). */
export function pathTo(index: FolderIndex, id: string): PrivateFolder[] {
  const path: PrivateFolder[] = [];
  const seen = new Set<string>();
  let current = index.byId.get(id);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = current.parentId ? index.byId.get(current.parentId) : undefined;
  }
  return path;
}

/** Identifiants du dossier et de tous ses sous-dossiers. */
export function subtreeIds(index: FolderIndex, id: string): Set<string> {
  const ids = new Set<string>();
  const stack = [id];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (ids.has(current)) continue;
    ids.add(current);
    for (const child of index.children.get(current) ?? []) stack.push(child.id);
  }
  return ids;
}

/** Documents actifs du dossier et de ses sous-dossiers. */
export function deepDocumentCount(index: FolderIndex, id: string): number {
  let total = 0;
  for (const folderId of subtreeIds(index, id)) {
    total += index.byId.get(folderId)?.documentCount ?? 0;
  }
  return total;
}

/** « Administratif · Fiscalité · 2024 » : le classement d'un dossier, en une ligne. */
export function classificationOf(folder: PrivateFolder): string[] {
  const seen = new Set<string>();
  return [
    folder.category,
    folder.subCategory,
    folder.department,
    folder.projectRef,
    folder.year?.toString(),
  ].filter((part): part is string => {
    // Une même valeur à deux niveaux (catégorie et département « Finance ») ne s'affiche qu'une fois.
    const key = part?.trim().toLowerCase();
    if (!part || !key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Adresse de l'explorateur ouvert sur un dossier. */
export const folderHref = (id: string | null) =>
  id ? `/admin/documents?dossier=${id}` : '/admin/documents';

// --- Téléchargement ---

function filenameFrom(disposition: string | null, fallback: string): string {
  const encoded = disposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded);
    } catch {
      // Nom mal encodé : on retombe sur la forme simple.
    }
  }
  return disposition?.match(/filename="([^"]+)"/i)?.[1] ?? fallback;
}

/**
 * Récupère le fichier par la route authentifiée (droit revérifié et
 * téléchargement audité par l'API). Passer par `adminFetch` plutôt que par un
 * simple lien : une session expirée est renouvelée, et un refus (droit
 * révoqué entre-temps) remonte comme une erreur lisible, pas comme une page
 * JSON brute.
 */
export async function fetchDocumentFile(
  document: Pick<PrivateDocument, 'id' | 'name' | 'fileType'>,
): Promise<{ blob: Blob; filename: string }> {
  let response: Response;
  try {
    response = await adminFetch(
      `/api/backend/documents-prives/files/${document.id}/download`,
    );
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Connexion au serveur impossible.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      body?.code ?? 'UNKNOWN_ERROR',
      body?.message ?? 'Le téléchargement a échoué.',
      [],
      typeof body?.requestId === 'string' ? body.requestId : undefined,
    );
  }
  const extension = fileTypeOf(document.fileType)?.ext;
  const fallback = extension ? `${document.name}.${extension}` : document.name;
  return {
    blob: await response.blob(),
    filename: filenameFrom(
      response.headers.get('content-disposition'),
      fallback,
    ),
  };
}

/** Télécharge le document et le remet au navigateur sous son nom. */
export async function downloadDocument(
  document: Pick<PrivateDocument, 'id' | 'name' | 'fileType'>,
): Promise<void> {
  const { blob, filename } = await fetchDocumentFile(document);
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = filename;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  // Laisse au navigateur le temps de démarrer l'enregistrement.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// --- Téléversement ---

/**
 * Envoie un fichier avec suivi de l'avancement (`XMLHttpRequest`, seul à
 * l'exposer) : sur une connexion lente, 25 Mo sans indication ressemblent à
 * une panne. Comme `adminFetch`, tente une rotation du jeton sur un 401.
 */
export function uploadPrivateFile(
  data: () => FormData,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<PrivateDocument> {
  const attempt = (retried: boolean): Promise<PrivateDocument> =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/backend/documents-prives/files');
      xhr.responseType = 'json';
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(event.loaded / event.total);
      };
      xhr.onerror = () =>
        reject(
          new ApiError(0, 'NETWORK_ERROR', 'Connexion au serveur impossible.'),
        );
      xhr.onabort = () =>
        reject(new DOMException('Envoi annulé', 'AbortError'));
      xhr.onload = () => {
        const body = xhr.response as Record<string, unknown> | null;
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(body as unknown as PrivateDocument);
          return;
        }
        if (xhr.status === 401 && !retried) {
          fetch('/api/auth/refresh', { method: 'POST' })
            .then((res) => {
              if (!res.ok) throw new Error('refresh');
              return attempt(true);
            })
            .then(resolve)
            .catch(() =>
              reject(new ApiError(401, 'UNAUTHORIZED', 'Session expirée.')),
            );
          return;
        }
        reject(
          new ApiError(
            xhr.status,
            typeof body?.code === 'string' ? body.code : 'UNKNOWN_ERROR',
            typeof body?.message === 'string'
              ? body.message
              : 'Le téléversement a échoué.',
            Array.isArray(body?.details) ? body.details : [],
            typeof body?.requestId === 'string' ? body.requestId : undefined,
          ),
        );
      };
      signal?.addEventListener('abort', () => xhr.abort(), { once: true });
      xhr.send(data());
    });
  return attempt(false);
}
