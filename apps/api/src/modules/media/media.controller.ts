import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
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
  async serve(
    @Param('storedName') storedName: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const media = await this.mediaService.findByStoredName(storedName);
    const path = this.mediaService.pathOf(media.storedName);
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
      type: media.mimeType,
      disposition: 'inline',
    });
  }
}
