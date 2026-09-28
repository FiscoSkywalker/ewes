import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AccessTokenPayload } from '../types/token-payload.type.js';
import type { AuthenticatedUser } from '../types/authenticated-user.type.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  /**
   * Volontairement pas de lecture DB ici pour rester sur un jeton d'accès
   * stateless (courte durée de vie — blueprint/10_Security.md §1). La
   * révocation immédiate (changement de rôle, désactivation) passe par le
   * jeton de rafraîchissement (`AuthService.refresh`), pas par l'accès.
   */
  validate(payload: AccessTokenPayload): AuthenticatedUser {
    if (!payload?.sub || !payload.role) {
      throw new UnauthorizedException({
        code: 'TOKEN_INVALID',
        message: 'Jeton invalide.',
        details: [],
      });
    }

    return {
      id: payload.sub,
      role: payload.role,
      // email/fullName ne sont pas portés par le jeton d'accès (minimisation) ;
      // `GET /me` reste la source de vérité pour l'affichage du profil.
      email: '',
      fullName: '',
    };
  }
}
