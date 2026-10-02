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

/**
 * Cas de régression : contenu DRAFT/ARCHIVED inaccessible publiquement,
 * mutations réservées aux rôles éditoriaux, parution programmée
 * (blueprint/17_Testing_Strategy.md §3, 09_Business_Rules.md).
 */
describe('Articles (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const password = 'correct horse battery staple';
  const stamp = Date.now();
  const prefix = `e2e-article-${stamp}`;
  const gestionnaireEmail = `e2e-art-gest-${stamp}@ewes.example`;
  const userEmail = `e2e-art-user-${stamp}@ewes.example`;
  let auth: { Authorization: string };

  async function login(email: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return res.body.accessToken as string;
  }

  async function create(suffix: string, extra: Record<string, unknown> = {}) {
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/articles')
      .set(auth)
      .send({
        slug: `${prefix}-${suffix}`,
        type: 'ACTUALITE',
        titleFr: `Titre ${suffix}`,
        ...extra,
      })
      .expect(201);
    return res.body.id as string;
  }

  const publish = (id: string, body: Record<string, unknown> = {}) =>
    request(app.getHttpServer())
      .post(`/api/v1/admin/articles/${id}/publish`)
      .set(auth)
      .send(body);

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
        fullName: 'E2E Article Gestionnaire',
        role: Role.GESTIONNAIRE,
      },
    });
    await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash,
        fullName: 'E2E Article User',
        role: Role.UTILISATEUR,
      },
    });
    auth = { Authorization: `Bearer ${await login(gestionnaireEmail)}` };
  });

  afterAll(async () => {
    await prisma.article.deleteMany({
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
    await request(app.getHttpServer()).get('/api/v1/admin/articles').expect(401);

    const userToken = await login(userEmail);
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/articles')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ slug: `${prefix}-x`, type: 'ACTUALITE', titleFr: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN_ROLE');
  });

  it('requires a title and a summary or content to publish, and keeps drafts and archives hidden', async () => {
    const id = await create('cycle', { contextFr: 'Lubumbashi' });

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/articles/${id}`)
      .set(auth)
      .send({ status: 'PUBLISHED' })
      .expect(400);

    const incomplete = await publish(id);
    expect(incomplete.status).toBe(422);
    expect(incomplete.body.code).toBe('ARTICLE_PUBLISH_INCOMPLETE');
    expect(incomplete.body.details).toEqual(['excerptFr']);

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/articles/${id}`)
      .set(auth)
      .send({
        excerptFr: 'Résumé',
        contentFr: 'Premier paragraphe.\n\nSecond paragraphe.',
        datePrecision: 'MONTH',
      })
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/articles/${prefix}-cycle`)
      .expect(404);

    await publish(id).expect(200);

    const visible = await request(app.getHttpServer())
      .get(`/api/v1/articles/${prefix}-cycle`)
      .expect(200);
    expect(visible.body.contextFr).toBe('Lubumbashi');
    expect(visible.body.datePrecision).toBe('MONTH');
    expect(visible.body.image).toBeNull();
    expect(visible.body.publishedAt).toBeTruthy();
    expect(visible.body).not.toHaveProperty('id');
    expect(visible.body).not.toHaveProperty('status');

    await request(app.getHttpServer())
      .post(`/api/v1/admin/articles/${id}/archive`)
      .set(auth)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/v1/articles/${prefix}-cycle`)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/api/v1/admin/articles/${id}`)
      .set(auth)
      .expect(200);
  });

  it('hides a scheduled article until its publication date, and orders the list newest first', async () => {
    const future = await create('future', { excerptFr: 'Bientôt' });
    await publish(future, { publishedAt: '2099-01-01T00:00:00.000Z' }).expect(
      200,
    );
    await request(app.getHttpServer())
      .get(`/api/v1/articles/${prefix}-future`)
      .expect(404);

    const older = await create('older', { excerptFr: 'Ancien', type: 'ENQUETE' });
    const newer = await create('newer', { excerptFr: 'Récent', type: 'ENQUETE' });
    await publish(older, { publishedAt: '1990-05-01T00:00:00.000Z' }).expect(200);
    await publish(newer, { publishedAt: '1995-05-01T00:00:00.000Z' }).expect(200);

    const list = await request(app.getHttpServer())
      .get('/api/v1/articles?type=ENQUETE&limit=100')
      .expect(200);
    const slugs = list.body.data
      .map((a: { slug: string }) => a.slug)
      .filter((s: string) => s.startsWith(prefix));
    expect(slugs).toEqual([`${prefix}-newer`, `${prefix}-older`]);
    expect(slugs).not.toContain(`${prefix}-future`);

    await request(app.getHttpServer())
      .get('/api/v1/articles?type=INCONNU')
      .expect(400);
  });

  it('excludes a featured article from the page and its total, and counts published articles per type regardless of filters', async () => {
    // COMMUNIQUE : rubrique qu'aucune autre suite e2e ne publie en parallèle.
    const listCommuniques = (query = '') =>
      request(app.getHttpServer())
        .get(`/api/v1/articles?type=COMMUNIQUE&limit=100${query}`)
        .expect(200);
    const before = await listCommuniques();
    const countBefore: number = before.body.meta.types.COMMUNIQUE ?? 0;
    expect(before.body.meta.total).toBe(countBefore);

    const first = await create('com-a', { excerptFr: 'A', type: 'COMMUNIQUE' });
    const second = await create('com-b', { excerptFr: 'B', type: 'COMMUNIQUE' });
    // Brouillon : ne doit compter ni dans le total ni dans la rubrique.
    await create('com-draft', { excerptFr: 'C', type: 'COMMUNIQUE' });
    await publish(first, { publishedAt: '1980-01-01T00:00:00.000Z' }).expect(200);
    await publish(second, { publishedAt: '1980-02-01T00:00:00.000Z' }).expect(200);

    const all = await listCommuniques();
    expect(all.body.meta.types.COMMUNIQUE).toBe(countBefore + 2);
    expect(all.body.meta.total).toBe(countBefore + 2);

    const excluded = await listCommuniques(`&exclude=${prefix}-com-b`);
    const slugs = excluded.body.data.map((a: { slug: string }) => a.slug);
    expect(slugs).toContain(`${prefix}-com-a`);
    expect(slugs).not.toContain(`${prefix}-com-b`);
    expect(excluded.body.meta.total).toBe(countBefore + 1);
    // Les compteurs par rubrique ignorent l'exclusion et le filtre de rubrique.
    expect(excluded.body.meta.types).toEqual(all.body.meta.types);
    const unfiltered = await request(app.getHttpServer())
      .get('/api/v1/articles?limit=1')
      .expect(200);
    expect(unfiltered.body.meta.types.COMMUNIQUE).toBe(countBefore + 2);
    expect(unfiltered.body.data).toHaveLength(1);

    await request(app.getHttpServer())
      .get('/api/v1/articles?exclude=../secret')
      .expect(400);
  });

  it('locks the slug after publication and rejects duplicates', async () => {
    const id = await create('lock', { excerptFr: 'x' });
    const duplicate = await request(app.getHttpServer())
      .post('/api/v1/admin/articles')
      .set(auth)
      .send({ slug: `${prefix}-lock`, type: 'ACTUALITE', titleFr: 'dup' });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.code).toBe('ARTICLE_SLUG_TAKEN');

    await publish(id).expect(200);
    const locked = await request(app.getHttpServer())
      .patch(`/api/v1/admin/articles/${id}`)
      .set(auth)
      .send({ slug: `${prefix}-lock-2` });
    expect(locked.status).toBe(409);
    expect(locked.body.code).toBe('ARTICLE_SLUG_LOCKED');
  });
});
