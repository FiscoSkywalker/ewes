import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PagesService } from './pages.service.js';

@ApiTags('pages')
@Controller('pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get(':slug')
  @ApiOperation({ summary: 'Page institutionnelle publiée, par slug' })
  async getBySlug(@Param('slug') slug: string) {
    const page = await this.pagesService.findPublishedBySlug(slug);
    return {
      slug: page.slug,
      titleFr: page.titleFr,
      titleEn: page.titleEn,
      contentFr: page.contentFr,
      contentEn: page.contentEn,
      metaDescriptionFr: page.metaDescriptionFr,
      metaDescriptionEn: page.metaDescriptionEn,
      publishedAt: page.publishedAt,
      updatedAt: page.updatedAt,
    };
  }
}
