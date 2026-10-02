import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ContentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { FrontendRevalidator } from '../../common/revalidation/frontend-revalidator.service.js';
import type { CreateRealisationDto } from './dto/create-realisation.dto.js';
import type { UpdateRealisationDto } from './dto/update-realisation.dto.js';
import type {
  ListAdminRealisationsDto,
  ListRealisationsDto,
} from './dto/list-realisations.dto.js';
import { MAX_FEATURED_REALISATIONS } from './realisation-types.js';

const REALISATION_NOT_FOUND = {
  code: 'REALISATION_NOT_FOUND',
  message: 'Réalisation introuvable.',
  details: [],
};

/** Tags de cache du site public : une entrée par fiche + la liste. */
const REALISATIONS_LIST_TAG = 'realisations';
const realisationTag = (slug: string) => `realisation:${slug}`;

/** Représentation publique : année la plus récente d'abord, puis ordre de saisie. */
const PUBLIC_ORDER = [
  { year: { sort: 'desc', nulls: 'last' } },
  { yearEnd: { sort: 'desc', nulls: 'last' } },
  { createdAt: 'asc' },
] satisfies Prisma.RealisationOrderByWithRelationInput[];

const WITH_SERVICE = {
  service: { select: { slug: true } },
} satisfies Prisma.RealisationInclude;

export type RealisationWithService = Prisma.RealisationGetPayload<{
  include: typeof WITH_SERVICE;
}>;

