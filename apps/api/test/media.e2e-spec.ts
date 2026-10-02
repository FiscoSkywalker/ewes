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
    const fake = await upload(Buffer.from('<?php echo "pwned"; ?>'), 'shell.png');
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
      .get(
        '/api/v1/media/00000000-0000-4000-8000-000000000000.png',
      )
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
});
