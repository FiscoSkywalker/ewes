import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Service, ServiceOffering } from '@prisma/client';
import { ServicesService } from './services.service.js';

/** Représentation publique : ni `id`, ni `status`, ni dates internes. */
function toPublic(service: Service & { offerings: ServiceOffering[] }) {
  return {
    slug: service.slug,
    nameFr: service.nameFr,
    nameEn: service.nameEn,
    taglineFr: service.taglineFr,
    taglineEn: service.taglineEn,
    descriptionFr: service.descriptionFr,
    descriptionEn: service.descriptionEn,
    imageUrl: service.imageUrl,
    imageAltFr: service.imageAltFr,
    imageAltEn: service.imageAltEn,
    publishedAt: service.publishedAt,
    offerings: service.offerings.map((offering) => ({
      titleFr: offering.titleFr,
      titleEn: offering.titleEn,
      descriptionFr: offering.descriptionFr,
      descriptionEn: offering.descriptionEn,
      icon: offering.icon,
    })),
  };
}

@ApiTags('services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @ApiOperation({ summary: 'Services publiés, avec leurs prestations' })
  async list() {
    const services = await this.servicesService.listPublished();
    return { data: services.map(toPublic) };
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Service publié, par slug' })
  async getBySlug(@Param('slug') slug: string) {
    return toPublic(await this.servicesService.findPublishedBySlug(slug));
  }
}
