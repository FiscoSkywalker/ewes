import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ArticleType, ContentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { FrontendRevalidator } from '../../common/revalidation/frontend-revalidator.service.js';
import { escapeLike } from '../../common/utils/like.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { MediaService, mediaUrl } from '../media/media.service.js';
import type { SetCoverDto } from './dto/set-cover.dto.js';
import type { CreateArticleDto } from './dto/create-article.dto.js';
import type { UpdateArticleDto } from './dto/update-article.dto.js';
import type {
  ListAdminArticlesDto,
  ListArticlesDto,
  ListPublishedArticlesDto,
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
    private readonly media: MediaService,
    private readonly audit: AuditService,
  ) {}

  /** Lecture publique : PUBLISHED, non supprimé, date de publication atteinte. */
  private publicWhere(): Prisma.ArticleWhereInput {
    return {
      status: ContentStatus.PUBLISHED,
      deletedAt: null,
      publishedAt: { lte: new Date() },
    };
  }

  /**
   * Page d'articles publiés ; `meta.types` donne le nombre d'articles publiés
   * par rubrique, indépendamment des filtres `type` et `exclude` (rubriques
   * du site et leurs compteurs, sans tout charger).
   */
  async listPublished(query: ListPublishedArticlesDto) {
    const base = this.publicWhere();
    const [{ data, meta }, groups] = await Promise.all([
      this.page(
        {
          ...base,
          ...(query.type && { type: query.type }),
          ...(query.exclude && { slug: { not: query.exclude } }),
        },
        query,
      ),
      this.prisma.article.groupBy({
        by: ['type'],
        where: base,
        _count: { _all: true },
      }),
    ]);
    const types: Partial<Record<ArticleType, number>> = {};
    for (const group of groups) types[group.type] = group._count._all;
    return { data, meta: { ...meta, types } };
  }

  async findPublishedBySlug(slug: string) {
    const article = await this.prisma.article.findFirst({
      where: { ...this.publicWhere(), slug },
      include: WITH_COVER,
    });
    if (!article) throw new NotFoundException(ARTICLE_NOT_FOUND);
    return article;
  }

  /**
   * Liste d'administration : filtres, recherche et tri au choix. `meta.statuses`
   * compte les articles de chaque statut, sans tenir compte du filtre de
   * statut lui-même (il alimente les effectifs des onglets) mais en tenant
   * compte de la recherche et de la rubrique.
   */
  async listAdmin(query: ListAdminArticlesDto) {
    const search = query.q ? escapeLike(query.q) : undefined;
    const base: Prisma.ArticleWhereInput = {
      deletedAt: null,
      ...(query.type && { type: query.type }),
      ...(search && {
        OR: (
          ['titleFr', 'titleEn', 'slug', 'excerptFr', 'excerptEn', 'contextFr', 'contextEn'] as const
        ).map((field) => ({
          [field]: { contains: search, mode: 'insensitive' as const },
        })),
      }),
    };
    // Une parution absente (brouillon) passe toujours en dernier.
    const primary: Prisma.ArticleOrderByWithRelationInput | undefined =
      query.sort === 'publishedAt'
        ? { publishedAt: { sort: query.order, nulls: 'last' } }
        : query.sort
          ? { [query.sort]: query.order }
          : undefined;
    const [{ data, meta }, groups] = await Promise.all([
      this.page(
        { ...base, ...(query.status && { status: query.status }) },
        query,
        // `id` départage les ex æquo : une page ne doit ni répéter ni sauter de ligne.
        primary ? [primary, { updatedAt: 'desc' }, { id: 'asc' }] : ORDER,
      ),
      this.prisma.article.groupBy({
        by: ['status'],
        where: base,
        _count: { _all: true },
      }),
    ]);
    const statuses: Partial<Record<ContentStatus, number>> = {};
    for (const group of groups) statuses[group.status] = group._count._all;
    return { data, meta: { ...meta, statuses } };
  }

  private async page(
    where: Prisma.ArticleWhereInput,
    query: ListArticlesDto,
    orderBy: Prisma.ArticleOrderByWithRelationInput[] = ORDER,
  ) {
    const [data, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        include: WITH_COVER,
        orderBy,
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
  async publish(actor: AuthenticatedUser, id: string, publishedAt?: string) {
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
        // Sans date choisie : la première date de publication est conservée, sauf si
        // l'article n'est jamais paru (date future d'une parution annulée) : il paraît maintenant.
        publishedAt: publishedAt
          ? new Date(publishedAt)
          : current.publishedAt && current.publishedAt.getTime() <= Date.now()
            ? current.publishedAt
            : new Date(),
      },
      include: WITH_COVER,
    });
    await this.record(actor, 'ARTICLE_PUBLISHED', published, current.status, {
      status: published.status,
      publishedAt: published.publishedAt?.toISOString() ?? null,
    });
    await this.revalidate(published.slug);
    return published;
  }

  /** Définit (remplace) le visuel de couverture à partir d'un média téléversé. */
  async setCover(id: string, dto: SetCoverDto) {
    await this.findById(id);
    const media = await this.media.findById(dto.mediaId);
    await this.prisma.$transaction([
      this.prisma.articleImage.deleteMany({ where: { articleId: id } }),
      this.prisma.articleImage.create({
        data: {
          articleId: id,
          url: mediaUrl(media.storedName),
          altFr: dto.altFr,
          altEn: dto.altEn,
          position: 0,
        },
      }),
    ]);
    return this.afterCoverChange(id);
  }

  /** Retire le visuel de couverture (le média reste dans la médiathèque). */
  async removeCover(id: string) {
    await this.findById(id);
    await this.prisma.articleImage.deleteMany({ where: { articleId: id } });
    return this.afterCoverChange(id);
  }

  private async afterCoverChange(id: string) {
    const article = await this.findById(id);
    if (article.status === ContentStatus.PUBLISHED) {
      await this.revalidate(article.slug);
    }
    return article;
  }

  /** Retire immédiatement l'article du site public (retour en brouillon). */
  unpublish(actor: AuthenticatedUser, id: string) {
    return this.setStatus(actor, id, ContentStatus.DRAFT, 'ARTICLE_UNPUBLISHED');
  }

  /** Dépublie en conservant l'article pour l'historique interne. */
  archive(actor: AuthenticatedUser, id: string) {
    return this.setStatus(actor, id, ContentStatus.ARCHIVED, 'ARTICLE_ARCHIVED');
  }

  private async setStatus(
    actor: AuthenticatedUser,
    id: string,
    status: ContentStatus,
    action: string,
  ) {
    const current = await this.findById(id);
    if (current.status === status) return current;
    const updated = await this.prisma.article.update({
      where: { id },
      data: { status },
      include: WITH_COVER,
    });
    await this.record(actor, action, updated, current.status);
    await this.revalidate(updated.slug);
    return updated;
  }

  /**
   * Suppression logique : l'article disparaît du site et du portail ; la
   * ligne est conservée (historique, audit).
   */
  async remove(actor: AuthenticatedUser, id: string) {
    const current = await this.findById(id);
    await this.prisma.article.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.record(actor, 'ARTICLE_DELETED', current, current.status, { deleted: true });
    await this.revalidate(current.slug);
  }

  /** Publication, dépublication, archivage et suppression sont toujours tracés (blueprint/09 §7). */
  private record(
    actor: AuthenticatedUser,
    action: string,
    article: { id: string; slug: string; status: ContentStatus },
    before: ContentStatus,
    after: Prisma.InputJsonValue = { status: article.status },
  ) {
    return this.audit.record({
      actorId: actor.id,
      action,
      entityType: 'Article',
      entityId: article.id,
      before: { status: before, slug: article.slug },
      after,
    });
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
