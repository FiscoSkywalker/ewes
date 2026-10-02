import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import * as argon2 from 'argon2';
import { Role } from '@prisma/client';
import { existsSync } from 'node:fs';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { GlobalHttpExceptionFilter } from './../src/common/filters/http-exception.filter.js';
import { MAX_IMAGE_BYTES } from './../src/modules/media/image-signature.js';

/** PNG 1x1 valide (signature réelle, pas seulement une extension). */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

/**
 * Cas de régression : un fichier ne vaut que par son contenu réel (pas son
 * nom/type déclaré), taille limitée, accès éditorial seulement, média utilisé
 * non supprimable (blueprint/10_Security.md §3, 17_Testing_Strategy.md §3).
 */
describe('Media (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let mediaDir: string;

  const password = 'correct horse battery staple';
  const stamp = Date.now();
  const gestionnaireEmail = `e2e-media-gest-${stamp}@ewes.example`;
  const userEmail = `e2e-media-user-${stamp}@ewes.example`;
  const articleSlug = `e2e-media-article-${stamp}`;
  let auth: { Authorization: string };

  async function login(email: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return res.body.accessToken as string;
  }

  const upload = (buffer: Buffer, filename = 'photo.png') =>
    request(app.getHttpServer())
      .post('/api/v1/admin/media')
      .set(auth)
      .attach('file', buffer, filename);

  beforeAll(async () => {
    // Stockage isolé : aucun fichier de test dans le dossier de développement.
    mediaDir = await mkdtemp(join(tmpdir(), 'ewes-media-e2e-'));
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
        fullName: 'E2E Media Gestionnaire',
        role: Role.GESTIONNAIRE,
      },
    });
    await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash,
        fullName: 'E2E Media User',
        role: Role.UTILISATEUR,
      },
    });
    auth = { Authorization: `Bearer ${await login(gestionnaireEmail)}` };
  });

  afterAll(async () => {
    await prisma.article.deleteMany({ where: { slug: articleSlug } });
    await prisma.media.deleteMany({
      where: { uploadedBy: { email: { in: [gestionnaireEmail, userEmail] } } },
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

  it('rejects unauthenticated and under-privileged uploads', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/media')
      .attach('file', PNG_1X1, 'a.png')
      .expect(401);

    const userToken = await login(userEmail);
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/media')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('file', PNG_1X1, 'a.png');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN_ROLE');
  });

  it('judges a file by its real content, not its name or declared type', async () => {
    const fake = await upload(
      Buffer.from('<?php echo "pwned"; ?>'),
      'shell.png',
    );
    expect(fake.status).toBe(415);
    expect(fake.body.code).toBe('MEDIA_TYPE_NOT_ALLOWED');

    const svg = await upload(
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'),
      'logo.svg',
    );
    expect(svg.status).toBe(415);

    // Rien n'a été écrit sur disque pour les refus.
    expect(await readdir(mediaDir)).toHaveLength(0);

    const none = await request(app.getHttpServer())
      .post('/api/v1/admin/media')
      .set(auth);
    expect(none.status).toBe(400);
    expect(none.body.code).toBe('MEDIA_FILE_REQUIRED');
  });

  it('rejects files over the size limit', async () => {
    const big = Buffer.concat([PNG_1X1, Buffer.alloc(MAX_IMAGE_BYTES)]);
    const res = await upload(big, 'big.png');
    expect(res.status).toBe(413);
    expect(res.body.code).toBe('PAYLOAD_TOO_LARGE');
    expect(await readdir(mediaDir)).toHaveLength(0);
  });

  it('stores a valid image under a random name and serves it safely', async () => {
    const res = await upload(PNG_1X1, '../../évil name.png');
    expect(res.status).toBe(201);
    expect(res.body.mimeType).toBe('image/png');
    expect(res.body.url).toMatch(/^\/uploads\/[0-9a-f-]{36}\.png$/);
    expect(res.body.url).not.toContain('evil');

    const storedName = (res.body.url as string).replace('/uploads/', '');
    const served = await request(app.getHttpServer())
      .get(`/api/v1/media/${storedName}`)
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', (c: Buffer) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(served.headers['content-type']).toBe('image/png');
    expect(served.headers['x-content-type-options']).toBe('nosniff');
    expect(served.headers['cache-control']).toContain('immutable');
    expect((served.body as Buffer).equals(PNG_1X1)).toBe(true);

    // Un nom hors motif ou inconnu n'atteint jamais le disque.
    await request(app.getHttpServer())
      .get('/api/v1/media/..%2F..%2Fpackage.json')
      .expect(404);
    await request(app.getHttpServer())
      .get('/api/v1/media/00000000-0000-4000-8000-000000000000.png')
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/v1/admin/media/${res.body.id}`)
      .set(auth)
      .expect(204);
    expect(existsSync(join(mediaDir, storedName))).toBe(false);
    await request(app.getHttpServer())
      .get(`/api/v1/media/${storedName}`)
      .expect(404);
  });

  it('attaches an image as an article cover and refuses to delete it while used', async () => {
    const uploaded = await upload(PNG_1X1, 'cover.png');
    const mediaId = uploaded.body.id as string;
    const url = uploaded.body.url as string;

    const article = await request(app.getHttpServer())
      .post('/api/v1/admin/articles')
      .set(auth)
      .send({
        slug: articleSlug,
        type: 'ACTUALITE',
        titleFr: 'Avec couverture',
        excerptFr: 'Résumé',
      })
      .expect(201);
    const id = article.body.id as string;

    await request(app.getHttpServer())
      .put(`/api/v1/admin/articles/${id}/cover`)
      .set(auth)
      .send({ mediaId: '00000000-0000-4000-8000-000000000000' })
      .expect(404);

    await request(app.getHttpServer())
      .put(`/api/v1/admin/articles/${id}/cover`)
      .set(auth)
      .send({ mediaId, altFr: 'Une image', altEn: 'An image' })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/articles/${id}/publish`)
      .set(auth)
      .expect(200);

    const publicArticle = await request(app.getHttpServer())
      .get(`/api/v1/articles/${articleSlug}`)
      .expect(200);
    expect(publicArticle.body.image).toEqual({
      url,
      altFr: 'Une image',
      altEn: 'An image',
    });

    const blocked = await request(app.getHttpServer())
      .delete(`/api/v1/admin/media/${mediaId}`)
      .set(auth);
    expect(blocked.status).toBe(409);
    expect(blocked.body.code).toBe('MEDIA_IN_USE');

    await request(app.getHttpServer())
      .delete(`/api/v1/admin/articles/${id}/cover`)
      .set(auth)
      .expect(200);
    const after = await request(app.getHttpServer())
      .get(`/api/v1/articles/${articleSlug}`)
      .expect(200);
    expect(after.body.image).toBeNull();

    await request(app.getHttpServer())
      .delete(`/api/v1/admin/media/${mediaId}`)
      .set(auth)
      .expect(204);
  });

  describe('library listing and bulk removal', () => {
    const tag = `e2e-lib-${stamp}`;
    const list = (query: string) =>
      request(app.getHttpServer())
        .get(`/api/v1/admin/media?q=${tag}${query}`)
        .set(auth);
    const ids: Record<string, string> = {};
    const libraryArticleSlug = `${articleSlug}-lib`;
    let articleId: string;

    beforeAll(async () => {
      // Tailles distinctes pour pouvoir tester le tri par poids.
      const sizes: Record<string, number> = { alpha: 0, Beta: 300, gamma: 100 };
      for (const [name, extra] of Object.entries(sizes)) {
        const res = await upload(
          Buffer.concat([PNG_1X1, Buffer.alloc(extra)]),
          `${tag}-${name}.png`,
        ).expect(201);
        ids[name] = res.body.id as string;
      }
      const article = await request(app.getHttpServer())
        .post('/api/v1/admin/articles')
        .set(auth)
        .send({
          slug: libraryArticleSlug,
          type: 'ACTUALITE',
          titleFr: 'Article de la médiathèque',
          excerptFr: 'Résumé',
        })
        .expect(201);
      articleId = article.body.id as string;
      await request(app.getHttpServer())
        .put(`/api/v1/admin/articles/${articleId}/cover`)
        .set(auth)
        .send({ mediaId: ids.alpha })
        .expect(200);
    });

    afterAll(async () => {
      await prisma.article.deleteMany({
        where: { slug: libraryArticleSlug },
      });
    });

    it('searches by file name without case, treating % and _ literally', async () => {
      const byName = await list('').expect(200);
      expect(byName.body.data).toHaveLength(3);

      const upper = await request(app.getHttpServer())
        .get(`/api/v1/admin/media?q=${tag.toUpperCase()}-BETA`)
        .set(auth)
        .expect(200);
      expect(upper.body.data.map((m: { id: string }) => m.id)).toEqual([
        ids.Beta,
      ]);

      for (const wildcard of ['%', '_']) {
        const none = await request(app.getHttpServer())
          .get(`/api/v1/admin/media?q=${encodeURIComponent(wildcard)}`)
          .set(auth)
          .expect(200);
        expect(none.body.data).toHaveLength(0);
      }
    });

    it('says where each image is used and counts used / unused', async () => {
      const all = await list('').expect(200);
      expect(all.body.meta.usage).toEqual({ all: 3, used: 1, unused: 2 });

      const alpha = all.body.data.find(
        (m: { id: string }) => m.id === ids.alpha,
      );
      expect(alpha.usages).toEqual([
        { type: 'ARTICLE', id: articleId, title: 'Article de la médiathèque' },
      ]);
      expect(alpha.uploadedByName).toBe('E2E Media Gestionnaire');
      const beta = all.body.data.find((m: { id: string }) => m.id === ids.Beta);
      expect(beta.usages).toEqual([]);

      const used = await list('&usage=used').expect(200);
      expect(used.body.data.map((m: { id: string }) => m.id)).toEqual([
        ids.alpha,
      ]);
      expect(used.body.meta.total).toBe(1);
      // Les effectifs ignorent le filtre d'usage : les onglets restent justes.
      expect(used.body.meta.usage).toEqual({ all: 3, used: 1, unused: 2 });

      const unused = await list('&usage=unused').expect(200);
      expect(unused.body.data).toHaveLength(2);
      expect(
        unused.body.data.some((m: { id: string }) => m.id === ids.alpha),
      ).toBe(false);
    });

    it('sorts by name and size in both directions, with a stable pagination', async () => {
      const names = async (query: string) =>
        (await list(query).expect(200)).body.data.map(
          (m: { id: string }) => m.id,
        );

      expect(await names('&sort=originalName&order=asc')).toEqual([
        ids.alpha,
        ids.Beta,
        ids.gamma,
      ]);
      expect(await names('&sort=originalName&order=desc')).toEqual([
        ids.gamma,
        ids.Beta,
        ids.alpha,
      ]);
      expect(await names('&sort=sizeBytes&order=desc')).toEqual([
        ids.Beta,
        ids.gamma,
        ids.alpha,
      ]);
      expect(await names('&sort=sizeBytes&order=asc')).toEqual([
        ids.alpha,
        ids.gamma,
        ids.Beta,
      ]);

      const first = await names('&sort=sizeBytes&order=asc&limit=2&page=1');
      const second = await names('&sort=sizeBytes&order=asc&limit=2&page=2');
      expect([...first, ...second]).toEqual([ids.alpha, ids.gamma, ids.Beta]);
    });

    it('refuses invalid list parameters', async () => {
      for (const query of [
        '&sort=password',
        '&usage=maybe',
        '&order=sideways',
        '&limit=101',
        `&q=${'x'.repeat(101)}`,
      ]) {
        await list(query).expect(400);
      }
    });

    it('removes several images at once, judging each one and auditing it', async () => {
      const unknown = '00000000-0000-4000-8000-000000000000';

      const bad = (body: unknown) =>
        request(app.getHttpServer())
          .post('/api/v1/admin/media/delete')
          .set(auth)
          .send(body as object);
      await bad({ ids: [] }).expect(400);
      await bad({ ids: ['pas-un-uuid'] }).expect(400);
      await bad({
        ids: Array.from(
          { length: 51 },
          (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
        ),
      }).expect(400);
      await bad({ ids: [ids.Beta, ids.Beta] }).expect(400);

      const userToken = await login(userEmail);
      await request(app.getHttpServer())
        .post('/api/v1/admin/media/delete')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ids: [ids.Beta] })
        .expect(403);

      const res = await bad({ ids: [ids.Beta, ids.alpha, unknown] }).expect(
        200,
      );
      expect(res.body.deleted).toEqual([ids.Beta]);
      expect(res.body.blocked).toEqual([
        { id: ids.alpha, reason: 'IN_USE' },
        { id: unknown, reason: 'NOT_FOUND' },
      ]);
      expect(
        await prisma.media.findUnique({ where: { id: ids.Beta } }),
      ).toBeNull();
      expect(
        await prisma.media.findUnique({ where: { id: ids.alpha } }),
      ).not.toBeNull();

      const trail = await prisma.auditLog.findMany({
        where: { entityType: 'Media', entityId: { in: [ids.Beta, ids.alpha] } },
      });
      expect(trail).toHaveLength(1);
      expect(trail[0]).toMatchObject({
        action: 'MEDIA_DELETED',
        entityId: ids.Beta,
        beforeData: { originalName: `${tag}-Beta.png`, mimeType: 'image/png' },
      });
      expect(trail[0].actorId).not.toBeNull();
    });

    it('frees an image once the only content using it is deleted', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/admin/articles/${articleId}`)
        .set(auth)
        .expect(204);

      const after = await list('&usage=used').expect(200);
      expect(after.body.data).toEqual([]);

      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/media/delete')
        .set(auth)
        .send({ ids: [ids.alpha, ids.gamma] })
        .expect(200);
      expect(res.body.deleted.sort()).toEqual([ids.alpha, ids.gamma].sort());
      expect((await list('').expect(200)).body.data).toEqual([]);
    });
  });

  describe('thumbnails', () => {
    const served = (name: string, query = '') =>
      request(app.getHttpServer())
        .get(`/api/v1/media/${name}${query}`)
        .buffer(true)
        .parse((r, cb) => {
          const chunks: Buffer[] = [];
          r.on('data', (c: Buffer) => chunks.push(c));
          r.on('end', () => cb(null, Buffer.concat(chunks)));
        });
    const nameOf = (url: string) => url.replace('/uploads/', '').split('?')[0];

    it('serves a small WebP thumbnail next to the untouched original', async () => {
      const photo = await sharp({
        create: {
          width: 2000,
          height: 1500,
          channels: 3,
          background: '#2f7f86',
        },
      })
        .jpeg()
        .toBuffer();
      const res = await upload(photo, 'grande-photo.jpg').expect(201);
      const name = nameOf(res.body.url as string);
      expect(res.body.thumbUrl).toBe(`/uploads/${name}?size=thumb`);

      const thumb = await served(name, '?size=thumb').expect(200);
      expect(thumb.headers['content-type']).toBe('image/webp');
      expect(thumb.headers['x-content-type-options']).toBe('nosniff');
      expect(thumb.headers['cache-control']).toContain('immutable');
      const meta = await sharp(thumb.body as Buffer).metadata();
      expect(meta.format).toBe('webp');
      expect([meta.width, meta.height]).toEqual([640, 480]);
      expect((thumb.body as Buffer).length).toBeLessThan(photo.length);

      // Sans paramètre, ou avec une valeur inconnue : l'original, intact.
      for (const query of ['', '?size=huge']) {
        const original = await served(name, query).expect(200);
        expect(original.headers['content-type']).toBe('image/jpeg');
        expect((original.body as Buffer).equals(photo)).toBe(true);
      }
    });

    it('straightens a photo by its EXIF orientation and never enlarges a small one', async () => {
      const rotated = await sharp({
        create: { width: 400, height: 200, channels: 3, background: '#be6e32' },
      })
        .jpeg()
        .withMetadata({ orientation: 6 })
        .toBuffer();
      const res = await upload(rotated, 'telephone.jpg').expect(201);
      const thumb = await served(nameOf(res.body.url), '?size=thumb').expect(
        200,
      );
      const meta = await sharp(thumb.body as Buffer).metadata();
      expect([meta.width, meta.height]).toEqual([200, 400]);
    });

    it('rebuilds a missing thumbnail on demand and removes it with the image', async () => {
      const res = await upload(PNG_1X1, 'ancienne.png').expect(201);
      const name = nameOf(res.body.url as string);
      const thumbFile = join(
        mediaDir,
        'thumbs',
        `${name.replace('.png', '')}.webp`,
      );
      expect(existsSync(thumbFile)).toBe(true);

      // Image téléversée avant les vignettes : fabriquée à la première demande.
      await rm(thumbFile);
      await served(name, '?size=thumb').expect(200);
      expect(existsSync(thumbFile)).toBe(true);

      await request(app.getHttpServer())
        .delete(`/api/v1/admin/media/${res.body.id}`)
        .set(auth)
        .expect(204);
      expect(existsSync(thumbFile)).toBe(false);
      await served(name, '?size=thumb').expect(404);
    });

    it('refuses a file that has an image signature but cannot be decoded', async () => {
      const before = (await readdir(mediaDir)).sort();
      const thumbsBefore = (await readdir(join(mediaDir, 'thumbs'))).length;
      const broken = Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        Buffer.from('ceci n’est pas un vrai PNG'),
      ]);
      const res = await upload(broken, 'casse.png');
      expect(res.status).toBe(415);
      expect(res.body.code).toBe('MEDIA_UNREADABLE');
      // Ni original ni vignette laissés sur le disque.
      expect((await readdir(mediaDir)).sort()).toEqual(before);
      expect((await readdir(join(mediaDir, 'thumbs'))).length).toBe(
        thumbsBefore,
      );
    });

    it('never builds a thumbnail for an unknown or malformed name', async () => {
      await served('..%2F..%2Fpackage.json', '?size=thumb').expect(404);
      await served(
        '00000000-0000-4000-8000-000000000000.png',
        '?size=thumb',
      ).expect(404);
    });
  });
});
