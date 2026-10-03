import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import { InvitationsService } from '../users/invitations.service.js';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly invitations: InvitationsService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string, ctx: RequestContext) {
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
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const passwordValid = await argon2.verify(user.passwordHash, password);
    if (!passwordValid) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const tokens = await this.issueTokens(user.id, user.role, ctx);
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

    const accessPayload: AccessTokenPayload = { sub: userId, role };
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
