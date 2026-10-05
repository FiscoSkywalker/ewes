import {
  BadRequestException,
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
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { MAX_IMAGE_BYTES } from '../media/image-signature.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import type { UploadedAvatar } from './avatar-storage.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ProfileService } from './profile.service.js';

/**
 * « Mon profil » : ouvert à tout compte connecté, quel que soit son rôle
 * (blueprint/14 §3). Aucune de ces routes n'accepte d'identifiant de compte :
 * elles agissent toujours sur la personne du jeton.
 */
@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(private readonly profile: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Identité de la personne connectée' })
  getProfile(@CurrentUser() actor: AuthenticatedUser) {
    return this.profile.view(actor.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Modifier son nom (audité)' })
  updateProfile(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profile.updateName(actor, dto);
  }

  @Get('account')
  @ApiOperation({
    summary:
      'Sécurité du compte : ancienneté, dernier changement de mot de passe, sessions ouvertes',
  })
  account(@CurrentUser() actor: AuthenticatedUser) {
    return this.profile.account(actor);
  }

  @Post('password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Changer son mot de passe (l’actuel est redemandé ; les autres sessions sont fermées)',
  })
  // blueprint/10_Security.md §3 : comme la connexion, c'est une porte vers le mot de passe.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  changePassword(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.profile.changePassword(actor, dto);
  }

  @Get('avatar')
  @ApiOperation({ summary: 'Sa photo de profil (jamais celle d’un autre)' })
  async avatar(
    @CurrentUser() actor: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { stream, size } = await this.profile.openAvatar(actor);
    // Privée : ni cache partagé ni index. Le client redemande l'image quand `avatarVersion` change.
    res.set({
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'Content-Length': String(size),
    });
    return new StreamableFile(stream, {
      type: 'image/webp',
      disposition: 'inline',
    });
  }

  @Put('avatar')
  @ApiOperation({
    summary:
      'Définir sa photo de profil (JPEG, PNG ou WebP, 5 Mo max ; recadrée au carré)',
  })
  @ApiConsumes('multipart/form-data')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
    }),
  )
  setAvatar(
    @CurrentUser() actor: AuthenticatedUser,
    @UploadedFile() file: UploadedAvatar | undefined,
  ) {
    if (!file) {
      throw new BadRequestException({
        code: 'MEDIA_FILE_REQUIRED',
        message: 'Aucun fichier reçu (champ « file »).',
        details: ['file'],
      });
    }
    return this.profile.setAvatar(actor, file);
  }

  @Delete('avatar')
  @ApiOperation({ summary: 'Retirer sa photo de profil' })
  removeAvatar(@CurrentUser() actor: AuthenticatedUser) {
    return this.profile.removeAvatar(actor);
  }

  // Déclarée avant `:id` : « revoke-others » ne doit pas être pris pour un identifiant.
  @Post('sessions/revoke-others')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fermer toutes ses autres sessions' })
  revokeOtherSessions(@CurrentUser() actor: AuthenticatedUser) {
    return this.profile.revokeOtherSessions(actor);
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Fermer l’une de ses autres sessions' })
  async revokeSession(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.profile.revokeSession(actor, id);
  }
}
