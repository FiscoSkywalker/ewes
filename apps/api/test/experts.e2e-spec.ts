import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import * as argon2 from 'argon2';
import { Role } from '@prisma/client';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { GlobalHttpExceptionFilter } from './../src/common/filters/http-exception.filter.js';

/**
 * Cas de régression : un profil est une personne, jamais public avant une
 * publication explicite ; portrait validé contre la médiathèque ; actions
 * sensibles tracées (blueprint/17_Testing_Strategy.md §3).
 */
describe('Experts (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let mediaDir: string;
  let auth: { Authorization: string };
  let serviceId: string;

  const password = 'correct horse battery staple';
  const stamp = Date.now();
  const prefix = `E2E Expert ${stamp}`;
  const gestionnaireEmail = `e2e-experts-gest-${stamp}@ewes.example`;
  const userEmail = `e2e-experts-user-${stamp}@ewes.example`;

  /** PNG 1x1 valide. */
  const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  );

  async function login(email: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return res.body.accessToken as string;
  }

  const create = (body: Record<string, unknown> = {}) =>
    request(app.getHttpServer())
      .post('/api/v1/admin/experts')
      .set(auth)
      .send({ fullName: `${prefix} A`, roleFr: 'Ingénieur', ...body });

  const act = (id: string, action: 'publish' | 'unpublish') =>
    request(app.getHttpServer())
      .post(`/api/v1/admin/experts/${id}/${action}`)
      .set(auth);

  const publicNames = async () =>
    (
      (await request(app.getHttpServer()).get('/api/v1/experts').expect(200))
        .body.data as { fullName: string }[]
    ).map((expert) => expert.fullName);

  beforeAll(async () => {
    // Stockage isolé : aucune image de test dans le dossier de développement.
    mediaDir = await mkdtemp(join(tmpdir(), 'ewes-experts-e2e-'));
    process.env.PUBLIC_MEDIA_PATH = mediaDir;

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
        fullName: 'E2E Experts Gestionnaire',
        role: Role.GESTIONNAIRE,
      },
    });
    await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash,
        fullName: 'E2E Experts User',
        role: Role.UTILISATEUR,
      },
    });
    auth = { Authorization: `Bearer ${await login(gestionnaireEmail)}` };
    serviceId = (await prisma.service.findFirstOrThrow()).id;
  });

  afterEach(async () => {
    await prisma.expert.deleteMany({
      where: { fullName: { startsWith: prefix } },
    });
  });

  afterAll(async () => {
    await prisma.media.deleteMany({
      where: { uploadedBy: { email: gestionnaireEmail } },
    });
    await prisma.session.deleteMany({
      where: { user: { email: { in: [gestionnaireEmail, userEmail] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [gestionnaireEmail, userEmail] } },
    });
    await app.close();
    await rm(mediaDir, { recursive: true, force: true });
  });

  it('rejects unauthenticated and under-privileged access to admin routes', async () => {
    await request(app.getHttpServer()).get('/api/v1/admin/experts').expect(401);

    const userToken = await login(userEmail);
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/experts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ fullName: 'x', roleFr: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN_ROLE');
  });

  it('keeps a profile hidden until explicitly published, exposes only public fields, then hides it again', async () => {
    const created = await create({
      roleEn: 'Engineer',
      bioFr: 'Bio',
      specialtiesFr: ['EIES'],
      yearsOfExperience: 12,
      serviceId,
    }).expect(201);
    expect(created.body.status).toBe('DRAFT');
    const id = created.body.id as string;

    // Un statut envoyé par le client est refusé, jamais appliqué.
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/experts/${id}`)
      .set(auth)
      .send({ status: 'PUBLISHED' })
      .expect(400);
    expect(await publicNames()).not.toContain(`${prefix} A`);

    await act(id, 'publish').expect(200);
    const list = (
      await request(app.getHttpServer()).get('/api/v1/experts').expect(200)
    ).body.data as Record<string, unknown>[];
    const shown = list.find((e) => e.fullName === `${prefix} A`)!;
    expect(shown).toMatchObject({
      roleFr: 'Ingénieur',
      roleEn: 'Engineer',
      bioFr: 'Bio',
      specialtiesFr: ['EIES'],
      yearsOfExperience: 12,
      photoUrl: null,
    });
    expect(typeof shown.poleSlug).toBe('string');
    for (const internal of ['id', 'status', 'serviceId', 'sortOrder']) {
      expect(shown).not.toHaveProperty(internal);
    }

    await act(id, 'unpublish').expect(200);
    expect(await publicNames()).not.toContain(`${prefix} A`);
  });

  it('appends new profiles last, applies a full order atomically and refuses an incomplete one', async () => {
    const a = (await create({ fullName: `${prefix} A` }).expect(201)).body;
    const b = (await create({ fullName: `${prefix} B` }).expect(201)).body;
    expect(b.sortOrder).toBe(a.sortOrder + 1);
    await act(a.id, 'publish').expect(200);
    await act(b.id, 'publish').expect(200);

    const ids = async () =>
      (
        await request(app.getHttpServer())
          .get('/api/v1/admin/experts')
          .set(auth)
          .expect(200)
      ).body.map((e: { id: string }) => e.id) as string[];
    const before = await ids();
    const swapped = before.map((id) =>
      id === a.id ? b.id : id === b.id ? a.id : id,
    );
    await request(app.getHttpServer())
      .put('/api/v1/admin/experts/order')
      .set(auth)
      .send({ ids: swapped })
      .expect(200);
    expect(await ids()).toEqual(swapped);
    // Le site suit l'ordre choisi.
    const own = (await publicNames()).filter((n) => n.startsWith(prefix));
    expect(own).toEqual([`${prefix} B`, `${prefix} A`]);

    for (const bad of [
      swapped.slice(1),
      [...swapped.slice(1), swapped[1]],
      [...swapped.slice(1), '00000000-0000-4000-8000-000000000000'],
    ]) {
      const res = await request(app.getHttpServer())
        .put('/api/v1/admin/experts/order')
        .set(auth)
        .send({ ids: bad });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('EXPERT_ORDER_MISMATCH');
    }
    expect(await ids()).toEqual(swapped);
  });

  it('cleans specialties and validates the body and the pole', async () => {
    const created = await create({
      specialtiesFr: [
        '  EIES  ',
        'eies',
        '',
        'Audit  environnemental',
        'Audit environnemental',
      ],
      specialtiesEn: ['ESIA'],
    }).expect(201);
    // Espaces normalisés, vides et doublons (casse ignorée) écartés, ordre gardé.
    expect(created.body.specialtiesFr).toEqual([
      'EIES',
      'Audit environnemental',
    ]);

    for (const body of [
      { fullName: '' },
      { roleFr: '' },
      { fullName: 'x'.repeat(121) },
      { yearsOfExperience: -1 },
      { yearsOfExperience: 71 },
      { yearsOfExperience: 1.5 },
      { specialtiesFr: Array.from({ length: 13 }, (_, i) => `S${i}`) },
      { specialtiesFr: ['x'.repeat(41)] },
      { serviceId: 'pas-un-uuid' },
      { photoUrl: 'https://exemple.test/x.png' },
    ]) {
      const res = await create(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
    }
    const unknownPole = await create({
      serviceId: '00000000-0000-4000-8000-000000000000',
    });
    expect(unknownPole.status).toBe(400);
    expect(unknownPole.body.code).toBe('EXPERT_SERVICE_NOT_FOUND');
  });

  it('only accepts a portrait from the media library and protects it from deletion while used', async () => {
    const id = (await create().expect(201)).body.id as string;
    const patch = (body: object) =>
      request(app.getHttpServer())
        .patch(`/api/v1/admin/experts/${id}`)
        .set(auth)
        .send(body);

    const unknown = await patch({
      photoUrl: '/uploads/00000000-0000-4000-8000-000000000000.png',
    });
    expect(unknown.status).toBe(404);
    expect(unknown.body.code).toBe('MEDIA_NOT_FOUND');

    const media = await request(app.getHttpServer())
      .post('/api/v1/admin/media')
      .set(auth)
      .attach('file', PNG, 'portrait.png')
      .expect(201);
    await patch({ photoUrl: media.body.url }).expect(200);

    const library = await request(app.getHttpServer())
      .get('/api/v1/admin/media')
      .set(auth)
      .expect(200);
    const entry = library.body.data.find(
      (m: { id: string }) => m.id === media.body.id,
    );
    expect(entry.usages).toEqual([
      { type: 'EXPERT', id, title: `${prefix} A` },
    ]);
    const blocked = await request(app.getHttpServer())
      .delete(`/api/v1/admin/media/${media.body.id}`)
      .set(auth);
    expect(blocked.status).toBe(409);
    expect(blocked.body.code).toBe('MEDIA_IN_USE');

    // Retirer la photo (`null`) libère l'image.
    await patch({ photoUrl: null }).expect(200);
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/media/${media.body.id}`)
      .set(auth)
      .expect(204);
  });

  it('keeps the portrait focal point with its photo, validates it, and resets it when the photo changes', async () => {
    const upload = async () =>
      (
        await request(app.getHttpServer())
          .post('/api/v1/admin/media')
          .set(auth)
          .attach('file', PNG, 'portrait.png')
          .expect(201)
      ).body.url as string;
    const [first, second] = [await upload(), await upload()];
    const created = await create({
      photoUrl: first,
      photoFocalX: 30,
      photoFocalY: 10,
    }).expect(201);
    const id = created.body.id as string;
    expect(created.body).toMatchObject({ photoFocalX: 30, photoFocalY: 10 });
    const patch = (body: object) =>
      request(app.getHttpServer())
        .patch(`/api/v1/admin/experts/${id}`)
        .set(auth)
        .send(body);

    // Un autre champ ne touche pas au point focal ; les bornes (0 et 100) sont permises.
    expect((await patch({ roleFr: 'Chef' }).expect(200)).body).toMatchObject({
      photoFocalX: 30,
      photoFocalY: 10,
    });
    expect(
      (await patch({ photoFocalX: 0, photoFocalY: 100 }).expect(200)).body,
    ).toMatchObject({ photoFocalX: 0, photoFocalY: 100 });

    // Le site public le reçoit avec la photo, sans autre champ interne.
    await act(id, 'publish').expect(200);
    const shown = (
      (await request(app.getHttpServer()).get('/api/v1/experts').expect(200))
        .body.data as Record<string, unknown>[]
    ).find((e) => e.fullName === `${prefix} A`)!;
    expect(shown).toMatchObject({
      photoUrl: first,
      photoFocalX: 0,
      photoFocalY: 100,
    });

    // Valeurs hors bornes, non entières, mal typées ou incomplètes : refusées, rien n'est écrit.
    for (const body of [
      { photoFocalX: 101, photoFocalY: 50 },
      { photoFocalX: -1, photoFocalY: 50 },
      { photoFocalX: 50.5, photoFocalY: 50 },
      { photoFocalX: '50', photoFocalY: 50 },
    ]) {
      await patch(body).expect(400);
    }
    for (const body of [
      { photoFocalX: 40 },
      { photoFocalY: 40 },
      { photoFocalX: 40, photoFocalY: null },
    ]) {
      const incomplete = await patch(body).expect(400);
      expect(incomplete.body.code).toBe('EXPERT_FOCAL_INCOMPLETE');
    }
    expect((await patch({}).expect(200)).body).toMatchObject({
      photoFocalX: 0,
      photoFocalY: 100,
    });

    // Une nouvelle photo sans point focal : l'ancien visait l'ancienne image, retour au cadrage par défaut.
    expect((await patch({ photoUrl: second }).expect(200)).body).toMatchObject({
      photoUrl: second,
      photoFocalX: null,
      photoFocalY: null,
    });
    // Nouvelle photo avec son propre point focal : gardé.
    expect(
      (
        await patch({
          photoUrl: first,
          photoFocalX: 70,
          photoFocalY: 20,
        }).expect(200)
      ).body,
    ).toMatchObject({ photoUrl: first, photoFocalX: 70, photoFocalY: 20 });
    // Remise explicite au cadrage par défaut, puis retrait de la photo.
    expect(
      (await patch({ photoFocalX: null, photoFocalY: null }).expect(200)).body,
    ).toMatchObject({ photoFocalX: null, photoFocalY: null });
    await patch({ photoFocalX: 60, photoFocalY: 60 }).expect(200);
    expect((await patch({ photoUrl: null }).expect(200)).body).toMatchObject({
      photoUrl: null,
      photoFocalX: null,
      photoFocalY: null,
    });
  });

  it('traces publication, unpublication and deletion with the actor', async () => {
    const id = (await create().expect(201)).body.id as string;
    await act(id, 'publish').expect(200);
    // Répéter une action sans effet n'écrit pas de ligne en plus.
    await act(id, 'publish').expect(200);
    await act(id, 'unpublish').expect(200);
    await act(id, 'unpublish').expect(200);
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/experts/${id}`)
      .set(auth)
      .expect(204);
    await request(app.getHttpServer())
      .get(`/api/v1/admin/experts/${id}`)
      .set(auth)
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/experts/${id}`)
      .set(auth)
      .expect(404);

    const trail = await prisma.auditLog.findMany({
      where: { entityType: 'Expert', entityId: id },
      orderBy: { createdAt: 'asc' },
    });
    expect(trail.map((e) => e.action)).toEqual([
      'EXPERT_PUBLISHED',
      'EXPERT_UNPUBLISHED',
      'EXPERT_DELETED',
    ]);
    expect(trail.every((e) => e.actorId !== null)).toBe(true);
    expect(trail[0]).toMatchObject({
      beforeData: { status: 'DRAFT', fullName: `${prefix} A` },
      afterData: { status: 'PUBLISHED' },
    });
    expect(trail[2].beforeData).toMatchObject({ fullName: `${prefix} A` });
  });
});