@Injectable()
export class RealisationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidator: FrontendRevalidator,
  ) {}

  /** Lecture publique : PUBLISHED, non supprimée, date de publication atteinte. */
  private publicWhere(query?: ListRealisationsDto): Prisma.RealisationWhereInput {
    return {
      status: ContentStatus.PUBLISHED,
      deletedAt: null,
      publishedAt: { lte: new Date() },
      ...this.filters(query),
    };
  }

  private filters(query?: ListRealisationsDto): Prisma.RealisationWhereInput {
    return {
      ...(query?.projectType && { projectType: query.projectType }),
      ...(query?.year && { year: query.year }),
      ...(query?.location && {
        location: { contains: query.location, mode: 'insensitive' },
      }),
    };
  }

  async listPublished(query: ListRealisationsDto) {
    const where = this.publicWhere(query);
    const [data, total] = await Promise.all([
      this.prisma.realisation.findMany({
        where,
        include: WITH_SERVICE,
        orderBy: PUBLIC_ORDER,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.realisation.count({ where }),
    ]);
    return { data, meta: { page: query.page, limit: query.limit, total } };
  }

  async findPublishedBySlug(slug: string) {
    const realisation = await this.prisma.realisation.findFirst({
      where: { ...this.publicWhere(), slug },
      include: WITH_SERVICE,
    });
    if (!realisation) throw new NotFoundException(REALISATION_NOT_FOUND);
    return realisation;
  }

  async listAdmin(query: ListAdminRealisationsDto) {
    const where: Prisma.RealisationWhereInput = {
      deletedAt: null,
      ...(query.status && { status: query.status }),
      ...this.filters(query),
    };
    const [data, total] = await Promise.all([
      this.prisma.realisation.findMany({
        where,
        include: WITH_SERVICE,
        orderBy: PUBLIC_ORDER,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.realisation.count({ where }),
    ]);
    return { data, meta: { page: query.page, limit: query.limit, total } };
  }

  async findById(id: string) {
    const realisation = await this.prisma.realisation.findFirst({
      where: { id, deletedAt: null },
      include: WITH_SERVICE,
    });
    if (!realisation) throw new NotFoundException(REALISATION_NOT_FOUND);
    return realisation;
  }

  async create(dto: CreateRealisationDto) {
    await this.assertFeaturedCapacity(null, dto.isFeatured, false);
    try {
      return await this.prisma.realisation.create({
        data: dto,
        include: WITH_SERVICE,
      });
    } catch (error) {
      throw this.translateWriteError(error);
    }
  }

  async update(id: string, dto: UpdateRealisationDto) {
    const current = await this.findById(id);

    // Un contenu publié conserve son slug (liens partagés/indexés).
    if (
      dto.slug !== undefined &&
      dto.slug !== current.slug &&
      current.publishedAt !== null
    ) {
      throw new ConflictException({
        code: 'REALISATION_SLUG_LOCKED',
        message:
          'Le slug d’une réalisation déjà publiée ne peut plus être modifié.',
        details: [],
      });
    }
    await this.assertFeaturedCapacity(
      id,
      dto.isFeatured ?? current.isFeatured,
      current.status === ContentStatus.PUBLISHED,
    );

    let updated;
    try {
      updated = await this.prisma.realisation.update({
        where: { id },
        data: dto,
        include: WITH_SERVICE,
      });
    } catch (error) {
      throw this.translateWriteError(error);
    }
    if (updated.status === ContentStatus.PUBLISHED) {
      await this.revalidate(updated.slug);
    }
    return updated;
  }

  /** Publication explicite ; exige les champs nécessaires au filtrage public. */
  async publish(id: string) {
    const current = await this.findById(id);
    if (current.status === ContentStatus.PUBLISHED) return current;

    const missing: string[] = [];
    if (!current.titleFr.trim()) missing.push('titleFr');
    if (current.year === null) missing.push('year');
    if (current.projectType === null) missing.push('projectType');
    if (missing.length > 0) {
      throw new UnprocessableEntityException({
        code: 'REALISATION_PUBLISH_INCOMPLETE',
        message: 'Des champs obligatoires manquent pour publier cette réalisation.',
        details: missing,
      });
    }
    await this.assertFeaturedCapacity(id, current.isFeatured, true);

    const published = await this.prisma.realisation.update({
      where: { id },
      data: {
        status: ContentStatus.PUBLISHED,
        publishedAt: current.publishedAt ?? new Date(),
      },
      include: WITH_SERVICE,
    });
    await this.revalidate(published.slug);
    return published;
  }

  /** Retire immédiatement la fiche du site public (retour en brouillon). */
  unpublish(id: string) {
    return this.setStatus(id, ContentStatus.DRAFT);
  }

  /** Dépublie en conservant la fiche pour l'historique interne. */
  archive(id: string) {
    return this.setStatus(id, ContentStatus.ARCHIVED);
  }

  private async setStatus(id: string, status: ContentStatus) {
    await this.findById(id);
    const updated = await this.prisma.realisation.update({
      where: { id },
      data: { status },
      include: WITH_SERVICE,
    });
    await this.revalidate(updated.slug);
    return updated;
  }

  /**
   * Limite les fiches « vitrine » publiées simultanément. `excludeId` écarte
   * la fiche en cours de modification du décompte.
   */
  private async assertFeaturedCapacity(
    excludeId: string | null,
    willBeFeatured: boolean | undefined,
    willBePublished: boolean,
  ) {
    if (!willBeFeatured || !willBePublished) return;
    const featured = await this.prisma.realisation.count({
      where: {
        isFeatured: true,
        status: ContentStatus.PUBLISHED,
        deletedAt: null,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
    if (featured >= MAX_FEATURED_REALISATIONS) {
      throw new ConflictException({
        code: 'REALISATION_FEATURED_LIMIT',
        message: `Au plus ${MAX_FEATURED_REALISATIONS} réalisations peuvent être mises en avant simultanément.`,
        details: [],
      });
    }
  }

  private async revalidate(slug: string) {
    await this.revalidator.revalidate(realisationTag(slug));
    await this.revalidator.revalidate(REALISATIONS_LIST_TAG);
  }

  private translateWriteError(error: unknown): unknown {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return new ConflictException({
          code: 'REALISATION_SLUG_TAKEN',
          message: 'Ce slug est déjà utilisé par une autre réalisation.',
          details: [],
        });
      }
      if (error.code === 'P2003') {
        return new BadRequestException({
          code: 'SERVICE_NOT_FOUND',
          message: 'Le service indiqué n’existe pas.',
          details: ['serviceId'],
        });
      }
    }
    return error;
  }
}
