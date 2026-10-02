import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ActualitesService,
  type ArticleWithCover,
} from './actualites.service.js';
import { ListArticlesDto } from './dto/list-articles.dto.js';

/** Représentation publique : ni `id`, ni `status`, ni dates internes. */
function toPublic(article: ArticleWithCover) {
  const cover = article.images[0];
  return {
    slug: article.slug,
    type: article.type,
    titleFr: article.titleFr,
    titleEn: article.titleEn,
    excerptFr: article.excerptFr,
    excerptEn: article.excerptEn,
    contextFr: article.contextFr,
    contextEn: article.contextEn,
    contentFr: article.contentFr,
    contentEn: article.contentEn,
    publishedAt: article.publishedAt,
    datePrecision: article.datePrecision,
    image: cover
      ? { url: cover.url, altFr: cover.altFr, altEn: cover.altEn }
      : null,
  };
}

@ApiTags('articles')
@Controller('articles')
export class ActualitesController {
  constructor(private readonly actualitesService: ActualitesService) {}

  @Get()
  @ApiOperation({ summary: 'Articles publiés (rubrique, pagination)' })
  async list(@Query() query: ListArticlesDto) {
    const { data, meta } = await this.actualitesService.listPublished(query);
    return { data: data.map(toPublic), meta };
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Article publié, par slug' })
  async getBySlug(@Param('slug') slug: string) {
    return toPublic(await this.actualitesService.findPublishedBySlug(slug));
  }
}
