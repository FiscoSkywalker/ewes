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
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { RealisationsService } from './realisations.service.js';
import { CreateRealisationDto } from './dto/create-realisation.dto.js';
import { UpdateRealisationDto } from './dto/update-realisation.dto.js';
import { SetRealisationImagesDto } from './dto/set-realisation-images.dto.js';
import { ListAdminRealisationsDto } from './dto/list-realisations.dto.js';

@ApiTags('admin/realisations')
@ApiBearerAuth()
@Controller('admin/realisations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMINISTRATEUR, Role.GESTIONNAIRE)
export class AdminRealisationsController {
  constructor(private readonly realisationsService: RealisationsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les réalisations (tous statuts)' })
  list(@Query() query: ListAdminRealisationsDto) {
    return this.realisationsService.listAdmin(query);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.realisationsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer une réalisation (toujours en brouillon)' })
  create(@Body() dto: CreateRealisationDto) {
    return this.realisationsService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRealisationDto,
  ) {
    return this.realisationsService.update(id, dto);
  }

  @Put(':id/images')
  @ApiOperation({
    summary:
      'Définir la galerie (images de la médiathèque, dans l’ordre d’affichage)',
  })
  setImages(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetRealisationImagesDto,
  ) {
    return this.realisationsService.setImages(id, dto);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publier explicitement une réalisation' })
  publish(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.realisationsService.publish(actor, id);
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dépublier (retour en brouillon)' })
  unpublish(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.realisationsService.unpublish(actor, id);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archiver (dépublié, conservé pour l’historique)' })
  archive(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.realisationsService.archive(actor, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer (suppression logique)' })
  async remove(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.realisationsService.remove(actor, id);
  }
}
