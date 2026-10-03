import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import * as argon2 from 'argon2';
import { Role } from '@prisma/client';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { GlobalHttpExceptionFilter } from './../src/common/filters/http-exception.filter.js';
import { MAX_KEY_FIGURES } from './../src/modules/key-figures/key-figures.service.js';

/**
 * Cas de régression : un chiffre masqué n'est jamais exposé publiquement,
 * la valeur calculée suit l'année courante, les mutations sont réservées aux
 * rôles éditoriaux et tracées (blueprint/17_Testing_Strategy.md §3).
 */
describe('Key figures (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const password = 'correct horse battery staple';
  const stamp = Date.now();
  const prefix = `e2e-kf-${stamp}`;
  const gestionnaireEmail = `e2e-kf-gest-${stamp}@ewes.example`;
  const userEmail = `e2e-kf-user-${stamp}@ewes.example`;
  let auth: { Authorization: string };

  // Un jeton par compte : la connexion a sa propre limite de fréquence stricte.
  async function login(email: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return res.body.accessToken as string;
  }

  const create = (body: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post('/api/v1/admin/key-figures')
      .set(auth)
      .send({ value: 1, labelFr: `${prefix} libellé`, ...body });

  const publicLabels = async () =>
    (
      (
        await request(app.getHttpServer())
          .get('/api/v1/key-figures')
          .expect(200)
      ).body.data as { labelFr: string }[]
    ).map((figure) => figure.labelFr);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new GlobalHttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
    });
    await prisma.user.create({
      data: {
        email: gestionnaireEmail,
        passwordHash,
        fullName: 'E2E KF Gestionnaire',
        role: Role.GESTIONNAIRE,
      },
    });
    await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash,
        fullName: 'E2E KF User',
        role: Role.UTILISATEUR,
      },
    });
    auth = { Authorization: `Bearer ${await login(gestionnaireEmail)}` };
  });

  // Chaque cas repart des seuls chiffres réels : le plafond est partagé par toute la table.
  afterEach(async () => {
    await prisma.keyFigure.deleteMany({
      where: { labelFr: { startsWith: prefix } },
    });
  });

  afterAll(async () => {
    await prisma.keyFigure.deleteMany({
      where: { labelFr: { startsWith: prefix } },
    });
    await prisma.session.deleteMany({
      where: { user: { email: { in: [gestionnaireEmail, userEmail] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [gestionnaireEmail, userEmail] } },
    });
    await app.close();
  });

  it('rejects unauthenticated and under-privileged access to admin routes', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/key-figures')
      .expect(401);

    const userToken = await login(userEmail);
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/key-figures')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ value: 1, labelFr: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN_ROLE');
  });

  it('appends new figures last, hides a hidden figure publicly and exposes no internal field', async () => {
    const a = await create({
      labelFr: `${prefix} A`,
      labelEn: 'A en',
      suffixFr: 'pays',
      suffixEn: 'countries',
      subtextFr: 'précision',
      value: 7,
    }).expect(201);
    const b = await create({
      labelFr: `${prefix} B`,
      isVisible: false,
    }).expect(201);
    expect(b.body.sortOrder).toBe(a.body.sortOrder + 1);

    const list = await request(app.getHttpServer())
      .get('/api/v1/key-figures')
      .expect(200);
    const labels = list.body.data.map((f: { labelFr: string }) => f.labelFr);
    expect(labels).toContain(`${prefix} A`);
    // Masqué : conservé pour le portail, jamais exposé au public.
    expect(labels).not.toContain(`${prefix} B`);
    const shown = list.body.data.find(
      (f: { labelFr: string }) => f.labelFr === `${prefix} A`,
    );
    expect(shown).toEqual({
      value: 7,
      suffixFr: 'pays',
      suffixEn: 'countries',
      labelFr: `${prefix} A`,
      labelEn: 'A en',
      subtextFr: 'précision',
      subtextEn: null,
    });

    const admin = await request(app.getHttpServer())
      .get('/api/v1/admin/key-figures')
      .set(auth)
      .expect(200);
    expect(admin.body.some((f: { id: string }) => f.id === b.body.id)).toBe(
      true,
    );

    // Rendre visible un chiffre masqué le publie aussitôt.
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/key-figures/${b.body.id}`)
      .set(auth)
      .send({ isVisible: true })
      .expect(200);
    expect(await publicLabels()).toContain(`${prefix} B`);
  });

  it('computes the displayed value from a start year, recalculated on every read', async () => {
    const year = new Date().getFullYear();
    const res = await create({
      labelFr: `${prefix} années`,
      value: 99,
      sinceYear: year - 5,
    }).expect(201);
    expect(res.body.displayedValue).toBe(5);

    const shown = (
      await request(app.getHttpServer()).get('/api/v1/key-figures').expect(200)
    ).body.data.find(
      (f: { labelFr: string }) => f.labelFr === `${prefix} années`,
    );
    // La valeur saisie (99) est ignorée ; l'année de départ n'est pas exposée.
    expect(shown.value).toBe(5);
    expect(shown).not.toHaveProperty('sinceYear');

    // Repasser à une valeur fixe (`null`) rend la valeur saisie.
    const fixed = await request(app.getHttpServer())
      .patch(`/api/v1/admin/key-figures/${res.body.id}`)
      .set(auth)
      .send({ sinceYear: null })
      .expect(200);
    expect(fixed.body.displayedValue).toBe(99);

    // Une année dans le futur donnerait un nombre d'années négatif.
    const future = await create({
      labelFr: `${prefix} futur`,
      sinceYear: year + 1,
    });
    expect(future.status).toBe(400);
    expect(future.body.code).toBe('KEY_FIGURE_YEAR_IN_FUTURE');
  });

  it('validates the body', async () => {
    for (const body of [
      { labelFr: '' },
      { value: -1 },
      { value: 1.5 },
      { value: 2_000_000 },
      { suffixFr: 'x'.repeat(21) },
      { labelFr: 'x'.repeat(121) },
      { isVisible: 'oui' },
    ]) {
      const res = await create(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
    }
  });

  it('applies a full order atomically and refuses an incomplete one', async () => {
    const ids = async () =>
      (
        await request(app.getHttpServer())
          .get('/api/v1/admin/key-figures')
          .set(auth)
          .expect(200)
      ).body.map((f: { id: string }) => f.id) as string[];

    const [x, y] = [
      (await create({ labelFr: `${prefix} X` }).expect(201)).body.id,
      (await create({ labelFr: `${prefix} Y` }).expect(201)).body.id,
    ];
    const before = await ids();
    const swapped = before.map((id) => (id === x ? y : id === y ? x : id));
    await request(app.getHttpServer())
      .put('/api/v1/admin/key-figures/order')
      .set(auth)
      .send({ ids: swapped })
      .expect(200);
    expect(await ids()).toEqual(swapped);

    for (const bad of [
      swapped.slice(1),
      [...swapped.slice(1), swapped[1]],
      [...swapped.slice(1), '00000000-0000-4000-8000-000000000000'],
    ]) {
      const res = await request(app.getHttpServer())
        .put('/api/v1/admin/key-figures/order')
        .set(auth)
        .send({ ids: bad });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('KEY_FIGURE_ORDER_MISMATCH');
    }
    expect(await ids()).toEqual(swapped);
  });

  it('caps the number of figures', async () => {
    const existing = await prisma.keyFigure.count();
    for (let i = existing; i < MAX_KEY_FIGURES; i++) {
      await create({ labelFr: `${prefix} plein ${i}` }).expect(201);
    }
    const res = await create({ labelFr: `${prefix} de trop` });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('KEY_FIGURE_LIMIT');
  });

  it('traces creation, update and deletion with the actor and what changed', async () => {
    const created = await create({
      labelFr: `${prefix} trace`,
      value: 4,
    }).expect(201);
    const id = created.body.id as string;
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/key-figures/${id}`)
      .set(auth)
      .send({ value: 5, isVisible: false })
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/key-figures/${id}`)
      .set(auth)
      .expect(204);
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/key-figures/${id}`)
      .set(auth)
      .expect(404);

    const trail = await prisma.auditLog.findMany({
      where: { entityType: 'KeyFigure', entityId: id },
      orderBy: { createdAt: 'asc' },
    });
    expect(trail.map((e) => e.action)).toEqual([
      'KEY_FIGURE_CREATED',
      'KEY_FIGURE_UPDATED',
      'KEY_FIGURE_DELETED',
    ]);
    expect(trail.every((e) => e.actorId !== null)).toBe(true);
    expect(trail[1]).toMatchObject({
      beforeData: { value: 4, isVisible: true },
      afterData: { value: 5, isVisible: false },
    });
    expect(trail[2].beforeData).toMatchObject({ value: 5 });
  });
});
