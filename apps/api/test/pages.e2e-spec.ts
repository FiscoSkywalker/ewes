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
 * Cas de régression : contenu DRAFT inaccessible publiquement, mutations
 * réservées à ADMINISTRATEUR/GESTIONNAIRE (blueprint/17_Testing_Strategy.md §3).
 */
describe('Pages (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const password = 'correct horse battery staple';
  const stamp = Date.now();
  const slug = `e2e-page-${stamp}`;
  const adminEmail = `e2e-pages-admin-${stamp}@ewes.example`;
  const userEmail = `e2e-pages-user-${stamp}@ewes.example`;

  async function login(email: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return res.body.accessToken as string;
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
        email: adminEmail,
        passwordHash,
        fullName: 'E2E Pages Admin',
        role: Role.ADMINISTRATEUR,
      },
    });
    await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash,
        fullName: 'E2E Pages User',
        role: Role.UTILISATEUR,
      },
    });
  });

  afterAll(async () => {
    await prisma.page.deleteMany({ where: { slug: { startsWith: slug } } });
    await prisma.session.deleteMany({
      where: { user: { email: { in: [adminEmail, userEmail] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [adminEmail, userEmail] } },
    });
    await app.close();
  });

  it('rejects unauthenticated and under-privileged access to admin routes', async () => {
    await request(app.getHttpServer()).get('/api/v1/admin/pages').expect(401);

    const userToken = await login(userEmail);
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/pages')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ slug, titleFr: 'x', contentFr: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN_ROLE');
  });

  it('keeps a page hidden until explicitly published, then hides it again on unpublish', async () => {
    const token = await login(adminEmail);
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request(app.getHttpServer())
      .post('/api/v1/admin/pages')
      .set(auth)
      .send({ slug, titleFr: 'Titre', contentFr: 'Contenu' })
      .expect(201);
    expect(created.body.status).toBe('DRAFT');
    const id = created.body.id as string;

    // Un statut envoyé par le client est refusé, jamais appliqué.
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/pages/${id}`)
      .set(auth)
      .send({ status: 'PUBLISHED' })
      .expect(400);

    const hidden = await request(app.getHttpServer()).get(
      `/api/v1/pages/${slug}`,
    );
    expect(hidden.status).toBe(404);
    expect(hidden.body.code).toBe('PAGE_NOT_FOUND');

    await request(app.getHttpServer())
      .post(`/api/v1/admin/pages/${id}/publish`)
      .set(auth)
      .expect(200);

    const visible = await request(app.getHttpServer())
      .get(`/api/v1/pages/${slug}`)
      .expect(200);
    expect(visible.body.titleFr).toBe('Titre');
    expect(visible.body.publishedAt).toBeTruthy();
    expect(visible.body).not.toHaveProperty('id');
    expect(visible.body).not.toHaveProperty('status');

    await request(app.getHttpServer())
      .post(`/api/v1/admin/pages/${id}/unpublish`)
      .set(auth)
      .expect(200);
    await request(app.getHttpServer()).get(`/api/v1/pages/${slug}`).expect(404);
  });

  it('locks the slug once published and rejects duplicates', async () => {
    const token = await login(adminEmail);
    const auth = { Authorization: `Bearer ${token}` };
    const lockedSlug = `${slug}-locked`;

    const created = await request(app.getHttpServer())
      .post('/api/v1/admin/pages')
      .set(auth)
      .send({ slug: lockedSlug, titleFr: 'T', contentFr: 'C' })
      .expect(201);
    const id = created.body.id as string;

    const duplicate = await request(app.getHttpServer())
      .post('/api/v1/admin/pages')
      .set(auth)
      .send({ slug: lockedSlug, titleFr: 'T', contentFr: 'C' });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.code).toBe('PAGE_SLUG_TAKEN');

    // Avant publication, le slug reste modifiable.
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/pages/${id}`)
      .set(auth)
      .send({ slug: `${lockedSlug}-2` })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/pages/${id}/publish`)
      .set(auth)
      .expect(200);

    const locked = await request(app.getHttpServer())
      .patch(`/api/v1/admin/pages/${id}`)
      .set(auth)
      .send({ slug: `${lockedSlug}-3` });
    expect(locked.status).toBe(409);
    expect(locked.body.code).toBe('PAGE_SLUG_LOCKED');
  });
});
