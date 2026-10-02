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
import { MAX_DOCUMENT_BYTES } from './../src/modules/documents-publics/document-signature.js';

const pdf = (label: string) =>
  Buffer.from(`%PDF-1.4\n% ${label}\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n`);

/**
 * Cas de régression : un document ne vaut que par son contenu réel (PDF),
 * un brouillon / archivé / supprimé n'est jamais téléchargeable, même en
 * connaissant son nom de fichier (blueprint/10_Security.md, 17 §3).
 */
describe('Documents publics (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let mediaDir: string;
  let documentsDir: string;

  const password = 'correct horse battery staple';
  const stamp = Date.now();
  const prefix = `e2e-doc-${stamp}`;
  const gestionnaireEmail = `e2e-doc-gest-${stamp}@ewes.example`;
  const userEmail = `e2e-doc-user-${stamp}@ewes.example`;
  let auth: { Authorization: string };

  async function login(email: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return res.body.accessToken as string;
  }

  const create = (
    suffix: string,
    file: Buffer = pdf(suffix),
    fields: Record<string, string> = {},
  ) => {
    // Les surcharges remplacent les valeurs par défaut (jamais de champ en double).
    const merged: Record<string, string> = {
      slug: `${prefix}-${suffix}`,
      titleFr: `Document ${suffix}`,
      category: 'GUIDE',
      ...fields,
    };
    const req = request(app.getHttpServer())
      .post('/api/v1/admin/documents-publics')
      .set(auth);
    for (const [key, value] of Object.entries(merged)) req.field(key, value);
    return req.attach('file', file, `${suffix}.pdf`);
  };

  const storedNameOf = (fileUrl: string) => fileUrl.replace('/files/', '');
  const download = (storedName: string) =>
    request(app.getHttpServer())
      .get(`/api/v1/documents-publics/files/${storedName}`)
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', (c: Buffer) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });
  const post = (url: string) =>
    request(app.getHttpServer()).post(url).set(auth);

  beforeAll(async () => {
    mediaDir = await mkdtemp(join(tmpdir(), 'ewes-docs-e2e-'));
    documentsDir = join(mediaDir, 'documents');
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
        fullName: 'E2E Doc Gestionnaire',
        role: Role.GESTIONNAIRE,
      },
    });
    await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash,
        fullName: 'E2E Doc User',
        role: Role.UTILISATEUR,
      },
    });
    auth = { Authorization: `Bearer ${await login(gestionnaireEmail)}` };
  });

  afterAll(async () => {
    await prisma.publicDocument.deleteMany({
      where: { slug: { startsWith: prefix } },
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
      .get('/api/v1/admin/documents-publics')
      .expect(401);

    const userToken = await login(userEmail);
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/documents-publics')
      .set('Authorization', `Bearer ${userToken}`)
      .field('slug', `${prefix}-x`)
      .field('titleFr', 'x')
      .field('category', 'GUIDE')
      .attach('file', pdf('x'), 'x.pdf');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN_ROLE');
  });

  it('judges a file by its content, enforces the size limit and validates fields', async () => {
    const fake = await create('fake', Buffer.from('MZ\x90\x00 not a pdf'));
    expect(fake.status).toBe(415);
    expect(fake.body.code).toBe('DOCUMENT_TYPE_NOT_ALLOWED');

    const big = await create(
      'big',
      Buffer.concat([pdf('big'), Buffer.alloc(MAX_DOCUMENT_BYTES)]),
    );
    expect(big.status).toBe(413);
    expect(big.body.code).toBe('PAYLOAD_TOO_LARGE');

    const noFile = await request(app.getHttpServer())
      .post('/api/v1/admin/documents-publics')
      .set(auth)
      .field('slug', `${prefix}-nofile`)
      .field('titleFr', 'x')
      .field('category', 'GUIDE');
    expect(noFile.status).toBe(400);
    expect(noFile.body.code).toBe('DOCUMENT_FILE_REQUIRED');

    for (const [suffix, fields] of [
      ['badcat', { category: 'AUTRE' }],
      ['badyear', { year: 'abc' }],
      ['badstatus', { status: 'PUBLISHED' }],
    ] as const) {
      const res = await create(suffix, pdf(suffix), fields);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('BAD_REQUEST');
      expect(JSON.stringify(res.body.details)).toContain(
        Object.keys(fields)[0],
      );
    }

    // Aucun refus n'a laissé de fichier sur le disque.
    const files = existsSync(documentsDir) ? await readdir(documentsDir) : [];
    expect(files).toHaveLength(0);
  });

  it('never serves a draft, archived or deleted document, even by file name', async () => {
    const created = await create('cycle', pdf('cycle'), {
      year: '2025',
      pages: '12',
      excerptFr: 'Résumé',
    }).expect(201);
    expect(created.body.status).toBe('DRAFT');
    const id = created.body.id as string;
    const slug = created.body.slug as string;
    const storedName = storedNameOf(created.body.fileUrl as string);
    expect(storedName).toMatch(/^[0-9a-f-]{36}\.pdf$/);

    // Brouillon : ni fiche ni fichier.
    await request(app.getHttpServer())
      .get(`/api/v1/documents-publics/${slug}`)
      .expect(404);
    await download(storedName).expect(404);

    await post(`/api/v1/admin/documents-publics/${id}/publish`).expect(200);

    const visible = await request(app.getHttpServer())
      .get(`/api/v1/documents-publics/${slug}`)
      .expect(200);
    expect(visible.body.file.url).toBe(`/files/${storedName}`);
    expect(visible.body.file.mimeType).toBe('application/pdf');
    expect(visible.body.year).toBe(2025);
    expect(visible.body.pages).toBe(12);
    expect(visible.body).not.toHaveProperty('id');
    expect(visible.body).not.toHaveProperty('status');
    expect(visible.body).not.toHaveProperty('storedName');

    const file = await download(storedName).expect(200);
    expect(file.headers['content-type']).toBe('application/pdf');
    expect(file.headers['content-disposition']).toBe(
      `attachment; filename="${slug}.pdf"`,
    );
    expect(file.headers['x-content-type-options']).toBe('nosniff');
    expect((file.body as Buffer).equals(pdf('cycle'))).toBe(true);

    const listed = await request(app.getHttpServer())
      .get('/api/v1/documents-publics?category=GUIDE&limit=100')
      .expect(200);
    expect(
      listed.body.data.some((d: { slug: string }) => d.slug === slug),
    ).toBe(true);

    // Dépublié, archivé puis supprimé : le fichier redevient introuvable.
    await post(`/api/v1/admin/documents-publics/${id}/unpublish`).expect(200);
    await download(storedName).expect(404);
    await post(`/api/v1/admin/documents-publics/${id}/publish`).expect(200);
    await download(storedName).expect(200);
    await post(`/api/v1/admin/documents-publics/${id}/archive`).expect(200);
    await download(storedName).expect(404);
    await post(`/api/v1/admin/documents-publics/${id}/publish`).expect(200);

    await request(app.getHttpServer())
      .delete(`/api/v1/admin/documents-publics/${id}`)
      .set(auth)
      .expect(204);
    await download(storedName).expect(404);
    await request(app.getHttpServer())
      .get(`/api/v1/admin/documents-publics/${id}`)
      .set(auth)
      .expect(404);

    // Noms hors motif : jamais lus sur le disque.
    await request(app.getHttpServer())
      .get('/api/v1/documents-publics/files/..%2F..%2Fpackage.json')
      .expect(404);
  });

  it('lets staff read a draft PDF privately and audits every publication change', async () => {
    const created = await create('staff', pdf('staff')).expect(201);
    const id = created.body.id as string;
    const fileUrl = `/api/v1/admin/documents-publics/${id}/file`;
    const read = (headers: Record<string, string> = auth) =>
      request(app.getHttpServer())
        .get(fileUrl)
        .set(headers)
        .buffer(true)
        .parse((r, cb) => {
          const chunks: Buffer[] = [];
          r.on('data', (c: Buffer) => chunks.push(c));
          r.on('end', () => cb(null, Buffer.concat(chunks)));
        });

    // Brouillon : introuvable publiquement, lisible par le personnel, jamais mis en cache partagé.
    await download(storedNameOf(created.body.fileUrl as string)).expect(404);
    const draft = await read().expect(200);
    expect((draft.body as Buffer).equals(pdf('staff'))).toBe(true);
    expect(draft.headers['content-type']).toBe('application/pdf');
    expect(draft.headers['content-disposition']).toBe(
      `inline; filename="${created.body.slug}.pdf"`,
    );
    expect(draft.headers['cache-control']).toBe('private, no-store');
    expect(draft.headers['x-content-type-options']).toBe('nosniff');

    // Sans compte ou sans rôle de personnel : refusé.
    await request(app.getHttpServer()).get(fileUrl).expect(401);
    await read({ Authorization: `Bearer ${await login(userEmail)}` }).expect(403);

    await post(`/api/v1/admin/documents-publics/${id}/publish`).expect(200);
    await post(`/api/v1/admin/documents-publics/${id}/publish`).expect(200); // déjà publié : aucun changement
    await post(`/api/v1/admin/documents-publics/${id}/unpublish`).expect(200);
    await post(`/api/v1/admin/documents-publics/${id}/archive`).expect(200);
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/documents-publics/${id}`)
      .set(auth)
      .expect(204);
    await read().expect(404);

    const trail = await prisma.auditLog.findMany({
      where: { entityType: 'PublicDocument', entityId: id },
      orderBy: { createdAt: 'asc' },
    });
    expect(trail.map((e) => e.action)).toEqual([
      'PUBLIC_DOCUMENT_PUBLISHED',
      'PUBLIC_DOCUMENT_UNPUBLISHED',
      'PUBLIC_DOCUMENT_ARCHIVED',
      'PUBLIC_DOCUMENT_DELETED',
    ]);
    expect(trail.every((e) => e.actorId !== null)).toBe(true);
    expect(trail[0]).toMatchObject({
      beforeData: { status: 'DRAFT', slug: created.body.slug },
      afterData: { status: 'PUBLISHED' },
    });
    expect(trail[3].afterData).toEqual({ deleted: true });
  });

  it('searches, sorts and counts the admin library per status without leaking filters between them', async () => {
    const needle = `srch${stamp}`;
    const doc = (name: string, category: string, extra: Record<string, string> = {}) =>
      create(`${needle}-${name.toLowerCase()}`, pdf(name), { titleFr: `${name} ${needle}`, category, ...extra }).expect(201);
    const charlie = await doc('Charlie', 'GUIDE', { year: '2023' });
    const alpha = await doc('Alpha', 'REPORT');
    const bravo = await doc('Bravo', 'GUIDE', { year: '2025', excerptFr: 'Remise de 100%_exacte demandee.' });
    // Alpha est publié en dernier : c'est aussi le plus récemment modifié.
    await post(`/api/v1/admin/documents-publics/${alpha.body.id}/publish`).expect(200);
    void charlie;
    void bravo;

    const get = (query: string) =>
      request(app.getHttpServer()).get(`/api/v1/admin/documents-publics?${query}`).set(auth);
    const titles = (res: request.Response) =>
      (res.body.data as { titleFr: string }[]).map((d) => d.titleFr.split(' ')[0]);

    // Recherche insensible à la casse (slug compris) ; compteurs par statut.
    const found = await get(`q=${needle.toUpperCase()}&limit=100`).expect(200);
    expect(found.body.meta.total).toBe(3);
    expect(found.body.meta.statuses).toEqual({ DRAFT: 2, PUBLISHED: 1 });

    // Le filtre de statut restreint la liste mais pas les compteurs ; catégorie et recherche, si.
    const drafts = await get(`q=${needle}&status=DRAFT`).expect(200);
    expect(drafts.body.meta.total).toBe(2);
    expect(drafts.body.meta.statuses).toEqual({ DRAFT: 2, PUBLISHED: 1 });
    const guides = await get(`q=${needle}&category=GUIDE`).expect(200);
    expect(guides.body.meta.total).toBe(2);
    expect(guides.body.meta.statuses).toEqual({ DRAFT: 2 });

    // `%` et `_` sont cherchés littéralement, jamais comme jokers.
    const literal = await get('q=%25').expect(200);
    expect(
      (literal.body.data as { excerptFr: string | null }[]).every((d) => d.excerptFr?.includes('%')),
    ).toBe(true);
    expect(titles(literal)).toContain('Bravo');
    expect((await get('q=100%25_exacte').expect(200)).body.meta.total).toBe(1);
    expect((await get('q=100%25Xexacte').expect(200)).body.meta.total).toBe(0);

    // Tri : titre, année (sans année toujours en dernier), catégorie, date de modification.
    const sorted = async (sort: string, order: string) =>
      titles(await get(`q=${needle}&sort=${sort}&order=${order}`).expect(200));
    expect(await sorted('titleFr', 'asc')).toEqual(['Alpha', 'Bravo', 'Charlie']);
    expect(await sorted('titleFr', 'desc')).toEqual(['Charlie', 'Bravo', 'Alpha']);
    expect(await sorted('year', 'asc')).toEqual(['Charlie', 'Bravo', 'Alpha']);
    expect(await sorted('year', 'desc')).toEqual(['Bravo', 'Charlie', 'Alpha']);
    expect((await sorted('category', 'asc'))[0]).toBe('Alpha');
    expect((await sorted('category', 'desc')).at(-1)).toBe('Alpha');
    expect((await sorted('updatedAt', 'desc'))[0]).toBe('Alpha');
    expect((await sorted('updatedAt', 'asc')).at(-1)).toBe('Alpha');

    // Tri + pagination : chaque ligne apparaît une fois.
    const page = async (n: number) =>
      titles(await get(`q=${needle}&sort=titleFr&order=asc&limit=1&page=${n}`).expect(200));
    expect([await page(1), await page(2), await page(3)]).toEqual([['Alpha'], ['Bravo'], ['Charlie']]);

    // Paramètres refusés avec le champ fautif ; aucune injection par le champ de tri.
    for (const bad of ['sort=slug', 'sort=year;drop', 'order=up', `q=${'x'.repeat(101)}`]) {
      const res = await get(bad).expect(400);
      expect(JSON.stringify(res.body)).toContain(bad.split('=')[0]);
    }
  });

  it('replaces the PDF and removes the previous file from disk', async () => {
    const created = await create('replace', pdf('v1')).expect(201);
    const id = created.body.id as string;
    const oldName = storedNameOf(created.body.fileUrl as string);
    await post(`/api/v1/admin/documents-publics/${id}/publish`).expect(200);

    const replaced = await request(app.getHttpServer())
      .put(`/api/v1/admin/documents-publics/${id}/file`)
      .set(auth)
      .attach('file', pdf('v2'), 'v2.pdf')
      .expect(200);
    const newName = storedNameOf(replaced.body.fileUrl as string);
    expect(newName).not.toBe(oldName);
    expect(existsSync(join(documentsDir, oldName))).toBe(false);
    expect(
      ((await download(newName).expect(200)).body as Buffer).equals(pdf('v2')),
    ).toBe(true);
    await download(oldName).expect(404);

    const notPdf = await request(app.getHttpServer())
      .put(`/api/v1/admin/documents-publics/${id}/file`)
      .set(auth)
      .attach('file', Buffer.from('nope'), 'nope.pdf');
    expect(notPdf.status).toBe(415);
    // L'ancien fichier valide est conservé après un remplacement refusé.
    await download(newName).expect(200);
  });

  it('accepts the certificate category and filters the public list by it', async () => {
    const created = await create('certificat', pdf('certificat'), {
      category: 'CERTIFICATE',
    }).expect(201);
    expect(created.body.category).toBe('CERTIFICATE');
    await post(
      `/api/v1/admin/documents-publics/${created.body.id}/publish`,
    ).expect(200);

    const certificates = await request(app.getHttpServer())
      .get('/api/v1/documents-publics?category=CERTIFICATE&limit=100')
      .expect(200);
    const slugs = certificates.body.data.map((d: { slug: string }) => d.slug);
    expect(slugs).toContain(`${prefix}-certificat`);
    expect(
      certificates.body.data.every(
        (d: { category: string }) => d.category === 'CERTIFICATE',
      ),
    ).toBe(true);
  });

  it('locks the slug after publication and rejects duplicates and unknown services', async () => {
    const created = await create('lock').expect(201);
    const id = created.body.id as string;

    const duplicate = await create('lock');
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.code).toBe('DOCUMENT_SLUG_TAKEN');

    const unknownService = await request(app.getHttpServer())
      .patch(`/api/v1/admin/documents-publics/${id}`)
      .set(auth)
      .send({ serviceId: '00000000-0000-4000-8000-000000000000' });
    expect(unknownService.status).toBe(400);
    expect(unknownService.body.code).toBe('SERVICE_NOT_FOUND');

    await post(`/api/v1/admin/documents-publics/${id}/publish`).expect(200);
    const locked = await request(app.getHttpServer())
      .patch(`/api/v1/admin/documents-publics/${id}`)
      .set(auth)
      .send({ slug: `${prefix}-lock-2` });
    expect(locked.status).toBe(409);
    expect(locked.body.code).toBe('DOCUMENT_SLUG_LOCKED');
  });
});
