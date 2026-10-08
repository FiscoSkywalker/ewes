import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContentStatus, Prisma } from '@prisma/client';
import { escapeLike } from '../../common/utils/like.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { FrontendRevalidator } from '../../common/revalidation/frontend-revalidator.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import {
  DocumentStorageService,
  documentFileUrl,
  type UploadedDocument,
} from './document-storage.service.js';
import { DOCUMENT_MIME_TYPE } from './document-signature.js';
import type { CreatePublicDocumentDto } from './dto/create-public-document.dto.js';
import type { UpdatePublicDocumentDto } from './dto/update-public-document.dto.js';
import type {
  ListAdminPublicDocumentsDto,
  ListPublicDocumentsDto,
} from './dto/list-public-documents.dto.js';

const DOCUMENT_NOT_FOUND = {
  code: 'DOCUMENT_NOT_FOUND',
  message: 'Document introuvable.',
  details: [],
};

/** Tags de cache du site public : une entrée par document + la liste. */
const DOCUMENTS_LIST_TAG = 'documents';
const documentTag = (slug: string) => `document:${slug}`;

/** Plus récents d'abord. */
const ORDER = [
  { publishedAt: { sort: 'desc', nulls: 'last' } },
  { createdAt: 'desc' },
] satisfies Prisma.PublicDocumentOrderByWithRelationInput[];

const WITH_SERVICE = {
  service: { select: { slug: true } },
} satisfies Prisma.PublicDocumentInclude;

export type PublicDocumentWithService = Prisma.PublicDocumentGetPayload<{
  include: typeof WITH_SERVICE;
}>;

