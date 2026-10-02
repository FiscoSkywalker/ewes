import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { FrontendRevalidator } from '../../common/revalidation/frontend-revalidator.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { MediaService } from '../media/media.service.js';
import type { CreateServiceDto } from './dto/create-service.dto.js';
import type { UpdateServiceDto } from './dto/update-service.dto.js';
import type {
  CreateServiceOfferingDto,
  UpdateServiceOfferingDto,
} from './dto/service-offering.dto.js';

const SERVICE_NOT_FOUND = {
  code: 'SERVICE_NOT_FOUND',
  message: 'Service introuvable.',
  details: [],
};

const OFFERING_NOT_FOUND = {
  code: 'SERVICE_OFFERING_NOT_FOUND',
  message: 'Prestation introuvable.',
  details: [],
};

/** Tags de cache du site public : une entrée par service + la liste. */
const SERVICES_LIST_TAG = 'services';
const serviceTag = (slug: string) => `service:${slug}`;

const WITH_OFFERINGS = {
  offerings: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
} satisfies Prisma.ServiceInclude;

const ORDER = [
  { sortOrder: 'asc' },
  { createdAt: 'asc' },
] satisfies Prisma.ServiceOrderByWithRelationInput[];

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidator: FrontendRevalidator,
    private readonly audit: AuditService,
    private readonly media: MediaService,
  ) {}

  listPublished() {
    return this.prisma.service.findMany({
      where: { status: ContentStatus.PUBLISHED },
      include: WITH_OFFERINGS,
      orderBy: ORDER,
    });
  }

  /** Lecture publique : seuls les services PUBLISHED existent pour le visiteur. */
  async findPublishedBySlug(slug: string) {
    const service = await this.prisma.service.findFirst({
      where: { slug, status: ContentStatus.PUBLISHED },
      include: WITH_OFFERINGS,
    });
    if (!service) throw new NotFoundException(SERVICE_NOT_FOUND);
    return service;
  }

  list() {
    return this.prisma.service.findMany({
      include: WITH_OFFERINGS,
      orderBy: ORDER,
    });
  }

  async findById(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: WITH_OFFERINGS,
    });
    if (!service) throw new NotFoundException(SERVICE_NOT_FOUND);
    return service;
  }

  async create(dto: CreateServiceDto) {
    if (dto.imageUrl) await this.media.findByUrl(dto.imageUrl);
    const sortOrder =
      dto.sortOrder ??
      (await this.nextPosition(
        this.prisma.service.aggregate({ _max: { sortOrder: true } }),
      ));
    try {
      return await this.prisma.service.create({
        data: {
          slug: dto.slug,
          nameFr: dto.nameFr,
          nameEn: dto.nameEn,
          taglineFr: dto.taglineFr,
          taglineEn: dto.taglineEn,
          descriptionFr: dto.descriptionFr,
          descriptionEn: dto.descriptionEn,
          imageUrl: dto.imageUrl,
          imageAltFr: dto.imageAltFr,
          imageAltEn: dto.imageAltEn,
          sortOrder,
        },
        include: WITH_OFFERINGS,
      });
    } catch (error) {
      throw this.translateSlugConflict(error);
    }
  }

  async update(id: string, dto: UpdateServiceDto) {
    const current = await this.findById(id);
    // Le visuel doit être une image de la médiathèque (jamais une adresse quelconque).
    if (dto.imageUrl) await this.media.findByUrl(dto.imageUrl);

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
      updated = await this.prisma.service.update({
        where: { id },
        data: dto,
        include: WITH_OFFERINGS,
      });
    } catch (error) {
      throw this.translateSlugConflict(error);
    }
    await this.revalidateIfPublished(updated);
    return updated;
  }

  async publish(actor: AuthenticatedUser, id: string) {
    const current = await this.findById(id);
    if (current.status === ContentStatus.PUBLISHED) return current;
    const published = await this.prisma.service.update({
      where: { id },
      data: {
        status: ContentStatus.PUBLISHED,
        publishedAt: current.publishedAt ?? new Date(),
      },
      include: WITH_OFFERINGS,
    });
    await this.record(actor, 'SERVICE_PUBLISHED', published, current.status);
    await this.revalidate(published.slug);
    return published;
  }

  /** Retire immédiatement le service du site public (retour en brouillon). */
  async unpublish(actor: AuthenticatedUser, id: string) {
    const current = await this.findById(id);
    if (current.status === ContentStatus.DRAFT) return current;
    const unpublished = await this.prisma.service.update({
      where: { id },
      data: { status: ContentStatus.DRAFT },
      include: WITH_OFFERINGS,
    });
    await this.record(
      actor,
      'SERVICE_UNPUBLISHED',
      unpublished,
      current.status,
    );
    await this.revalidate(unpublished.slug);
    return unpublished;
  }

  async addOffering(serviceId: string, dto: CreateServiceOfferingDto) {
    const service = await this.findById(serviceId);
    const sortOrder =
      dto.sortOrder ??
      (await this.nextPosition(
        this.prisma.serviceOffering.aggregate({
          where: { serviceId },
          _max: { sortOrder: true },
        }),
      ));
    const offering = await this.prisma.serviceOffering.create({
      data: {
        serviceId,
        titleFr: dto.titleFr,
        titleEn: dto.titleEn,
        descriptionFr: dto.descriptionFr,
        descriptionEn: dto.descriptionEn,
        icon: dto.icon,
        sortOrder,
      },
    });
    await this.revalidateIfPublished(service);
    return offering;
  }

  async updateOffering(
    serviceId: string,
    offeringId: string,
    dto: UpdateServiceOfferingDto,
  ) {
    const service = await this.findById(serviceId);
    await this.findOffering(serviceId, offeringId);
    const offering = await this.prisma.serviceOffering.update({
      where: { id: offeringId },
      data: dto,
    });
    await this.revalidateIfPublished(service);
    return offering;
  }

  async removeOffering(
    actor: AuthenticatedUser,
    serviceId: string,
    offeringId: string,
  ) {
    const service = await this.findById(serviceId);
    const offering = await this.findOffering(serviceId, offeringId);
    await this.prisma.serviceOffering.delete({ where: { id: offeringId } });
    // Suppression de contenu : toujours tracée, avec de quoi retrouver ce qui a disparu.
    await this.audit.record({
      actorId: actor.id,
      action: 'SERVICE_OFFERING_REMOVED',
      entityType: 'ServiceOffering',
      entityId: offeringId,
      before: { service: service.slug, titleFr: offering.titleFr },
    });
    await this.revalidateIfPublished(service);
  }

  /** Ordre des prestations d'un service : la liste complète, appliquée d'un bloc. */
  async reorderOfferings(serviceId: string, ids: string[]) {
    const service = await this.findById(serviceId);
    this.assertSameSet(ids, service.offerings, {
      code: 'SERVICE_OFFERING_ORDER_MISMATCH',
      message:
        'L’ordre doit lister toutes les prestations du service, une fois chacune.',
    });
    await this.prisma.$transaction(
      ids.map((id, position) =>
        this.prisma.serviceOffering.update({
          where: { id },
          data: { sortOrder: position },
        }),
      ),
    );
    await this.revalidateIfPublished(service);
    return this.findById(serviceId);
  }

  /** Une prestation n'est joignable que par son propre service (pas d'IDOR croisé). */
  private async findOffering(serviceId: string, offeringId: string) {
    const offering = await this.prisma.serviceOffering.findFirst({
      where: { id: offeringId, serviceId },
    });
    if (!offering) throw new NotFoundException(OFFERING_NOT_FOUND);
    return offering;
  }

  /** Un nouvel élément se range après les autres (sans trou à combler à la main). */
  private async nextPosition(
    aggregate: Promise<{ _max: { sortOrder: number | null } }>,
  ) {
    const { _max } = await aggregate;
    return (_max.sortOrder ?? -1) + 1;
  }

  /** Le nouvel ordre doit contenir exactement les éléments existants, sans doublon. */
  private assertSameSet(
    ids: string[],
    existing: { id: string }[],
    error: { code: string; message: string },
  ) {
    const known = new Set(existing.map((item) => item.id));
    if (
      ids.length !== known.size ||
      new Set(ids).size !== ids.length ||
      !ids.every((id) => known.has(id))
    ) {
      throw new BadRequestException({ ...error, details: ['ids'] });
    }
  }

  /** Publication et dépublication sont toujours tracées (blueprint/09 §7). */
  private record(
    actor: AuthenticatedUser,
    action: string,
    service: { id: string; slug: string; status: ContentStatus },
    before: ContentStatus,
  ) {
    return this.audit.record({
      actorId: actor.id,
      action,
      entityType: 'Service',
      entityId: service.id,
      before: { status: before, slug: service.slug },
      after: { status: service.status },
    });
  }

  private async revalidateIfPublished(service: {
    slug: string;
    status: ContentStatus;
  }) {
    if (service.status === ContentStatus.PUBLISHED) {
      await this.revalidate(service.slug);
    }
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
