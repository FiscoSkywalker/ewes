import { Injectable } from '@nestjs/common';
import { ContactMessageStatus, ContentStatus, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface DashboardPending {
  /** Messages de contact au statut `NOUVEAU`. */
  contacts: number;
  /** Réalisations en brouillon (non supprimées). */
  realisations: number;
  /** Articles en brouillon (non supprimés). */
  articles: number;
  /** Documents publics en brouillon (non supprimés). */
  documents: number;
  /** Envois d'e-mail en échec définitif ; `null` hors Administrateur (non communiqué). */
  emails: number | null;
}

/**
 * Compteurs « à traiter » du tableau de bord (blueprint/14_Admin_Backoffice.md §5)
 * en une seule requête HTTP. Chaque compteur applique **exactement** le filtre
 * de la liste d'administration qu'il résume, pour que le chiffre de la carte
 * égale le total de l'écran vers lequel elle renvoie.
 */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async pending(role: Role): Promise<DashboardPending> {
    // Le rôle vient du jeton vérifié côté serveur, jamais d'un paramètre client.
    const isAdmin = role === Role.ADMINISTRATEUR;
    const [contacts, realisations, articles, documents, emails] =
      await Promise.all([
        this.prisma.contactMessage.count({
          where: { status: ContactMessageStatus.NOUVEAU },
        }),
        this.prisma.realisation.count({
          where: { status: ContentStatus.DRAFT, deletedAt: null },
        }),
        this.prisma.article.count({
          where: { status: ContentStatus.DRAFT, deletedAt: null },
        }),
        this.prisma.publicDocument.count({
          where: { status: ContentStatus.DRAFT, deletedAt: null },
        }),
        isAdmin
          ? this.prisma.notification.count({
              where: { sentAt: null, failedAt: { not: null } },
            })
          : Promise.resolve(null),
      ]);
    return { contacts, realisations, articles, documents, emails };
  }
}
