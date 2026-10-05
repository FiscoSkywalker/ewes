import { Role } from '@prisma/client';

/** Forme de `request.user` une fois `JwtAuthGuard` passé — jamais le hash de mot de passe. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  /** Session du jeton d'accès (absente des jetons émis avant son ajout). */
  sessionId?: string;
}
