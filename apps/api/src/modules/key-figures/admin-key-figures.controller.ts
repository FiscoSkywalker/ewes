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
import { KeyFiguresService } from './key-figures.service.js';
import { CreateKeyFigureDto } from './dto/create-key-figure.dto.js';
import { UpdateKeyFigureDto } from './dto/update-key-figure.dto.js';
import { toAdminView } from './key-figure-views.js';

@ApiTags('admin/key-figures')
@ApiBearerAuth()
@Controller('admin/key-figures')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMINISTRATEUR, Role.GESTIONNAIRE)
export class AdminKeyFiguresController {
  constructor(private readonly keyFiguresService: KeyFiguresService) {}

  @Get()
  @ApiOperation({ summary: 'Tous les chiffres clés, visibles ou masqués' })
  async list() {
    return (await this.keyFiguresService.list()).map(toAdminView);
  }

  @Get('counts')
  @ApiOperation({
    summary:
      'Nombres actuels de missions et de formations publiées (valeurs des chiffres calculés en direct)',
  })
  counts() {
    return this.keyFiguresService.liveCounts();
  }

  @Post()
  @ApiOperation({ summary: 'Ajouter un chiffre clé (en dernière position)' })
  async create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateKeyFigureDto,
  ) {
    return toAdminView(await this.keyFiguresService.create(actor, dto));
  }

  @Put('order')
  @ApiOperation({
    summary: 'Ordre d’affichage (liste complète, appliquée d’un bloc)',
  })
  async reorder(@Body() dto: ReorderDto) {
    return (await this.keyFiguresService.reorder(dto.ids)).map(toAdminView);
  }

  @Patch(':id')
  async update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateKeyFigureDto,
  ) {
    return toAdminView(await this.keyFiguresService.update(actor, id, dto));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.keyFiguresService.remove(actor, id);
  }
}
