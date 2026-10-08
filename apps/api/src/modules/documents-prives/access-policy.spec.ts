import { describe, expect, it } from 'vitest';
import { ConfidentialityLevel, Role } from '@prisma/client';
import {
  buildScope,
  canReadDocument,
  canReadFolder,
  canWriteDocument,
  canWriteFolder,
  expandReadableFolders,
  readableDocumentWhere,
  visibleParentId,
  type FolderNode,
} from './access-policy.js';

const L = ConfidentialityLevel;

/**
 *   root (RESTREINT)
 *   ├── a (RESTREINT)
 *   │   └── a1 (CONFIDENTIEL)
 *   └── b (PUBLIC_INTERNE)
 *   other (RESTREINT)
 */
const folders: FolderNode[] = [
  { id: 'root', parentId: null, confidentiality: L.RESTREINT },
  { id: 'a', parentId: 'root', confidentiality: L.RESTREINT },
  { id: 'a1', parentId: 'a', confidentiality: L.CONFIDENTIEL },
  { id: 'b', parentId: 'root', confidentiality: L.PUBLIC_INTERNE },
  { id: 'other', parentId: null, confidentiality: L.RESTREINT },
];

const scopeOf = (
  role: Role,
  grantedFolderIds: string[] = [],
  grantedDocumentIds: string[] = [],
) =>
  buildScope({
    userId: 'u1',
    role,
    folders,
    grantedFolderIds,
    grantedDocumentIds,
  });

describe('expandReadableFolders', () => {
  it('covers a granted folder and all its descendants, nothing else', () => {
    expect([...expandReadableFolders(folders, ['a'])].sort()).toEqual([
      'a',
      'a1',
    ]);
    expect([...expandReadableFolders(folders, ['root'])].sort()).toEqual([
      'a',
      'a1',
      'b',
      'root',
    ]);
  });

  it('never grants a parent from a child grant, and ignores unknown folders', () => {
    expect([...expandReadableFolders(folders, ['a1'])]).toEqual(['a1']);
    expect(expandReadableFolders(folders, ['ghost']).size).toBe(0);
  });
});

