import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreatePageDto } from './dto/create-page.dto.js';
import type { UpdatePageDto } from './dto/update-page.dto.js';
import { FrontendRevalidator } from './frontend-revalidator.service.js';

const PAGE_NOT_FOUND = {
  code: 'PAGE_NOT_FOUND',
  message: 'Page introuvable.',
  details: [],
};

@Injectable()
export class PagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidator: FrontendRevalidator,
  ) {}

  /** Lecture publique : seules les pages PUBLISHED existent pour le visiteur. */
  async findPublishedBySlug(slug: string) {
    const page = await this.prisma.page.findFirst({
      where: { slug, status: ContentStatus.PUBLISHED },
    });
    if (!page) throw new NotFoundException(PAGE_NOT_FOUND);
    return page;
  }

  list() {
    return this.prisma.page.findMany({ orderBy: { slug: 'asc' } });
  }

  async findById(id: string) {
    const page = await this.prisma.page.findUnique({ where: { id } });
    if (!page) throw new NotFoundException(PAGE_NOT_FOUND);
    return page;
  }

  async create(dto: CreatePageDto) {
    try {
      return await this.prisma.page.create({ data: dto });
    } catch (error) {
      throw this.translateSlugConflict(error);
    }
  }

  async update(id: string, dto: UpdatePageDto) {
    const current = await this.findById(id);

    // Un contenu publié conserve son slug (liens partagés/indexés).
    if (
      dto.slug !== undefined &&
      dto.slug !== current.slug &&
      current.publishedAt !== null
    ) {
      throw new ConflictException({
        code: 'PAGE_SLUG_LOCKED',
        message: 'Le slug d’une page déjà publiée ne peut plus être modifié.',
        details: [],
      });
    }

    let updated;
    try {
      updated = await this.prisma.page.update({ where: { id }, data: dto });
    } catch (error) {
      throw this.translateSlugConflict(error);
    }
    if (updated.status === ContentStatus.PUBLISHED) {
      await this.revalidator.revalidatePage(updated.slug);
    }
    return updated;
  }

  async publish(id: string) {
    const current = await this.findById(id);
    if (current.status === ContentStatus.PUBLISHED) return current;
    const published = await this.prisma.page.update({
      where: { id },
      data: {
        status: ContentStatus.PUBLISHED,
        publishedAt: current.publishedAt ?? new Date(),
      },
    });
    await this.revalidator.revalidatePage(published.slug);
    return published;
  }

  /** Retire immédiatement la page du site public (retour en brouillon). */
  async unpublish(id: string) {
    await this.findById(id);
    const unpublished = await this.prisma.page.update({
      where: { id },
      data: { status: ContentStatus.DRAFT },
    });
    await this.revalidator.revalidatePage(unpublished.slug);
    return unpublished;
  }

  private translateSlugConflict(error: unknown): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException({
        code: 'PAGE_SLUG_TAKEN',
        message: 'Ce slug est déjà utilisé par une autre page.',
        details: [],
      });
    }
    return error;
  }
}
