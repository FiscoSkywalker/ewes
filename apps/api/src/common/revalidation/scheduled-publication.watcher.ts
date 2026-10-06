import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { FrontendRevalidator } from './frontend-revalidator.service.js';

/**
 * Durée de cache de repli du site public (1 h) plus une marge : une parution
 * plus ancienne est de toute façon déjà visible, la rattraper n'apporte rien.
 */
export const SCHEDULE_LOOKBACK_MS = 65 * 60_000;

const DEFAULT_INTERVAL_SECONDS = 60;

/**
 * Parution programmée : un contenu publié avec une date future (`publishedAt`)
 * est invisible tant qu'elle n'est pas atteinte (le public filtre sur
 * `publishedAt <= maintenant`), mais personne n'agit à cet instant, donc rien
 * ne demande au site d'invalider son cache — la parution n'apparaîtrait qu'à
 * l'expiration du cache (1 h au plus). Ce service balaie à intervalle régulier
 * les contenus dont la date vient d'être atteinte et revalide leurs tags.
 *
 * - **Sans planificateur tiers** (blueprint/00 §5) : un simple minuteur, une
 *   instance de l'API ; revalider deux fois ne coûte rien.
 * - **Fenêtre glissante** `(dernier balayage, maintenant]`, qui ne s'avance
 *   que si la base a répondu. Au démarrage elle remonte d'une heure pour
 *   rattraper une parution survenue pendant un arrêt de l'API.
 * - **Seules les parutions réellement programmées** sont reprises
 *   (`publishedAt > updatedAt`) : une publication immédiate ou antidatée a déjà
 *   revalidé le site au moment de l'action.
 * - **Un refus du site n'est pas perdu** : le tag reste en attente et est
 *   rejoué à chaque balayage jusqu'à réussite, ou au-delà de la durée du cache.
 *
 * `PUBLICATION_WATCH_INTERVAL_SECONDS` règle l'intervalle (60 s par défaut,
 * `0` désactive la surveillance).
 */
@Injectable()
export class ScheduledPublicationWatcher
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ScheduledPublicationWatcher.name);
  private timer?: NodeJS.Timeout;
  private running = false;
  private checkedUntil = new Date(Date.now() - SCHEDULE_LOOKBACK_MS);
  /** Tags à revalider, avec l'instant où ils sont devenus dus. */
  private readonly pending = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidator: FrontendRevalidator,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const raw = this.config.get<string>('PUBLICATION_WATCH_INTERVAL_SECONDS');
    const seconds =
      raw === undefined || raw === '' ? DEFAULT_INTERVAL_SECONDS : Number(raw);
    if (!Number.isFinite(seconds) || seconds <= 0) {
      this.logger.log(
        'Surveillance des parutions programmées désactivée (PUBLICATION_WATCH_INTERVAL_SECONDS).',
      );
      return;
    }
    if (!this.revalidator.configured) {
      this.logger.warn(
        'WEB_REVALIDATE_URL/REVALIDATE_SECRET non définis : surveillance des parutions programmées désactivée.',
      );
      return;
    }

    this.checkedUntil = new Date(Date.now() - SCHEDULE_LOOKBACK_MS);
    this.timer = setInterval(() => void this.run(), seconds * 1000);
    // Ne retient jamais l'arrêt du processus.
    this.timer.unref();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
    this.timer = undefined;
  }

  /** Un balayage du minuteur : jamais deux à la fois, jamais d'exception qui remonte. */
  private async run() {
    if (this.running) return;
    this.running = true;
    try {
      await this.tick();
    } catch (error) {
      this.logger.warn(
        `Balayage des parutions programmées échoué : ${error instanceof Error ? error.message : 'erreur inconnue'}`,
      );
    } finally {
      this.running = false;
    }
  }

  /**
   * Un balayage : repère les contenus dont la date de parution est atteinte
   * depuis le précédent, puis (re)demande au site de revalider ce qui est en
   * attente. Renvoie les tags devenus dus (utile aux tests).
   */
  async tick(now = new Date()): Promise<string[]> {
    const due = await this.dueTags(this.checkedUntil, now);
    // Avancé seulement après une lecture réussie : sinon la fenêtre est relue.
    this.checkedUntil = now;

    for (const tag of due) {
      if (!this.pending.has(tag)) this.pending.set(tag, now.getTime());
    }
    if (due.length > 0) {
      this.logger.log(
        `Parution programmée atteinte : revalidation du site (${due.join(', ')}).`,
      );
    }

    const expiredBefore = now.getTime() - SCHEDULE_LOOKBACK_MS;
    for (const [tag, dueSince] of this.pending) {
      if (dueSince < expiredBefore) {
        this.pending.delete(tag);
        this.logger.warn(
          `Revalidation de ${tag} abandonnée : le cache du site a expiré de lui-même.`,
        );
      } else if (await this.revalidator.revalidate(tag)) {
        this.pending.delete(tag);
      }
    }
    return due;
  }

  /** Tags des contenus publiés dont la parution programmée tombe dans `(since, until]`. */
  private async dueTags(since: Date, until: Date): Promise<string[]> {
    const visible = { status: ContentStatus.PUBLISHED, deletedAt: null };
    const reached = { publishedAt: { gt: since, lte: until } };
    const [articles, realisations, documents] = await Promise.all([
      this.prisma.article.findMany({
        where: {
          ...visible,
          AND: [
            reached,
            { publishedAt: { gt: this.prisma.article.fields.updatedAt } },
          ],
        },
        select: { slug: true },
      }),
      this.prisma.realisation.findMany({
        where: {
          ...visible,
          AND: [
            reached,
            { publishedAt: { gt: this.prisma.realisation.fields.updatedAt } },
          ],
        },
        select: { slug: true },
      }),
      this.prisma.publicDocument.findMany({
        where: {
          ...visible,
          AND: [
            reached,
            {
              publishedAt: { gt: this.prisma.publicDocument.fields.updatedAt },
            },
          ],
        },
        select: { slug: true },
      }),
    ]);

    const tags = new Set<string>();
    // Les noms de tags sont ceux que les services de chaque contenu envoient
    // déjà à la publication (et que le site accepte, `api/revalidate`).
    for (const { slug } of articles) {
      tags.add(`article:${slug}`).add('articles');
    }
    // `realisations` rafraîchit aussi les chiffres clés, qui comptent les missions.
    for (const { slug } of realisations) {
      tags.add(`realisation:${slug}`).add('realisations');
    }
    for (const { slug } of documents) {
      tags.add(`document:${slug}`).add('documents');
    }
    return [...tags];
  }
}
