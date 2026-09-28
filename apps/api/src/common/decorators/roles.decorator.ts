import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Marque un handler/contrôleur comme réservé à un sous-ensemble de rôles.
 * S'utilise avec `JwtAuthGuard` + `RolesGuard` (blueprint/10_Security.md §2) —
 * ne remplace jamais une vérification côté serveur, seulement la complète.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
