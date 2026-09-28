import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Vérifie le jeton d'accès (stratégie `jwt` — voir `auth/strategies/jwt.strategy.ts`).
 * Niveau middleware Next.js + guard NestJS requis en complément l'un de
 * l'autre (blueprint/10_Security.md §5) : ce guard est le niveau qui compte
 * réellement côté serveur.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
