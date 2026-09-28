import { Role } from '@prisma/client';

/** Payload signé du jeton d'accès (courte durée — blueprint/10_Security.md §1). */
export interface AccessTokenPayload {
  sub: string;
  role: Role;
}

/**
 * Payload signé du jeton de rafraîchissement. `sid` référence la ligne
 * `Session` dont le hash du jeton est vérifié à chaque rafraîchissement
 * (révocation possible côté serveur, contrairement à un JWT auto-suffisant).
 */
export interface RefreshTokenPayload {
  sub: string;
  sid: string;
}
