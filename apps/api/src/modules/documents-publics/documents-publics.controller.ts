import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { createReadStream } from 'node:fs';
import {
  DocumentsPublicsService,
  type PublicDocumentWithService,
} from './documents-publics.service.js';
import { ListPublicDocumentsDto } from './dto/list-public-documents.dto.js';

/** Représentation publique : ni `id`, ni `status`, ni nom de stockage. */
function toPublic(document: PublicDocumentWithService) {
  return {
    slug: document.slug,
    titleFr: document.titleFr,
    titleEn: document.titleEn,
    excerptFr: document.excerptFr,
    excerptEn: document.excerptEn,
    category: document.category,
    year: document.year,
    pages: document.pages,
    serviceSlug: document.service?.slug ?? null,
    publishedAt: document.publishedAt,
    file: {
      url: document.fileUrl,
      mimeType: document.fileType,
      sizeBytes: document.fileSizeBytes,
    },
  };
}

@ApiTags('documents-publics')
@Controller('documents-publics')
export class DocumentsPublicsController {
  constructor(private readonly documentsService: DocumentsPublicsService) {}

  @Get()
  @ApiOperation({ summary: 'Documents publics publiés (filtres, pagination)' })
  async list(@Query() query: ListPublicDocumentsDto) {
    const { data, meta } = await this.documentsService.listPublished(query);
    return { data: data.map(toPublic), meta };
  }

  @Get('files/:storedName')
  @ApiOperation({ summary: 'Télécharger le PDF d’un document publié' })
  async download(
    @Param('storedName') storedName: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const document =
      await this.documentsService.findPublishedByStoredName(storedName);
    const path = this.documentsService.pathOf(document.storedName);
    // Cache court : une dépublication doit rester effective rapidement.
    res.set({
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(createReadStream(path), {
      type: document.fileType,
      // Le slug respecte un motif strict : sans danger dans l'en-tête.
      disposition: `attachment; filename="${document.slug}.pdf"`,
    });
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Document public publié, par slug' })
  async getBySlug(@Param('slug') slug: string) {
    return toPublic(await this.documentsService.findPublishedBySlug(slug));
  }
}
