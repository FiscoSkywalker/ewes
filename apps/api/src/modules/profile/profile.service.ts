import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Role, User } from '@prisma/client';
import * as argon2 from 'argon2';
import { describeUserAgent } from '../../common/utils/user-agent.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { AccountLockedNotifier } from '../users/account-locked-notifier.service.js';
import { LoginLockoutService } from '../users/login-lockout.service.js';
import { avatarVersionOf } from '../users/user-views.js';
import {
  AvatarStorageService,
  type UploadedAvatar,
} from '../users/avatar-storage.service.js';
import type { ChangePasswordDto } from './dto/change-password.dto.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';
import { passwordChangedEmail } from './password-emails.js';

/** Ce que l'écran « Mon profil » et la coquille du portail savent de la personne connectée. */
export interface ProfileView {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  /**
   * Identifiant de la photo actuelle, `null` sans photo. Change à chaque
   * nouvelle photo : le navigateur s'en sert pour savoir quand relire l'image.
   */
  avatarVersion: string | null;
}

export interface SessionView {
  id: string;
  /** « Chrome sur Windows » : jamais l'en-tête brut. */
  device: string;
  ipAddress: string | null;
  /** Dernière ouverture ou renouvellement de la session. */
  lastActiveAt: Date;
  expiresAt: Date;
  /** La session de la requête en cours. */
  current: boolean;
}

export interface AccountView {
  createdAt: Date;
  passwordChangedAt: Date | null;
  sessions: SessionView[];
}

const toProfileView = (user: User): ProfileView => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  role: user.role,
  avatarVersion: avatarVersionOf(user.avatarName),
});

const USER_NOT_FOUND = {
  code: 'USER_NOT_FOUND',
  message: 'Utilisateur introuvable.',
  details: [],
};

const fieldError = (
  code: string,
  field: string,
  message: string,
  status = HttpStatus.BAD_REQUEST,
) =>
  new HttpException(
    { code, message, details: [{ field, messages: [message] }] },
    status,
  );

/**
 * Le compte, vu par la personne qui le possède (blueprint/14 §3 : « Mon
 * profil » est ouvert à tous les rôles). Tout part de l'identité du jeton
 * signé : aucun identifiant de compte n'est accepté du client, donc personne
 * ne peut toucher au profil d'un autre par cette porte.
 */
