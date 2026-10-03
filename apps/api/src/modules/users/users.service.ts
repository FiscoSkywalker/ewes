import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import {
  toUserView,
  type UserDetailView,
  type UserView,
} from './user-views.js';

export const USER_NOT_FOUND = {
  code: 'USER_NOT_FOUND',
  message: 'Compte introuvable.',
  details: [],
};

type Tx = Prisma.TransactionClient;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** `email` est comparé insensible à la casse : la contrainte unique en base est appliquée sur la valeur normalisée à la création. */
  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  // --- Administration des comptes (Administrateur) ---

  /** Tous les comptes non supprimés, par nom. */
  async list(): Promise<UserView[]> {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: [{ fullName: 'asc' }, { email: 'asc' }],
    });
    const activity = await this.prisma.session.groupBy({
      by: ['userId'],
      where: { userId: { in: users.map((user) => user.id) } },
      _max: { createdAt: true },
    });
    const lastActive = new Map(
      activity.map((row) => [row.userId, row._max.createdAt]),
    );
    return users.map((user) =>
      toUserView(user, lastActive.get(user.id) ?? null),
    );
  }

  async detail(id: string): Promise<UserDetailView> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!user) throw new NotFoundException(USER_NOT_FOUND);
    const [last, activeSessions, folders, documents] = await Promise.all([
      this.prisma.session.aggregate({
        where: { userId: id },
        _max: { createdAt: true },
      }),
      this.prisma.session.count({
        where: { userId: id, revokedAt: null, expiresAt: { gt: new Date() } },
      }),
      this.prisma.folderAccessGrant.count({ where: { userId: id } }),
      this.prisma.documentAccessGrant.count({ where: { userId: id } }),
    ]);
    return {
      ...toUserView(user, last._max.createdAt),
      activeSessions,
      grants: { folders, documents },
    };
  }

  /**
   * Changement de rôle (audité, valeurs avant/après). Les sessions du compte
   * sont révoquées : le nouveau rôle s'applique à sa prochaine connexion, et
   * un jeton d'accès déjà émis expire de lui-même (15 min).
   */
  async changeRole(actor: AuthenticatedUser, id: string, role: Role) {
    if (actor.id === id) {
      throw new ForbiddenException({
        code: 'CANNOT_CHANGE_OWN_ROLE',
        message:
          'Vous ne pouvez pas changer votre propre rôle. Demandez-le à un autre administrateur.',
        details: [],
      });
    }
    const { before, user } = await this.exclusive(async (tx) => {
      const current = await this.requireUser(tx, id);
      if (current.role === role) {
        throw new BadRequestException({
          code: 'ROLE_UNCHANGED',
          message: 'Ce compte a déjà ce rôle.',
          details: [],
        });
      }
      if (current.role === Role.ADMINISTRATEUR && current.isActive) {
        await this.assertAnotherAdministrator(tx, id);
      }
      const updated = await tx.user.update({ where: { id }, data: { role } });
      await this.revokeSessions(tx, id);
      return { before: current.role, user: updated };
    });
    await this.audit.record({
      actorId: actor.id,
      action: 'USER_ROLE_CHANGED',
      entityType: 'User',
      entityId: id,
      before: { role: before, email: user.email },
      after: { role: user.role, email: user.email },
    });
    return this.detail(id);
  }

  /**
   * Désactive ou réactive un compte. Désactiver ferme ses sessions (plus de
   * renouvellement) et interdit toute nouvelle connexion ; rien n'est supprimé,
   * son historique et ses droits restent. Sans effet (et sans audit) si le
   * compte est déjà dans l'état demandé.
   */
  async setActive(actor: AuthenticatedUser, id: string, active: boolean) {
    if (!active && actor.id === id) {
      throw new ForbiddenException({
        code: 'CANNOT_DEACTIVATE_SELF',
        message:
          'Vous ne pouvez pas désactiver votre propre compte. Demandez-le à un autre administrateur.',
        details: [],
      });
    }
    const changed = await this.exclusive(async (tx) => {
      const current = await this.requireUser(tx, id);
      if (current.isActive === active) return null;
      if (!active && current.role === Role.ADMINISTRATEUR) {
        await this.assertAnotherAdministrator(tx, id);
      }
      const updated = await tx.user.update({
        where: { id },
        data: { isActive: active },
      });
      if (!active) await this.revokeSessions(tx, id);
      return updated;
    });
    if (changed) {
      await this.audit.record({
        actorId: actor.id,
        action: active ? 'USER_REACTIVATED' : 'USER_DEACTIVATED',
        entityType: 'User',
        entityId: id,
        before: { isActive: !active, email: changed.email },
        after: { isActive: active, email: changed.email },
      });
    }
    return this.detail(id);
  }

  // --- Internes ---

  private async requireUser(tx: Tx, id: string): Promise<User> {
    const user = await tx.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundException(USER_NOT_FOUND);
    return user;
  }

  /** Il doit toujours rester un administrateur actif : sinon plus personne ne gère les comptes. */
  private async assertAnotherAdministrator(tx: Tx, excludedId: string) {
    const others = await tx.user.count({
      where: {
        role: Role.ADMINISTRATEUR,
        isActive: true,
        deletedAt: null,
        id: { not: excludedId },
      },
    });
    if (others === 0) {
      throw new ConflictException({
        code: 'LAST_ADMINISTRATOR',
        message:
          'Il doit rester au moins un administrateur actif. Nommez d’abord un autre administrateur.',
        details: [],
      });
    }
  }

  private revokeSessions(tx: Tx, userId: string) {
    return tx.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Transaction sérialisable : deux administrateurs qui se rétrogradent en
   * même temps ne peuvent pas passer tous deux la règle du dernier
   * administrateur ; le second reçoit un conflit à rejouer.
   */
  private async exclusive<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
    try {
      return await this.prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException({
          code: 'CONCURRENT_UPDATE',
          message:
            'Un autre administrateur modifie les comptes en ce moment. Réessayez.',
          details: [],
        });
      }
      throw error;
    }
  }
}
