import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { MediaService } from './media.service.js';

/** Service public des images téléversées (le site les réécrit en `/uploads/...`). */
@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get(':storedName')
  @ApiOperation({ summary: 'Image téléversée, par nom de fichier' })
  @ApiQuery({
    name: 'size',
    required: false,
    enum: ['thumb'],
    description:
      'thumb : vignette WebP (640 px au plus), fabriquée au besoin. Toute autre valeur : l’original.',
  })
  async serve(
    @Param('storedName') storedName: string,
    @Query('size') size: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const media = await this.mediaService.findByStoredName(storedName);
    const thumb = size === 'thumb';
    const path = thumb
      ? await this.mediaService.thumbnail(media.storedName)
      : this.mediaService.pathOf(media.storedName);
    try {
      await stat(path);
    } catch {
      throw new NotFoundException({
        code: 'MEDIA_NOT_FOUND',
        message: 'Média introuvable.',
        details: [],
      });
    }
    // Nom aléatoire et contenu jamais modifié : cache long sans risque.
    res.set({
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(createReadStream(path), {
      type: thumb ? 'image/webp' : media.mimeType,
      disposition: 'inline',
    });
  }
}