@Injectable()
export class DocumentsPublicsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: DocumentStorageService,
    private readonly revalidator: FrontendRevalidator,
    private readonly audit: AuditService,
  ) {}

  /** Lecture publique : PUBLISHED, non supprimé, date de publication atteinte. */
  private publicWhere(
    query?: ListPublicDocumentsDto,
  ): Prisma.PublicDocumentWhereInput {
    return {
      status: ContentStatus.PUBLISHED,
      deletedAt: null,
      publishedAt: { lte: new Date() },
      ...this.filters(query),
    };
  }

  private filters(
    query?: ListPublicDocumentsDto,
  ): Prisma.PublicDocumentWhereInput {
    return {
      ...(query?.category && { category: query.category }),
      ...(query?.year && { year: query.year }),
    };
  }

  listPublished(query: ListPublicDocumentsDto) {
    return this.page(this.publicWhere(query), query);
  }

  async findPublishedBySlug(slug: string) {
    const document = await this.prisma.publicDocument.findFirst({
      where: { ...this.publicWhere(), slug },
      include: WITH_SERVICE,
    });
    if (!document) throw new NotFoundException(DOCUMENT_NOT_FOUND);
    return document;
  }

  /**
   * Fichier d'un document publié : un brouillon, un archivé ou un supprimé
   * n'est jamais joignable, même en connaissant son nom de fichier.
   */
  async findPublishedByStoredName(storedName: string) {
    const document = await this.prisma.publicDocument.findFirst({
      where: { ...this.publicWhere(), storedName },
    });
    if (!document || !(await this.storage.exists(document.storedName))) {
      throw new NotFoundException({
        code: 'DOCUMENT_FILE_NOT_FOUND',
        message: 'Fichier introuvable.',
        details: [],
      });
    }
    return document;
  }

  pathOf(storedName: string) {
    return this.storage.pathOf(storedName);
  }

  /**
   * Fichier d'un document quel que soit son statut, pour le personnel : un
   * brouillon n'a pas d'adresse publique, il faut pourtant pouvoir le relire
   * avant de le publier.
   */
  async findFileForStaff(id: string) {
    const document = await this.findById(id);
    if (!(await this.storage.exists(document.storedName))) {
      throw new NotFoundException({
        code: 'DOCUMENT_FILE_NOT_FOUND',
        message: 'Fichier introuvable.',
        details: [],
      });
    }
    return document;
  }

  /**
   * Liste d'administration : filtres, recherche et tri au choix. `meta.statuses`
   * compte les documents de chaque statut, sans tenir compte du filtre de
   * statut lui-même (il alimente les effectifs des onglets), mais en tenant
   * compte de la recherche et des autres filtres.
   */
  async listAdmin(query: ListAdminPublicDocumentsDto) {
    const search = query.q ? escapeLike(query.q) : undefined;
    const base: Prisma.PublicDocumentWhereInput = {
      deletedAt: null,
      ...this.filters(query),
      ...(search && {
        OR: (
          ['titleFr', 'titleEn', 'slug', 'excerptFr', 'excerptEn'] as const
        ).map((field) => ({
          [field]: { contains: search, mode: 'insensitive' as const },
        })),
      }),
    };
    // Année facultative : les documents sans année passent toujours en dernier.
    const primary: Prisma.PublicDocumentOrderByWithRelationInput | undefined =
      query.sort === 'year'
        ? { year: { sort: query.order, nulls: 'last' } }
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
      this.prisma.publicDocument.groupBy({
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
    where: Prisma.PublicDocumentWhereInput,
    query: ListPublicDocumentsDto,
    orderBy: Prisma.PublicDocumentOrderByWithRelationInput[] = ORDER,
  ) {
    const [data, total] = await Promise.all([
      this.prisma.publicDocument.findMany({
        where,
        include: WITH_SERVICE,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.publicDocument.count({ where }),
    ]);
    return { data, meta: { page: query.page, limit: query.limit, total } };
  }

  async findById(id: string) {
    const document = await this.prisma.publicDocument.findFirst({
      where: { id, deletedAt: null },
      include: WITH_SERVICE,
    });
    if (!document) throw new NotFoundException(DOCUMENT_NOT_FOUND);
    return document;
  }

  /** Crée le document (toujours en brouillon) avec son fichier PDF. */
  async create(dto: CreatePublicDocumentDto, file: UploadedDocument) {
    const storedName = await this.storage.save(file);
    try {
      return await this.prisma.publicDocument.create({
        data: {
          slug: dto.slug,
          titleFr: dto.titleFr,
          titleEn: dto.titleEn,
          excerptFr: dto.excerptFr,
          excerptEn: dto.excerptEn,
          category: dto.category,
          year: dto.year,
          pages: dto.pages,
          serviceId: dto.serviceId,
          storedName,
          fileUrl: documentFileUrl(storedName),
          fileType: DOCUMENT_MIME_TYPE,
          fileSizeBytes: file.size,
        },
        include: WITH_SERVICE,
      });
    } catch (error) {
      await this.storage.remove(storedName);
      throw this.translateWriteError(error);
    }
  }

  async update(id: string, dto: UpdatePublicDocumentDto) {
    const current = await this.findById(id);

    // Un contenu publié conserve son slug (liens partagés/indexés).
    if (
      dto.slug !== undefined &&
      dto.slug !== current.slug &&
      current.publishedAt !== null
    ) {
      throw new ConflictException({
        code: 'DOCUMENT_SLUG_LOCKED',
        message: 'Le slug d’un document déjà publié ne peut plus être modifié.',
        details: [],
      });
    }

    let updated;
    try {
      updated = await this.prisma.publicDocument.update({
        where: { id },
        data: {
          slug: dto.slug,
          titleFr: dto.titleFr,
          titleEn: dto.titleEn,
          excerptFr: dto.excerptFr,
          excerptEn: dto.excerptEn,
          category: dto.category,
          year: dto.year,
          pages: dto.pages,
          serviceId: dto.serviceId,
        },
        include: WITH_SERVICE,
      });
    } catch (error) {
      throw this.translateWriteError(error);
    }
    await this.revalidateIfPublished(updated);
    return updated;
  }

  /** Remplace le fichier PDF ; l'ancien est supprimé une fois le nouveau enregistré. */
  async replaceFile(id: string, file: UploadedDocument) {
    const current = await this.findById(id);
    const storedName = await this.storage.save(file);
    let updated;
    try {
      updated = await this.prisma.publicDocument.update({
        where: { id },
        data: {
          storedName,
          fileUrl: documentFileUrl(storedName),
          fileSizeBytes: file.size,
        },
        include: WITH_SERVICE,
      });
    } catch (error) {
      await this.storage.remove(storedName);
      throw error;
    }
    await this.storage.remove(current.storedName);
    await this.revalidateIfPublished(updated);
    return updated;
  }

  /** Publication explicite : elle exige un fichier présent sur le disque. */
  async publish(actor: AuthenticatedUser, id: string) {
    const current = await this.findById(id);
    if (current.status === ContentStatus.PUBLISHED) return current;
    if (!(await this.storage.exists(current.storedName))) {
      throw new ConflictException({
        code: 'DOCUMENT_FILE_MISSING',
        message:
          'Le fichier du document est introuvable : téléversez-le à nouveau.',
        details: [],
      });
    }
    const published = await this.prisma.publicDocument.update({
      where: { id },
      data: {
        status: ContentStatus.PUBLISHED,
        publishedAt: current.publishedAt ?? new Date(),
      },
      include: WITH_SERVICE,
    });
    await this.record(
      actor,
      'PUBLIC_DOCUMENT_PUBLISHED',
      published,
      current.status,
    );
    await this.revalidate(published.slug);
    return published;
  }

  /** Retire immédiatement le document (et son fichier) du site public. */
  unpublish(actor: AuthenticatedUser, id: string) {
    return this.setStatus(
      actor,
      id,
      ContentStatus.DRAFT,
      'PUBLIC_DOCUMENT_UNPUBLISHED',
    );
  }

  /** Dépublie en conservant le document pour l'historique interne. */
  archive(actor: AuthenticatedUser, id: string) {
    return this.setStatus(
      actor,
      id,
      ContentStatus.ARCHIVED,
      'PUBLIC_DOCUMENT_ARCHIVED',
    );
  }

  private async setStatus(
    actor: AuthenticatedUser,
    id: string,
    status: ContentStatus,
    action: string,
  ) {
    const current = await this.findById(id);
    if (current.status === status) return current;
    const updated = await this.prisma.publicDocument.update({
      where: { id },
      data: { status },
      include: WITH_SERVICE,
    });
    await this.record(actor, action, updated, current.status);
    await this.revalidate(updated.slug);
    return updated;
  }

  /** Publication, dépublication, archivage et suppression sont toujours tracés (blueprint/09 §7). */
  private record(
    actor: AuthenticatedUser,
    action: string,
    document: { id: string; slug: string; status: ContentStatus },
    before: ContentStatus,
    after: Prisma.InputJsonValue = { status: document.status },
  ) {
    return this.audit.record({
      actorId: actor.id,
      action,
      entityType: 'PublicDocument',
      entityId: document.id,
      before: { status: before, slug: document.slug },
      after,
    });
  }

  /**
   * Suppression logique : le document disparaît partout (site et
   * administration). Le fichier reste sur le disque, inatteignable.
   */
  async remove(actor: AuthenticatedUser, id: string) {
    const current = await this.findById(id);
    await this.prisma.publicDocument.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.record(
      actor,
      'PUBLIC_DOCUMENT_DELETED',
      current,
      current.status,
      { deleted: true },
    );
    await this.revalidate(current.slug);
  }

  private async revalidateIfPublished(document: {
    slug: string;
    status: ContentStatus;
  }) {
    if (document.status === ContentStatus.PUBLISHED) {
      await this.revalidate(document.slug);
    }
  }

  private async revalidate(slug: string) {
    await this.revalidator.revalidate(documentTag(slug));
    await this.revalidator.revalidate(DOCUMENTS_LIST_TAG);
  }

  private translateWriteError(error: unknown): unknown {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return new ConflictException({
          code: 'DOCUMENT_SLUG_TAKEN',
          message: 'Ce slug est déjà utilisé par un autre document.',
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
