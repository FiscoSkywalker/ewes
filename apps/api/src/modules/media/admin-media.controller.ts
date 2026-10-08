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
  Query,
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
import { Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { singleFileUploadOptions } from '../../common/http/upload-options.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { MAX_IMAGE_BYTES } from './image-signature.js';
import { DeleteManyMediaDto } from './dto/delete-many-media.dto.js';
import { ListMediaDto } from './dto/list-media.dto.js';
import { UpdateMediaDto } from './dto/update-media.dto.js';
import { MediaService, type UploadedImage } from './media.service.js';

@ApiTags('admin/media')
@ApiBearerAuth()
@Controller('admin/media')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMINISTRATEUR, Role.GESTIONNAIRE)
export class AdminMediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post()
  @ApiOperation({
    summary: 'Téléverser une image (JPEG, PNG ou WebP, 5 Mo max)',
  })
  @ApiConsumes('multipart/form-data')
  // blueprint/10_Security.md §3 : taille/type limités, fréquence limitée.
  // 40/min : l'écran envoie plusieurs images d'un coup (une requête par image).
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('file', singleFileUploadOptions(MAX_IMAGE_BYTES)),
  )
  upload(
    @UploadedFile() file: UploadedImage | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException({
        code: 'MEDIA_FILE_REQUIRED',
        message: 'Aucun fichier reçu (champ « file »).',
        details: ['file'],
      });
    }
    return this.mediaService.upload(file, user.id);
  }

  @Get()
  @ApiOperation({
    summary:
      'Médiathèque : recherche, tri, filtre d’usage ; chaque image indique les contenus où elle apparaît',
  })
  list(@Query() query: ListMediaDto) {
    return this.mediaService.list(query);
  }

  // Déclaré avant `:id` : « delete » ne doit pas être pris pour un identifiant.
  @Post('delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Supprimer plusieurs médias non utilisés ; les médias utilisés sont refusés un par un',
  })
  removeMany(
    @Body() dto: DeleteManyMediaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mediaService.removeMany(dto.ids, user);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Texte alternatif par défaut d’une image (FR/EN) : pré-remplit celui des contenus qui la choisissent',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMediaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mediaService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un média non utilisé' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.mediaService.remove(id, user);
  }
}
