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
import { escapeLike } from '../../common/utils/like.js';
import { normalizeSearch } from '../../common/utils/normalize.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { MediaService } from '../media/media.service.js';
import type { CreateRealisationDto } from './dto/create-realisation.dto.js';
import type { SetRealisationDocumentsDto } from './dto/set-realisation-documents.dto.js';
import type { SetRealisationImagesDto } from './dto/set-realisation-images.dto.js';
import type { SetRealisationPartnersDto } from './dto/set-realisation-partners.dto.js';
import type { UpdateRealisationDto } from './dto/update-realisation.dto.js';
import type {
  ListAdminRealisationsDto,
  ListRealisationsDto,
} from './dto/list-realisations.dto.js';
import { MAX_FEATURED_REALISATIONS } from './realisation-types.js';

const PARTNER_COLLATOR = new Intl.Collator('fr', {
  sensitivity: 'base',
  numeric: true,
});

/** Clé de comparaison d'un nom de partenaire : sans espaces en trop ni casse. */
const partnerKey = (name: string) =>
  name.trim().replace(/\s+/g, ' ').toLowerCase();

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

const WITH_RELATIONS = {
  service: { select: { slug: true } },
  // Galerie dans l'ordre d'affichage ; la première image est l'image principale.
  images: {
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, url: true, altFr: true, altEn: true, position: true },
  },
  // Partenaires et bailleurs, dans l'ordre choisi.
  partners: {
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, name: true },
  },
  // Documents associés (un document supprimé n'est plus jamais associé), dans l'ordre choisi.
  documents: {
    where: { publicDocument: { deletedAt: null } },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    select: {
      publicDocument: {
        select: {
          id: true,
          slug: true,
          titleFr: true,
          titleEn: true,
          category: true,
          year: true,
          pages: true,
          status: true,
          publishedAt: true,
          fileUrl: true,
          fileType: true,
          fileSizeBytes: true,
        },
      },
    },
  },
} satisfies Prisma.RealisationInclude;

export type RealisationWithRelations = Prisma.RealisationGetPayload<{
  include: typeof WITH_RELATIONS;
}>;

