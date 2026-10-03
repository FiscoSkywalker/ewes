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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { ReorderDto } from '../services/dto/reorder.dto.js';
import { ExpertsService } from './experts.service.js';
import { CreateExpertDto } from './dto/create-expert.dto.js';
import { UpdateExpertDto } from './dto/update-expert.dto.js';
import { toAdminView } from './expert-views.js';

@ApiTags('admin/experts')
@ApiBearerAuth()
@Controller('admin/experts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMINISTRATEUR, Role.GESTIONNAIRE)
export class AdminExpertsController {
  constructor(private readonly expertsService: ExpertsService) {}

  @Get()
  @ApiOperation({ summary: 'Tous les experts (tous statuts), dans l’ordre' })
  async list() {
    return (await this.expertsService.list()).map(toAdminView);
  }

  @Post()
  @ApiOperation({
    summary: 'Créer un expert (toujours en brouillon, en dernière position)',
  })
  async create(@Body() dto: CreateExpertDto) {
    return toAdminView(await this.expertsService.create(dto));
  }

  @Put('order')
  @ApiOperation({
    summary: 'Ordre d’affichage (liste complète, appliquée d’un bloc)',
  })
  async reorder(@Body() dto: ReorderDto) {
    return (await this.expertsService.reorder(dto.ids)).map(toAdminView);
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return toAdminView(await this.expertsService.findById(id));
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExpertDto,
  ) {
    return toAdminView(await this.expertsService.update(id, dto));
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publier explicitement un profil' })
  async publish(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return toAdminView(await this.expertsService.publish(actor, id));
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dépublier un profil (retour en brouillon)' })
  async unpublish(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return toAdminView(await this.expertsService.unpublish(actor, id));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer définitivement un profil (audité)' })
  async remove(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.expertsService.remove(actor, id);
  }
}
