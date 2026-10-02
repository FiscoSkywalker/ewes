import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ContentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { FrontendRevalidator } from '../../common/revalidation/frontend-revalidator.service.js';
import type { CreateArticleDto } from './dto/create-article.dto.js';
import type { UpdateArticleDto } from './dto/update-article.dto.js';
import type {
  ListAdminArticlesDto,
  ListArticlesDto,
} from './dto/list-articles.dto.js';

const ARTICLE_NOT_FOUND = {
  code: 'ARTICLE_NOT_FOUND',
  message: 'Article introuvable.',
  details: [],
};

/** Tags de cache du site public : une entrée par article + la liste. */
const ARTICLES_LIST_TAG = 'articles';
const articleTag = (slug: string) => `article:${slug}`;

/** Les plus récents d'abord. */
const ORDER = [
  { publishedAt: { sort: 'desc', nulls: 'last' } },
  { createdAt: 'desc' },
] satisfies Prisma.ArticleOrderByWithRelationInput[];

/** Visuel de couverture : première image par position. */
const WITH_COVER = {
  images: { orderBy: { position: 'asc' }, take: 1 },
} satisfies Prisma.ArticleInclude;

export type ArticleWithCover = Prisma.ArticleGetPayload<{
  include: typeof WITH_COVER;
}>;

@Injectable()
export class ActualitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidator: FrontendRevalidator,
  ) {}

  /** Lecture publique : PUBLISHED, non supprimé, date de publication atteinte. */
  private publicWhere(query?: ListArticlesDto): Prisma.ArticleWhereInput {
    return {
      status: ContentStatus.PUBLISHED,
      deletedAt: null,
      publishedAt: { lte: new Date() },
      ...(query?.type && { type: query.type }),
    };
  }

  async listPublished(query: ListArticlesDto) {
    return this.page(this.publicWhere(query), query);
  }

  async findPublishedBySlug(slug: string) {
    const article = await this.prisma.article.findFirst({
      where: { ...this.publicWhere(), slug },
      include: WITH_COVER,
    });
    if (!article) throw new NotFoundException(ARTICLE_NOT_FOUND);
    return article;
  }

  async listAdmin(query: ListAdminArticlesDto) {
    return this.page(
      {
        deletedAt: null,
        ...(query.status && { status: query.status }),
        ...(query.type && { type: query.type }),
      },
      query,
    );
  }

  private async page(where: Prisma.ArticleWhereInput, query: ListArticlesDto) {
    const [data, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        include: WITH_COVER,
        orderBy: ORDER,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.article.count({ where }),
    ]);
    return { data, meta: { page: query.page, limit: query.limit, total } };
  }

  async findById(id: string) {
    const article = await this.prisma.article.findFirst({
      where: { id, deletedAt: null },
      include: WITH_COVER,
    });
    if (!article) throw new NotFoundException(ARTICLE_NOT_FOUND);
    return article;
  }

  async create(dto: CreateArticleDto) {
    try {
      return await this.prisma.article.create({
        data: {
          slug: dto.slug,
          type: dto.type,
          titleFr: dto.titleFr,
          titleEn: dto.titleEn,
          excerptFr: dto.excerptFr,
          excerptEn: dto.excerptEn,
          contextFr: dto.contextFr,
          contextEn: dto.contextEn,
          contentFr: dto.contentFr ?? '',
          contentEn: dto.contentEn,
          datePrecision: dto.datePrecision,
        },
        include: WITH_COVER,
      });
    } catch (error) {
      throw this.translateSlugConflict(error);
    }
  }

  async update(id: string, dto: UpdateArticleDto) {
    const current = await this.findById(id);

    // Un contenu publié conserve son slug (liens partagés/indexés).
    if (
      dto.slug !== undefined &&
      dto.slug !== current.slug &&
      current.publishedAt !== null
    ) {
      throw new ConflictException({
        code: 'ARTICLE_SLUG_LOCKED',
        message: 'Le slug d’un article déjà publié ne peut plus être modifié.',
        details: [],
      });
    }

    let updated;
    try {
      updated = await this.prisma.article.update({
        where: { id },
        data: dto,
        include: WITH_COVER,
      });
    } catch (error) {
      throw this.translateSlugConflict(error);
    }
    if (updated.status === ContentStatus.PUBLISHED) {
      await this.revalidate(updated.slug);
    }
    return updated;
  }

  /**
   * Publication explicite. `publishedAt` peut être antidaté ou futur
   * (parution programmée : invisible jusqu'à cette date).
   */
  async publish(id: string, publishedAt?: string) {
    const current = await this.findById(id);
    if (current.status === ContentStatus.PUBLISHED) return current;

    const missing: string[] = [];
    if (!current.titleFr.trim()) missing.push('titleFr');
    if (!current.excerptFr?.trim() && !current.contentFr.trim()) {
      missing.push('excerptFr');
    }
    if (missing.length > 0) {
      throw new UnprocessableEntityException({
        code: 'ARTICLE_PUBLISH_INCOMPLETE',
        message:
          'Un titre et un résumé ou un contenu sont nécessaires pour publier cet article.',
        details: missing,
      });
    }

    const published = await this.prisma.article.update({
      where: { id },
      data: {
        status: ContentStatus.PUBLISHED,
        publishedAt: publishedAt
          ? new Date(publishedAt)
          : (current.publishedAt ?? new Date()),
      },
      include: WITH_COVER,
    });
    await this.revalidate(published.slug);
    return published;
  }

  /** Retire immédiatement l'article du site public (retour en brouillon). */
  unpublish(id: string) {
    return this.setStatus(id, ContentStatus.DRAFT);
  }

  /** Dépublie en conservant l'article pour l'historique interne. */
  archive(id: string) {
    return this.setStatus(id, ContentStatus.ARCHIVED);
  }

  private async setStatus(id: string, status: ContentStatus) {
    await this.findById(id);
    const updated = await this.prisma.article.update({
      where: { id },
      data: { status },
      include: WITH_COVER,
    });
    await this.revalidate(updated.slug);
    return updated;
  }

  private async revalidate(slug: string) {
    await this.revalidator.revalidate(articleTag(slug));
    await this.revalidator.revalidate(ARTICLES_LIST_TAG);
  }

  private translateSlugConflict(error: unknown): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException({
        code: 'ARTICLE_SLUG_TAKEN',
        message: 'Ce slug est déjà utilisé par un autre article.',
        details: [],
      });
    }
    return error;
  }
}
