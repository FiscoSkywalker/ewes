import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { FrontendRevalidator } from '../../common/revalidation/frontend-revalidator.service.js';
import type { CreateServiceDto } from './dto/create-service.dto.js';
import type { UpdateServiceDto } from './dto/update-service.dto.js';

const SERVICE_NOT_FOUND = {
  code: 'SERVICE_NOT_FOUND',
  message: 'Service introuvable.',
  details: [],
};

/** Tags de cache du site public : une entrée par service + la liste. */
const SERVICES_LIST_TAG = 'services';
const serviceTag = (slug: string) => `service:${slug}`;

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidator: FrontendRevalidator,
  ) {}

  listPublished() {
    return this.prisma.service.findMany({
      where: { status: ContentStatus.PUBLISHED },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Lecture publique : seuls les services PUBLISHED existent pour le visiteur. */
  async findPublishedBySlug(slug: string) {
    const service = await this.prisma.service.findFirst({
      where: { slug, status: ContentStatus.PUBLISHED },
    });
    if (!service) throw new NotFoundException(SERVICE_NOT_FOUND);
    return service;
  }

  list() {
    return this.prisma.service.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async findById(id: string) {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) throw new NotFoundException(SERVICE_NOT_FOUND);
    return service;
  }

  async create(dto: CreateServiceDto) {
    try {
      return await this.prisma.service.create({ data: dto });
    } catch (error) {
      throw this.translateSlugConflict(error);
    }
  }

  async update(id: string, dto: UpdateServiceDto) {
    const current = await this.findById(id);

    // Un contenu publié conserve son slug (liens partagés/indexés).
    if (
      dto.slug !== undefined &&
      dto.slug !== current.slug &&
      current.publishedAt !== null
    ) {
      throw new ConflictException({
        code: 'SERVICE_SLUG_LOCKED',
        message: 'Le slug d’un service déjà publié ne peut plus être modifié.',
        details: [],
      });
    }

    let updated;
    try {
      updated = await this.prisma.service.update({ where: { id }, data: dto });
    } catch (error) {
      throw this.translateSlugConflict(error);
    }
    if (updated.status === ContentStatus.PUBLISHED) {
      await this.revalidate(updated.slug);
    }
    return updated;
  }

  async publish(id: string) {
    const current = await this.findById(id);
    if (current.status === ContentStatus.PUBLISHED) return current;
    const published = await this.prisma.service.update({
      where: { id },
      data: {
        status: ContentStatus.PUBLISHED,
        publishedAt: current.publishedAt ?? new Date(),
      },
    });
    await this.revalidate(published.slug);
    return published;
  }

  /** Retire immédiatement le service du site public (retour en brouillon). */
  async unpublish(id: string) {
    await this.findById(id);
    const unpublished = await this.prisma.service.update({
      where: { id },
      data: { status: ContentStatus.DRAFT },
    });
    await this.revalidate(unpublished.slug);
    return unpublished;
  }

  private async revalidate(slug: string) {
    await this.revalidator.revalidate(serviceTag(slug));
    await this.revalidator.revalidate(SERVICES_LIST_TAG);
  }

  private translateSlugConflict(error: unknown): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException({
        code: 'SERVICE_SLUG_TAKEN',
        message: 'Ce slug est déjà utilisé par un autre service.',
        details: [],
      });
    }
    return error;
  }
}
