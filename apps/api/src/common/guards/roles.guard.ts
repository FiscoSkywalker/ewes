import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../../modules/auth/types/authenticated-user.type.js';

/**
 * S'utilise après `JwtAuthGuard` (qui peuple `request.user`). Sans métadonnée
 * `@Roles(...)` sur le handler/contrôleur, l'accès est autorisé à tout
 * utilisateur authentifié — la restriction de rôle est un opt-in explicite.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context
      .switchToHttp()
      .getRequest<{ user: AuthenticatedUser }>();

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_ROLE',
        message: "Vous n'avez pas les droits requis pour cette action.",
        details: [],
      });
    }

    return true;
  }
}
