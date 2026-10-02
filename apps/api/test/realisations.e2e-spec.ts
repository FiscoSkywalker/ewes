import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import * as argon2 from 'argon2';
import { Role } from '@prisma/client';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { GlobalHttpExceptionFilter } from './../src/common/filters/http-exception.filter.js';
import { MAX_FEATURED_REALISATIONS } from './../src/modules/realisations/realisation-types.js';

/**
 * Cas de régression : contenu DRAFT/ARCHIVED inaccessible publiquement,
 * mutations réservées aux rôles éditoriaux, client masqué si non publiable
 * (blueprint/17_Testing_Strategy.md §3, 12_Realisations_Portfolio_System.md).
 */
describe('Realisations (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const password = 'correct horse battery staple';
  const stamp = Date.now();
  const prefix = `e2e-real-${stamp}`;
  const gestionnaireEmail = `e2e-real-gest-${stamp}@ewes.example`;
  const userEmail = `e2e-real-user-${stamp}@ewes.example`;

  async function login(email: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return res.body.accessToken as string;
  }

  let auth: { Authorization: string };

  async function create(slug: string, extra: Record<string, unknown> = {}) {
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/realisations')
      .set(auth)
      .send({ slug, titleFr: `Mission ${slug}`, ...extra })
      .expect(201);
    return res.body.id as string;
  }

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
        fullName: 'E2E Real Gestionnaire',
        role: Role.GESTIONNAIRE,
      },
    });
    await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash,
        fullName: 'E2E Real User',
        role: Role.UTILISATEUR,
      },
    });
    auth = { Authorization: `Bearer ${await login(gestionnaireEmail)}` };
  });

  afterAll(async () => {
    await prisma.realisation.deleteMany({
      where: { slug: { startsWith: prefix } },
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
      .get('/api/v1/admin/realisations')
      .expect(401);

    const userToken = await login(userEmail);
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/realisations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ slug: `${prefix}-x`, titleFr: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN_ROLE');
  });

  it('keeps DRAFT and ARCHIVED hidden, requires year and type to publish, and hides a non-public client', async () => {
    const slug = `${prefix}-cycle`;
    const id = await create(slug, {
      clientName: 'Client confidentiel',
      isClientPublic: false,
    });

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/realisations/${id}`)
      .set(auth)
      .send({ status: 'PUBLISHED' })
      .expect(400);

    const incomplete = await request(app.getHttpServer())
      .post(`/api/v1/admin/realisations/${id}/publish`)
      .set(auth);
    expect(incomplete.status).toBe(422);
    expect(incomplete.body.code).toBe('REALISATION_PUBLISH_INCOMPLETE');
    expect(incomplete.body.details).toEqual(['year', 'projectType']);

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/realisations/${id}`)
      .set(auth)
      .send({ year: 2024, projectType: 'AUDIT' })
      .expect(200);

    // Toujours brouillon : invisible publiquement.
    await request(app.getHttpServer())
      .get(`/api/v1/realisations/${slug}`)
      .expect(404);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/realisations/${id}/publish`)
      .set(auth)
      .expect(200);

    const visible = await request(app.getHttpServer())
      .get(`/api/v1/realisations/${slug}`)
      .expect(200);
    expect(visible.body.year).toBe(2024);
    expect(visible.body.clientName).toBeNull();
    expect(visible.body).not.toHaveProperty('id');
    expect(visible.body).not.toHaveProperty('status');

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/realisations/${id}`)
      .set(auth)
      .send({ isClientPublic: true })
      .expect(200);
    const withClient = await request(app.getHttpServer())
      .get(`/api/v1/realisations/${slug}`)
      .expect(200);
    expect(withClient.body.clientName).toBe('Client confidentiel');

    await request(app.getHttpServer())
      .post(`/api/v1/admin/realisations/${id}/archive`)
      .set(auth)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/v1/realisations/${slug}`)
      .expect(404);
    // Conservée pour l'historique interne.
    await request(app.getHttpServer())
      .get(`/api/v1/admin/realisations/${id}`)
      .set(auth)
      .expect(200);
  });

  it('filters, orders and paginates the public list', async () => {
    const make = async (suffix: string, year: number, type: string) => {
      const id = await create(`${prefix}-${suffix}`, { year, projectType: type });
      await request(app.getHttpServer())
        .post(`/api/v1/admin/realisations/${id}/publish`)
        .set(auth)
        .expect(200);
    };
    await make('list-old', 1999, 'ETUDE');
    await make('list-new', 2031, 'ETUDE');
    await make('list-other', 2031, 'FORMATION');

    const etude = await request(app.getHttpServer())
      .get('/api/v1/realisations?projectType=ETUDE&limit=100')
      .expect(200);
    const slugs = etude.body.data
      .map((r: { slug: string }) => r.slug)
      .filter((s: string) => s.startsWith(prefix));
    expect(slugs).toEqual([`${prefix}-list-new`, `${prefix}-list-old`]);

    const year = await request(app.getHttpServer())
      .get('/api/v1/realisations?year=2031&limit=100')
      .expect(200);
    expect(
      year.body.data.every((r: { year: number }) => r.year === 2031),
    ).toBe(true);

    const paged = await request(app.getHttpServer())
      .get('/api/v1/realisations?limit=1&page=1')
      .expect(200);
    expect(paged.body.data).toHaveLength(1);
    expect(paged.body.meta.limit).toBe(1);
    expect(paged.body.meta.total).toBeGreaterThanOrEqual(3);

    await request(app.getHttpServer())
      .get('/api/v1/realisations?projectType=INCONNU')
      .expect(400);
  });

  it('locks the slug after publication and rejects an unknown service', async () => {
    const slug = `${prefix}-lock`;
    const id = await create(slug, { year: 2020, projectType: 'EIES' });

    const unknownService = await request(app.getHttpServer())
      .patch(`/api/v1/admin/realisations/${id}`)
      .set(auth)
      .send({ serviceId: '00000000-0000-4000-8000-000000000000' });
    expect(unknownService.status).toBe(400);
    expect(unknownService.body.code).toBe('SERVICE_NOT_FOUND');

    await request(app.getHttpServer())
      .post(`/api/v1/admin/realisations/${id}/publish`)
      .set(auth)
      .expect(200);
    const locked = await request(app.getHttpServer())
      .patch(`/api/v1/admin/realisations/${id}`)
      .set(auth)
      .send({ slug: `${slug}-2` });
    expect(locked.status).toBe(409);
    expect(locked.body.code).toBe('REALISATION_SLUG_LOCKED');
  });

  it('searches, sorts and counts the admin list per status without leaking filters between them', async () => {
    const needle = `srch${stamp}`;
    const slugOf = (letter: string) => `${prefix}-${needle}-${letter}`;
    const a = await create(slugOf('a'), { year: 2023, projectType: 'EIES' });
    await create(slugOf('b'));
    await create(slugOf('c'), {
      year: 2025,
      projectType: 'AUDIT',
      clientName: 'Societe 100%_exacte',
      location: `Lieu-${needle}`,
    });
    // `a` est publiée en dernier : c'est aussi la plus récemment modifiée.
    await request(app.getHttpServer())
      .post(`/api/v1/admin/realisations/${a}/publish`)
      .set(auth)
      .expect(200);

    const get = (query: string) =>
      request(app.getHttpServer()).get(`/api/v1/admin/realisations?${query}`).set(auth);
    const letters = (res: request.Response) =>
      (res.body.data as { slug: string }[]).map((r) => r.slug.slice(-1));

    // Recherche insensible à la casse ; compteurs par statut.
    const found = await get(`q=${needle.toUpperCase()}&limit=100`).expect(200);
    expect(found.body.meta.total).toBe(3);
    expect(found.body.meta.statuses).toEqual({ DRAFT: 2, PUBLISHED: 1 });
    // Le client et le lieu sont cherchés aussi.
    expect(letters(await get(`q=lieu-${needle}`).expect(200))).toEqual(['c']);

    // Le filtre de statut restreint la liste, pas les compteurs ; type et recherche, si.
    const drafts = await get(`q=${needle}&status=DRAFT`).expect(200);
    expect(drafts.body.meta.total).toBe(2);
    expect(drafts.body.meta.statuses).toEqual({ DRAFT: 2, PUBLISHED: 1 });
    const eies = await get(`q=${needle}&projectType=EIES`).expect(200);
    expect(eies.body.meta.total).toBe(1);
    expect(eies.body.meta.statuses).toEqual({ PUBLISHED: 1 });

    // `%` et `_` sont cherchés littéralement, jamais comme jokers.
    const literal = await get('q=%25').expect(200);
    expect(
      (literal.body.data as Record<string, string | null>[]).every((r) =>
        ['titleFr', 'titleEn', 'clientName', 'location', 'slug'].some((f) => r[f]?.includes('%')),
      ),
    ).toBe(true);
    expect(letters(literal)).toContain('c');
    expect((await get('q=100%25_exacte').expect(200)).body.meta.total).toBe(1);
    expect((await get('q=100%25Xexacte').expect(200)).body.meta.total).toBe(0);

    // Tri : titre, année et type (valeur absente toujours en dernier), date de modification.
    const sorted = async (sort: string, order: string) =>
      letters(await get(`q=${needle}&sort=${sort}&order=${order}`).expect(200));
    expect(await sorted('titleFr', 'asc')).toEqual(['a', 'b', 'c']);
    expect(await sorted('titleFr', 'desc')).toEqual(['c', 'b', 'a']);
    expect(await sorted('year', 'asc')).toEqual(['a', 'c', 'b']);
    expect(await sorted('year', 'desc')).toEqual(['c', 'a', 'b']);
    expect(await sorted('projectType', 'asc')).toEqual(['c', 'a', 'b']);
    expect(await sorted('projectType', 'desc')).toEqual(['a', 'c', 'b']);
    expect((await sorted('updatedAt', 'desc'))[0]).toBe('a');
    expect((await sorted('updatedAt', 'asc')).at(-1)).toBe('a');

    // Tri + pagination : chaque ligne apparaît une fois.
    const page = async (n: number) =>
      letters(await get(`q=${needle}&sort=titleFr&order=asc&limit=1&page=${n}`).expect(200));
    expect([await page(1), await page(2), await page(3)]).toEqual([['a'], ['b'], ['c']]);

    // Paramètres refusés avec le champ fautif ; aucune injection par le champ de tri.
    for (const bad of ['sort=slug', 'sort=year;drop', 'order=up', `q=${'x'.repeat(101)}`]) {
      const res = await get(bad).expect(400);
      expect(JSON.stringify(res.body)).toContain(bad.split('=')[0]);
    }
  });

  it('deletes logically with a confirmation trail and audits every publication change', async () => {
    const id = await create(`${prefix}-trail`, { year: 2024, projectType: 'ETUDE' });
    const post = (action: string) =>
      request(app.getHttpServer()).post(`/api/v1/admin/realisations/${id}/${action}`).set(auth);

    await post('publish').expect(200);
    await post('publish').expect(200); // déjà publiée : aucun changement, aucune trace
    await post('unpublish').expect(200);
    await post('unpublish').expect(200); // déjà en brouillon
    await post('archive').expect(200);

    // Un Utilisateur ne supprime rien (jeton obtenu avant : une requête supertest ne doit pas en chevaucher une autre).
    const userToken = await login(userEmail);
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/realisations/${id}`)
      .set({ Authorization: `Bearer ${userToken}` })
      .expect(403);
    await request(app.getHttpServer()).delete(`/api/v1/admin/realisations/${id}`).expect(401);

    await post('publish').expect(200);
    await request(app.getHttpServer())
      .get(`/api/v1/realisations/${prefix}-trail`)
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/realisations/${id}`)
      .set(auth)
      .expect(204);

    // Disparue partout : site, fiche d'administration, liste ; la ligne reste en base.
    await request(app.getHttpServer()).get(`/api/v1/realisations/${prefix}-trail`).expect(404);
    await request(app.getHttpServer()).get(`/api/v1/admin/realisations/${id}`).set(auth).expect(404);
    await request(app.getHttpServer()).delete(`/api/v1/admin/realisations/${id}`).set(auth).expect(404);
    const row = await prisma.realisation.findUniqueOrThrow({ where: { id } });
    expect(row.deletedAt).not.toBeNull();

    const trail = await prisma.auditLog.findMany({
      where: { entityType: 'Realisation', entityId: id },
      orderBy: { createdAt: 'asc' },
    });
    expect(trail.map((e) => e.action)).toEqual([
      'REALISATION_PUBLISHED',
      'REALISATION_UNPUBLISHED',
      'REALISATION_ARCHIVED',
      'REALISATION_PUBLISHED',
      'REALISATION_DELETED',
    ]);
    expect(trail.every((e) => e.actorId !== null)).toBe(true);
    expect(trail[0]).toMatchObject({
      beforeData: { status: 'DRAFT', slug: `${prefix}-trail` },
      afterData: { status: 'PUBLISHED' },
    });
    expect(trail[4].afterData).toEqual({ deleted: true });
  });

  it('caps simultaneously featured published realisations', async () => {
    // Libère la place éventuellement prise par des données existantes.
    const alreadyFeatured = await prisma.realisation.count({
      where: { isFeatured: true, status: 'PUBLISHED', deletedAt: null },
    });
    const room = Math.max(0, MAX_FEATURED_REALISATIONS - alreadyFeatured);

    for (let i = 0; i < room; i++) {
      const id = await create(`${prefix}-feat-${i}`, {
        year: 2022,
        projectType: 'EIES',
        isFeatured: true,
      });
      await request(app.getHttpServer())
        .post(`/api/v1/admin/realisations/${id}/publish`)
        .set(auth)
        .expect(200);
    }

    const extra = await create(`${prefix}-feat-extra`, {
      year: 2022,
      projectType: 'EIES',
      isFeatured: true,
    });
    const res = await request(app.getHttpServer())
      .post(`/api/v1/admin/realisations/${extra}/publish`)
      .set(auth);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('REALISATION_FEATURED_LIMIT');
  });
});
