import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { escapeLike } from '../../common/utils/like.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { auditContextStorage } from './audit-context.js';
import { entityKey, resolveEntities } from './audit-entities.js';

export interface AuditEntry {
  /** Acteur ; `null` pour une action sans utilisateur (script, système). */
  actorId: string | null;
  /** Verbe stable en MAJUSCULES, ex. `DOCUMENT_DOWNLOADED`. */
  action: string;
  entityType: string;
  entityId?: string;
  /** Valeurs avant/après d'un changement de droit ou de contenu. */
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
}

/** Filet de sécurité : au-delà, les facettes sont recalculées même sans nouvelle écriture. */
const FACETS_TTL_MS = 10 * 60_000;

export interface Facets {
  actions: { action: string; count: number }[];
  entityTypes: { entityType: string; count: number }[];
  actors: { id: string; fullName: string }[];
}

/**
 * Journal d'audit en écriture seule (blueprint/09_Business_Rules.md §7) :
 * aucune méthode ne modifie ni ne supprime une entrée. N'y mettre jamais de
 * mot de passe, de jeton, de chemin de fichier ni de contenu de document
 * (blueprint/10_Security.md §3). Une écriture qui échoue fait échouer
 * l'action auditée : une action sensible ne doit jamais passer sans trace.
 */