@Injectable()
export class RealisationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidator: FrontendRevalidator,
    private readonly audit: AuditService,
    private readonly media: MediaService,
  ) {}

  /** Lecture publique : PUBLISHED, non supprimée, date de publication atteinte. */
  private publicWhere(
    query?: ListRealisationsDto,
  ): Prisma.RealisationWhereInput {
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
        include: WITH_RELATIONS,
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
      include: WITH_RELATIONS,
    });
    if (!realisation) throw new NotFoundException(REALISATION_NOT_FOUND);
    return realisation;
  }

  /**
   * Liste d'administration : filtres, recherche et tri au choix. `meta.statuses`
   * compte les fiches de chaque statut, sans tenir compte du filtre de statut
   * lui-même (il alimente les effectifs des onglets) mais en tenant compte de
   * la recherche et des autres filtres.
   */
  async listAdmin(query: ListAdminRealisationsDto) {
    const search = query.q ? escapeLike(query.q) : undefined;
    const base: Prisma.RealisationWhereInput = {
      deletedAt: null,
      ...this.filters(query),
      ...(search && {
        OR: (
          ['titleFr', 'titleEn', 'clientName', 'location', 'slug'] as const
        ).map((field) => ({
          [field]: { contains: search, mode: 'insensitive' as const },
        })),
      }),
    };
    const where: Prisma.RealisationWhereInput = {
      ...base,
      ...(query.status && { status: query.status }),
    };
    // Année et type facultatifs en brouillon : les fiches sans valeur passent toujours en dernier.
    const nullable = (field: 'year' | 'projectType') => ({
      [field]: { sort: query.order, nulls: 'last' as const },
    });
    const primary: Prisma.RealisationOrderByWithRelationInput | undefined =
      query.sort === 'year' || query.sort === 'projectType'
        ? nullable(query.sort)
        : query.sort
          ? { [query.sort]: query.order }
          : undefined;
    const [data, total, groups] = await Promise.all([
      this.prisma.realisation.findMany({
        where,
        include: WITH_RELATIONS,
        // `id` départage les ex æquo : une page ne doit ni répéter ni sauter de ligne.
        orderBy: primary
          ? [primary, { updatedAt: 'desc' }, { id: 'asc' }]
          : PUBLIC_ORDER,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.realisation.count({ where }),
      this.prisma.realisation.groupBy({
        by: ['status'],
        where: base,
        _count: { _all: true },
      }),
    ]);
    const statuses: Partial<Record<ContentStatus, number>> = {};
    for (const group of groups) statuses[group.status] = group._count._all;
    return {
      data,
      meta: { page: query.page, limit: query.limit, total, statuses },
    };
  }

  async findById(id: string) {
    const realisation = await this.prisma.realisation.findFirst({
      where: { id, deletedAt: null },
      include: WITH_RELATIONS,
    });
    if (!realisation) throw new NotFoundException(REALISATION_NOT_FOUND);
    return realisation;
  }

  async create(dto: CreateRealisationDto) {
    await this.assertFeaturedCapacity(null, dto.isFeatured, false);
    try {
      return await this.prisma.realisation.create({
        data: dto,
        include: WITH_RELATIONS,
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
        include: WITH_RELATIONS,
      });
    } catch (error) {
      throw this.translateWriteError(error);
    }
    if (updated.status === ContentStatus.PUBLISHED) {
      await this.revalidate(updated.slug);
    }
    return updated;
  }

  /**
   * Remplace la galerie : l'ordre du tableau est l'ordre d'affichage. Chaque
   * adresse doit désigner une image de la médiathèque (jamais une adresse
   * quelconque : le site l'afficherait telle quelle).
   */
  async setImages(id: string, dto: SetRealisationImagesDto) {
    const current = await this.findById(id);

    const urls = dto.images.map((image) => image.url);
    if (new Set(urls).size !== urls.length) {
      throw new BadRequestException({
        code: 'REALISATION_IMAGE_DUPLICATE',
        message: 'La même image ne peut figurer qu’une fois dans la galerie.',
        details: ['images'],
      });
    }
    for (const url of urls) await this.media.findByUrl(url);

    await this.prisma.$transaction([
      this.prisma.realisationImage.deleteMany({ where: { realisationId: id } }),
      this.prisma.realisationImage.createMany({
        data: dto.images.map((image, position) => ({
          realisationId: id,
          url: image.url,
          altFr: image.altFr?.trim() || null,
          altEn: image.altEn?.trim() || null,
          position,
        })),
      }),
    ]);
    if (current.status === ContentStatus.PUBLISHED) {
      await this.revalidate(current.slug);
    }
    return this.findById(id);
  }

  /**
   * Remplace la liste des partenaires et bailleurs (l'ordre est conservé). Les
   * noms sont nettoyés, et une même organisation n'est gardée qu'une fois.
   */
  async setPartners(id: string, dto: SetRealisationPartnersDto) {
    const current = await this.findById(id);

    const seen = new Set<string>();
    const names: string[] = [];
    for (const raw of dto.partners) {
      const name = raw.trim().replace(/\s+/g, ' ');
      if (!name || seen.has(partnerKey(name))) continue;
      seen.add(partnerKey(name));
      names.push(name);
    }

    await this.prisma.$transaction([
      this.prisma.realisationPartner.deleteMany({
        where: { realisationId: id },
      }),
      this.prisma.realisationPartner.createMany({
        data: names.map((name, position) => ({
          realisationId: id,
          name,
          position,
        })),
      }),
    ]);
    if (current.status === ContentStatus.PUBLISHED) {
      await this.revalidate(current.slug);
    }
    return this.findById(id);
  }

  /** Remplace les documents publics associés (l'ordre est conservé). */
  async setDocuments(id: string, dto: SetRealisationDocumentsDto) {
    const current = await this.findById(id);

    const found = await this.prisma.publicDocument.findMany({
      where: { id: { in: dto.documentIds }, deletedAt: null },
      select: { id: true },
    });
    const known = new Set(found.map((d) => d.id));
    const missing = dto.documentIds.filter(
      (documentId) => !known.has(documentId),
    );
    if (missing.length > 0) {
      throw new NotFoundException({
        code: 'PUBLIC_DOCUMENT_NOT_FOUND',
        message: 'Un document à associer n’existe pas ou a été supprimé.',
        details: missing,
      });
    }

    await this.prisma.$transaction([
      this.prisma.realisationDocument.deleteMany({
        where: { realisationId: id },
      }),
      this.prisma.realisationDocument.createMany({
        data: dto.documentIds.map((publicDocumentId, position) => ({
          realisationId: id,
          publicDocumentId,
          position,
        })),
      }),
    ]);
    if (current.status === ContentStatus.PUBLISHED) {
      await this.revalidate(current.slug);
    }
    return this.findById(id);
  }

  /**
   * Annuaire des partenaires : chaque organisation une seule fois (casse
   * ignorée), avec le nombre de réalisations qui la citent. Sert à l'écran
   * « Partenaires & bailleurs » et à la saisie assistée des fiches.
   */
  async listPartners(q?: string) {
    const rows = await this.prisma.realisationPartner.findMany({
      where: { realisation: { deletedAt: null } },
      select: {
        name: true,
        realisation: { select: { id: true, titleFr: true } },
      },
    });

    const groups = new Map<
      string,
      {
        spellings: Map<string, number>;
        realisations: Map<string, { id: string; titleFr: string }>;
      }
    >();
    for (const row of rows) {
      const key = partnerKey(row.name);
      const group = groups.get(key) ?? {
        spellings: new Map(),
        realisations: new Map(),
      };
      group.spellings.set(row.name, (group.spellings.get(row.name) ?? 0) + 1);
      group.realisations.set(row.realisation.id, row.realisation);
      groups.set(key, group);
    }

    const needle = q ? normalizeSearch(q) : null;
    const data = [...groups.values()]
      .map((group) => {
        // Graphie affichée : la plus employée (à égalité, l'ordre alphabétique).
        const spellings = [...group.spellings.entries()].sort(
          (a, b) => b[1] - a[1] || PARTNER_COLLATOR.compare(a[0], b[0]),
        );
        return {
          name: spellings[0][0],
          // Autres graphies présentes : à unifier par un renommage.
          variants: spellings.slice(1).map(([spelling]) => spelling),
          count: group.realisations.size,
          realisations: [...group.realisations.values()].sort((a, b) =>
            PARTNER_COLLATOR.compare(a.titleFr, b.titleFr),
          ),
        };
      })
      .filter(
        (partner) => !needle || normalizeSearch(partner.name).includes(needle),
      )
      .sort((a, b) => PARTNER_COLLATOR.compare(a.name, b.name));
    return { data, meta: { total: data.length } };
  }

  /**
   * Renomme un partenaire dans toutes les réalisations (corriger une faute,
   * unifier deux graphies). Si le nouveau nom existe déjà dans une réalisation
   * qui citait aussi l'ancien, les deux sont fusionnés.
   */
  async renamePartner(actor: AuthenticatedUser, from: string, to: string) {
    const affected = await this.prisma.realisationPartner.findMany({
      where: { name: { equals: from, mode: 'insensitive' } },
      select: {
        id: true,
        name: true,
        realisationId: true,
        realisation: { select: { slug: true, status: true, deletedAt: true } },
      },
    });
    if (affected.length === 0) {
      throw new NotFoundException({
        code: 'PARTNER_NOT_FOUND',
        message: 'Ce partenaire n’est cité dans aucune réalisation.',
        details: [],
      });
    }
    // Un autre nom déjà présent dans la même fiche : on garde l'existant.
    const targetRows = await this.prisma.realisationPartner.findMany({
      where: {
        realisationId: { in: affected.map((a) => a.realisationId) },
        name: { equals: to, mode: 'insensitive' },
        id: { notIn: affected.map((a) => a.id) },
      },
      select: { realisationId: true },
    });
    const alreadyThere = new Set(targetRows.map((t) => t.realisationId));

    const toMerge = affected.filter((a) => alreadyThere.has(a.realisationId));
    const toRename = affected.filter((a) => !alreadyThere.has(a.realisationId));
    await this.prisma.$transaction([
      this.prisma.realisationPartner.deleteMany({
        where: { id: { in: toMerge.map((a) => a.id) } },
      }),
      this.prisma.realisationPartner.updateMany({
        where: { id: { in: toRename.map((a) => a.id) } },
        data: { name: to },
      }),
    ]);
    await this.audit.record({
      actorId: actor.id,
      action: 'REALISATION_PARTNER_RENAMED',
      entityType: 'RealisationPartner',
      before: { name: from },
      after: {
        name: to,
        realisations: affected.length,
        merged: toMerge.length,
      },
    });
    await this.revalidateMany(affected.map((a) => a.realisation));
    return { updated: toRename.length, merged: toMerge.length };
  }

  /** Retire un partenaire de toutes les réalisations. */
  async removePartner(actor: AuthenticatedUser, name: string) {
    const affected = await this.prisma.realisationPartner.findMany({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: {
        realisation: { select: { slug: true, status: true, deletedAt: true } },
      },
    });
    if (affected.length === 0) {
      throw new NotFoundException({
        code: 'PARTNER_NOT_FOUND',
        message: 'Ce partenaire n’est cité dans aucune réalisation.',
        details: [],
      });
    }
    await this.prisma.realisationPartner.deleteMany({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    await this.audit.record({
      actorId: actor.id,
      action: 'REALISATION_PARTNER_REMOVED',
      entityType: 'RealisationPartner',
      before: { name, realisations: affected.length },
    });
    await this.revalidateMany(affected.map((a) => a.realisation));
    return { removed: affected.length };
  }

  /** Publication explicite ; exige les champs nécessaires au filtrage public. */
  async publish(actor: AuthenticatedUser, id: string) {
    const current = await this.findById(id);
    if (current.status === ContentStatus.PUBLISHED) return current;

    const missing: string[] = [];
    if (!current.titleFr.trim()) missing.push('titleFr');
    if (current.year === null) missing.push('year');
    if (current.projectType === null) missing.push('projectType');
    if (missing.length > 0) {
      throw new UnprocessableEntityException({
        code: 'REALISATION_PUBLISH_INCOMPLETE',
        message:
          'Des champs obligatoires manquent pour publier cette réalisation.',
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
      include: WITH_RELATIONS,
    });
    await this.record(
      actor,
      'REALISATION_PUBLISHED',
      published,
      current.status,
    );
    await this.revalidate(published.slug);
    return published;
  }

  /** Retire immédiatement la fiche du site public (retour en brouillon). */
  unpublish(actor: AuthenticatedUser, id: string) {
    return this.setStatus(
      actor,
      id,
      ContentStatus.DRAFT,
      'REALISATION_UNPUBLISHED',
    );
  }

  /** Dépublie en conservant la fiche pour l'historique interne. */
  archive(actor: AuthenticatedUser, id: string) {
    return this.setStatus(
      actor,
      id,
      ContentStatus.ARCHIVED,
      'REALISATION_ARCHIVED',
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
    const updated = await this.prisma.realisation.update({
      where: { id },
      data: { status },
      include: WITH_RELATIONS,
    });
    await this.record(actor, action, updated, current.status);
    await this.revalidate(updated.slug);
    return updated;
  }

  /**
   * Suppression logique : la fiche disparaît du site et du portail ; la ligne
   * est conservée (historique, audit).
   */
  async remove(actor: AuthenticatedUser, id: string) {
    const current = await this.findById(id);
    await this.prisma.realisation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.record(actor, 'REALISATION_DELETED', current, current.status, {
      deleted: true,
    });
    await this.revalidate(current.slug);
  }

  /** Publication, dépublication, archivage et suppression sont toujours tracés (blueprint/09 §7). */
  private record(
    actor: AuthenticatedUser,
    action: string,
    realisation: { id: string; slug: string; status: ContentStatus },
    before: ContentStatus,
    after: Prisma.InputJsonValue = { status: realisation.status },
  ) {
    return this.audit.record({
      actorId: actor.id,
      action,
      entityType: 'Realisation',
      entityId: realisation.id,
      before: { status: before, slug: realisation.slug },
      after,
    });
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

  /** Revalide les fiches publiées touchées par un changement groupé, et la liste. */
  private async revalidateMany(
    realisations: {
      slug: string;
      status: ContentStatus;
      deletedAt: Date | null;
    }[],
  ) {
    for (const r of realisations) {
      if (r.status === ContentStatus.PUBLISHED && !r.deletedAt) {
        await this.revalidator.revalidate(realisationTag(r.slug));
      }
    }
    await this.revalidator.revalidate(REALISATIONS_LIST_TAG);
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
