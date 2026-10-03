import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { escapeLike } from '../../common/utils/like.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { auditContextStorage } from './audit-context.js';

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

/**
 * Journal d'audit en écriture seule (blueprint/09_Business_Rules.md §7) :
 * aucune méthode ne modifie ni ne supprime une entrée. N'y mettre jamais de
 * mot de passe, de jeton, de chemin de fichier ni de contenu de document
 * (blueprint/10_Security.md §3). Une écriture qui échoue fait échouer
 * l'action auditée : une action sensible ne doit jamais passer sans trace.
 */
@Injectable()
export class AuditService {
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
  }

  async list(query: {
    page: number;
    limit: number;
    actorId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    /** Recherche libre : auteur (nom), code d'action (espaces = `_`), type d'élément. */
    q?: string;
    /** Jours inclus (UTC), `AAAA-MM-JJ`. */
    from?: string;
    to?: string;
  }) {
    const search = query.q?.trim() ? escapeLike(query.q.trim()) : undefined;
    const where: Prisma.AuditLogWhereInput = {
      ...(query.actorId && { actorId: query.actorId }),
      ...(query.action && { action: query.action }),
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
      this.prisma.auditLog.findMany({
        where,
        // Nom seul : de quoi afficher « par … » sans exposer l'e-mail de l'acteur.
        include: { actor: { select: { id: true, fullName: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data, meta: { page: query.page, limit: query.limit, total } };
  }
}
