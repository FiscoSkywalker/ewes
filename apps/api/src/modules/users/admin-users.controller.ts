import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { ChangeRoleDto } from './dto/change-role.dto.js';
import { InviteUserDto } from './dto/invite-user.dto.js';
import { InvitationsService } from './invitations.service.js';
import { UsersService } from './users.service.js';

/**
 * Gestion des comptes : réservée à l'Administrateur (blueprint/14 §3). Le
 * rôle est lu dans le jeton signé, jamais dans le corps de la requête.
 */
@ApiTags('admin/users')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMINISTRATEUR)
export class AdminUsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly invitations: InvitationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Tous les comptes (actifs et désactivés)' })
  list() {
    return this.usersService.list();
  }

  // Les routes statiques `invitations` précèdent `:id` pour ne pas être prises pour un identifiant.

  @Get('invitations')
  @ApiOperation({ summary: 'Invitations en attente (dont expirées)' })
  listInvitations() {
    return this.invitations.list();
  }

  @Post('invitations')
  @ApiOperation({
    summary:
      'Inviter par e-mail : le compte n’existe qu’une fois l’invitation acceptée',
  })
  invite(@CurrentUser() actor: AuthenticatedUser, @Body() dto: InviteUserDto) {
    return this.invitations.invite(actor, dto);
  }

  @Post('invitations/:id/resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Renvoyer une invitation (le lien précédent est invalidé)',
  })
  resend(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invitations.resend(actor, id);
  }

  @Delete('invitations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Retirer une invitation (audité)' })
  async revokeInvitation(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.invitations.revoke(actor, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fiche d’un compte' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.detail(id);
  }

  @Patch(':id/role')
  @ApiOperation({
    summary: 'Changer le rôle d’un compte (audité, avant/après)',
  })
  changeRole(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeRoleDto,
  ) {
    return this.usersService.changeRole(actor, id, dto.role);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Désactiver un compte : sessions fermées, connexion refusée',
  })
  deactivate(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.setActive(actor, id, false);
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Réactiver un compte désactivé' })
  reactivate(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.setActive(actor, id, true);
  }
}
