import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Service } from '@prisma/client';
import { ServicesService } from './services.service.js';

/** Représentation publique : ni `id`, ni `status`, ni dates internes. */
function toPublic(service: Service) {
  return {
    slug: service.slug,
    nameFr: service.nameFr,
    nameEn: service.nameEn,
    descriptionFr: service.descriptionFr,
    descriptionEn: service.descriptionEn,
    publishedAt: service.publishedAt,
  };
}

@ApiTags('services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @ApiOperation({ summary: 'Services publiés' })
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
