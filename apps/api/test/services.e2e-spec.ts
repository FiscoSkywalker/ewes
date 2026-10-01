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
describe('Services (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const password = 'correct horse battery staple';
  const stamp = Date.now();
  const slug = `e2e-service-${stamp}`;
  const gestionnaireEmail = `e2e-services-gest-${stamp}@ewes.example`;
  const userEmail = `e2e-services-user-${stamp}@ewes.example`;

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
        email: gestionnaireEmail,
        passwordHash,
        fullName: 'E2E Services Gestionnaire',
        role: Role.GESTIONNAIRE,
      },
    });
    await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash,
        fullName: 'E2E Services User',
        role: Role.UTILISATEUR,
      },
    });
  });

  afterAll(async () => {
    await prisma.service.deleteMany({ where: { slug: { startsWith: slug } } });
    await prisma.session.deleteMany({
      where: { user: { email: { in: [gestionnaireEmail, userEmail] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [gestionnaireEmail, userEmail] } },
    });
    await app.close();
  });

  it('rejects unauthenticated and under-privileged access to admin routes', async () => {
    await request(app.getHttpServer()).get('/api/v1/admin/services').expect(401);

    const userToken = await login(userEmail);
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/services')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ slug, nameFr: 'x', descriptionFr: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN_ROLE');
  });

  it('keeps a service hidden until explicitly published, then hides it again', async () => {
    const auth = { Authorization: `Bearer ${await login(gestionnaireEmail)}` };

    const created = await request(app.getHttpServer())
      .post('/api/v1/admin/services')
      .set(auth)
      .send({ slug, nameFr: 'Eau', descriptionFr: 'Description' })
      .expect(201);
    expect(created.body.status).toBe('DRAFT');
    const id = created.body.id as string;

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/services/${id}`)
      .set(auth)
      .send({ status: 'PUBLISHED' })
      .expect(400);

    const hidden = await request(app.getHttpServer()).get(
      `/api/v1/services/${slug}`,
    );
    expect(hidden.status).toBe(404);
    expect(hidden.body.code).toBe('SERVICE_NOT_FOUND');
    const hiddenList = await request(app.getHttpServer())
      .get('/api/v1/services')
      .expect(200);
    expect(
      hiddenList.body.data.some((s: { slug: string }) => s.slug === slug),
    ).toBe(false);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/services/${id}/publish`)
      .set(auth)
      .expect(200);

    const visible = await request(app.getHttpServer())
      .get(`/api/v1/services/${slug}`)
      .expect(200);
    expect(visible.body.nameFr).toBe('Eau');
    expect(visible.body).not.toHaveProperty('id');
    expect(visible.body).not.toHaveProperty('status');
    const visibleList = await request(app.getHttpServer())
      .get('/api/v1/services')
      .expect(200);
    expect(
      visibleList.body.data.some((s: { slug: string }) => s.slug === slug),
    ).toBe(true);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/services/${id}/unpublish`)
      .set(auth)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/v1/services/${slug}`)
      .expect(404);
  });

  it('locks the slug after first publication, even if unpublished, and rejects duplicates', async () => {
    const auth = { Authorization: `Bearer ${await login(gestionnaireEmail)}` };
    const lockedSlug = `${slug}-locked`;

    const created = await request(app.getHttpServer())
      .post('/api/v1/admin/services')
      .set(auth)
      .send({ slug: lockedSlug, nameFr: 'N', descriptionFr: 'D' })
      .expect(201);
    const id = created.body.id as string;

    const duplicate = await request(app.getHttpServer())
      .post('/api/v1/admin/services')
      .set(auth)
      .send({ slug: lockedSlug, nameFr: 'N', descriptionFr: 'D' });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.code).toBe('SERVICE_SLUG_TAKEN');

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/services/${id}`)
      .set(auth)
      .send({ slug: `${lockedSlug}-2` })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/services/${id}/publish`)
      .set(auth)
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/services/${id}/unpublish`)
      .set(auth)
      .expect(200);

    const locked = await request(app.getHttpServer())
      .patch(`/api/v1/admin/services/${id}`)
      .set(auth)
      .send({ slug: `${lockedSlug}-3` });
    expect(locked.status).toBe(409);
    expect(locked.body.code).toBe('SERVICE_SLUG_LOCKED');
  });
});
