import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { UpdateGeneralSettingsDto } from './dto/update-general-settings.dto.js';
import { UpdateLegalSettingsDto } from './dto/update-legal-settings.dto.js';
import { UpdateMailSettingsDto } from './dto/update-mail-settings.dto.js';
import { SiteSettingsService } from './site-settings.service.js';
import { toGeneralView, toLegalView } from './site-settings-views.js';

/** Paramètres de la plateforme : Administrateur uniquement (blueprint/14 §2). */
@ApiTags('admin/settings')
@ApiBearerAuth()
@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMINISTRATEUR)
export class AdminSiteSettingsController {
  constructor(private readonly settings: SiteSettingsService) {}

  @Get('general')
  @ApiOperation({
    summary: 'Coordonnées publiques, horaires et réseaux sociaux',
  })
  async general() {
    return toGeneralView(await this.settings.current());
  }

  @Patch('general')
  @ApiOperation({
    summary:
      'Modifier les coordonnées, horaires et réseaux sociaux (visible aussitôt sur le site)',
  })
  async updateGeneral(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: UpdateGeneralSettingsDto,
  ) {
    return toGeneralView(await this.settings.updateGeneral(actor, dto));
  }

  @Get('legal')
  @ApiOperation({
    summary:
      'Mentions légales et informations de protection des données (pages légales du site)',
  })
  async legal() {
    return toLegalView(await this.settings.current());
  }

  @Patch('legal')
  @ApiOperation({
    summary:
      'Modifier les mentions légales (visibles aussitôt sur les pages légales du site)',
  })
  async updateLegal(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: UpdateLegalSettingsDto,
  ) {
    return toLegalView(await this.settings.updateLegal(actor, dto));
  }

  @Get('mail')
  @ApiOperation({
    summary:
      'Messagerie : destinataire, accusé de réception, état de l’envoi et synthèse des e-mails',
  })
  mail() {
    return this.settings.mailOverview();
  }

  @Patch('mail')
  @ApiOperation({
    summary:
      'Modifier le destinataire des messages de contact et l’accusé de réception',
  })
  async updateMail(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: UpdateMailSettingsDto,
  ) {
    await this.settings.updateMail(actor, dto);
    return this.settings.mailOverview();
  }

  @Post('mail/test')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Envoyer un e-mail de test à l’administrateur connecté et renvoyer le résultat réel',
  })
  test(@CurrentUser() actor: AuthenticatedUser) {
    return this.settings.sendTest(actor);
  }
}
