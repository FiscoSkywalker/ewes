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
    // Comme en production derrière Nginx (TRUST_PROXY_HOPS=1) : l'IP vient de X-Forwarded-For.
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
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

  describe('audit des connexions', () => {
    const agent = 'e2e-audit-agent/1.0';
    let seq = 0;
    /** IP distincte par requête : la limite de 5 connexions/min par IP ne gêne pas ces tests. */
    const attempt = (who: string, secret: string) =>
      request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('X-Forwarded-For', `10.77.${(seq >> 8) & 255}.${++seq & 255}`)
        .set('User-Agent', agent)
        .send({ email: who, password: secret });
    const traces = (where: object) =>
      prisma.auditLog.findMany({
        where: { action: { startsWith: 'AUTH_' }, ...where },
        orderBy: { createdAt: 'asc' },
      });

    it('traces failures with their reason and answers them all identically', async () => {
      const unknown = `e2e-auth-unknown-${Date.now()}@ewes.example`;
      const disabled = await prisma.user.create({
        data: {
          email: `e2e-auth-off-${Date.now()}@ewes.example`,
          passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
          fullName: 'E2E Auth Off',
          role: Role.UTILISATEUR,
          isActive: false,
        },
      });
      const secret = 'un-mot-de-passe-secret-a-ne-jamais-journaliser';
      try {
        const wrong = await attempt(email, secret);
        const gone = await attempt(unknown, secret);
        const off = await attempt(disabled.email, password);
        // Même réponse dans les trois cas : l'audit ne rend rien observable de l'extérieur.
        for (const res of [wrong, gone, off]) {
          expect(res.status).toBe(401);
          expect(res.body.code).toBe('INVALID_CREDENTIALS');
          expect(res.body.message).toBe(wrong.body.message);
        }

        const [wrongRow] = await traces({
          action: 'AUTH_LOGIN_FAILED',
          entityId: userId,
          // Les autres tests du fichier échouent aussi sur ce compte : on ne lit que cette série.
          userAgent: agent,
        });
        expect(wrongRow).toMatchObject({
          // Personne n'est authentifié : pas d'auteur, le compte visé est l'élément.
          actorId: null,
          entityType: 'User',
          afterData: { email, reason: 'wrong_password' },
          userAgent: agent,
        });
        expect(wrongRow.ipAddress).toBeTruthy();

        const [goneRow] = await traces({
          action: 'AUTH_LOGIN_FAILED',
          afterData: { path: ['email'], equals: unknown },
        });
        expect(goneRow).toMatchObject({
          entityId: null,
          afterData: { email: unknown, reason: 'unknown_account' },
        });

        const [offRow] = await traces({ entityId: disabled.id });
        expect(offRow).toMatchObject({
          action: 'AUTH_LOGIN_FAILED',
          afterData: { reason: 'inactive_account' },
        });

        // Jamais le mot de passe saisi, dans aucune des trois traces.
        const all = JSON.stringify([wrongRow, goneRow, offRow]);
        expect(all).not.toContain(secret);
        expect(all).not.toContain(password);
        expect(all).not.toMatch(/passwordHash|argon2/i);
      } finally {
        await prisma.user.delete({ where: { id: disabled.id } });
      }
    });

    it('traces a successful login with its author, address and browser — and no token', async () => {
      const before = new Date();
      const res = await attempt(email, password).expect(200);
      const rows = await traces({
        action: 'AUTH_LOGIN_SUCCEEDED',
        actorId: userId,
        createdAt: { gte: before },
      });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        entityType: 'User',
        entityId: userId,
        afterData: { method: 'password' },
        userAgent: agent,
      });
      expect(rows[0].ipAddress).toBeTruthy();
      const dump = JSON.stringify(rows[0]);
      expect(dump).not.toContain(res.body.accessToken);
      expect(dump).not.toContain(res.body.refreshToken);
      expect(dump).not.toContain(password);
    });

    it('does not trace a malformed request (nothing identifies an attempt)', async () => {
      const before = new Date();
      await attempt('pas-un-email', 'x').expect(400);
      expect(
        await traces({ createdAt: { gte: before }, userAgent: agent }),
      ).toHaveLength(0);
    });
  });
});
