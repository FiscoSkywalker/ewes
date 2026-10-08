import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import * as argon2 from 'argon2';
import { ContentStatus, Role } from '@prisma/client';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { GlobalHttpExceptionFilter } from './../src/common/filters/http-exception.filter.js';

type Pending = {
  contacts: number;
  realisations: number;
  articles: number;
  documents: number;
  emails: number | null;
};

/**
 * Compteurs du tableau de bord en un seul appel : chaque chiffre doit égaler le
 * total de la liste d'administration qu'il résume, le rôle est jugé côté serveur,
 * et les e-mails en échec ne sont jamais communiqués à un Gestionnaire.
 * La base est partagée avec d'autres suites : on compare des écarts, pas des totaux.
 */
describe('Tableau de bord (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let admin: { Authorization: string };
  let gest: { Authorization: string };
  let user: { Authorization: string };

  const password = 'correct horse battery staple';
  const stamp = Date.now();
  const tag = `e2e-dashboard-${stamp}`;
  const emails = {
    admin: `${tag}-admin@ewes.example`,
    gest: `${tag}-gest@ewes.example`,
    user: `${tag}-user@ewes.example`,
  };

  const login = async (email: string) => ({
    Authorization: `Bearer ${
      (
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email, password })
          .expect(200)
      ).body.accessToken as string
    }`,
  });
  const dashboard = (auth: { Authorization: string }) =>
    request(app.getHttpServer()).get('/api/v1/admin/dashboard').set(auth);
  const pending = async (auth: { Authorization: string }) =>
    ((await dashboard(auth).expect(200)).body as { pending: Pending }).pending;
  const total = async (auth: { Authorization: string }, path: string) =>
    (
      (
        await request(app.getHttpServer())
          .get(`/api/v1/admin/${path}`)
          .set(auth)
          .expect(200)
      ).body as { meta: { total: number } }
    ).meta.total;

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

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    for (const [key, role] of [
      ['admin', Role.ADMINISTRATEUR],
      ['gest', Role.GESTIONNAIRE],
      ['user', Role.UTILISATEUR],
    ] as const) {
      await prisma.user.create({
        data: {
          email: emails[key],
          passwordHash,
          fullName: `E2E Dashboard ${key}`,
          role,
        },
      });
    }
    admin = await login(emails.admin);
    gest = await login(emails.gest);
    user = await login(emails.user);
  });

  afterAll(async () => {
    await prisma.contactMessage.deleteMany({
      where: { email: { startsWith: tag } },
    });
    await prisma.realisation.deleteMany({
      where: { slug: { startsWith: tag } },
    });
    await prisma.article.deleteMany({ where: { slug: { startsWith: tag } } });
    await prisma.publicDocument.deleteMany({
      where: { slug: { startsWith: tag } },
    });
    await prisma.notification.deleteMany({
      where: { recipientEmail: { startsWith: tag } },
    });
    await prisma.session.deleteMany({
      where: { user: { email: { in: Object.values(emails) } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: Object.values(emails) } },
    });
    await app.close();
  });

  it('exige un jeton, et refuse le rôle Utilisateur', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/dashboard')
      .expect(401);
    await dashboard(user).expect(403);
  });

  it('compte chaque catégorie une fois, en ignorant ce que la liste correspondante ignore', async () => {
    const before = await pending(admin);

    await prisma.contactMessage.createMany({
      data: [
        { name: 'A', email: `${tag}-a@x.example`, message: 'un' },
        { name: 'B', email: `${tag}-b@x.example`, message: 'deux' },
        // Traité : n'attend plus rien.
        {
          name: 'C',
          email: `${tag}-c@x.example`,
          message: 'trois',
          status: 'TRAITE',
        },
      ],
    });
    await prisma.realisation.createMany({
      data: [
        { slug: `${tag}-r1`, titleFr: 'Brouillon' },
        // Publié et supprimé : hors compteur.
        {
          slug: `${tag}-r2`,
          titleFr: 'Publié',
          status: ContentStatus.PUBLISHED,
        },
        { slug: `${tag}-r3`, titleFr: 'Supprimé', deletedAt: new Date() },
      ],
    });
    await prisma.article.createMany({
      data: [
        {
          slug: `${tag}-a1`,
          type: 'ACTUALITE',
          titleFr: 'Brouillon',
          contentFr: '<p>x</p>',
        },
        {
          slug: `${tag}-a2`,
          type: 'ACTUALITE',
          titleFr: 'Supprimé',
          contentFr: '<p>x</p>',
          deletedAt: new Date(),
        },
      ],
    });
    await prisma.publicDocument.createMany({
      data: [1, 2].map((n) => ({
        slug: `${tag}-d${n}`,
        titleFr: `Doc ${n}`,
        category: 'REPORT' as const,
        storedName: `${tag}-d${n}.pdf`,
        fileUrl: `/x/${tag}-d${n}.pdf`,
        fileType: 'application/pdf',
        fileSizeBytes: 10,
        ...(n === 2 && { status: ContentStatus.PUBLISHED }),
      })),
    });
    await prisma.notification.createMany({
      data: [
        // Échec définitif : compté. Envoyé et en attente : non.
        {
          type: 'TEST',
          recipientEmail: `${tag}-1@x.example`,
          idempotencyKey: `${tag}-failed`,
          payload: {},
          failedAt: new Date(),
        },
        {
          type: 'TEST',
          recipientEmail: `${tag}-2@x.example`,
          idempotencyKey: `${tag}-sent`,
          payload: {},
          sentAt: new Date(),
        },
        {
          type: 'TEST',
          recipientEmail: `${tag}-3@x.example`,
          idempotencyKey: `${tag}-pending`,
          payload: {},
        },
      ],
    });

    const after = await pending(admin);
    expect(after.contacts - before.contacts).toBe(2);
    expect(after.realisations - before.realisations).toBe(1);
    expect(after.articles - before.articles).toBe(1);
    expect(after.documents - before.documents).toBe(1);
    expect(after.emails! - before.emails!).toBe(1);
  });

  it('égale le total des listes qu’il résume', async () => {
    // Les autres suites écrivent en parallèle : on relit jusqu'à un instantané cohérent.
    let last = '';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const counted = await pending(admin);
      const listed = {
        contacts: await total(admin, 'contacts?status=NOUVEAU&limit=1'),
        realisations: await total(admin, 'realisations?status=DRAFT&limit=1'),
        articles: await total(admin, 'articles?status=DRAFT&limit=1'),
        documents: await total(admin, 'documents-publics?status=DRAFT&limit=1'),
        emails: await total(admin, 'notifications?status=failed&limit=1'),
      };
      last = JSON.stringify({ counted, listed });
      if (JSON.stringify(counted) === JSON.stringify(listed)) return;
    }
    expect(last).toBe('cohérent');
  });

  it('ne communique jamais les e-mails en échec à un Gestionnaire', async () => {
    const counts = await pending(gest);
    expect(counts.emails).toBeNull();
    expect(counts.contacts).toEqual(expect.any(Number));
    expect(counts.realisations).toEqual(expect.any(Number));
    expect(counts.articles).toEqual(expect.any(Number));
    expect(counts.documents).toEqual(expect.any(Number));
  });

  it('ignore tout paramètre client : le rôle vient du jeton', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/dashboard?role=ADMINISTRATEUR')
      .set(gest)
      .expect(200);
    expect((res.body as { pending: Pending }).pending.emails).toBeNull();
  });
});
