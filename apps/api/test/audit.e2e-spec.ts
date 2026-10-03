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
import { GlobalHttpExceptionFilter } from './../src/common/filters/http-exception.filter.js';
import { createValidationPipe } from './../src/common/pipes/validation.pipe.js';

interface Entry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  beforeData: Record<string, unknown> | null;
  afterData: Record<string, unknown> | null;
  actor: { id: string; fullName: string } | null;
  entity: { label: string | null; slug: string | null; exists: boolean } | null;
  subject: { id: string; fullName: string } | null;
}

/**
 * Journal d'audit (Administrateur uniquement) : les éléments sont nommés (et
 * signalés supprimés), le bénéficiaire d'un droit est nommé, les filtres
 * acceptent plusieurs actions, et les facettes décrivent ce qui existe.
 */
describe('Journal d’audit (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const password = 'correct horse battery staple';
  const stamp = Date.now();
  const tag = `E2E Audit ${stamp}`;
  const adminEmail = `e2e-audit-admin-${stamp}@ewes.example`;
  const gestEmail = `e2e-audit-gest-${stamp}@ewes.example`;
  const adminName = `${tag} Admin`;
  let adminId: string;
  let gestId: string;
  let tAdmin: { Authorization: string };
  let tGest: { Authorization: string };
  const expertIds: string[] = [];

  const api = () => request(app.getHttpServer());
  const login = async (email: string) => ({
    Authorization: `Bearer ${
      (
        await api()
          .post('/api/v1/auth/login')
          .set(
            'X-Forwarded-For',
            `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`,
          )
          .send({ email, password })
          .expect(200)
      ).body.accessToken as string
    }`,
  });
  const logs = (query: string) =>
    api().get(`/api/v1/admin/audit-logs${query}`).set(tAdmin);
  const entries = async (query: string) =>
    (await logs(query).expect(200)).body as {
      data: Entry[];
      meta: { total: number };
    };

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

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        fullName: adminName,
        role: Role.ADMINISTRATEUR,
      },
    });
    const gest = await prisma.user.create({
      data: {
        email: gestEmail,
        passwordHash,
        fullName: `${tag} Gest`,
        role: Role.GESTIONNAIRE,
      },
    });
    adminId = admin.id;
    gestId = gest.id;
    tAdmin = await login(adminEmail);
    tGest = await login(gestEmail);
  });

  afterAll(async () => {
    // Le journal est inaltérable : ses lignes de test restent, rattachées à des éléments jetables.
    await prisma.expert.deleteMany({ where: { id: { in: expertIds } } });
    await prisma.session.deleteMany({
      where: { userId: { in: [adminId, gestId] } },
    });
    await prisma.user.deleteMany({ where: { id: { in: [adminId, gestId] } } });
    await app.close();
  });

  it('is reserved to the Administrateur', async () => {
    await api().get('/api/v1/admin/audit-logs').expect(401);
    await api().get('/api/v1/admin/audit-logs/facets').expect(401);
    for (const path of ['', '/facets']) {
      await api().get(`/api/v1/admin/audit-logs${path}`).set(tGest).expect(403);
    }
  });

  it('names the element, flags a deleted one, and keeps what it was in the before/after values', async () => {
    const createExpert = async (name: string) => {
      const res = await api()
        .post('/api/v1/admin/experts')
        .set(tAdmin)
        .send({ fullName: name, roleFr: 'Ingénieur' })
        .expect(201);
      expertIds.push(res.body.id as string);
      return res.body.id as string;
    };
    const published = await createExpert(`${tag} Publié`);
    await api()
      .post(`/api/v1/admin/experts/${published}/publish`)
      .set(tAdmin)
      .expect(200);
    const doomed = await createExpert(`${tag} Supprimé`);
    await api()
      .delete(`/api/v1/admin/experts/${doomed}`)
      .set(tAdmin)
      .expect(204);

    const { data } = await entries('?entityType=Expert&limit=100');
    const publish = data.find(
      (e) => e.entityId === published && e.action === 'EXPERT_PUBLISHED',
    )!;
    expect(publish.entity).toEqual({
      label: `${tag} Publié`,
      slug: null,
      exists: true,
    });
    expect(publish.actor).toEqual({ id: adminId, fullName: adminName });

    const deleted = data.find(
      (e) => e.entityId === doomed && e.action === 'EXPERT_DELETED',
    )!;
    expect(deleted.entity).toEqual({ label: null, slug: null, exists: false });
    // Même supprimé, on sait qui c'était : le nom est dans les valeurs « avant ».
    expect(deleted.beforeData).toMatchObject({ fullName: `${tag} Supprimé` });
  });

  it('names the account an access right was granted to, and leaves unknown elements unnamed', async () => {
    const folderId = randomUUID();
    const row = await prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'ACCESS_GRANTED',
        entityType: 'Folder',
        entityId: folderId,
        afterData: { userId: gestId, folderId, scope: 'folder' },
      },
    });
    const { data } = await entries(`?entityId=${folderId}`);
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe(row.id);
    expect(data[0].subject).toEqual({ id: gestId, fullName: `${tag} Gest` });
    expect(data[0].entity).toEqual({ label: null, slug: null, exists: false });
    // Une entrée sans élément (ex. action du système) ne produit ni élément ni bénéficiaire.
    const plain = await prisma.auditLog.create({
      data: { actorId: null, action: 'SYSTEM_NOTE', entityType: 'System' },
    });
    const system = (await entries('?action=SYSTEM_NOTE&limit=100')).data.find(
      (e) => e.id === plain.id,
    )!;
    expect(system).toMatchObject({ entity: null, subject: null, actor: null });
  });

  it('keeps the name of a soft-deleted element but marks it gone (no link to offer)', async () => {
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const gone = await prisma.user.create({
      data: {
        email: `e2e-audit-gone-${stamp}@ewes.example`,
        passwordHash,
        fullName: `${tag} Parti`,
        role: Role.UTILISATEUR,
        deletedAt: new Date(),
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'USER_DEACTIVATED',
        entityType: 'User',
        entityId: gone.id,
      },
    });
    const { data } = await entries(`?entityId=${gone.id}`);
    expect(data[0].entity).toEqual({
      label: `${tag} Parti`,
      slug: null,
      exists: false,
    });
    await prisma.user.delete({ where: { id: gone.id } });
  });

  it('filters on several actions at once and rejects a malformed list', async () => {
    const both = await entries(
      '?entityType=Expert&action=EXPERT_PUBLISHED,EXPERT_DELETED&limit=100',
    );
    const actions = new Set(both.data.map((e) => e.action));
    expect(actions).toEqual(new Set(['EXPERT_PUBLISHED', 'EXPERT_DELETED']));
    const one = await entries(
      '?entityType=Expert&action=EXPERT_DELETED&limit=100',
    );
    expect(both.meta.total).toBeGreaterThan(one.meta.total);
    // Une action inconnue est simplement sans résultat ; une liste mal formée est refusée.
    expect(
      (await entries('?action=NOT_AN_ACTION,EXPERT_DELETED&entityType=Expert'))
        .meta.total,
    ).toBe(one.meta.total);
    await logs('?action=expert_deleted').expect(400);
    await logs('?action=EXPERT_DELETED,').expect(400);
    await logs(
      `?action=${Array.from({ length: 41 }, () => 'A').join(',')}`,
    ).expect(400);
  });

  it('describes what exists for the filters', async () => {
    const res = await api()
      .get('/api/v1/admin/audit-logs/facets')
      .set(tAdmin)
      .expect(200);
    const body = res.body as {
      actions: { action: string; count: number }[];
      entityTypes: { entityType: string; count: number }[];
      actors: { id: string; fullName: string }[];
    };
    expect(
      body.actions.find((a) => a.action === 'EXPERT_PUBLISHED')!.count,
    ).toBeGreaterThanOrEqual(1);
    expect(body.entityTypes.map((t) => t.entityType)).toEqual(
      expect.arrayContaining(['Expert', 'Folder']),
    );
    expect(body.actors).toContainEqual({ id: adminId, fullName: adminName });
    // Que des noms : jamais d'e-mail, de hash ou de jeton.
    expect(JSON.stringify(body)).not.toMatch(
      /passwordHash|@ewes\.example|argon2/,
    );
    const sorted = body.actions.map((a) => a.action);
    expect(sorted).toEqual([...sorted].sort());
  });
});
