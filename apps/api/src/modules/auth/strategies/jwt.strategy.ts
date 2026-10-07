import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { AccessTokenPayload } from '../types/token-payload.type.js';
import type { AuthenticatedUser } from '../types/authenticated-user.type.js';

const TOKEN_INVALID = {
  code: 'TOKEN_INVALID',
  message: 'Jeton invalide.',
  details: [],
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  /**
   * La signature et l'expiration prouvent qui est la personne ; **l'état du
   * compte, lui, est relu en base à chaque requête** (une lecture par clé
   * primaire) : un compte désactivé ou supprimé est refusé aussitôt, et le
   * **rôle** appliqué est celui d'aujourd'hui, pas celui inscrit dans le jeton
   * au moment de la connexion. Sans cela, une désactivation ou une
   * rétrogradation ne prendrait effet qu'à l'expiration du jeton (15 min).
   *
   * Le refus est le même 401 qu'un jeton invalide : l'appelant tente un
   * renouvellement, que le serveur refuse aussi (sessions révoquées).
   */
  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    if (!payload?.sub || !payload.role)
      throw new UnauthorizedException(TOKEN_INVALID);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { role: true, isActive: true, deletedAt: true },
    });
    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException(TOKEN_INVALID);
    }

    return {
      id: payload.sub,
      role: user.role,
      sessionId: typeof payload.sid === 'string' ? payload.sid : undefined,
      // email/fullName ne sont pas portés par le jeton d'accès (minimisation) ;
      // `GET /me` reste la source de vérité pour l'affichage du profil.
      email: '',
      fullName: '',
    };
  }
}
