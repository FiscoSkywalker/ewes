import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AccountLockedNotifier } from '../users/account-locked-notifier.service.js';
import { InvitationsService } from '../users/invitations.service.js';
import { LoginLockoutService } from '../users/login-lockout.service.js';
import { UsersService } from '../users/users.service.js';
import { parseDurationToSeconds } from '../../common/utils/duration.js';
import type {
  AccessTokenPayload,
  RefreshTokenPayload,
} from './types/token-payload.type.js';

interface RequestContext {
  userAgent?: string;
  ipAddress?: string;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
}

const INVALID_CREDENTIALS = {
  code: 'INVALID_CREDENTIALS',
  // blueprint/10_Security.md §1 : ne jamais révéler si le compte existe.
  message: 'E-mail ou mot de passe incorrect.',
  details: [],
};

const TOKEN_INVALID = {
  code: 'TOKEN_INVALID',
  message: 'Jeton de rafraîchissement invalide ou expiré.',
  details: [],
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly invitations: InvitationsService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly lockout: LoginLockoutService,
    private readonly lockedNotifier: AccountLockedNotifier,
  ) {}

  async login(email: string, password: string, ctx: RequestContext) {
    // Verrouillage d'abord : tant qu'il dure, même le bon mot de passe est refusé
    // (sinon on pourrait continuer à deviner). Même réponse pour une adresse
    // inconnue : le verrouillage ne révèle pas l'existence d'un compte.
    const lock = await this.lockout.status(email);
    if (lock.locked && lock.until) {
      const minutes = Math.max(
        1,
        Math.ceil((lock.until.getTime() - Date.now()) / 60_000),
      );
      throw new HttpException(
        {
          code: 'LOGIN_LOCKED',
          message: `Trop de tentatives de connexion échouées pour cette adresse. Réessayez dans ${minutes} minute${minutes > 1 ? 's' : ''}.`,
          details: [],
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.usersService.findByEmail(email);

    if (!user || !user.isActive || user.deletedAt) {
      // Coût constant approximatif : on vérifie quand même un hash factice
      // pour ne pas laisser fuiter l'existence du compte par timing.
      await argon2
        .verify(
          '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$UwaAxfLzJ0MPYVR1cKvqjA',
          password,
        )
        .catch(() => false);
      await this.traceLoginFailure(
        email,
        user?.id ?? null,
        user ? 'inactive_account' : 'unknown_account',
      );
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const passwordValid = await argon2.verify(user.passwordHash, password);
    if (!passwordValid) {
      await this.traceLoginFailure(email, user.id, 'wrong_password');
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const tokens = await this.issueTokens(user.id, user.role, ctx);
    await this.traceLoginSuccess(user.id, 'password');
    await this.forgetFailures(email);
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  /** Aperçu d'une invitation pour la page d'activation (jeton lu dans le lien de l'e-mail). */
  inspectInvitation(token: string) {
    return this.invitations.inspect(token);
  }

  /**
   * Active le compte invité avec le mot de passe choisi, puis ouvre sa
   * session : celui qui détient le lien secret vient de prouver sa
   * possession de la boîte e-mail, comme pour une connexion.
   */
  async acceptInvitation(token: string, password: string, ctx: RequestContext) {
    const { user } = await this.invitations.accept(token, password);
    const tokens = await this.issueTokens(user.id, user.role, ctx);
    await this.traceLoginSuccess(user.id, 'invitation');
    await this.forgetFailures(user.email);
    return { ...tokens, user };
  }

  async refresh(
    refreshToken: string,
    ctx: RequestContext,
  ): Promise<IssuedTokens> {
    const payload = this.verifyRefreshToken(refreshToken);

    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() < Date.now() ||
      session.refreshTokenHash !== this.hashToken(refreshToken)
    ) {
      if (session && !session.revokedAt) {
        // Rejeu d'un jeton déjà roté : signal de vol probable, on révoque par prudence.
        await this.prisma.session.update({
          where: { id: session.id },
          data: { revokedAt: new Date() },
        });
        if (session.refreshTokenHash !== this.hashToken(refreshToken)) {
          await this.traceTokenReuse(session.userId, session.id);
        }
      }
      throw new UnauthorizedException(TOKEN_INVALID);
    }

    const user = await this.usersService.findById(session.userId);
    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException(TOKEN_INVALID);
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(user.id, user.role, ctx);
  }

  async logout(refreshToken: string): Promise<void> {
    let payload: RefreshTokenPayload;
    try {
      payload = this.verifyRefreshToken(refreshToken);
    } catch {
      // Déconnexion idempotente : un jeton déjà invalide n'est pas une erreur.
      return;
    }

    await this.prisma.session.updateMany({
      where: { id: payload.sid, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Connexions et échecs sont tracés (blueprint/10_Security.md §6). Jamais le
   * mot de passe ni un jeton. L'adresse IP et le navigateur viennent du
   * contexte de la requête (`AuditService`).
   *
   * Une connexion réussie est tracée **obligatoirement** : sans trace, pas de
   * session. Un échec ne l'est qu'au mieux : une panne du journal ne doit pas
   * transformer un refus (401) en erreur serveur, ni distinguer les cas par
   * leur réponse.
   */
  private async traceLoginSuccess(
    userId: string,
    method: 'password' | 'invitation',
  ) {
    await this.audit.record({
      actorId: userId,
      action: 'AUTH_LOGIN_SUCCEEDED',
      entityType: 'User',
      entityId: userId,
      after: { method },
    });
  }

  /** Échec : trace, puis compteur de verrouillage (une trace de plus à la bascule). Au mieux, comme la trace. */
  private async traceLoginFailure(
    attempted: string,
    userId: string | null,
    reason: 'unknown_account' | 'inactive_account' | 'wrong_password',
  ) {
    await this.traceFailureEntry(attempted, userId, reason);
    try {
      if (await this.lockout.recordFailure(attempted)) {
        const until = new Date(Date.now() + this.lockout.windowMs);
        await this.audit.record({
          actorId: null,
          action: 'AUTH_ACCOUNT_LOCKED',
          entityType: 'User',
          entityId: userId ?? undefined,
          after: {
            email: attempted.trim().toLowerCase().slice(0, 254),
            failures: this.lockout.maxFailures,
            until: until.toISOString(),
          },
        });
        await this.lockedNotifier.notify(attempted, until);
      }
    } catch (error) {
      this.logger.error(`Compteur de verrouillage non tenu : ${String(error)}`);
    }
  }

  /** Connexion réussie : l'adresse repart de zéro. Sans effet sur la réponse si la purge échoue. */
  private async forgetFailures(email: string) {
    try {
      await this.lockout.clear(email);
    } catch (error) {
      this.logger.error(`Échecs récents non effacés : ${String(error)}`);
    }
  }

  private async traceFailureEntry(
    attempted: string,
    userId: string | null,
    reason: 'unknown_account' | 'inactive_account' | 'wrong_password',
  ) {
    try {
      await this.audit.record({
        // Personne n'est authentifié : l'auteur est inconnu, le compte visé est l'élément.
        actorId: null,
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'User',
        entityId: userId ?? undefined,
        after: { email: attempted.trim().toLowerCase().slice(0, 254), reason },
      });
    } catch (error) {
      this.logger.error(`Échec de connexion non tracé : ${String(error)}`);
    }
  }

  private async traceTokenReuse(userId: string, sessionId: string) {
    try {
      await this.audit.record({
        actorId: null,
        action: 'AUTH_TOKEN_REUSE_DETECTED',
        entityType: 'User',
        entityId: userId,
        after: { sessionId },
      });
    } catch (error) {
      this.logger.error(`Réutilisation de jeton non tracée : ${String(error)}`);
    }
  }

  private async issueTokens(
    userId: string,
    role: Role,
    ctx: RequestContext,
  ): Promise<IssuedTokens> {
    const sessionId = randomUUID();
    const accessExpiresInSeconds = parseDurationToSeconds(
      this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    );
    const refreshExpiresInSeconds = parseDurationToSeconds(
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    );

    const accessPayload: AccessTokenPayload = {
      sub: userId,
      role,
      sid: sessionId,
    };
    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: accessExpiresInSeconds,
    });

    const refreshPayload: RefreshTokenPayload = { sub: userId, sid: sessionId };
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: refreshExpiresInSeconds,
    });

    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId,
        refreshTokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + refreshExpiresInSeconds * 1000),
        userAgent: ctx.userAgent,
        ipAddress: ctx.ipAddress,
      },
    });

    return { accessToken, refreshToken };
  }

  private verifyRefreshToken(refreshToken: string): RefreshTokenPayload {
    try {
      return this.jwtService.verify<RefreshTokenPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException(TOKEN_INVALID);
    }
  }

  /**
   * Hash non cryptographique-lent (SHA-256) volontaire : le jeton opaque est
   * déjà à haute entropie (signé, aléatoire) — contrairement à un mot de
   * passe, il n'a pas besoin d'Argon2id pour résister au brute-force.
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
