import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { KeyFigure } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { FrontendRevalidator } from '../../common/revalidation/frontend-revalidator.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import type { CreateKeyFigureDto } from './dto/create-key-figure.dto.js';
import type { UpdateKeyFigureDto } from './dto/update-key-figure.dto.js';

/** Tag de cache du site public. */
export const KEY_FIGURES_TAG = 'key-figures';

/** Au-delà, la bande de chiffres de la page À propos cesse d'être lisible d'un coup d'œil. */
export const MAX_KEY_FIGURES = 8;

const KEY_FIGURE_NOT_FOUND = {
  code: 'KEY_FIGURE_NOT_FOUND',
  message: 'Chiffre clé introuvable.',
  details: [],
};

const ORDER = [{ sortOrder: 'asc' }, { createdAt: 'asc' }] as const;

@Injectable()
export class KeyFiguresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidator: FrontendRevalidator,
    private readonly audit: AuditService,
  ) {}

  /** Lecture publique : seuls les chiffres visibles, dans l'ordre choisi. */
  listVisible() {
    return this.prisma.keyFigure.findMany({
      where: { isVisible: true },
      orderBy: [...ORDER],
    });
  }

  list() {
    return this.prisma.keyFigure.findMany({ orderBy: [...ORDER] });
  }

  async findById(id: string) {
    const figure = await this.prisma.keyFigure.findUnique({ where: { id } });
    if (!figure) throw new NotFoundException(KEY_FIGURE_NOT_FOUND);
    return figure;
  }

  async create(actor: AuthenticatedUser, dto: CreateKeyFigureDto) {
    this.assertYear(dto.sinceYear);
    const [count, last] = await Promise.all([
      this.prisma.keyFigure.count(),
      this.prisma.keyFigure.aggregate({ _max: { sortOrder: true } }),
    ]);
    if (count >= MAX_KEY_FIGURES) {
      throw new ConflictException({
        code: 'KEY_FIGURE_LIMIT',
        message: `Au plus ${MAX_KEY_FIGURES} chiffres clés peuvent être enregistrés : retirez-en un avant d’en ajouter.`,
        details: [],
      });
    }
    const created = await this.prisma.keyFigure.create({
      data: {
        value: dto.value,
        sinceYear: dto.sinceYear,
        suffixFr: dto.suffixFr,
        suffixEn: dto.suffixEn,
        labelFr: dto.labelFr,
        labelEn: dto.labelEn,
        subtextFr: dto.subtextFr,
        subtextEn: dto.subtextEn,
        isVisible: dto.isVisible,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
    });
    await this.record(actor, 'KEY_FIGURE_CREATED', created, null);
    await this.revalidator.revalidate(KEY_FIGURES_TAG);
    return created;
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateKeyFigureDto) {
    const current = await this.findById(id);
    this.assertYear(dto.sinceYear);
    const updated = await this.prisma.keyFigure.update({
      where: { id },
      data: {
        value: dto.value,
        sinceYear: dto.sinceYear,
        suffixFr: dto.suffixFr,
        suffixEn: dto.suffixEn,
        labelFr: dto.labelFr,
        labelEn: dto.labelEn,
        subtextFr: dto.subtextFr,
        subtextEn: dto.subtextEn,
        isVisible: dto.isVisible,
      },
    });
    await this.record(actor, 'KEY_FIGURE_UPDATED', updated, current);
    await this.revalidator.revalidate(KEY_FIGURES_TAG);
    return updated;
  }

  async remove(actor: AuthenticatedUser, id: string) {
    const current = await this.findById(id);
    await this.prisma.keyFigure.delete({ where: { id } });
    await this.record(actor, 'KEY_FIGURE_DELETED', null, current);
    await this.revalidator.revalidate(KEY_FIGURES_TAG);
  }

  /** Ordre d'affichage : la liste complète, appliquée d'un bloc (jamais à moitié). */
  async reorder(ids: string[]) {
    const existing = await this.prisma.keyFigure.findMany({
      select: { id: true },
    });
    const known = new Set(existing.map((figure) => figure.id));
    if (
      ids.length !== known.size ||
      new Set(ids).size !== ids.length ||
      !ids.every((id) => known.has(id))
    ) {
      throw new BadRequestException({
        code: 'KEY_FIGURE_ORDER_MISMATCH',
        message: 'L’ordre doit lister tous les chiffres clés, une fois chacun.',
        details: ['ids'],
      });
    }
    await this.prisma.$transaction(
      ids.map((id, position) =>
        this.prisma.keyFigure.update({
          where: { id },
          data: { sortOrder: position },
        }),
      ),
    );
    await this.revalidator.revalidate(KEY_FIGURES_TAG);
    return this.list();
  }

  /** Une année de départ dans le futur donnerait un nombre d'années négatif. */
  private assertYear(sinceYear: number | null | undefined) {
    if (sinceYear != null && sinceYear > new Date().getFullYear()) {
      throw new BadRequestException({
        code: 'KEY_FIGURE_YEAR_IN_FUTURE',
        message: 'L’année de départ ne peut pas être dans le futur.',
        details: ['sinceYear'],
      });
    }
  }

  /**
   * Un chiffre est affiché tel quel aux visiteurs : toute création,
   * modification et suppression est tracée, avec ce qui a changé.
   */
  private record(
    actor: AuthenticatedUser,
    action: string,
    after: KeyFigure | null,
    before: KeyFigure | null,
  ) {
    const summary = (figure: KeyFigure) => ({
      labelFr: figure.labelFr,
      value: figure.value,
      sinceYear: figure.sinceYear,
      isVisible: figure.isVisible,
    });
    return this.audit.record({
      actorId: actor.id,
      action,
      entityType: 'KeyFigure',
      entityId: (after ?? before)?.id,
      before: before ? summary(before) : undefined,
      after: after ? summary(after) : undefined,
    });
  }
}
