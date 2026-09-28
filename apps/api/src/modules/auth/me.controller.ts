import { Controller, Get, NotFoundException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from './types/authenticated-user.type.js';
import { UsersService } from '../users/users.service.js';

@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getProfile(@CurrentUser() authUser: AuthenticatedUser) {
    const user = await this.usersService.findById(authUser.id);
    if (!user || !user.isActive || user.deletedAt) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur introuvable.',
        details: [],
      });
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }
}
