import { ConfidentialityLevel, Prisma, Role } from '@prisma/client';

/**
 * Politique d'accès de l'espace documentaire privé — fonctions pures, sans
 * accès base, pour qu'elle se démontre par des tests unitaires.
 * Références : blueprint/09_Business_Rules.md §4-5, 11_Document_Management_System.md §3.
 *
 * Règles :
 * - ADMINISTRATEUR : accès complet.
 * - Les autres rôles n'ont AUCUN accès par défaut : il faut un droit nominatif.
 * - Un droit sur un dossier couvre ce dossier et tous ses sous-dossiers.
 * - Un droit sur un document couvre ce seul document (« sorti de son
 *   contexte de dossier »), sans révéler le dossier qui le contient.
 * - Une confidentialité de document PLUS STRICTE que celle de son dossier
 *   retire l'héritage du droit de dossier : seul un droit sur le document
 *   (ou l'Administrateur) y donne accès. Plus laxiste ou égale : sans effet.
 * - Écrire (téléverser, classer, archiver) exige le rôle GESTIONNAIRE et un
 *   droit sur le dossier ; l'UTILISATEUR ne fait que lire/télécharger.
 */

const LEVEL_RANK: Record<ConfidentialityLevel, number> = {
  PUBLIC_INTERNE: 0,
  RESTREINT: 1,
  CONFIDENTIEL: 2,
};

const ALL_LEVELS = Object.keys(LEVEL_RANK) as ConfidentialityLevel[];

export interface FolderNode {
  id: string;
  parentId: string | null;
  confidentiality: ConfidentialityLevel;
}

/** Périmètre d'un utilisateur, calculé une fois par requête. */
export interface AccessScope {
  userId: string;
  role: Role;
  isAdmin: boolean;
  /** Dossiers lisibles : dossiers dotés d'un droit + tous leurs descendants. */
  readableFolderIds: ReadonlySet<string>;
  /** Documents isolés dotés d'un droit explicite. */
  grantedDocumentIds: ReadonlySet<string>;
  /** Niveau de confidentialité de chaque dossier existant. */
  folderLevels: ReadonlyMap<string, ConfidentialityLevel>;
}

export interface DocumentRef {
  id: string;
  folderId: string;
  /** Surcharge ; `null` = hérite du dossier. */
  confidentiality: ConfidentialityLevel | null;
}

/** Dossiers couverts par des droits directs + leurs descendants. */
export function expandReadableFolders(
  folders: readonly FolderNode[],
  grantedFolderIds: Iterable<string>,
): Set<string> {
  const children = new Map<string, string[]>();
  for (const folder of folders) {
    if (folder.parentId) {
      const siblings = children.get(folder.parentId) ?? [];
      siblings.push(folder.id);
      children.set(folder.parentId, siblings);
    }
  }
  const existing = new Set(folders.map((f) => f.id));
  const readable = new Set<string>();
  const stack = [...grantedFolderIds].filter((id) => existing.has(id));
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (readable.has(id)) continue;
    readable.add(id);
    stack.push(...(children.get(id) ?? []));
  }
  return readable;
}

export function buildScope(args: {
  userId: string;
  role: Role;
  folders: readonly FolderNode[];
  grantedFolderIds: Iterable<string>;
  grantedDocumentIds: Iterable<string>;
}): AccessScope {
  return {
    userId: args.userId,
    role: args.role,
    isAdmin: args.role === Role.ADMINISTRATEUR,
    readableFolderIds: expandReadableFolders(args.folders, args.grantedFolderIds),
    grantedDocumentIds: new Set(args.grantedDocumentIds),
    folderLevels: new Map(args.folders.map((f) => [f.id, f.confidentiality])),
  };
}

export function canReadFolder(scope: AccessScope, folderId: string): boolean {
  return scope.isAdmin || scope.readableFolderIds.has(folderId);
}

/** Le droit de dossier s'applique-t-il à ce document (surcharge plus stricte exclue) ? */
function inheritsFolderAccess(
  scope: AccessScope,
  document: DocumentRef,
): boolean {
  if (!scope.readableFolderIds.has(document.folderId)) return false;
  const folderLevel = scope.folderLevels.get(document.folderId);
  if (!folderLevel) return false;
  return (
    document.confidentiality === null ||
    LEVEL_RANK[document.confidentiality] <= LEVEL_RANK[folderLevel]
  );
}

export function canReadDocument(
  scope: AccessScope,
  document: DocumentRef,
): boolean {
  if (scope.isAdmin) return true;
  return (
    scope.grantedDocumentIds.has(document.id) ||
    inheritsFolderAccess(scope, document)
  );
}

export function canWriteFolder(scope: AccessScope, folderId: string): boolean {
  if (scope.isAdmin) return true;
  return scope.role === Role.GESTIONNAIRE && scope.readableFolderIds.has(folderId);
}

/** Écrire sur un document suppose de pouvoir le lire ET d'écrire dans son dossier. */
export function canWriteDocument(
  scope: AccessScope,
  document: DocumentRef,
): boolean {
  if (scope.isAdmin) return true;
  return canReadDocument(scope, document) && canWriteFolder(scope, document.folderId);
}

/**
 * Filtre Prisma des documents lisibles : l'accès est appliqué EN BASE (liste,
 * recherche), jamais en façade. Les documents supprimés sont toujours exclus.
 */
export function readableDocumentWhere(
  scope: AccessScope,
): Prisma.PrivateDocumentWhereInput {
  if (scope.isAdmin) return { deletedAt: null };

  const branches: Prisma.PrivateDocumentWhereInput[] = [];
  for (const level of ALL_LEVELS) {
    const folderIds = [...scope.readableFolderIds].filter(
      (id) => scope.folderLevels.get(id) === level,
    );
    if (folderIds.length === 0) continue;
    branches.push({
      folderId: { in: folderIds },
      OR: [
        { confidentiality: null },
        {
          confidentiality: {
            in: ALL_LEVELS.filter((l) => LEVEL_RANK[l] <= LEVEL_RANK[level]),
          },
        },
      ],
    });
  }
  if (scope.grantedDocumentIds.size > 0) {
    branches.push({ id: { in: [...scope.grantedDocumentIds] } });
  }
  // Aucun droit : aucun résultat (jamais « tout »).
  if (branches.length === 0) return { id: { in: [] } };
  return { deletedAt: null, OR: branches };
}

/** Dossiers lisibles, et parent masqué s'il ne l'est pas (aucune fuite d'arborescence). */
export function visibleParentId(
  scope: AccessScope,
  parentId: string | null,
): string | null {
  return parentId && canReadFolder(scope, parentId) ? parentId : null;
}

export function confidentialityRank(level: ConfidentialityLevel): number {
  return LEVEL_RANK[level];
}
