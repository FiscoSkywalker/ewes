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
import { CreateFolderDto, UpdateFolderDto } from './dto/folder.dto.js';
import { PrivateFoldersService } from './private-folders.service.js';

/**
 * Tout utilisateur authentifié peut appeler ces routes ; le droit réel
 * (périmètre nominatif, rôle) est vérifié côté serveur dans le service.
 */
@ApiTags('documents-prives/folders')
@ApiBearerAuth()
@Controller('documents-prives/folders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PrivateFoldersController {
  constructor(private readonly folders: PrivateFoldersService) {}

  @Get()
  @ApiOperation({
    summary: 'Arborescence : uniquement les dossiers auxquels vous avez droit',
  })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.folders.list(user);
  }

  @Get(':id')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.folders.get(user, id);
  }

  @Post()
  @ApiOperation({
    summary:
      'Créer un dossier (premier niveau : Administrateur ; sous-dossier : droit d’écriture)',
  })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateFolderDto) {
    return this.folders.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFolderDto,
  ) {
    return this.folders.update(user, id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMINISTRATEUR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un dossier vide (Administrateur)' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.folders.remove(user, id);
  }
}
