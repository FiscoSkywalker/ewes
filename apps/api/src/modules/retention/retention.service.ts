import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { monthsBefore } from '../../common/utils/months.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

/**
 * Durées validées avec EWES, annoncées dans la politique de confidentialité
 * (`apps/web/src/lib/legal`) : à changer ensemble, jamais l'une sans l'autre.
 * Volontairement en constantes et non en variables d'environnement.
 */
export const AUDIT_ONLINE_MONTHS = 12;
export const AUDIT_ARCHIVE_MONTHS = 60;
export const CONTACT_RETENTION_MONTHS = 24;

const AUDIT_BATCH = 5_000;
const CONTACT_BATCH = 500;
/** Garde-fou : un balayage ne boucle jamais indéfiniment (le suivant reprend). */
const MAX_BATCHES = 200;

const DEFAULT_INTERVAL_HOURS = 24;
/** Premier balayage peu après le démarrage, pour ne pas ralentir celui-ci. */
const FIRST_RUN_DELAY_MS = 60_000;

export interface RetentionReport {
  auditArchived: number;
  auditPurged: number;
  contactsPurged: number;
}

/**
 * Durées de conservation (blueprint/07_Database_Design.md §6) :
 *
 * - **Journal d'audit** : 12 mois en ligne, puis déplacé — jamais supprimé —
 *   dans `audit_logs_archive`. Le déplacement passe par la fonction SQL
 *   `audit_logs_archive_before()`, la seule voie que le déclencheur de
 *   `audit_logs` accepte ; elle refuse tout ce qui a moins de 12 mois.
 * - **Archive d'audit** : supprimée 5 ans après la date de l'événement, par la
 *   fonction SQL `audit_logs_archive_purge_before()` (seule voie acceptée par le
 *   déclencheur de l'archive ; refuse tout ce qui a moins de 5 ans).
 * - **Messages de contact** : supprimés 24 mois après leur dernière mise à jour
 *   (création ou changement de statut), avec leurs e-mails (alerte à l'équipe et
 *   accusé de réception, qui portent le nom et l'adresse du visiteur).
 *
 * Sans planificateur tiers (blueprint/00 §5) : un minuteur, une instance de
 * l'API ; un balayage est idempotent, donc rejouer ou chevaucher ne coûte rien.
 * `RETENTION_SWEEP_INTERVAL_HOURS` règle l'intervalle (24 par défaut, `0`
 * désactive). Chaque balayage qui a agi laisse une entrée d'audit (nombre
 * seulement, aucune donnée personnelle).
 */
