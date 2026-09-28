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
 * Couvre le cas de régression obligatoire "rotation de jeton de
 * rafraîchissement" (blueprint/17_Testing_Strategy.md §3) de bout en bout,
 * contre la base Postgres de dev (pas encore de base de test isolée dédiée
 * — voir le journal de session).
 */
describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const password = 'correct horse battery staple';
  const email = `e2e-auth-${Date.now()}@ewes.example`;
  let userId: string;

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
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
        fullName: 'E2E Test User',
        role: Role.ADMINISTRATEUR,
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
    await app.close();
  });

  it('rejects a wrong password with a generic error', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
    expect(res.body.requestId).toEqual(expect.any(String));
  });

  it('logs in, reads /me, then rejects an unauthenticated /me', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    expect(loginRes.body.accessToken).toEqual(expect.any(String));
    expect(loginRes.body.refreshToken).toEqual(expect.any(String));
    expect(loginRes.body.user.email).toBe(email);

    const meRes = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
      .expect(200);
    expect(meRes.body.email).toBe(email);
    expect(meRes.body.role).toBe(Role.ADMINISTRATEUR);

    await request(app.getHttpServer()).get('/api/v1/me').expect(401);
  });

  it('rotates the refresh token and rejects reuse of the previous one', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    const originalRefreshToken = loginRes.body.refreshToken as string;

    const refreshRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: originalRefreshToken })
      .expect(200);
    expect(refreshRes.body.refreshToken).not.toBe(originalRefreshToken);

    const reuseRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: originalRefreshToken });
    expect(reuseRes.status).toBe(401);
    expect(reuseRes.body.code).toBe('TOKEN_INVALID');
  });

  it('revokes the session on logout, blocking a subsequent refresh', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    const { refreshToken } = loginRes.body;

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .send({ refreshToken })
      .expect(204);

    const refreshRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });
    expect(refreshRes.status).toBe(401);
    expect(refreshRes.body.code).toBe('TOKEN_INVALID');
  });
});
