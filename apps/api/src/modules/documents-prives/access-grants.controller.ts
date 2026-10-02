import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { AccessGrantsService } from './access-grants.service.js';
import {
  CreateDocumentGrantDto,
  CreateFolderGrantDto,
  ListGrantsDto,
} from './dto/access-grant.dto.js';

/** Gouvernance : seul l'Administrateur attribue ou révoque un droit (blueprint/09 §5). */
@ApiTags('admin/access-grants')
@ApiBearerAuth()
@Controller('admin/access-grants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMINISTRATEUR)
export class AccessGrantsController {
  constructor(private readonly grants: AccessGrantsService) {}

  @Get('folders')
  @ApiOperation({ summary: 'Droits par dossier' })
  listFolderGrants(@Query() query: ListGrantsDto) {
    return this.grants.listFolderGrants(query);
  }

  @Post('folders')
  @ApiOperation({
    summary: 'Donner un droit sur un dossier (et ses sous-dossiers)',
  })
  createFolderGrant(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateFolderGrantDto,
  ) {
    return this.grants.createFolderGrant(actor, dto.folderId, dto.userId);
  }

  @Delete('folders/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeFolderGrant(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.grants.revokeFolderGrant(actor, id);
  }

  @Get('documents')
  @ApiOperation({ summary: 'Droits par document isolé' })
  listDocumentGrants(@Query() query: ListGrantsDto) {
    return this.grants.listDocumentGrants(query);
  }

  @Post('documents')
  @ApiOperation({ summary: 'Donner un droit sur un document isolé' })
  createDocumentGrant(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateDocumentGrantDto,
  ) {
    return this.grants.createDocumentGrant(actor, dto.documentId, dto.userId);
  }

  @Delete('documents/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeDocumentGrant(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.grants.revokeDocumentGrant(actor, id);
  }
}
