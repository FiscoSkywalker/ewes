import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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
 * Cas de régression : contenu DRAFT inaccessible publiquement, mutations
 * réservées à ADMINISTRATEUR/GESTIONNAIRE (blueprint/17_Testing_Strategy.md §3).
 */
describe('Services (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let mediaDir: string;

  const password = 'correct horse battery staple';
  const stamp = Date.now();
  const slug = `e2e-service-${stamp}`;
  const gestionnaireEmail = `e2e-services-gest-${stamp}@ewes.example`;
  const userEmail = `e2e-services-user-${stamp}@ewes.example`;

  // Un jeton par compte : la connexion a sa propre limite de fréquence stricte.
  const tokens = new Map<string, string>();
  async function login(email: string): Promise<string> {
    const known = tokens.get(email);
    if (known) return known;
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    const token = res.body.accessToken as string;
    tokens.set(email, token);
    return token;
  }

  beforeAll(async () => {
    // Stockage isolé : aucune image de test dans le dossier de développement.
    mediaDir = await mkdtemp(join(tmpdir(), 'ewes-services-e2e-'));
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
    await request(app.getHttpServer())
      .get('/api/v1/admin/services')
      .expect(401);

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

  it('manages ordered offerings, exposes them only once the service is published, and scopes them to their service', async () => {
    const auth = { Authorization: `Bearer ${await login(gestionnaireEmail)}` };
    const offeringsSlug = `${slug}-offerings`;
    const created = await request(app.getHttpServer())
      .post('/api/v1/admin/services')
      .set(auth)
      .send({
        slug: offeringsSlug,
        nameFr: 'Environnement',
        taglineFr: 'Mesurer',
        descriptionFr: 'D',
        sortOrder: 5,
      })
      .expect(201);
    const id = created.body.id as string;
    const other = await request(app.getHttpServer())
      .post('/api/v1/admin/services')
      .set(auth)
      .send({ slug: `${offeringsSlug}-other`, nameFr: 'O', descriptionFr: 'D' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/services/${id}/offerings`)
      .set(auth)
      .send({ titleFr: 'Deuxième', descriptionFr: 'd', sortOrder: 2 })
      .expect(201);
    const first = await request(app.getHttpServer())
      .post(`/api/v1/admin/services/${id}/offerings`)
      .set(auth)
      .send({ titleFr: 'Première', descriptionFr: 'd', sortOrder: 1 })
      .expect(201);
    const offeringId = first.body.id as string;

    // Une prestation n'est modifiable que via son propre service.
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/services/${other.body.id}/offerings/${offeringId}`)
      .set(auth)
      .send({ titleFr: 'Piraté' })
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/services/${id}/offerings/${offeringId}`)
      .set(auth)
      .send({ titleEn: 'First' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/services/${id}/publish`)
      .set(auth)
      .expect(200);

    const visible = await request(app.getHttpServer())
      .get(`/api/v1/services/${offeringsSlug}`)
      .expect(200);
    expect(visible.body.taglineFr).toBe('Mesurer');
    expect(
      visible.body.offerings.map((o: { titleFr: string }) => o.titleFr),
    ).toEqual(['Première', 'Deuxième']);
    expect(visible.body.offerings[0].titleEn).toBe('First');
    expect(visible.body.offerings[0]).not.toHaveProperty('id');

    await request(app.getHttpServer())
      .delete(`/api/v1/admin/services/${id}/offerings/${offeringId}`)
      .set(auth)
      .expect(204);
    const after = await request(app.getHttpServer())
      .get(`/api/v1/services/${offeringsSlug}`)
      .expect(200);
    expect(after.body.offerings).toHaveLength(1);
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

  it('appends new services and offerings last, and applies a full offering order atomically', async () => {
    const auth = { Authorization: `Bearer ${await login(gestionnaireEmail)}` };
    const orderSlug = `${slug}-order`;

    const [a, b] = [
      await request(app.getHttpServer())
        .post('/api/v1/admin/services')
        .set(auth)
        .send({ slug: `${orderSlug}-a`, nameFr: 'A', descriptionFr: 'D' })
        .expect(201),
      await request(app.getHttpServer())
        .post('/api/v1/admin/services')
        .set(auth)
        .send({ slug: `${orderSlug}-b`, nameFr: 'B', descriptionFr: 'D' })
        .expect(201),
    ];
    // Sans position donnée, un service se range après tous les autres.
    expect(b.body.sortOrder).toBe(a.body.sortOrder + 1);

    // Même règle pour les prestations d'un service.
    const id = a.body.id as string;
    const offering = async (titleFr: string, icon?: string) =>
      (
        await request(app.getHttpServer())
          .post(`/api/v1/admin/services/${id}/offerings`)
          .set(auth)
          .send({ titleFr, descriptionFr: 'd', ...(icon && { icon }) })
          .expect(201)
      ).body as { id: string; sortOrder: number; icon: string | null };
    const first = await offering('Une', 'droplets');
    const second = await offering('Deux');
    const third = await offering('Trois', 'zap');
    expect([first.sortOrder, second.sortOrder, third.sortOrder]).toEqual([
      0, 1, 2,
    ]);
    expect(second.icon).toBeNull();

    const reordered = await request(app.getHttpServer())
      .put(`/api/v1/admin/services/${id}/offerings/order`)
      .set(auth)
      .send({ ids: [third.id, first.id, second.id] })
      .expect(200);
    expect(
      reordered.body.offerings.map((o: { titleFr: string }) => o.titleFr),
    ).toEqual(['Trois', 'Une', 'Deux']);
    const incomplete = await request(app.getHttpServer())
      .put(`/api/v1/admin/services/${id}/offerings/order`)
      .set(auth)
      .send({ ids: [third.id, first.id] });
    expect(incomplete.status).toBe(400);
    expect(incomplete.body.code).toBe('SERVICE_OFFERING_ORDER_MISMATCH');
    // Les prestations d'un autre service ne se glissent pas dans cet ordre.
    const foreign = await request(app.getHttpServer())
      .put(`/api/v1/admin/services/${id}/offerings/order`)
      .set(auth)
      .send({ ids: [third.id, first.id, b.body.id] });
    expect(foreign.status).toBe(400);
  });

  it('exposes the offering icon publicly and refuses an invalid one', async () => {
    const auth = { Authorization: `Bearer ${await login(gestionnaireEmail)}` };
    const iconSlug = `${slug}-icon`;
    const created = await request(app.getHttpServer())
      .post('/api/v1/admin/services')
      .set(auth)
      .send({ slug: iconSlug, nameFr: 'I', descriptionFr: 'D' })
      .expect(201);
    const id = created.body.id as string;

    const bad = await request(app.getHttpServer())
      .post(`/api/v1/admin/services/${id}/offerings`)
      .set(auth)
      .send({ titleFr: 'T', descriptionFr: 'd', icon: 'Droplets<script>' });
    expect(bad.status).toBe(400);

    const ok = await request(app.getHttpServer())
      .post(`/api/v1/admin/services/${id}/offerings`)
      .set(auth)
      .send({ titleFr: 'T', descriptionFr: 'd', icon: 'flask-conical' })
      .expect(201);
    // Changer de pictogramme, puis le retirer (`null`).
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/services/${id}/offerings/${ok.body.id}`)
      .set(auth)
      .send({ icon: 'leaf' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/services/${id}/publish`)
      .set(auth)
      .expect(200);
    const visible = await request(app.getHttpServer())
      .get(`/api/v1/services/${iconSlug}`)
      .expect(200);
    expect(visible.body.offerings[0].icon).toBe('leaf');

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/services/${id}/offerings/${ok.body.id}`)
      .set(auth)
      .send({ icon: null })
      .expect(200);
    const cleared = await request(app.getHttpServer())
      .get(`/api/v1/services/${iconSlug}`)
      .expect(200);
    expect(cleared.body.offerings[0].icon).toBeNull();
  });

  describe('visual', () => {
    /** PNG 1x1 valide. */
    const PNG = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64',
    );

    it('only accepts an image of the media library, shows it publicly and protects it from deletion while used', async () => {
      const auth = {
        Authorization: `Bearer ${await login(gestionnaireEmail)}`,
      };
      const visualSlug = `${slug}-visual`;
      const created = await request(app.getHttpServer())
        .post('/api/v1/admin/services')
        .set(auth)
        .send({ slug: visualSlug, nameFr: 'V', descriptionFr: 'D' })
        .expect(201);
      const id = created.body.id as string;
      const patch = (body: object) =>
        request(app.getHttpServer())
          .patch(`/api/v1/admin/services/${id}`)
          .set(auth)
          .send(body);

      // Jamais une adresse quelconque : le site l'afficherait telle quelle.
      expect(
        (await patch({ imageUrl: 'https://exemple.test/x.png' })).status,
      ).toBe(400);
      const unknown = await patch({
        imageUrl: '/uploads/00000000-0000-4000-8000-000000000000.png',
      });
      expect(unknown.status).toBe(404);
      expect(unknown.body.code).toBe('MEDIA_NOT_FOUND');

      const media = await request(app.getHttpServer())
        .post('/api/v1/admin/media')
        .set(auth)
        .attach('file', PNG, 'pole.png')
        .expect(201);
      const url = media.body.url as string;

      const saved = await patch({
        imageUrl: url,
        imageAltFr: '  Prélèvement d’eau  ',
      }).expect(200);
      expect(saved.body.imageUrl).toBe(url);

      await request(app.getHttpServer())
        .post(`/api/v1/admin/services/${id}/publish`)
        .set(auth)
        .expect(200);
      const visible = await request(app.getHttpServer())
        .get(`/api/v1/services/${visualSlug}`)
        .expect(200);
      expect(visible.body.imageUrl).toBe(url);
      expect(visible.body.imageAltEn).toBeNull();

      // La médiathèque sait qu'un pôle l'utilise et refuse de la supprimer.
      const library = await request(app.getHttpServer())
        .get('/api/v1/admin/media')
        .set(auth)
        .expect(200);
      const entry = library.body.data.find(
        (m: { id: string }) => m.id === media.body.id,
      );
      expect(entry.usages).toEqual([{ type: 'SERVICE', id, title: 'V' }]);
      const blocked = await request(app.getHttpServer())
        .delete(`/api/v1/admin/media/${media.body.id}`)
        .set(auth);
      expect(blocked.status).toBe(409);
      expect(blocked.body.code).toBe('MEDIA_IN_USE');

      // Retirer le visuel (`null`) libère l'image : le site retrouve son visuel d'origine.
      await patch({ imageUrl: null }).expect(200);
      const cleared = await request(app.getHttpServer())
        .get(`/api/v1/services/${visualSlug}`)
        .expect(200);
      expect(cleared.body.imageUrl).toBeNull();
      await request(app.getHttpServer())
        .delete(`/api/v1/admin/media/${media.body.id}`)
        .set(auth)
        .expect(204);
    });
  });

  it('traces publication, unpublication and the removal of an offering, with the actor', async () => {
    const auth = { Authorization: `Bearer ${await login(gestionnaireEmail)}` };
    const auditSlug = `${slug}-audit`;
    const created = await request(app.getHttpServer())
      .post('/api/v1/admin/services')
      .set(auth)
      .send({ slug: auditSlug, nameFr: 'Audit', descriptionFr: 'D' })
      .expect(201);
    const id = created.body.id as string;
    const offering = await request(app.getHttpServer())
      .post(`/api/v1/admin/services/${id}/offerings`)
      .set(auth)
      .send({ titleFr: 'À retirer', descriptionFr: 'd' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/services/${id}/publish`)
      .set(auth)
      .expect(200);
    // Répéter une action sans effet n'écrit pas de ligne en plus.
    await request(app.getHttpServer())
      .post(`/api/v1/admin/services/${id}/publish`)
      .set(auth)
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/services/${id}/unpublish`)
      .set(auth)
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/services/${id}/unpublish`)
      .set(auth)
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/services/${id}/offerings/${offering.body.id}`)
      .set(auth)
      .expect(204);

    const trail = await prisma.auditLog.findMany({
      where: { entityId: { in: [id, offering.body.id as string] } },
      orderBy: { createdAt: 'asc' },
    });
    expect(trail.map((e) => e.action)).toEqual([
      'SERVICE_PUBLISHED',
      'SERVICE_UNPUBLISHED',
      'SERVICE_OFFERING_REMOVED',
    ]);
    expect(trail.every((e) => e.actorId !== null)).toBe(true);
    expect(trail[0]).toMatchObject({
      entityType: 'Service',
      beforeData: { status: 'DRAFT', slug: auditSlug },
      afterData: { status: 'PUBLISHED' },
    });
    expect(trail[2]).toMatchObject({
      entityType: 'ServiceOffering',
      beforeData: { service: auditSlug, titleFr: 'À retirer' },
    });
  });
});
