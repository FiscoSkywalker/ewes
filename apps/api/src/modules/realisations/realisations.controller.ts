import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  RealisationsService,
  type RealisationWithService,
} from './realisations.service.js';
import { ListRealisationsDto } from './dto/list-realisations.dto.js';

/**
 * Représentation publique : ni `id`, ni `status`, et le client n'apparaît que
 * si la fiche l'autorise explicitement (`isClientPublic`).
 */
function toPublic(realisation: RealisationWithService) {
  return {
    slug: realisation.slug,
    titleFr: realisation.titleFr,
    titleEn: realisation.titleEn,
    clientName: realisation.isClientPublic ? realisation.clientName : null,
    location: realisation.location,
    year: realisation.year,
    yearEnd: realisation.yearEnd,
    projectType: realisation.projectType,
    descriptionFr: realisation.descriptionFr,
    descriptionEn: realisation.descriptionEn,
    objectivesFr: realisation.objectivesFr,
    objectivesEn: realisation.objectivesEn,
    resultsFr: realisation.resultsFr,
    resultsEn: realisation.resultsEn,
    isFeatured: realisation.isFeatured,
    serviceSlug: realisation.service?.slug ?? null,
    publishedAt: realisation.publishedAt,
  };
}

@ApiTags('realisations')
@Controller('realisations')
export class RealisationsController {
  constructor(private readonly realisationsService: RealisationsService) {}

  @Get()
  @ApiOperation({ summary: 'Réalisations publiées (filtres, pagination)' })
  async list(@Query() query: ListRealisationsDto) {
    const { data, meta } = await this.realisationsService.listPublished(query);
    return { data: data.map(toPublic), meta };
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Réalisation publiée, par slug' })
  async getBySlug(@Param('slug') slug: string) {
    return toPublic(await this.realisationsService.findPublishedBySlug(slug));
  }
}
