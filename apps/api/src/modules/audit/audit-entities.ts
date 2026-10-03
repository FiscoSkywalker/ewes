import type { PrismaService } from '../../prisma/prisma.service.js';

/** Ce que le journal sait dire d'un élément à partir de son identifiant. */
export interface EntityInfo {
  /** Nom lisible (titre, nom…) ; `null` si l'élément n'existe plus ou n'est pas connu. */
  label: string | null;
  /** Adresse publique (pages) : le portail adresse une page par son slug. */
  slug: string | null;
  /** `false` : supprimé (y compris suppression logique) ou introuvable — pas de lien à proposer. */
  exists: boolean;
}

const NONE: EntityInfo = { label: null, slug: null, exists: false };

interface Row {
  id: string;
  label: string;
  slug?: string;
  deletedAt?: Date | null;
}

const toMap = (rows: Row[]) =>
  new Map<string, EntityInfo>(
    rows.map((row) => [
      row.id,
      { label: row.label, slug: row.slug ?? null, exists: !row.deletedAt },
    ]),
  );

type Finder = (prisma: PrismaService, ids: string[]) => Promise<Row[]>;

/**
 * Types d'éléments auditables → comment retrouver leur nom. Un type absent de
 * cette table reste affiché par son identifiant : l'audit ne perd rien, il
 * est seulement moins lisible.
 */
const FINDERS: Record<string, Finder> = {
  // Une seule ligne de réglages : un nom fixe suffit, et elle existe toujours.
  SiteSettings: (_p, ids) =>
    Promise.resolve(
      ids.map((id) => ({ id, label: 'Paramètres de la plateforme' })),
    ),
  Article: async (p, ids) =>
    (
      await p.article.findMany({
        where: { id: { in: ids } },
        select: { id: true, titleFr: true, slug: true, deletedAt: true },
      })
    ).map((r) => ({ ...r, label: r.titleFr })),
  Realisation: async (p, ids) =>
    (
      await p.realisation.findMany({
        where: { id: { in: ids } },
        select: { id: true, titleFr: true, slug: true, deletedAt: true },
      })
    ).map((r) => ({ ...r, label: r.titleFr })),
  PublicDocument: async (p, ids) =>
    (
      await p.publicDocument.findMany({
        where: { id: { in: ids } },
        select: { id: true, titleFr: true, slug: true, deletedAt: true },
      })
    ).map((r) => ({ ...r, label: r.titleFr })),
  Page: async (p, ids) =>
    (
      await p.page.findMany({
        where: { id: { in: ids } },
        select: { id: true, titleFr: true, slug: true },
      })
    ).map((r) => ({ ...r, label: r.titleFr })),
  Service: async (p, ids) =>
    (
      await p.service.findMany({
        where: { id: { in: ids } },
        select: { id: true, nameFr: true, slug: true },
      })
    ).map((r) => ({ ...r, label: r.nameFr })),
  ServiceOffering: async (p, ids) =>
    (
      await p.serviceOffering.findMany({
        where: { id: { in: ids } },
        select: { id: true, titleFr: true },
      })
    ).map((r) => ({ ...r, label: r.titleFr })),
  Expert: async (p, ids) =>
    (
      await p.expert.findMany({
        where: { id: { in: ids } },
        select: { id: true, fullName: true },
      })
    ).map((r) => ({ ...r, label: r.fullName })),
  KeyFigure: async (p, ids) =>
    (
      await p.keyFigure.findMany({
        where: { id: { in: ids } },
        select: { id: true, labelFr: true },
      })
    ).map((r) => ({ ...r, label: r.labelFr })),
  Folder: async (p, ids) =>
    (
      await p.folder.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true },
      })
    ).map((r) => ({ ...r, label: r.name })),
  PrivateDocument: async (p, ids) =>
    (
      await p.privateDocument.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, deletedAt: true },
      })
    ).map((r) => ({ ...r, label: r.name })),
  ContactMessage: async (p, ids) =>
    (
      await p.contactMessage.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true },
      })
    ).map((r) => ({ ...r, label: r.name })),
  Media: async (p, ids) =>
    (
      await p.media.findMany({
        where: { id: { in: ids } },
        select: { id: true, originalName: true },
      })
    ).map((r) => ({ ...r, label: r.originalName ?? 'Image' })),
  User: async (p, ids) =>
    (
      await p.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, fullName: true, deletedAt: true },
      })
    ).map((r) => ({ ...r, label: r.fullName })),
  UserInvitation: async (p, ids) =>
    (
      await p.userInvitation.findMany({
        where: { id: { in: ids } },
        select: { id: true, fullName: true },
      })
    ).map((r) => ({ ...r, label: r.fullName })),
};

/**
 * Résout, en une requête par type d'élément (pas une par ligne), le nom des
 * éléments cités par une page du journal. Clé : `Type:identifiant`.
 */
export async function resolveEntities(
  prisma: PrismaService,
  refs: { entityType: string; entityId: string | null }[],
): Promise<Map<string, EntityInfo>> {
  const idsByType = new Map<string, Set<string>>();
  for (const { entityType, entityId } of refs) {
    if (!entityId || !FINDERS[entityType]) continue;
    (
      idsByType.get(entityType) ??
      idsByType.set(entityType, new Set()).get(entityType)!
    ).add(entityId);
  }
  const result = new Map<string, EntityInfo>();
  await Promise.all(
    [...idsByType].map(async ([type, ids]) => {
      const found = toMap(await FINDERS[type](prisma, [...ids]));
      for (const id of ids) result.set(`${type}:${id}`, found.get(id) ?? NONE);
    }),
  );
  return result;
}

export const entityKey = (entityType: string, entityId: string | null) =>
  `${entityType}:${entityId}`;