@Injectable()
export class AuditService {
  /**
   * Facettes déjà calculées, une par source (journal courant / archive). Elles
   * coûtent trois parcours complets de la table : on les calcule une fois, puis
   * on les réutilise jusqu'à la prochaine écriture dans le journal (`record`)
   * ou, au plus, `FACETS_TTL_MS`. Une seule instance de l'API est prévue
   * (blueprint/18) : l'invalidation locale suffit.
   */
  private readonly facetsCache = new Map<
    boolean,
    { value: Promise<Facets>; expiresAt: number }
  >();

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    // IP et navigateur de la requête en cours, bornés pour ne pas gonfler la table.
    const context = auditContextStorage.getStore();
    await this.prisma.auditLog.create({
      data: {
        ipAddress: context?.ipAddress?.slice(0, 64),
        userAgent: context?.userAgent?.slice(0, 300),
        actorId: entry.actorId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        beforeData: entry.before,
        afterData: entry.after,
      },
    });
    // Nouvelle action, nouvel auteur ou nouveaux effectifs : les facettes sont à refaire.
    // (L'archivage laisse toujours une entrée, donc invalide aussi l'archive.)
    this.facetsCache.clear();
  }

  /** Journal courant, ou archive (entrées de plus de 12 mois) : mêmes colonnes, même lecture. */
  private source(archived: boolean) {
    return (
      archived ? this.prisma.auditLogArchive : this.prisma.auditLog
    ) as typeof this.prisma.auditLog;
  }

  async list(query: {
    page: number;
    limit: number;
    actorId?: string;
    /** Un code d'action, ou plusieurs séparés par des virgules. */
    action?: string;
    /** Codes d'action à écarter (virgules). */
    excludeAction?: string;
    entityType?: string;
    entityId?: string;
    /** Recherche libre : auteur (nom), code d'action (espaces = `_`), type d'élément. */
    q?: string;
    /** Jours inclus (UTC), `AAAA-MM-JJ`. */
    from?: string;
    to?: string;
    /** Lire l'archive (entrées de plus de 12 mois) au lieu du journal courant. */
    archived?: boolean;
  }) {
    const model = this.source(query.archived ?? false);
    const search = query.q?.trim() ? escapeLike(query.q.trim()) : undefined;
    const where: Prisma.AuditLogWhereInput = {
      ...(query.actorId && { actorId: query.actorId }),
      ...(query.action && {
        action: query.action.includes(',')
          ? { in: query.action.split(',') }
          : query.action,
      }),
      ...(query.excludeAction && {
        NOT: { action: { in: query.excludeAction.split(',') } },
      }),
      ...(query.entityType && { entityType: query.entityType }),
      ...(query.entityId && { entityId: query.entityId }),
      ...((query.from || query.to) && {
        createdAt: {
          ...(query.from && {
            gte: new Date(`${query.from.slice(0, 10)}T00:00:00.000Z`),
          }),
          // Jour de fin inclus : borne exclusive au lendemain 00:00 UTC.
          ...(query.to && {
            lt: new Date(
              new Date(`${query.to.slice(0, 10)}T00:00:00.000Z`).getTime() +
                86_400_000,
            ),
          }),
        },
      }),
      ...(search && {
        OR: [
          {
            actor: {
              is: {
                fullName: { contains: search, mode: 'insensitive' as const },
              },
            },
          },
          {
            action: {
              contains: search.replace(/ /g, '_'),
              mode: 'insensitive' as const,
            },
          },
          { entityType: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };
    const [data, total] = await Promise.all([
      model.findMany({
        where,
        // Nom seul : de quoi afficher « par … » sans exposer l'e-mail de l'acteur.
        include: { actor: { select: { id: true, fullName: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      model.count({ where }),
    ]);
    const entities = await resolveEntities(this.prisma, data);
    // Bénéficiaire d'un droit (ACCESS_*) : l'utilisateur cité dans les valeurs avant/après.
    const subjectIds = [
      ...new Set(
        data
          .map(
            (row) => subjectIdOf(row.beforeData) ?? subjectIdOf(row.afterData),
          )
          .filter((id): id is string => id !== null),
      ),
    ];
    const subjects = new Map(
      (
        await this.prisma.user.findMany({
          where: { id: { in: subjectIds } },
          select: { id: true, fullName: true },
        })
      ).map((user) => [user.id, user]),
    );
    return {
      data: data.map((row) => {
        const subjectId =
          subjectIdOf(row.beforeData) ?? subjectIdOf(row.afterData);
        return {
          ...row,
          entity: row.entityId
            ? (entities.get(entityKey(row.entityType, row.entityId)) ?? null)
            : null,
          subject: subjectId ? (subjects.get(subjectId) ?? null) : null,
        };
      }),
      meta: { page: query.page, limit: query.limit, total },
    };
  }

  /**
   * De quoi remplir les filtres de l'écran : les actions et types d'éléments
   * réellement présents (avec leur effectif) et les personnes qui ont agi.
   */
  facets(archived = false): Promise<Facets> {
    const cached = this.facetsCache.get(archived);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const value = this.computeFacets(archived);
    this.facetsCache.set(archived, {
      value,
      expiresAt: Date.now() + FACETS_TTL_MS,
    });
    // Un échec n'est pas mémorisé : le prochain appel réessaie.
    value.catch(() => {
      if (this.facetsCache.get(archived)?.value === value) {
        this.facetsCache.delete(archived);
      }
    });
    return value;
  }

  private async computeFacets(archived: boolean): Promise<Facets> {
    const model = this.source(archived);
    const [actions, entityTypes, actorGroups] = await Promise.all([
      model.groupBy({
        by: ['action'],
        _count: { _all: true },
        orderBy: { action: 'asc' },
      }),
      model.groupBy({
        by: ['entityType'],
        _count: { _all: true },
        orderBy: { entityType: 'asc' },
      }),
      model.groupBy({
        by: ['actorId'],
        where: { actorId: { not: null } },
        _count: { _all: true },
      }),
    ]);
    const actors = await this.prisma.user.findMany({
      where: {
        id: { in: actorGroups.map((group) => group.actorId as string) },
      },
      select: { id: true, fullName: true },
      orderBy: { fullName: 'asc' },
    });
    return {
      actions: actions.map((row) => ({
        action: row.action,
        count: row._count._all,
      })),
      entityTypes: entityTypes.map((row) => ({
        entityType: row.entityType,
        count: row._count._all,
      })),
      actors,
    };
  }
}

/** `userId` consigné dans les valeurs avant/après d'un droit d'accès. */
function subjectIdOf(data: Prisma.JsonValue | null): string | null {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const value = data.userId;
    if (typeof value === 'string') return value;
  }
  return null;
}
