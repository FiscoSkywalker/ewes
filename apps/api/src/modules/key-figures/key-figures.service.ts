import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContentStatus, KeyFigureSource, type KeyFigure } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { FrontendRevalidator } from '../../common/revalidation/frontend-revalidator.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import type { CreateKeyFigureDto } from './dto/create-key-figure.dto.js';
import type { UpdateKeyFigureDto } from './dto/update-key-figure.dto.js';
import {
  displayedValue,
  type KeyFigureWithValue,
  type LiveCounts,
} from './key-figure-views.js';

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
  async listVisible() {
    return this.withValues(
      await this.prisma.keyFigure.findMany({
        where: { isVisible: true },
        orderBy: [...ORDER],
      }),
    );
  }

  async list() {
    return this.withValues(
      await this.prisma.keyFigure.findMany({ orderBy: [...ORDER] }),
    );
  }

  /**
   * Ajoute à chaque chiffre sa valeur affichée. Les comptes de réalisations
   * ne sont demandés à la base que si un chiffre en dépend, et avec les
   * mêmes règles que la lecture publique des réalisations (publiées, non
   * supprimées, date de publication atteinte).
   */
  async withValues(figures: KeyFigure[]): Promise<KeyFigureWithValue[]> {
    const needsCounts = figures.some(
      (figure) =>
        figure.source === KeyFigureSource.MISSIONS ||
        figure.source === KeyFigureSource.TRAININGS,
    );
    const counts: LiveCounts = needsCounts
      ? await this.liveCounts()
      : { missions: 0, trainings: 0 };
    return figures.map((figure) => ({
      ...figure,
      displayedValue: displayedValue(figure, counts),
    }));
  }

  /** Comptes actuels des réalisations publiées (missions, dont formations), tels que les chiffres calculés les affichent. */
  async liveCounts(): Promise<LiveCounts> {
    const published = {
      status: ContentStatus.PUBLISHED,
      deletedAt: null,
      publishedAt: { lte: new Date() },
    };
    const [missions, trainings] = await Promise.all([
      this.prisma.realisation.count({ where: published }),
      this.prisma.realisation.count({
        where: { ...published, projectType: 'FORMATION' },
      }),
    ]);
    return { missions, trainings };
  }

  async findById(id: string) {
    const figure = await this.prisma.keyFigure.findUnique({ where: { id } });
    if (!figure) throw new NotFoundException(KEY_FIGURE_NOT_FOUND);
    return figure;
  }

  async create(actor: AuthenticatedUser, dto: CreateKeyFigureDto) {
    const source = dto.source ?? KeyFigureSource.FIXED;
    const sinceYear = this.resolveYear(source, dto.sinceYear);
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
        source,
        value: dto.value,
        sinceYear,
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
    return (await this.withValues([created]))[0];
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateKeyFigureDto) {
    const current = await this.findById(id);
    // La source et l'année d'arrivée se jugent ensemble : changer l'une sans l'autre doit rester cohérent.
    const source = dto.source ?? current.source;
    const sinceYear = this.resolveYear(
      source,
      dto.sinceYear !== undefined ? dto.sinceYear : current.sinceYear,
    );
    const updated = await this.prisma.keyFigure.update({
      where: { id },
      data: {
        source,
        value: dto.value,
        sinceYear,
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
    return (await this.withValues([updated]))[0];
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

  /**
   * Année de départ à enregistrer : obligatoire (et pas dans le futur, qui
   * donnerait un nombre d'années négatif) pour « années écoulées », sinon
   * effacée — une année orpheline n'a pas de sens pour les autres sources.
   */
  private resolveYear(
    source: KeyFigureSource,
    sinceYear: number | null | undefined,
  ) {
    if (source !== KeyFigureSource.YEARS_SINCE) return null;
    if (sinceYear == null) {
      throw new BadRequestException({
        code: 'KEY_FIGURE_YEAR_REQUIRED',
        message: 'Renseignez l’année de départ.',
        details: ['sinceYear'],
      });
    }
    if (sinceYear > new Date().getFullYear()) {
      throw new BadRequestException({
        code: 'KEY_FIGURE_YEAR_IN_FUTURE',
        message: 'L’année de départ ne peut pas être dans le futur.',
        details: ['sinceYear'],
      });
    }
    return sinceYear;
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
      source: figure.source,
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