describe('access policy', () => {
  it('gives an ordinary role no access by default', () => {
    for (const role of [Role.UTILISATEUR, Role.GESTIONNAIRE]) {
      const scope = scopeOf(role);
      expect(canReadFolder(scope, 'a')).toBe(false);
      expect(
        canReadDocument(scope, {
          id: 'd1',
          folderId: 'a',
          confidentiality: null,
        }),
      ).toBe(false);
      expect(canWriteFolder(scope, 'a')).toBe(false);
    }
  });

  it('gives the administrator full access', () => {
    const scope = scopeOf(Role.ADMINISTRATEUR);
    expect(canReadFolder(scope, 'other')).toBe(true);
    expect(canWriteFolder(scope, 'other')).toBe(true);
    expect(
      canReadDocument(scope, {
        id: 'd1',
        folderId: 'a1',
        confidentiality: L.CONFIDENTIEL,
      }),
    ).toBe(true);
  });

  it('inherits a folder grant to documents, including sub-folders', () => {
    const scope = scopeOf(Role.UTILISATEUR, ['a']);
    expect(
      canReadDocument(scope, {
        id: 'd1',
        folderId: 'a',
        confidentiality: null,
      }),
    ).toBe(true);
    expect(
      canReadDocument(scope, {
        id: 'd2',
        folderId: 'a1',
        confidentiality: null,
      }),
    ).toBe(true);
    expect(
      canReadDocument(scope, {
        id: 'd3',
        folderId: 'b',
        confidentiality: null,
      }),
    ).toBe(false);
  });

  it('removes folder-grant inheritance when the override is stricter than the folder', () => {
    const scope = scopeOf(Role.UTILISATEUR, ['a']);
    // Dossier RESTREINT, document CONFIDENTIEL : le droit de dossier ne suffit plus.
    expect(
      canReadDocument(scope, {
        id: 'd1',
        folderId: 'a',
        confidentiality: L.CONFIDENTIEL,
      }),
    ).toBe(false);
    // Surcharge égale ou plus laxiste : sans effet sur l'accès.
    expect(
      canReadDocument(scope, {
        id: 'd2',
        folderId: 'a',
        confidentiality: L.RESTREINT,
      }),
    ).toBe(true);
    expect(
      canReadDocument(scope, {
        id: 'd3',
        folderId: 'a',
        confidentiality: L.PUBLIC_INTERNE,
      }),
    ).toBe(true);
  });

  it('lets a document-level grant open that document alone', () => {
    const scope = scopeOf(Role.UTILISATEUR, [], ['d1']);
    expect(
      canReadDocument(scope, {
        id: 'd1',
        folderId: 'a',
        confidentiality: L.CONFIDENTIEL,
      }),
    ).toBe(true);
    expect(
      canReadDocument(scope, {
        id: 'd9',
        folderId: 'a',
        confidentiality: null,
      }),
    ).toBe(false);
    // Le dossier du document reste invisible.
    expect(canReadFolder(scope, 'a')).toBe(false);
  });

  it('allows writing only to a manager holding a grant on the folder', () => {
    const manager = scopeOf(Role.GESTIONNAIRE, ['a']);
    expect(canWriteFolder(manager, 'a')).toBe(true);
    expect(canWriteFolder(manager, 'a1')).toBe(true);
    expect(canWriteFolder(manager, 'b')).toBe(false);

    // Un utilisateur, même doté d'un droit, ne fait que lire.
    const user = scopeOf(Role.UTILISATEUR, ['a']);
    expect(canWriteFolder(user, 'a')).toBe(false);
  });

  it('refuses writing to a document the manager cannot even read', () => {
    const manager = scopeOf(Role.GESTIONNAIRE, ['a']);
    expect(
      canWriteDocument(manager, {
        id: 'd1',
        folderId: 'a',
        confidentiality: L.CONFIDENTIEL,
      }),
    ).toBe(false);
    expect(
      canWriteDocument(manager, {
        id: 'd2',
        folderId: 'a',
        confidentiality: null,
      }),
    ).toBe(true);
  });

  it('hides the parent of a granted folder instead of leaking the tree', () => {
    const scope = scopeOf(Role.UTILISATEUR, ['a1']);
    expect(visibleParentId(scope, 'a')).toBeNull();
    expect(visibleParentId(scope, null)).toBeNull();
    const wider = scopeOf(Role.UTILISATEUR, ['a']);
    expect(visibleParentId(wider, 'a')).toBe('a');
  });
});

describe('readableDocumentWhere', () => {
  it('returns an impossible filter when the user has no right at all', () => {
    expect(readableDocumentWhere(scopeOf(Role.UTILISATEUR))).toEqual({
      id: { in: [] },
    });
  });

  it('only excludes deleted documents for the administrator', () => {
    expect(readableDocumentWhere(scopeOf(Role.ADMINISTRATEUR))).toEqual({
      deletedAt: null,
    });
  });

  it('builds one branch per folder level plus the document grants, excluding deleted', () => {
    const where = readableDocumentWhere(
      scopeOf(Role.UTILISATEUR, ['a', 'b'], ['d9']),
    );
    expect(where.deletedAt).toBeNull();
    const branches = where.OR as Record<string, unknown>[];
    // a (RESTREINT) et b (PUBLIC_INTERNE) + a1 (CONFIDENTIEL, descendant de a) + droit document.
    expect(branches).toHaveLength(4);
    expect(branches).toContainEqual({ id: { in: ['d9'] } });

    const restreint = branches.find(
      (b) => JSON.stringify(b.folderId) === JSON.stringify({ in: ['a'] }),
    ) as { OR: { confidentiality: unknown }[] };
    // Dossier RESTREINT : surcharge PUBLIC_INTERNE ou RESTREINT seulement, jamais CONFIDENTIEL.
    expect(restreint.OR).toEqual([
      { confidentiality: null },
      { confidentiality: { in: ['PUBLIC_INTERNE', 'RESTREINT'] } },
    ]);
  });
});
