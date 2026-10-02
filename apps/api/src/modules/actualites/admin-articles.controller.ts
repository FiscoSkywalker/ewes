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
import { ActualitesService } from './actualites.service.js';
import { CreateArticleDto } from './dto/create-article.dto.js';
import { UpdateArticleDto } from './dto/update-article.dto.js';
import { PublishArticleDto } from './dto/publish-article.dto.js';
import { SetCoverDto } from './dto/set-cover.dto.js';
import { ListAdminArticlesDto } from './dto/list-articles.dto.js';

@ApiTags('admin/articles')
@ApiBearerAuth()
@Controller('admin/articles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMINISTRATEUR, Role.GESTIONNAIRE)
export class AdminArticlesController {
  constructor(private readonly actualitesService: ActualitesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les articles (tous statuts)' })
  list(@Query() query: ListAdminArticlesDto) {
    return this.actualitesService.listAdmin(query);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.actualitesService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un article (toujours en brouillon)' })
  create(@Body() dto: CreateArticleDto) {
    return this.actualitesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateArticleDto) {
    return this.actualitesService.update(id, dto);
  }

  @Put(':id/cover')
  @ApiOperation({ summary: 'Définir le visuel de couverture (média téléversé)' })
  setCover(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetCoverDto) {
    return this.actualitesService.setCover(id, dto);
  }

  @Delete(':id/cover')
  @ApiOperation({ summary: 'Retirer le visuel de couverture' })
  removeCover(@Param('id', ParseUUIDPipe) id: string) {
    return this.actualitesService.removeCover(id);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publier explicitement (date facultative, y compris future)' })
  publish(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishArticleDto,
  ) {
    return this.actualitesService.publish(actor, id, dto.publishedAt);
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dépublier (retour en brouillon)' })
  unpublish(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.actualitesService.unpublish(actor, id);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archiver (dépublié, conservé pour l’historique)' })
  archive(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.actualitesService.archive(actor, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer (suppression logique)' })
  async remove(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.actualitesService.remove(actor, id);
  }
}
