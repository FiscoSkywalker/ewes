import { Role } from '@prisma/client';

/** Payload signé du jeton d'accès (courte durée — blueprint/10_Security.md §1). */
export interface AccessTokenPayload {
  sub: string;
  role: Role;
  /**
   * Session (ligne `Session`) à laquelle ce jeton appartient : sert à dire
   * « cet appareil » dans le profil et à ne pas se déconnecter soi-même en
   * fermant les autres sessions. Absent des jetons émis avant son ajout.
   */
  sid?: string;
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