@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly lockout: LoginLockoutService,
    private readonly notifications: NotificationsService,
    private readonly avatars: AvatarStorageService,
    private readonly lockedNotifier: AccountLockedNotifier,
  ) {}

  /** Compte actif et non supprimé ; un jeton encore valide d'un compte désactivé n'ouvre plus rien. */
  private async requireActive(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || !user.isActive || user.deletedAt) {
      throw new NotFoundException(USER_NOT_FOUND);
    }
    return user;
  }

  async view(id: string): Promise<ProfileView> {
    return toProfileView(await this.requireActive(id));
  }

  async account(actor: AuthenticatedUser): Promise<AccountView> {
    const user = await this.requireActive(actor.id);
    const sessions = await this.prisma.session.findMany({
      where: {
        userId: user.id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    return {
      createdAt: user.createdAt,
      passwordChangedAt: user.passwordChangedAt,
      sessions: sessions
        .map((session) => ({
          id: session.id,
          device: describeUserAgent(session.userAgent),
          ipAddress: session.ipAddress,
          lastActiveAt: session.createdAt,
          expiresAt: session.expiresAt,
          current: session.id === actor.sessionId,
        }))
        // Cet appareil d'abord, puis du plus récent au plus ancien (déjà trié).
        .sort((a, b) => Number(b.current) - Number(a.current)),
    };
  }

  // --- Nom ---

  async updateName(
    actor: AuthenticatedUser,
    dto: UpdateProfileDto,
  ): Promise<ProfileView> {
    const current = await this.requireActive(actor.id);
    if (current.fullName === dto.fullName) return toProfileView(current);
    const updated = await this.prisma.user.update({
      where: { id: current.id },
      data: { fullName: dto.fullName },
    });
    await this.audit.record({
      actorId: current.id,
      action: 'USER_PROFILE_UPDATED',
      entityType: 'User',
      entityId: current.id,
      before: { fullName: current.fullName },
      after: { fullName: updated.fullName },
    });
    return toProfileView(updated);
  }

  // --- Mot de passe ---

  /**
   * Change le mot de passe après avoir redemandé l'actuel : une session
   * ouverte (appareil prêté, jeton volé) ne suffit pas à prendre le compte.
   *
   * - Les essais ratés comptent dans le **même** verrouillage que la
   *   connexion : cette porte ne laisse pas deviner le mot de passe plus
   *   vite que l'écran de connexion.
   * - Les autres sessions sont fermées (la nôtre continue) : si quelqu'un
   *   d'autre était connecté, il ne l'est plus.
   * - La personne est prévenue par e-mail, sans secret dedans.
   *
   * Le mot de passe, ancien ou nouveau, n'apparaît dans aucune trace.
   */
  async changePassword(actor: AuthenticatedUser, dto: ChangePasswordDto) {
    const user = await this.requireActive(actor.id);

    const lock = await this.lockout.status(user.email);
    if (lock.locked && lock.until) {
      const minutes = Math.max(
        1,
        Math.ceil((lock.until.getTime() - Date.now()) / 60_000),
      );
      throw new HttpException(
        {
          code: 'LOGIN_LOCKED',
          message: `Trop de tentatives avec un mot de passe incorrect. Réessayez dans ${minutes} minute${minutes > 1 ? 's' : ''}.`,
          details: [],
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!(await argon2.verify(user.passwordHash, dto.currentPassword))) {
      await this.traceWrongCurrentPassword(user);
      throw fieldError(
        'CURRENT_PASSWORD_INCORRECT',
        'currentPassword',
        'Mot de passe actuel incorrect.',
      );
    }
    if (dto.newPassword === dto.currentPassword) {
      throw fieldError(
        'PASSWORD_UNCHANGED',
        'newPassword',
        'Le nouveau mot de passe doit être différent de l’actuel.',
      );
    }
    if (dto.newPassword.trim().toLowerCase() === user.email) {
      throw fieldError(
        'BAD_REQUEST',
        'newPassword',
        'Le mot de passe ne peut pas être votre adresse e-mail.',
      );
    }

    const passwordHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
    });
    const changedAt = new Date();
    const revoked = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash, passwordChangedAt: changedAt },
      });
      const { count } = await tx.session.updateMany({
        where: {
          userId: user.id,
          revokedAt: null,
          ...(actor.sessionId && { id: { not: actor.sessionId } }),
        },
        data: { revokedAt: changedAt },
      });
      return count;
    });
    await this.forgetFailures(user.email);

    await this.audit.record({
      actorId: user.id,
      action: 'USER_PASSWORD_CHANGED',
      entityType: 'User',
      entityId: user.id,
      after: { sessionsClosed: revoked },
    });
    await this.warnByEmail(user, changedAt);

    return { passwordChangedAt: changedAt, sessionsClosed: revoked };
  }

  /** Échec : trace puis compteur du verrouillage (une trace de plus à la bascule). Au mieux. */
  private async traceWrongCurrentPassword(user: User) {
    try {
      await this.audit.record({
        actorId: user.id,
        action: 'AUTH_PASSWORD_CHANGE_FAILED',
        entityType: 'User',
        entityId: user.id,
        after: { reason: 'wrong_current_password' },
      });
      if (await this.lockout.recordFailure(user.email)) {
        const until = new Date(Date.now() + this.lockout.windowMs);
        await this.audit.record({
          actorId: null,
          action: 'AUTH_ACCOUNT_LOCKED',
          entityType: 'User',
          entityId: user.id,
          after: {
            email: user.email,
            failures: this.lockout.maxFailures,
            until: until.toISOString(),
          },
        });
        await this.lockedNotifier.notify(user.email, until);
      }
    } catch (error) {
      this.logger.error(
        `Échec de changement de mot de passe non tracé : ${String(error)}`,
      );
    }
  }

  private async forgetFailures(email: string) {
    try {
      await this.lockout.clear(email);
    } catch (error) {
      this.logger.error(`Échecs récents non effacés : ${String(error)}`);
    }
  }

  /** L'alerte n'annule jamais le changement, déjà fait et audité. */
  private async warnByEmail(user: User, changedAt: Date) {
    try {
      const mail = passwordChangedEmail({
        fullName: user.fullName,
        changedAt,
      });
      await this.notifications.enqueue({
        type: 'PASSWORD_CHANGED',
        to: user.email,
        subject: mail.subject,
        text: mail.text,
        idempotencyKey: `password-changed:${user.id}:${changedAt.getTime()}`,
      });
    } catch (error) {
      this.logger.error(
        `Alerte de changement de mot de passe non mise en file : ${String(error)}`,
      );
    }
  }

  // --- Photo de profil ---

  async setAvatar(
    actor: AuthenticatedUser,
    file: UploadedAvatar,
  ): Promise<ProfileView> {
    const current = await this.requireActive(actor.id);
    const storedName = await this.avatars.save(file);
    let updated: User;
    try {
      updated = await this.prisma.user.update({
        where: { id: current.id },
        data: { avatarName: storedName },
      });
      await this.audit.record({
        actorId: current.id,
        action: 'USER_AVATAR_CHANGED',
        entityType: 'User',
        entityId: current.id,
      });
    } catch (error) {
      await this.avatars.remove(storedName);
      throw error;
    }
    if (current.avatarName) await this.dropQuietly(current.avatarName);
    return toProfileView(updated);
  }

  async removeAvatar(actor: AuthenticatedUser): Promise<ProfileView> {
    const current = await this.requireActive(actor.id);
    if (!current.avatarName) return toProfileView(current);
    const updated = await this.prisma.user.update({
      where: { id: current.id },
      data: { avatarName: null },
    });
    await this.audit.record({
      actorId: current.id,
      action: 'USER_AVATAR_REMOVED',
      entityType: 'User',
      entityId: current.id,
    });
    await this.dropQuietly(current.avatarName);
    return toProfileView(updated);
  }

  /** Photo de la personne connectée, et d'elle seule. */
  async openAvatar(actor: AuthenticatedUser) {
    const user = await this.requireActive(actor.id);
    if (!user.avatarName) {
      throw new NotFoundException({
        code: 'AVATAR_NOT_FOUND',
        message: 'Aucune photo de profil.',
        details: [],
      });
    }
    return this.avatars.open(user.avatarName);
  }

  /** Un fichier orphelin n'est pas une erreur pour la personne : le compte est déjà à jour. */
  private async dropQuietly(storedName: string) {
    try {
      await this.avatars.remove(storedName);
    } catch (error) {
      this.logger.error(`Ancienne photo non supprimée : ${String(error)}`);
    }
  }

  // --- Sessions ---

  /** Ferme une autre session de la personne (pas la session courante : pour cela, se déconnecter). */
  async revokeSession(actor: AuthenticatedUser, sessionId: string) {
    if (sessionId === actor.sessionId) {
      throw new BadRequestException({
        code: 'CANNOT_REVOKE_CURRENT_SESSION',
        message:
          'C’est l’appareil que vous utilisez : pour le fermer, déconnectez-vous.',
        details: [],
      });
    }
    // `userId` dans le filtre : on ne ferme jamais la session d'un autre compte.
    const { count } = await this.prisma.session.updateMany({
      where: { id: sessionId, userId: actor.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count === 0) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: 'Session introuvable ou déjà fermée.',
        details: [],
      });
    }
    await this.audit.record({
      actorId: actor.id,
      action: 'USER_SESSIONS_CLOSED',
      entityType: 'User',
      entityId: actor.id,
      after: { count: 1, scope: 'one' },
    });
  }

  /** Ferme toutes les sessions de la personne sauf celle de la requête. */
  async revokeOtherSessions(actor: AuthenticatedUser) {
    if (!actor.sessionId) {
      // Jeton émis avant que la session n'y figure : impossible de savoir laquelle garder.
      throw new BadRequestException({
        code: 'SESSION_UNKNOWN',
        message:
          'Votre session n’a pas pu être identifiée. Reconnectez-vous, puis réessayez.',
        details: [],
      });
    }
    const { count } = await this.prisma.session.updateMany({
      where: {
        userId: actor.id,
        revokedAt: null,
        id: { not: actor.sessionId },
      },
      data: { revokedAt: new Date() },
    });
    if (count > 0) {
      await this.audit.record({
        actorId: actor.id,
        action: 'USER_SESSIONS_CLOSED',
        entityType: 'User',
        entityId: actor.id,
        after: { count, scope: 'others' },
      });
    }
    return { closed: count };
  }
}
