import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { FrontendRevalidator } from '../../common/revalidation/frontend-revalidator.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { MediaService } from '../media/media.service.js';
import type { CreateExpertDto } from './dto/create-expert.dto.js';
import type { UpdateExpertDto } from './dto/update-expert.dto.js';
import type { ExpertWithService } from './expert-views.js';

/** Tag de cache du site public. */
export const EXPERTS_TAG = 'experts';

const EXPERT_NOT_FOUND = {
  code: 'EXPERT_NOT_FOUND',
  message: 'Expert introuvable.',
  details: [],
};

const WITH_SERVICE = {
  service: { select: { id: true, slug: true, nameFr: true } },
} satisfies Prisma.ExpertInclude;

const ORDER = [
  { sortOrder: 'asc' },
  { createdAt: 'asc' },
] satisfies Prisma.ExpertOrderByWithRelationInput[];

/** Spécialités nettoyées : espaces normalisés, vides et doublons (casse ignorée) écartés, ordre gardé. */
export function cleanSpecialties(values: string[] | undefined) {
  if (!values) return undefined;
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const value = raw.trim().replace(/\s+/g, ' ');
    const key = value.toLocaleLowerCase('fr');
    if (!value || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

@Injectable()
export class ExpertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidator: FrontendRevalidator,
    private readonly audit: AuditService,
    private readonly media: MediaService,
  ) {}

  /** Lecture publique : seuls les profils publiés, dans l'ordre choisi. */
  listPublished() {
    return this.prisma.expert.findMany({
      where: { status: ContentStatus.PUBLISHED },
      include: WITH_SERVICE,
      orderBy: ORDER,
    });
  }

  list() {
    return this.prisma.expert.findMany({
      include: WITH_SERVICE,
      orderBy: ORDER,
    });
  }

  async findById(id: string): Promise<ExpertWithService> {
    const expert = await this.prisma.expert.findUnique({
      where: { id },
      include: WITH_SERVICE,
    });
    if (!expert) throw new NotFoundException(EXPERT_NOT_FOUND);
    return expert;
  }

  async create(dto: CreateExpertDto) {
    await this.assertReferences(dto);
    const last = await this.prisma.expert.aggregate({
      _max: { sortOrder: true },
    });
    return this.prisma.expert.create({
      data: {
        fullName: dto.fullName,
        roleFr: dto.roleFr,
        roleEn: dto.roleEn,
        bioFr: dto.bioFr,
        bioEn: dto.bioEn,
        specialtiesFr: cleanSpecialties(dto.specialtiesFr),
        specialtiesEn: cleanSpecialties(dto.specialtiesEn),
        yearsOfExperience: dto.yearsOfExperience,
        serviceId: dto.serviceId,
        photoUrl: dto.photoUrl,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
      include: WITH_SERVICE,
    });
  }

  async update(id: string, dto: UpdateExpertDto) {
    const current = await this.findById(id);
    await this.assertReferences(dto);
    const updated = await this.prisma.expert.update({
      where: { id },
      data: {
        fullName: dto.fullName,
        roleFr: dto.roleFr,
        roleEn: dto.roleEn,
        bioFr: dto.bioFr,
        bioEn: dto.bioEn,
        specialtiesFr: cleanSpecialties(dto.specialtiesFr),
        specialtiesEn: cleanSpecialties(dto.specialtiesEn),
        yearsOfExperience: dto.yearsOfExperience,
        serviceId: dto.serviceId,
        photoUrl: dto.photoUrl,
      },
      include: WITH_SERVICE,
    });
    if (current.status === ContentStatus.PUBLISHED) {
      await this.revalidator.revalidate(EXPERTS_TAG);
    }
    return updated;
  }

  async publish(actor: AuthenticatedUser, id: string) {
    const current = await this.findById(id);
    if (current.status === ContentStatus.PUBLISHED) return current;
    const published = await this.prisma.expert.update({
      where: { id },
      data: {
        status: ContentStatus.PUBLISHED,
        publishedAt: current.publishedAt ?? new Date(),
      },
      include: WITH_SERVICE,
    });
    await this.record(actor, 'EXPERT_PUBLISHED', published, current.status);
    await this.revalidator.revalidate(EXPERTS_TAG);
    return published;
  }

  /** Retire immédiatement le profil du site public (retour en brouillon). */
  async unpublish(actor: AuthenticatedUser, id: string) {
    const current = await this.findById(id);
    if (current.status === ContentStatus.DRAFT) return current;
    const unpublished = await this.prisma.expert.update({
      where: { id },
      data: { status: ContentStatus.DRAFT },
      include: WITH_SERVICE,
    });
    await this.record(actor, 'EXPERT_UNPUBLISHED', unpublished, current.status);
    await this.revalidator.revalidate(EXPERTS_TAG);
    return unpublished;
  }

  /** Suppression définitive (aucun autre contenu ne référence un expert) : tracée avec de quoi savoir qui c'était. */
  async remove(actor: AuthenticatedUser, id: string) {
    const current = await this.findById(id);
    await this.prisma.expert.delete({ where: { id } });
    await this.audit.record({
      actorId: actor.id,
      action: 'EXPERT_DELETED',
      entityType: 'Expert',
      entityId: id,
      before: { fullName: current.fullName, status: current.status },
    });
    if (current.status === ContentStatus.PUBLISHED) {
      await this.revalidator.revalidate(EXPERTS_TAG);
    }
  }

  /** Ordre d'affichage : la liste complète, appliquée d'un bloc (jamais à moitié). */
  async reorder(ids: string[]) {
    const existing = await this.prisma.expert.findMany({
      select: { id: true },
    });
    const known = new Set(existing.map((expert) => expert.id));
    if (
      ids.length !== known.size ||
      new Set(ids).size !== ids.length ||
      !ids.every((id) => known.has(id))
    ) {
      throw new BadRequestException({
        code: 'EXPERT_ORDER_MISMATCH',
        message: 'L’ordre doit lister tous les experts, une fois chacun.',
        details: ['ids'],
      });
    }
    await this.prisma.$transaction(
      ids.map((id, position) =>
        this.prisma.expert.update({
          where: { id },
          data: { sortOrder: position },
        }),
      ),
    );
    await this.revalidator.revalidate(EXPERTS_TAG);
    return this.list();
  }

  /** Le portrait doit être une image de la médiathèque et le pôle un service existant. */
  private async assertReferences(dto: {
    photoUrl?: string | null;
    serviceId?: string | null;
  }) {
    if (dto.photoUrl) await this.media.findByUrl(dto.photoUrl);
    if (dto.serviceId) {
      const service = await this.prisma.service.findUnique({
        where: { id: dto.serviceId },
        select: { id: true },
      });
      if (!service) {
        throw new BadRequestException({
          code: 'EXPERT_SERVICE_NOT_FOUND',
          message: 'Ce pôle n’existe pas.',
          details: ['serviceId'],
        });
      }
    }
  }

  /** Publier ou dépublier une personne est toujours tracé (blueprint/09 §7). */
  private record(
    actor: AuthenticatedUser,
    action: string,
    expert: { id: string; fullName: string; status: ContentStatus },
    before: ContentStatus,
  ) {
    return this.audit.record({
      actorId: actor.id,
      action,
      entityType: 'Expert',
      entityId: expert.id,
      before: { status: before, fullName: expert.fullName },
      after: { status: expert.status },
    });
  }
}
