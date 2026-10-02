import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreatePageDto } from './dto/create-page.dto.js';
import type { UpdatePageDto } from './dto/update-page.dto.js';
import { FrontendRevalidator } from '../../common/revalidation/frontend-revalidator.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';

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
    private readonly audit: AuditService,
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
      await this.revalidator.revalidate(`page:${updated.slug}`);
    }
    return updated;
  }

  async publish(actor: AuthenticatedUser, id: string) {
    const current = await this.findById(id);
    if (current.status === ContentStatus.PUBLISHED) return current;
    const published = await this.prisma.page.update({
      where: { id },
      data: {
        status: ContentStatus.PUBLISHED,
        publishedAt: current.publishedAt ?? new Date(),
      },
    });
    await this.record(actor, 'PAGE_PUBLISHED', published, current.status);
    await this.revalidator.revalidate(`page:${published.slug}`);
    return published;
  }

  /** Retire immédiatement la page du site public (retour en brouillon). */
  async unpublish(actor: AuthenticatedUser, id: string) {
    const current = await this.findById(id);
    if (current.status === ContentStatus.DRAFT) return current;
    const unpublished = await this.prisma.page.update({
      where: { id },
      data: { status: ContentStatus.DRAFT },
    });
    await this.record(actor, 'PAGE_UNPUBLISHED', unpublished, current.status);
    await this.revalidator.revalidate(`page:${unpublished.slug}`);
    return unpublished;
  }

  /** Publication et dépublication sont toujours tracées (blueprint/09 §7). */
  private record(
    actor: AuthenticatedUser,
    action: string,
    page: { id: string; slug: string; status: ContentStatus },
    before: ContentStatus,
  ) {
    return this.audit.record({
      actorId: actor.id,
      action,
      entityType: 'Page',
      entityId: page.id,
      before: { status: before, slug: page.slug },
      after: { status: page.status },
    });
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