@Injectable()
export class RetentionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RetentionService.name);
  private timer?: NodeJS.Timeout;
  private firstRun?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const raw = this.config.get<string>('RETENTION_SWEEP_INTERVAL_HOURS');
    const hours =
      raw === undefined || raw === '' ? DEFAULT_INTERVAL_HOURS : Number(raw);
    if (!Number.isFinite(hours) || hours <= 0) {
      this.logger.log(
        'Purge et archivage automatiques désactivés (RETENTION_SWEEP_INTERVAL_HOURS).',
      );
      return;
    }
    this.firstRun = setTimeout(() => void this.run(), FIRST_RUN_DELAY_MS);
    this.timer = setInterval(() => void this.run(), hours * 3_600_000);
    // Ne retiennent jamais l'arrêt du processus.
    this.firstRun.unref();
    this.timer.unref();
  }

  onModuleDestroy() {
    clearTimeout(this.firstRun);
    clearInterval(this.timer);
    this.firstRun = this.timer = undefined;
  }

  /** Un balayage du minuteur : jamais deux à la fois, jamais d'exception qui remonte. */
  private async run() {
    if (this.running) return;
    this.running = true;
    try {
      await this.sweep();
    } catch (error) {
      this.logger.warn(
        `Balayage de conservation échoué : ${error instanceof Error ? error.message : 'erreur inconnue'}`,
      );
    } finally {
      this.running = false;
    }
  }

  /** Applique les deux durées. Chaque volet est indépendant : l'échec de l'un ne bloque pas l'autre. */
  async sweep(now = new Date()): Promise<RetentionReport> {
    const report: RetentionReport = {
      auditArchived: 0,
      auditPurged: 0,
      contactsPurged: 0,
    };
    const failures: unknown[] = [];
    try {
      report.auditArchived = await this.archiveAudit(now);
    } catch (error) {
      failures.push(error);
    }
    try {
      report.auditPurged = await this.purgeAuditArchive(now);
    } catch (error) {
      failures.push(error);
    }
    try {
      report.contactsPurged = await this.purgeContacts(now);
    } catch (error) {
      failures.push(error);
    }
    if (failures.length > 0) {
      throw failures[0];
    }
    return report;
  }

  /** Déplace vers l'archive les entrées d'audit de plus de 12 mois ; renvoie leur nombre. */
  async archiveAudit(now = new Date()): Promise<number> {
    const cutoff = monthsBefore(now, AUDIT_ONLINE_MONTHS);
    let total = 0;
    for (let i = 0; i < MAX_BATCHES; i++) {
      // ISO avec « Z » : indépendant du fuseau de la session PostgreSQL.
      const [row] = await this.prisma.$queryRaw<{ moved: number }[]>(
        Prisma.sql`SELECT audit_logs_archive_before(${cutoff.toISOString()}::timestamptz, ${AUDIT_BATCH}::integer) AS moved`,
      );
      const moved = Number(row?.moved ?? 0);
      total += moved;
      if (moved < AUDIT_BATCH) break;
    }
    if (total > 0) {
      this.logger.log(
        `${total} entrée(s) du journal d'audit archivée(s) (antérieures au ${cutoff.toISOString().slice(0, 10)}).`,
      );
      await this.audit.record({
        actorId: null,
        action: 'RETENTION_AUDIT_ARCHIVED',
        entityType: 'AuditLog',
        after: { count: total, olderThan: cutoff.toISOString().slice(0, 10) },
      });
    }
    return total;
  }

  /** Supprime de l'archive les entrées d'audit de plus de 5 ans ; renvoie leur nombre. */
  async purgeAuditArchive(now = new Date()): Promise<number> {
    const cutoff = monthsBefore(now, AUDIT_ARCHIVE_MONTHS);
    let total = 0;
    for (let i = 0; i < MAX_BATCHES; i++) {
      const [row] = await this.prisma.$queryRaw<{ purged: number }[]>(
        Prisma.sql`SELECT audit_logs_archive_purge_before(${cutoff.toISOString()}::timestamptz, ${AUDIT_BATCH}::integer) AS purged`,
      );
      const purged = Number(row?.purged ?? 0);
      total += purged;
      if (purged < AUDIT_BATCH) break;
    }
    if (total > 0) {
      this.logger.log(
        `${total} entrée(s) de l'archive d'audit supprimée(s) (antérieures au ${cutoff.toISOString().slice(0, 10)}).`,
      );
      await this.audit.record({
        actorId: null,
        action: 'RETENTION_AUDIT_PURGED',
        entityType: 'AuditLog',
        after: { count: total, olderThan: cutoff.toISOString().slice(0, 10) },
      });
    }
    return total;
  }

  /** Supprime les messages de contact (et leurs e-mails) inactifs depuis plus de 24 mois. */
  async purgeContacts(now = new Date()): Promise<number> {
    const cutoff = monthsBefore(now, CONTACT_RETENTION_MONTHS);
    let total = 0;
    for (let i = 0; i < MAX_BATCHES; i++) {
      const due = await this.prisma.contactMessage.findMany({
        where: { updatedAt: { lt: cutoff } },
        select: { id: true },
        orderBy: { updatedAt: 'asc' },
        take: CONTACT_BATCH,
      });
      if (due.length === 0) break;
      const ids = due.map((message) => message.id);
      // Mêmes clés d'idempotence que `ContactService.notify`.
      const mailKeys = ids.flatMap((id) => [
        `contact:${id}:team`,
        `contact:${id}:ack`,
      ]);
      await this.prisma.$transaction([
        this.prisma.notification.deleteMany({
          where: { idempotencyKey: { in: mailKeys } },
        }),
        this.prisma.contactMessage.deleteMany({ where: { id: { in: ids } } }),
      ]);
      total += ids.length;
      if (ids.length < CONTACT_BATCH) break;
    }
    if (total > 0) {
      this.logger.log(
        `${total} message(s) de contact supprimé(s) (inactifs depuis le ${cutoff.toISOString().slice(0, 10)}).`,
      );
      await this.audit.record({
        actorId: null,
        action: 'RETENTION_CONTACTS_PURGED',
        entityType: 'ContactMessage',
        after: { count: total, olderThan: cutoff.toISOString().slice(0, 10) },
      });
    }
    return total;
  }
}
