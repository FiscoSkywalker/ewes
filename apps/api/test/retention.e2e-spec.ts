import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { Role } from '@prisma/client';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { RetentionService } from './../src/modules/retention/retention.service.js';
import { monthsBefore } from './../src/common/utils/months.js';
import { GlobalHttpExceptionFilter } from './../src/common/filters/http-exception.filter.js';
import { createValidationPipe } from './../src/common/pipes/validation.pipe.js';

/**
 * Durées de conservation : le journal d'audit passe en archive après 12 mois
 * (sans jamais perdre une ligne ni pouvoir être effacé autrement), les messages
 * de contact disparaissent après 24 mois avec leurs e-mails, et le journal
 * courant se lit vite (index + facettes mises en cache).
 */
describe('Conservation des données (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let retention: RetentionService;

  const password = 'correct horse battery staple';
  const stamp = Date.now();
  const adminEmail = `e2e-retention-admin-${stamp}@ewes.example`;
  // Codes d'action propres à cette suite : aucune autre ne les voit. Lettres seules
  // (le filtre `action` de l'API n'accepte que A-Z et « _ »).
  const letters = String(stamp).replace(/\d/g, (d) => 'ABCDEFGHIJ'[Number(d)]);
  const OLD = `RETENTION_OLD_${letters}`;
  const RECENT = `RETENTION_RECENT_${letters}`;
  const PURGE = `RETENTION_PURGE_${letters}`;
  let adminId: string;
  let tAdmin: { Authorization: string };
  const contactIds: string[] = [];

  const api = () => request(app.getHttpServer());
  const now = new Date();
  const ago = (months: number, extraDays = 0) =>
    new Date(monthsBefore(now, months).getTime() - extraDays * 86_400_000);

  const addAudit = (action: string, createdAt: Date, actorId?: string) =>
    prisma.auditLog.create({
      data: { action, entityType: 'E2eRetention', createdAt, actorId },
    });

  const addContact = async (updatedAt: Date, createdAt = updatedAt) => {
    const id = randomUUID();
    contactIds.push(id);
    await prisma.contactMessage.create({
      data: {
        id,
        name: `E2E Retention ${stamp}`,
        email: `retention-${id}@ewes.example`,
        message: 'Message de test de conservation',
        createdAt,
        updatedAt,
      },
    });
    for (const key of ['team', 'ack']) {
      await prisma.notification.create({
        data: {
          recipientEmail: `retention-${id}@ewes.example`,
          type: key === 'team' ? 'CONTACT_RECEIVED' : 'CONTACT_ACKNOWLEDGEMENT',
          idempotencyKey: `contact:${id}:${key}`,
          payload: { subject: 'x', text: 'y' },
        },
      });
    }
    return id;
  };
  const contactExists = async (id: string) =>
    (await prisma.contactMessage.count({ where: { id } })) === 1;
  const mailsOf = (id: string) =>
    prisma.notification.count({
      where: { idempotencyKey: { startsWith: `contact:${id}:` } },
    });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new GlobalHttpExceptionFilter());
    app.useGlobalPipes(createValidationPipe());
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
    await app.init();
    prisma = app.get(PrismaService);
    retention = app.get(RetentionService);

    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
        fullName: `E2E Retention ${stamp} Admin`,
        role: Role.ADMINISTRATEUR,
      },
    });
    adminId = admin.id;
    const res = await api()
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', `10.8.${stamp % 250}.${(stamp >> 3) % 250}`)
      .send({ email: adminEmail, password })
      .expect(200);
    tAdmin = { Authorization: `Bearer ${res.body.accessToken as string}` };
  });

  afterAll(async () => {
    // Journal et archive sont inaltérables : leurs lignes de test restent (codes d'action dédiés).
    await prisma.notification.deleteMany({
      where: {
        OR: contactIds.map((id) => ({
          idempotencyKey: { startsWith: `contact:${id}:` },
        })),
      },
    });
    await prisma.contactMessage.deleteMany({
      where: { id: { in: contactIds } },
    });
    await prisma.session.deleteMany({ where: { userId: adminId } });
    await prisma.user.deleteMany({ where: { id: adminId } });
    await app.close();
  });

  describe('journal d’audit', () => {
    it('serves the default view (newest first) from an index, on the journal and on the archive', async () => {
      const indexes = await prisma.$queryRaw<{ indexdef: string }[]>`
        SELECT indexdef FROM pg_indexes
        WHERE tablename IN ('audit_logs', 'audit_logs_archive')
          AND indexdef LIKE '%("createdAt" DESC, id DESC)%'`;
      expect(indexes).toHaveLength(2);
    });

    it('moves entries older than 12 months to the archive, losing none and leaving the rest', async () => {
      const old1 = await addAudit(OLD, ago(12, 1), adminId);
      const old2 = await addAudit(OLD, ago(30));
      const recent = await addAudit(RECENT, ago(11));
      const justInside = await addAudit(RECENT, ago(12, -1));

      const report = await retention.sweep(now);
      expect(report.auditArchived).toBeGreaterThanOrEqual(2);

      const archived = await prisma.auditLogArchive.findMany({
        where: { id: { in: [old1.id, old2.id] } },
      });
      expect(archived.map((row) => row.id).sort()).toEqual(
        [old1.id, old2.id].sort(),
      );
      // Copie fidèle : date d'origine et auteur conservés.
      const copy = archived.find((row) => row.id === old1.id)!;
      expect(copy.createdAt).toEqual(old1.createdAt);
      expect(copy.actorId).toBe(adminId);

      expect(
        await prisma.auditLog.count({
          where: { id: { in: [old1.id, old2.id] } },
        }),
      ).toBe(0);
      expect(
        await prisma.auditLog.count({
          where: { id: { in: [recent.id, justInside.id] } },
        }),
      ).toBe(2);
      expect(
        await prisma.auditLogArchive.count({
          where: { id: { in: [recent.id, justInside.id] } },
        }),
      ).toBe(0);

      // Une seconde passe n'a plus rien à déplacer pour nos lignes.
      await retention.sweep(now);
      expect(
        await prisma.auditLogArchive.count({ where: { action: OLD } }),
      ).toBe(2);
    });

    it('leaves a trace of the archiving, without personal data', async () => {
      await addAudit(OLD, ago(40));
      await retention.sweep(now);
      const trace = await prisma.auditLog.findFirst({
        where: { action: 'RETENTION_AUDIT_ARCHIVED' },
        orderBy: { createdAt: 'desc' },
      });
      expect(trace).toMatchObject({ actorId: null, entityType: 'AuditLog' });
      expect(Object.keys(trace!.afterData as object).sort()).toEqual([
        'count',
        'olderThan',
      ]);
    });

    it('stays write-only: no direct delete, no update, no early archiving', async () => {
      const live = await addAudit(RECENT, ago(1));
      await expect(
        prisma.auditLog.delete({ where: { id: live.id } }),
      ).rejects.toThrow(/écriture seule/);
      await expect(
        prisma.auditLog.update({
          where: { id: live.id },
          data: { action: 'X' },
        }),
      ).rejects.toThrow(/écriture seule/);

      const archived = await prisma.auditLogArchive.findFirstOrThrow({
        where: { action: OLD },
      });
      await expect(
        prisma.auditLogArchive.delete({ where: { id: archived.id } }),
      ).rejects.toThrow(/écriture seule/);
      await expect(
        prisma.auditLogArchive.update({
          where: { id: archived.id },
          data: { action: 'X' },
        }),
      ).rejects.toThrow(/écriture seule/);
      await expect(
        prisma.$executeRaw`TRUNCATE "audit_logs_archive"`,
      ).rejects.toThrow(/écriture seule/);

      // La base elle-même refuse d'archiver ce qui a moins de 12 mois.
      await expect(
        prisma.$queryRaw`SELECT audit_logs_archive_before(${ago(11).toISOString()}::timestamptz, 10)`,
      ).rejects.toThrow(/plus de 12 mois/);
      expect(await prisma.auditLog.count({ where: { id: live.id } })).toBe(1);
    });

    it('purges the archive 5 years after the event, and only then', async () => {
      const addArchived = (createdAt: Date) =>
        prisma.auditLogArchive.create({
          data: {
            id: randomUUID(),
            action: PURGE,
            entityType: 'E2eRetention',
            createdAt,
          },
        });
      const expired = await addArchived(ago(60, 1));
      const longGone = await addArchived(ago(90));
      const justInside = await addArchived(ago(60, -1));
      const recentlyArchived = await addArchived(ago(20));

      const report = await retention.sweep(now);
      expect(report.auditPurged).toBeGreaterThanOrEqual(2);

      const left = await prisma.auditLogArchive.findMany({
        where: { action: PURGE },
        select: { id: true },
      });
      expect(left.map((row) => row.id).sort()).toEqual(
        [justInside.id, recentlyArchived.id].sort(),
      );
      expect(left.map((row) => row.id)).not.toContain(expired.id);
      expect(left.map((row) => row.id)).not.toContain(longGone.id);

      const trace = await prisma.auditLog.findFirst({
        where: { action: 'RETENTION_AUDIT_PURGED' },
        orderBy: { createdAt: 'desc' },
      });
      expect(trace).toMatchObject({ actorId: null, entityType: 'AuditLog' });
      expect(Object.keys(trace!.afterData as object).sort()).toEqual([
        'count',
        'olderThan',
      ]);
    });

    it('refuses to purge the archive earlier than 5 years, and the live journal at any age', async () => {
      await expect(
        prisma.$queryRaw`SELECT audit_logs_archive_purge_before(${ago(59).toISOString()}::timestamptz, 10)`,
      ).rejects.toThrow(/plus de 5 ans/);
      const old = await addAudit(RECENT, ago(70));
      await expect(
        prisma.auditLog.delete({ where: { id: old.id } }),
      ).rejects.toThrow(/écriture seule/);
      // L'archivage, lui, la déplace (jamais supprimée dans le journal courant).
      await retention.sweep(now);
      expect(await prisma.auditLog.count({ where: { id: old.id } })).toBe(0);
    });

    it('lets the Administrateur read the archive, with the same filters', async () => {
      const current = await api()
        .get(`/api/v1/admin/audit-logs?action=${OLD}`)
        .set(tAdmin)
        .expect(200);
      expect(current.body.meta.total).toBe(0);

      const archive = await api()
        .get(`/api/v1/admin/audit-logs?archived=true&action=${OLD}&limit=100`)
        .set(tAdmin)
        .expect(200);
      expect(archive.body.meta.total).toBeGreaterThanOrEqual(3);
      const withActor = (
        archive.body.data as { actor: { id: string } | null }[]
      ).find((row) => row.actor);
      expect(withActor?.actor?.id).toBe(adminId);

      await api()
        .get('/api/v1/admin/audit-logs?archived=maybe')
        .set(tAdmin)
        .expect(400);
      await api().get('/api/v1/admin/audit-logs?archived=true').expect(401);
    });
  });

  describe('facettes', () => {
    interface Body {
      actions: { action: string; count: number }[];
    }
    const facets = async (archived = false) =>
      (
        await api()
          .get(
            `/api/v1/admin/audit-logs/facets${archived ? '?archived=true' : ''}`,
          )
          .set(tAdmin)
          .expect(200)
      ).body as Body;
    const countOf = (body: Body, action: string) =>
      body.actions.find((entry) => entry.action === action)?.count ?? 0;

    it('are computed once, then served from memory until the journal is written', async () => {
      const model = prisma.auditLog as unknown as {
        groupBy: (...args: unknown[]) => unknown;
      };
      const original = model.groupBy;
      let calls = 0;
      model.groupBy = (...args: unknown[]) => {
        calls += 1;
        return original.apply(model, args);
      };
      try {
        await facets();
        const afterFirst = calls;
        expect(afterFirst).toBeGreaterThan(0);
        await facets();
        await facets();
        expect(calls).toBe(afterFirst);

        // Une écriture d'audit (ici, une connexion) invalide : le nouvel effectif est visible aussitôt.
        const before = countOf(await facets(), 'AUTH_LOGIN_SUCCEEDED');
        await api()
          .post('/api/v1/auth/login')
          .set('X-Forwarded-For', `10.7.${stamp % 250}.${(stamp >> 2) % 250}`)
          .send({ email: adminEmail, password })
          .expect(200);
        expect(countOf(await facets(), 'AUTH_LOGIN_SUCCEEDED')).toBe(
          before + 1,
        );
        expect(calls).toBeGreaterThan(afterFirst);
      } finally {
        model.groupBy = original;
      }
    });

    it('describe the archive separately from the current journal', async () => {
      expect(countOf(await facets(true), OLD)).toBeGreaterThanOrEqual(3);
      expect(countOf(await facets(false), OLD)).toBe(0);
      expect(countOf(await facets(false), RECENT)).toBeGreaterThanOrEqual(3);
    });
  });

  describe('messages de contact', () => {
    it('deletes messages inactive for 24 months along with their e-mails, and nothing else', async () => {
      const expired = await addContact(ago(24, 1));
      const longGone = await addContact(ago(40));
      const justInside = await addContact(ago(24, -2));
      // Écrit il y a longtemps mais encore suivi récemment : le « dernier échange » est récent.
      const stillFollowed = await addContact(ago(1), ago(30));

      const report = await retention.sweep(now);
      expect(report.contactsPurged).toBeGreaterThanOrEqual(2);

      for (const id of [expired, longGone]) {
        expect(await contactExists(id)).toBe(false);
        expect(await mailsOf(id)).toBe(0);
      }
      for (const id of [justInside, stillFollowed]) {
        expect(await contactExists(id)).toBe(true);
        expect(await mailsOf(id)).toBe(2);
      }

      const trace = await prisma.auditLog.findFirst({
        where: { action: 'RETENTION_CONTACTS_PURGED' },
        orderBy: { createdAt: 'desc' },
      });
      expect(trace).toMatchObject({
        actorId: null,
        entityType: 'ContactMessage',
      });
      expect(JSON.stringify(trace?.afterData)).not.toContain('@');
    });

    it('treats a status change as the last exchange', async () => {
      const id = await addContact(ago(25));
      await prisma.contactMessage.update({
        where: { id },
        data: { status: 'TRAITE' },
      });
      await retention.sweep(now);
      expect(await contactExists(id)).toBe(true);
    });
  });

  describe('minuteur', () => {
    const timerOf = (config: Record<string, string | undefined>) => {
      const service = new RetentionService(
        prisma,
        app.get(RetentionService)['audit'],
        { get: (key: string) => config[key] } as never,
      );
      service.onModuleInit();
      return service;
    };

    it('stays off when the interval is 0 or invalid', () => {
      for (const value of ['0', '-1', 'abc']) {
        const service = timerOf({ RETENTION_SWEEP_INTERVAL_HOURS: value });
        expect(service['timer']).toBeUndefined();
        service.onModuleDestroy();
      }
    });

    it('starts by default (every 24 h) and stops on destroy', () => {
      const service = timerOf({});
      expect(service['timer']).toBeDefined();
      expect(service['firstRun']).toBeDefined();
      service.onModuleDestroy();
      expect(service['timer']).toBeUndefined();
    });
  });
});
