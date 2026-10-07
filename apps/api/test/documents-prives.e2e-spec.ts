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
import { MAX_PRIVATE_FILE_BYTES } from './../src/modules/documents-prives/private-file-signature.js';

const pdf = (label: string) =>
  Buffer.from(`%PDF-1.4\n% ${label}\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n`);

/** Faux DOCX/XLSX minimaux : signature ZIP + entrées OOXML (suffisant pour la détection). */
const ooxml = (folder: string) =>
  Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    Buffer.from(`[Content_Types].xml ${folder}document.xml`),
  ]);

/**
 * Cas de régression obligatoires (blueprint/17_Testing_Strategy.md §3) :
 * accès à un document privé sans droit => 403 explicite ; séparation des
 * rôles ; recherche limitée au périmètre ; audit des actions sensibles.
 */
describe('Documents privés (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let storageDir: string;

  const password = 'correct horse battery staple';
  const stamp = Date.now();
  const tag = `e2e-prive-${stamp}`;
  const emails = {
    admin: `${tag}-admin@ewes.example`,
    gest: `${tag}-gest@ewes.example`,
    user1: `${tag}-user1@ewes.example`,
    user2: `${tag}-user2@ewes.example`,
  };
  const ids: Record<string, string> = {};
  let tAdmin: string, tGest: string, tUser1: string, tUser2: string;

  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
  const get = (token: string, url: string) =>
    request(app.getHttpServer()).get(`/api/v1${url}`).set(bearer(token));
  const send = (
    method: 'post' | 'patch' | 'put' | 'delete',
    token: string,
    url: string,
    body?: object,
  ) => {
    const req = request(app.getHttpServer())[method](`/api/v1${url}`).set(bearer(token));
    return body ? req.send(body) : req;
  };

  async function login(email: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return res.body.accessToken as string;
  }

  const upload = (
    token: string,
    folderId: string,
    file: Buffer,
    fields: Record<string, string> = {},
    filename = 'fichier.pdf',
  ) => {
    const req = request(app.getHttpServer())
      .post('/api/v1/documents-prives/files')
      .set(bearer(token))
      .field('folderId', folderId);
    for (const [key, value] of Object.entries(fields)) req.field(key, value);
    return req.attach('file', file, filename);
  };

  const binary = (r: request.Response, cb: (e: Error | null, b: Buffer) => void) => {
    const chunks: Buffer[] = [];
    r.on('data', (c: Buffer) => chunks.push(c));
    r.on('end', () => cb(null, Buffer.concat(chunks)));
  };
  const download = (token: string, id: string) =>
    request(app.getHttpServer())
      .get(`/api/v1/documents-prives/files/${id}/download`)
      .set(bearer(token))
      .buffer(true)
      .parse(binary);

  const replace = (
    token: string,
    id: string,
    file: Buffer,
    filename = 'nouvelle-version.pdf',
  ) =>
    request(app.getHttpServer())
      .put(`/api/v1/documents-prives/files/${id}/file`)
      .set(bearer(token))
      .attach('file', file, filename);
  const storedFiles = async () => (existsSync(storageDir) ? readdir(storageDir) : []);
  const moveFolder = (token: string, id: string, parentId: string | null | undefined) =>
    send('post', token, `/documents-prives/folders/${id}/move`, parentId === undefined ? {} : { parentId });
  /** Dossiers créés par les scénarios de déplacement, supprimés en fin de suite (les plus récents d'abord). */
  const extraFolders: string[] = [];
  const makeFolder = async (name: string, parentId?: string, category = 'Test') => {
    const created = (
      await send('post', tAdmin, '/documents-prives/folders', {
        name: `${tag} ${name}`,
        category,
        ...(parentId && { parentId }),
      }).expect(201)
    ).body.id as string;
    extraFolders.push(created);
    return created;
  };

  const grantFolder = async (folderId: string, userId: string) =>
    (await send('post', tAdmin, '/admin/access-grants/folders', { folderId, userId }).expect(201))
      .body.id as string;
  const grantDocument = async (documentId: string, userId: string) =>
    (await send('post', tAdmin, '/admin/access-grants/documents', { documentId, userId }).expect(201))
      .body.id as string;
  const revokeFolder = (id: string) =>
    send('delete', tAdmin, `/admin/access-grants/folders/${id}`).expect(204);
  const revokeDocument = (id: string) =>
    send('delete', tAdmin, `/admin/access-grants/documents/${id}`).expect(204);

  const auditOf = async (params: string) =>
    (await get(tAdmin, `/admin/audit-logs?${params}`).expect(200)).body.data as {
      action: string;
      actorId: string | null;
      ipAddress: string | null;
      userAgent: string | null;
      beforeData: Record<string, unknown> | null;
      afterData: Record<string, unknown> | null;
    }[];

  beforeAll(async () => {
    storageDir = await mkdtemp(join(tmpdir(), 'ewes-private-e2e-'));
    process.env.PRIVATE_STORAGE_PATH = storageDir;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new GlobalHttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const roles: [keyof typeof emails, Role][] = [
      ['admin', Role.ADMINISTRATEUR],
      ['gest', Role.GESTIONNAIRE],
      ['user1', Role.UTILISATEUR],
      ['user2', Role.UTILISATEUR],
    ];
    for (const [key, role] of roles) {
      const user = await prisma.user.create({
        data: { email: emails[key], passwordHash, fullName: `E2E ${key}`, role },
      });
      ids[key] = user.id;
    }
    [tAdmin, tGest, tUser1, tUser2] = await Promise.all([
      login(emails.admin),
      login(emails.gest),
      login(emails.user1),
      login(emails.user2),
    ]);

    // Arborescence : ROOT (RESTREINT) > SUB ; OTHER à part.
    const folder = async (token: string, body: object, status = 201) =>
      (await send('post', token, '/documents-prives/folders', body).expect(status)).body;
    ids.root = (await folder(tAdmin, { name: `${tag} Racine`, category: 'Administratif', projectRef: `PRJ-${stamp}` })).id;
    ids.other = (await folder(tAdmin, { name: `${tag} Autre`, category: 'Juridique' })).id;
    await grantFolder(ids.root, ids.gest);
    ids.sub = (await folder(tGest, { name: `${tag} Sous-dossier`, category: 'Administratif', parentId: ids.root })).id;
  });

  afterAll(async () => {
    const folderIds = [ids.root, ids.sub, ids.other, ...extraFolders].filter(Boolean);
    await prisma.privateDocument.deleteMany({ where: { folderId: { in: folderIds } } });
    for (const id of [...extraFolders].reverse()) {
      await prisma.folder.updateMany({ where: { parentId: id }, data: { parentId: null } });
      await prisma.folder.deleteMany({ where: { id } });
    }
    await prisma.folder.deleteMany({ where: { id: ids.sub } });
    await prisma.folder.deleteMany({ where: { id: { in: [ids.root, ids.other].filter(Boolean) } } });
    const userIds = Object.values(emails);
    await prisma.session.deleteMany({ where: { user: { email: { in: userIds } } } });
    // Les entrées d'audit sont inaltérables : leur acteur est anonymisé (actorId -> NULL).
    await prisma.user.deleteMany({ where: { email: { in: userIds } } });
    await app.close();
    await rm(storageDir, { recursive: true, force: true });
  });

  it('requires authentication on every route', async () => {
    for (const path of [
      '/documents-prives/folders',
      '/documents-prives/files',
      '/documents-prives/search?q=a',
      '/admin/access-grants/folders',
      '/admin/audit-logs',
    ]) {
      await request(app.getHttpServer()).get(`/api/v1${path}`).expect(401);
    }
  });

  it('reserves top-level folders, folder deletion and grants to the administrator', async () => {
    const topLevel = await send('post', tGest, '/documents-prives/folders', {
      name: 'X', category: 'Y',
    });
    expect(topLevel.status).toBe(403);
    expect(topLevel.body.code).toBe('FORBIDDEN_ROLE');

    // Sous-dossier sans droit sur le parent : refusé et audité.
    const noRight = await send('post', tGest, '/documents-prives/folders', {
      name: 'X', category: 'Y', parentId: ids.other,
    });
    expect(noRight.status).toBe(403);
    expect(noRight.body.code).toBe('FOLDER_ACCESS_FORBIDDEN');

    // Un Gestionnaire ne fixe pas la confidentialité d'un dossier.
    const level = await send('post', tGest, '/documents-prives/folders', {
      name: 'X', category: 'Y', parentId: ids.root, confidentiality: 'PUBLIC_INTERNE',
    });
    expect(level.status).toBe(403);

    // Le sous-dossier du Gestionnaire hérite de la confidentialité du parent.
    const sub = await get(tAdmin, `/documents-prives/folders/${ids.sub}`).expect(200);
    expect(sub.body.confidentiality).toBe('RESTREINT');

    for (const token of [tGest, tUser1]) {
      await send('delete', token, `/documents-prives/folders/${ids.sub}`).expect(403);
      await request(app.getHttpServer())
        .post('/api/v1/admin/access-grants/folders')
        .set(bearer(token))
        .send({ folderId: ids.root, userId: ids.user1 })
        .expect(403);
    }
  });

  it('shows a user only the folders granted to them, hiding the parents', async () => {
    // Aucun droit : arborescence vide, et un dossier existant reste un 403 (pas de 404 révélateur).
    expect((await get(tUser2, '/documents-prives/folders').expect(200)).body.data).toEqual([]);
    const existing = await get(tUser2, `/documents-prives/folders/${ids.root}`);
    const unknown = await get(tUser2, '/documents-prives/folders/00000000-0000-4000-8000-000000000000');
    expect(existing.status).toBe(403);
    expect(unknown.status).toBe(403);
    expect(unknown.body.code).toBe(existing.body.code);

    // Droit sur le seul sous-dossier : il apparaît comme racine, sans révéler son parent.
    const grant = await grantFolder(ids.sub, ids.user1);
    const tree = (await get(tUser1, '/documents-prives/folders').expect(200)).body.data;
    expect(tree.map((f: { id: string }) => f.id)).toEqual([ids.sub]);
    expect(tree[0].parentId).toBeNull();
    expect(tree[0].canWrite).toBe(false);
    await get(tUser1, `/documents-prives/folders/${ids.root}`).expect(403);
    await revokeFolder(grant);

    // Droit sur le parent : le sous-dossier est couvert (héritage descendant).
    const parentGrant = await grantFolder(ids.root, ids.user1);
    const wide = (await get(tUser1, '/documents-prives/folders').expect(200)).body.data;
    expect(wide.map((f: { id: string }) => f.id).sort((a: string, b: string) => a.localeCompare(b))).toEqual([ids.root, ids.sub].sort((a, b) => a.localeCompare(b)));
    expect(wide.find((f: { id: string }) => f.id === ids.sub).parentId).toBe(ids.root);
    const detail = await get(tUser1, `/documents-prives/folders/${ids.root}`).expect(200);
    expect(detail.body.children.map((c: { id: string }) => c.id)).toEqual([ids.sub]);
    await revokeFolder(parentGrant);
  });

  it('validates uploads by real content and size, and never leaks storage details', async () => {
    const fake = await upload(tAdmin, ids.root, Buffer.from('MZ\x90\x00 pas un pdf'), {}, 'faux.pdf');
    expect(fake.status).toBe(415);
    expect(fake.body.code).toBe('DOCUMENT_TYPE_NOT_ALLOWED');
    // Archive ZIP quelconque (sans entrées OOXML) refusée.
    const zip = await upload(tAdmin, ids.root, Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]), {}, 'a.docx');
    expect(zip.status).toBe(415);

    const big = await upload(tAdmin, ids.root, Buffer.concat([pdf('big'), Buffer.alloc(MAX_PRIVATE_FILE_BYTES)]));
    expect(big.status).toBe(413);
    expect(big.body.code).toBe('PAYLOAD_TOO_LARGE');
    expect(existsSync(storageDir) ? await readdir(storageDir) : []).toHaveLength(0);

    const noFile = await request(app.getHttpServer())
      .post('/api/v1/documents-prives/files')
      .set(bearer(tAdmin))
      .field('folderId', ids.root);
    expect(noFile.status).toBe(400);
    expect(noFile.body.code).toBe('DOCUMENT_FILE_REQUIRED');

    // Formats Office reconnus par contenu.
    const docx = await upload(tAdmin, ids.root, ooxml('word/'), { name: `${tag} docx` }, 'x.docx').expect(201);
    expect(docx.body.fileType).toContain('wordprocessingml');
    const xlsx = await upload(tAdmin, ids.root, ooxml('xl/'), { name: `${tag} xlsx` }, 'x.xlsx').expect(201);
    expect(xlsx.body.fileType).toContain('spreadsheetml');

    const ok = await upload(tAdmin, ids.root, pdf('ok'), { name: `${tag} Contrat`, description: 'bail commercial' }).expect(201);
    const serialized = JSON.stringify(ok.body);
    expect(ok.body.status).toBe('ACTIVE');
    expect(ok.body.confidentiality).toBe('RESTREINT');
    expect(serialized).not.toMatch(/storedName|fileUrl|storage|\.pdf"/i);
    // Écrit sous un nom aléatoire, hors de toute racine publique.
    const files = await readdir(storageDir);
    expect(files.every((f) => /^[0-9a-f-]{36}\.(pdf|docx|xlsx)$/.test(f))).toBe(true);
    expect(files.length).toBe(3);
  });

  it('refuses every action without a grant with the same explicit 403, and audits the attempt', async () => {
    const doc = await upload(tAdmin, ids.other, pdf('secret'), { name: `${tag} Secret` }).expect(201);
    const id = doc.body.id as string;

    // Requêtes lancées l'une après l'autre (supertest les démarre à l'appel de then).
    const attempts = [
      () => get(tUser2, `/documents-prives/files/${id}`),
      () => get(tUser2, `/documents-prives/files/${id}/download`),
      () => send('patch', tUser2, `/documents-prives/files/${id}`, { name: 'x' }),
      () => send('post', tUser2, `/documents-prives/files/${id}/archive`),
    ];
    for (const attempt of attempts) {
      const res = await attempt();
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('DOCUMENT_ACCESS_FORBIDDEN');
    }
    // Un identifiant inexistant donne exactement la même réponse (aucune fuite d'existence).
    const ghost = await get(tUser2, '/documents-prives/files/00000000-0000-4000-8000-000000000000');
    expect(ghost.status).toBe(403);
    expect(ghost.body.code).toBe('DOCUMENT_ACCESS_FORBIDDEN');
    expect(ghost.body.message).toBe('Vous n’avez pas accès à ce document.');
    // L'Administrateur, lui, obtient un 404 explicite.
    await get(tAdmin, '/documents-prives/files/00000000-0000-4000-8000-000000000000').expect(404);

    const denied = (await auditOf(`action=DOCUMENT_ACCESS_DENIED&entityId=${id}`)).filter(
      (e) => e.actorId === ids.user2,
    );
    expect(denied.length).toBeGreaterThanOrEqual(4);
    expect(denied[0].ipAddress).toBeTruthy();
  });

  it('lets a Manager write only where granted, and a User never write', async () => {
    // Gestionnaire : droit sur ROOT (donc SUB), aucun sur OTHER.
    const own = await upload(tGest, ids.sub, pdf('g-sub'), { name: `${tag} Note service` }).expect(201);
    expect(own.body.canWrite).toBe(true);
    await upload(tGest, ids.root, pdf('g-root'), { name: `${tag} Note racine` }).expect(201);
    const foreign = await upload(tGest, ids.other, pdf('g-other'), { name: 'X' });
    expect(foreign.status).toBe(403);
    expect(foreign.body.code).toBe('FOLDER_ACCESS_FORBIDDEN');

    // Utilisateur avec droit de lecture : téléverser/modifier/archiver refusé.
    const grant = await grantFolder(ids.root, ids.user1);
    const asUser = await upload(tUser1, ids.root, pdf('u'), { name: 'X' });
    expect(asUser.status).toBe(403);
    expect(asUser.body.code).toBe('DOCUMENT_WRITE_FORBIDDEN');
    const docId = own.body.id as string;
    await get(tUser1, `/documents-prives/files/${docId}`).expect(200);
    await send('patch', tUser1, `/documents-prives/files/${docId}`, { name: 'Y' }).expect(403);
    await send('post', tUser1, `/documents-prives/files/${docId}/archive`).expect(403);
    await send('delete', tUser1, `/documents-prives/files/${docId}`).expect(403);
    await send('delete', tGest, `/documents-prives/files/${docId}`).expect(403);

    // Un Gestionnaire n'abaisse pas la confidentialité sous celle du dossier.
    const lower = await upload(tGest, ids.root, pdf('low'), { name: 'X', confidentiality: 'PUBLIC_INTERNE' });
    expect(lower.status).toBe(403);
    expect(lower.body.code).toBe('FORBIDDEN_ROLE');
    await revokeFolder(grant);
  });

  it('applies a stricter confidentiality override: folder grants no longer open it, a document grant does', async () => {
    const strict = await upload(tAdmin, ids.root, pdf('strict'), {
      name: `${tag} Confidentiel`, confidentiality: 'CONFIDENTIEL',
    }).expect(201);
    expect(strict.body.confidentiality).toBe('CONFIDENTIEL');
    expect(strict.body.confidentialityOverride).toBe('CONFIDENTIEL');
    const id = strict.body.id as string;

    const folderGrant = await grantFolder(ids.root, ids.user1);
    const listed = (await get(tUser1, `/documents-prives/files?folderId=${ids.root}`).expect(200)).body.data;
    expect(listed.map((d: { id: string }) => d.id)).not.toContain(id);
    expect((await get(tUser1, `/documents-prives/files/${id}`)).status).toBe(403);
    expect((await download(tUser1, id)).status).toBe(403);
    // Même un Gestionnaire doté du droit de dossier ne le lit ni ne le modifie.
    expect((await get(tGest, `/documents-prives/files/${id}`)).status).toBe(403);
    expect((await send('patch', tGest, `/documents-prives/files/${id}`, { name: 'x' })).status).toBe(403);

    // Droit isolé sur le document : accès à ce document seul, sans révéler son dossier.
    const docGrant = await grantDocument(id, ids.user2);
    const opened = await get(tUser2, `/documents-prives/files/${id}`).expect(200);
    expect(opened.body.folderId).toBeNull();
    expect(opened.body.folderName).toBeNull();
    expect((await download(tUser2, id)).status).toBe(200);
    expect((await get(tUser2, '/documents-prives/folders').expect(200)).body.data).toEqual([]);

    // Abaisser la confidentialité effective : Administrateur seul.
    expect((await send('patch', tGest, `/documents-prives/files/${id}`, { confidentiality: null })).status).toBe(403);
    await send('patch', tAdmin, `/documents-prives/files/${id}`, { confidentiality: null }).expect(200);
    expect((await get(tUser1, `/documents-prives/files/${id}`)).status).toBe(200);

    await revokeDocument(docGrant);
    await revokeFolder(folderGrant);
    expect((await get(tUser2, `/documents-prives/files/${id}`)).status).toBe(403);
  });

  it('downloads the exact content with safe headers, audits it, and stops at revocation', async () => {
    const doc = await upload(tAdmin, ids.root, pdf('contenu exact'), { name: `${tag} Rapport é/ü*` }).expect(201);
    const id = doc.body.id as string;
    const grant = await grantFolder(ids.root, ids.user1);

    const res = await download(tUser1, id).expect(200);
    expect((res.body as Buffer).equals(pdf('contenu exact'))).toBe(true);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['cache-control']).toBe('private, no-store');
    const disposition = res.headers['content-disposition'] as string;
    expect(disposition.startsWith('attachment;')).toBe(true);
    // Nom ASCII sûr (accents et caractères spéciaux retirés), forme UTF-8 pour les accents.
    const asciiName = /filename="([^"]*)"/.exec(disposition)![1];
    expect(asciiName).toMatch(/^[ -~]+$/);
    expect(asciiName).not.toMatch(/[/:*?<>|]/);
    expect(disposition).toContain("filename*=UTF-8''");

    const downloads = (await auditOf(`action=DOCUMENT_DOWNLOADED&entityId=${id}`)).filter(
      (e) => e.actorId === ids.user1,
    );
    expect(downloads).toHaveLength(1);
    expect(downloads[0].ipAddress).toBeTruthy();
    expect(downloads[0].userAgent === null || typeof downloads[0].userAgent === 'string').toBe(true);
    // Aucun chemin ni nom de stockage dans le journal.
    expect(JSON.stringify(downloads[0])).not.toMatch(/storage|\.pdf/i);

    // Révocation : effet immédiat, tracée avec la valeur avant.
    await revokeFolder(grant);
    expect((await download(tUser1, id)).status).toBe(403);
    expect((await get(tUser1, `/documents-prives/files/${id}`)).status).toBe(403);
    const revoked = (await auditOf(`action=ACCESS_REVOKED&entityId=${ids.root}`)).find(
      (e) => e.beforeData?.userId === ids.user1,
    );
    expect(revoked?.actorId).toBe(ids.admin);
    expect(revoked?.beforeData).toEqual({ userId: ids.user1, folderId: ids.root, scope: 'folder' });
  });

  it('archives and restores while keeping the document readable, and soft-deletes for the administrator only', async () => {
    const doc = await upload(tGest, ids.sub, pdf('cycle'), { name: `${tag} Cycle` }).expect(201);
    const id = doc.body.id as string;

    const archived = await send('post', tGest, `/documents-prives/files/${id}/archive`).expect(200);
    expect(archived.body.status).toBe('ARCHIVED');
    expect((await download(tGest, id)).status).toBe(200);
    const onlyArchived = (await get(tGest, `/documents-prives/files?folderId=${ids.sub}&status=ARCHIVED`).expect(200)).body.data;
    expect(onlyArchived.map((d: { id: string }) => d.id)).toContain(id);
    expect((await send('post', tGest, `/documents-prives/files/${id}/restore`).expect(200)).body.status).toBe('ACTIVE');

    await send('delete', tAdmin, `/documents-prives/files/${id}`).expect(204);
    expect((await get(tAdmin, `/documents-prives/files/${id}`)).status).toBe(404);
    expect((await get(tGest, `/documents-prives/files/${id}`)).status).toBe(403);
    expect((await download(tAdmin, id)).status).toBe(404);
    const all = (await get(tAdmin, `/documents-prives/files?folderId=${ids.sub}`).expect(200)).body.data;
    expect(all.map((d: { id: string }) => d.id)).not.toContain(id);
    // Le dossier ne peut plus être supprimé : la trace du document y reste liée.
    expect((await send('delete', tAdmin, `/documents-prives/folders/${ids.sub}`)).body.code).toBe('FOLDER_NOT_EMPTY');

    const actions = (await auditOf(`entityId=${id}`)).map((e) => e.action);
    for (const action of ['DOCUMENT_UPLOADED', 'DOCUMENT_ARCHIVED', 'DOCUMENT_RESTORED', 'DOCUMENT_DELETED']) {
      expect(actions).toContain(action);
    }
  });

  it('searches full text within the user scope only', async () => {
    const marker = `zorglub${stamp}`;
    const visible = await upload(tAdmin, ids.root, pdf('s1'), { name: `${tag} ${marker} visible`, description: 'plan stratégique' }).expect(201);
    const hidden = await upload(tAdmin, ids.other, pdf('s2'), { name: `${tag} ${marker} cache` }).expect(201);
    const byProject = `PRJ-${stamp}`;

    // Sans droit : rien, même si les termes correspondent.
    expect((await get(tUser2, `/documents-prives/search?q=${marker}`).expect(200)).body.data).toEqual([]);

    const grant = await grantFolder(ids.root, ids.user1);
    const found = (await get(tUser1, `/documents-prives/search?q=${marker}`).expect(200)).body;
    expect(found.data.map((d: { id: string }) => d.id)).toEqual([visible.body.id]);
    expect(found.meta.total).toBe(1);
    // Champs du dossier (projet) et de la description.
    const viaProject = (await get(tUser1, `/documents-prives/search?q=${byProject}`).expect(200)).body.data;
    expect(viaProject.length).toBeGreaterThan(0);
    const viaDescription = (await get(tUser1, '/documents-prives/search?q=strat%C3%A9gique').expect(200)).body.data;
    expect(viaDescription.map((d: { id: string }) => d.id)).toContain(visible.body.id);

    // Fragment de mot (pluriel, début de mot) : nom du dossier et description compris.
    const viaFolderName = (await get(tUser1, `/documents-prives/search?q=${encodeURIComponent(`${tag} Racin`)}`).expect(200)).body.data;
    expect(viaFolderName.map((d: { id: string }) => d.id)).toContain(visible.body.id);
    const viaFragment = (await get(tUser1, '/documents-prives/search?q=strat%C3%A9g').expect(200)).body.data;
    expect(viaFragment.map((d: { id: string }) => d.id)).toContain(visible.body.id);
    expect((await get(tUser2, '/documents-prives/search?q=strat%C3%A9g').expect(200)).body.data).toEqual([]);

    // L'Administrateur voit tout le périmètre.
    const adminFound = (await get(tAdmin, `/documents-prives/search?q=${marker}`).expect(200)).body.data;
    expect(adminFound.map((d: { id: string }) => d.id).sort((a: string, b: string) => a.localeCompare(b))).toEqual([visible.body.id, hidden.body.id].sort((a: string, b: string) => a.localeCompare(b)));

    // Requêtes hostiles : traitées comme du texte, jamais interprétées.
    for (const q of [`'; DROP TABLE private_documents; --`, '%', '_', '"', '& | !', '\\']) {
      await get(tUser1, `/documents-prives/search?q=${encodeURIComponent(q)}`).expect(200);
    }
    expect(await prisma.privateDocument.count()).toBeGreaterThan(0);
    await get(tUser1, '/documents-prives/search').expect(400);
    await revokeFolder(grant);
  });

  it('counts, sorts and filters without ever widening the scope', async () => {
    const marker = `quartz${stamp}`;
    const folder = (
      await send('post', tAdmin, '/documents-prives/folders', {
        name: `${tag} Écrans`,
        category: `Technique-${stamp}`,
        year: 2024,
        parentId: ids.other,
      }).expect(201)
    ).body.id as string;
    const names = ['b', 'a', 'c'].map((letter) => `${tag} ${marker} ${letter}`);
    const docs: string[] = [];
    for (const name of names) {
      docs.push((await upload(tAdmin, folder, pdf(name), { name }).expect(201)).body.id);
    }
    const sheet = (
      await upload(tAdmin, folder, ooxml('xl/'), { name: `${tag} ${marker} tableur` }, 'budget.xlsx').expect(201)
    ).body.id as string;
    const secret = (
      await upload(tAdmin, folder, pdf('secret'), { name: `${tag} ${marker} secret`, confidentiality: 'CONFIDENTIEL' }).expect(201)
    ).body.id as string;
    await send('post', tAdmin, `/documents-prives/files/${docs[2]}/archive`).expect(200);

    try {
      // Sans droit sur le dossier : un droit isolé ne révèle ni le dossier ni son compte.
      const isolatedGrant = await grantDocument(secret, ids.user2);
      const isolated = (await get(tUser2, '/documents-prives/files?scope=isolated').expect(200)).body;
      expect(isolated.data.map((d: { id: string }) => d.id)).toEqual([secret]);
      expect(isolated.data[0].folderId).toBeNull();
      expect(isolated.data[0].uploadedByName).toBe('E2E admin');
      expect((await get(tUser2, '/documents-prives/folders').expect(200)).body.data).toEqual([]);
      // Les filtres de classement ne fuient pas le dossier d'un document isolé.
      expect(
        (await get(tUser2, `/documents-prives/search?q=${marker}&year=2024`).expect(200)).body.data,
      ).toEqual([]);
      expect(
        (await get(tUser2, `/documents-prives/search?q=${marker}`).expect(200)).body.data.map(
          (d: { id: string }) => d.id,
        ),
      ).toEqual([secret]);
      await revokeDocument(isolatedGrant);

      // Droit de dossier : le compte ignore l'archivé et le document plus confidentiel.
      const grant = await grantFolder(folder, ids.user1);
      const listed = (await get(tUser1, '/documents-prives/folders').expect(200)).body.data;
      expect(listed.map((f: { id: string; documentCount: number }) => [f.id, f.documentCount])).toEqual([[folder, 3]]);
      const adminView = (await get(tAdmin, '/documents-prives/folders').expect(200)).body.data.find(
        (f: { id: string }) => f.id === folder,
      );
      expect(adminView.documentCount).toBe(4);
      // Un dossier ouvert n'a rien d'« isolé ».
      expect((await get(tUser1, '/documents-prives/files?scope=isolated').expect(200)).body.data).toEqual([]);

      const sorted = (
        await get(tUser1, `/documents-prives/files?folderId=${folder}&status=ACTIVE&sort=name&order=asc`).expect(200)
      ).body.data;
      expect(sorted.map((d: { id: string }) => d.id)).toEqual([docs[1], docs[0], sheet]);
      await get(tUser1, '/documents-prives/files?sort=storedName').expect(400);
      await get(tUser1, '/documents-prives/files?scope=all').expect(400);

      const idsOf = async (params: string) =>
        (await get(tUser1, `/documents-prives/search?q=${marker}&${params}`).expect(200)).body.data
          .map((d: { id: string }) => d.id)
          .sort((a: string, b: string) => a.localeCompare(b));
      const sortIds = (list: string[]) => [...list].sort((a, b) => a.localeCompare(b));
      expect(await idsOf('status=ARCHIVED')).toEqual([docs[2]]);
      expect(await idsOf('type=excel')).toEqual([sheet]);
      expect(await idsOf('type=pdf&status=ACTIVE')).toEqual(sortIds([docs[0], docs[1]]));
      expect(await idsOf(`category=${encodeURIComponent(`Technique-${stamp}`)}&year=2024`)).toEqual(
        sortIds([docs[0], docs[1], docs[2], sheet]),
      );
      expect(await idsOf('year=1999')).toEqual([]);
      await get(tUser1, `/documents-prives/search?q=${marker}&type=exe`).expect(400);
      await revokeFolder(grant);
    } finally {
      await prisma.privateDocument.deleteMany({ where: { folderId: folder } });
      await prisma.folder.deleteMany({ where: { id: folder } });
    }
  });

  it('restricts grants to the administrator, to real non-admin accounts, without duplicates', async () => {
    const duplicate = await grantFolder(ids.root, ids.user2);
    const again = await send('post', tAdmin, '/admin/access-grants/folders', { folderId: ids.root, userId: ids.user2 });
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('ACCESS_GRANT_EXISTS');

    const toAdmin = await send('post', tAdmin, '/admin/access-grants/folders', { folderId: ids.root, userId: ids.admin });
    expect(toAdmin.status).toBe(400);
    expect(toAdmin.body.code).toBe('GRANT_NOT_APPLICABLE');
    await send('post', tAdmin, '/admin/access-grants/folders', {
      folderId: ids.root, userId: '00000000-0000-4000-8000-000000000000',
    }).expect(404);
    await send('post', tAdmin, '/admin/access-grants/folders', {
      folderId: '00000000-0000-4000-8000-000000000000', userId: ids.user2,
    }).expect(404);

    const listed = (await get(tAdmin, `/admin/access-grants/folders?folderId=${ids.root}`).expect(200)).body.data;
    expect(JSON.stringify(listed)).not.toMatch(/passwordHash/);
    await revokeFolder(duplicate);
    await send('delete', tAdmin, `/admin/access-grants/folders/${duplicate}`).expect(404);

    const granted = (await auditOf(`action=ACCESS_GRANTED&entityId=${ids.root}`)).find(
      (e) => e.afterData?.userId === ids.user2,
    );
    expect(granted?.afterData).toEqual({ userId: ids.user2, folderId: ids.root, scope: 'folder' });
  });

  it('keeps the audit log read-only for the administrator and immutable in the database', async () => {
    for (const token of [tGest, tUser1]) {
      await get(token, '/admin/audit-logs').expect(403);
    }
    const first = await prisma.auditLog.findFirstOrThrow({ where: { actorId: ids.admin } });

    // Ni modification ni suppression, même en SQL direct (déclencheur PostgreSQL).
    await expect(
      prisma.auditLog.update({ where: { id: first.id }, data: { action: 'FALSIFIE' } }),
    ).rejects.toThrow(/écriture seule/);
    await expect(prisma.auditLog.delete({ where: { id: first.id } })).rejects.toThrow(/écriture seule/);
    await expect(prisma.auditLog.deleteMany({ where: { actorId: ids.admin } })).rejects.toThrow(/écriture seule/);
    await expect(
      prisma.auditLog.update({ where: { id: first.id }, data: { actorId: ids.gest } }),
    ).rejects.toThrow(/écriture seule/);
    // TRUNCATE (contournement évident du déclencheur par ligne) est refusé aussi.
    await expect(prisma.$executeRawUnsafe('TRUNCATE TABLE audit_logs')).rejects.toThrow(
      /écriture seule/,
    );
    const unchanged = await prisma.auditLog.findUniqueOrThrow({ where: { id: first.id } });
    expect(unchanged.action).toBe(first.action);

    // Aucune route d'écriture n'existe.
    await send('delete', tAdmin, `/admin/audit-logs/${first.id}`).expect(404);
    await send('patch', tAdmin, `/admin/audit-logs/${first.id}`, { action: 'X' }).expect(404);
  });

  it('moves a folder with its content — administrator only — and the rights follow the tree', async () => {
    const source = await makeFolder('Déplacé');
    const child = await makeFolder('Enfant', source);
    const target = await makeFolder('Cible', undefined, 'Juridique');
    const doc = await upload(tAdmin, child, pdf('dans-enfant'), { name: `${tag} Pièce` }).expect(201);
    const grant = await grantFolder(target, ids.user1);

    // Avant : le droit sur la cible ne couvre pas le dossier.
    await get(tUser1, `/documents-prives/folders/${child}`).expect(403);

    // Ni le Gestionnaire (même avec droit d'écriture) ni l'Utilisateur ne déplacent.
    const writer = await grantFolder(source, ids.gest);
    for (const token of [tGest, tUser1]) {
      const refused = await moveFolder(token, source, target);
      expect(refused.status).toBe(403);
      expect(refused.body.code).toBe('FORBIDDEN_ROLE');
    }
    await revokeFolder(writer);
    await request(app.getHttpServer())
      .post(`/api/v1/documents-prives/folders/${source}/move`)
      .send({ parentId: target })
      .expect(401);

    // Déplacement de l'enfant sous la cible : ses documents le suivent, sans changer.
    const moved = await moveFolder(tAdmin, child, target).expect(200);
    expect(moved.body.parentId).toBe(target);
    expect(moved.body.documentCount).toBe(1);
    const after = await get(tAdmin, `/documents-prives/files/${doc.body.id}`).expect(200);
    expect(after.body.folderId).toBe(child);
    expect(after.body.confidentiality).toBe('RESTREINT');

    // Le droit de la cible couvre maintenant le dossier déplacé et son document.
    await get(tUser1, `/documents-prives/folders/${child}`).expect(200);
    await get(tUser1, `/documents-prives/files/${doc.body.id}`).expect(200);
    const tree = (await get(tUser1, '/documents-prives/folders').expect(200)).body.data as {
      id: string;
      parentId: string | null;
    }[];
    expect(tree.find((f) => f.id === child)?.parentId).toBe(target);

    // Au premier niveau : plus de parent, et le droit hérité de la cible disparaît.
    const top = await moveFolder(tAdmin, child, null).expect(200);
    expect(top.body.parentId).toBeNull();
    await get(tUser1, `/documents-prives/folders/${child}`).expect(403);
    await get(tUser1, `/documents-prives/files/${doc.body.id}`).expect(403);

    // Journal : un seul événement par déplacement réel, avec les noms avant/après.
    const events = (await auditOf(`action=FOLDER_MOVED&entityId=${child}`)).reverse();
    expect(events).toHaveLength(2);
    expect(events[0].beforeData).toMatchObject({ parentId: source, parentName: `${tag} Déplacé` });
    expect(events[0].afterData).toMatchObject({ parentId: target, parentName: `${tag} Cible` });
    expect(events[1].beforeData).toMatchObject({ parentId: target });
    expect(events[1].afterData).toMatchObject({ parentId: null, parentName: null });

    // Déplacer au même endroit : sans effet, sans trace.
    await moveFolder(tAdmin, child, null).expect(200);
    expect(await auditOf(`action=FOLDER_MOVED&entityId=${child}`)).toHaveLength(2);
    await revokeFolder(grant);
  });

  it('refuses to move a folder into itself or its own descendants, and rejects bad targets', async () => {
    const a = await makeFolder('Boucle A');
    const b = await makeFolder('Boucle B', a);
    const c = await makeFolder('Boucle C', b);

    for (const [id, target] of [
      [a, a],
      [a, b],
      [a, c],
      [b, c],
    ] as const) {
      const res = await moveFolder(tAdmin, id, target);
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('FOLDER_MOVE_INVALID');
    }
    // L'arbre est intact.
    const tree = (await get(tAdmin, '/documents-prives/folders').expect(200)).body.data as {
      id: string;
      parentId: string | null;
    }[];
    const parentOf = (id: string) => tree.find((f) => f.id === id)?.parentId;
    expect([parentOf(a), parentOf(b), parentOf(c)]).toEqual([null, a, b]);

    await moveFolder(tAdmin, a, '00000000-0000-4000-8000-000000000000').expect(404);
    await moveFolder(tAdmin, '00000000-0000-4000-8000-000000000000', a).expect(404);
    await moveFolder(tAdmin, a, 'pas-un-uuid').expect(400);
    await moveFolder(tAdmin, a, undefined).expect(400);
    // Remonter une branche entière fonctionne : C devient fille de A.
    expect((await moveFolder(tAdmin, c, a).expect(200)).body.parentId).toBe(a);
  });

  it('replaces the file of a document in place: same document and rights, new content, old file kept out of reach', async () => {
    const created = await upload(tGest, ids.sub, pdf('version-1'), { name: `${tag} Rapport` }).expect(201);
    const id = created.body.id as string;
    const docGrant = await grantDocument(id, ids.user2);
    const filesBefore = await storedFiles();

    const v2 = Buffer.concat([pdf('version-2'), Buffer.from('X'.repeat(500))]);
    const replaced = await replace(tGest, id, v2).expect(200);
    expect(replaced.body).toMatchObject({
      id,
      name: `${tag} Rapport`,
      folderId: ids.sub,
      confidentiality: created.body.confidentiality,
      fileType: 'application/pdf',
      fileSizeBytes: v2.length,
      status: 'ACTIVE',
      uploadedByName: created.body.uploadedByName,
    });
    expect(JSON.stringify(replaced.body)).not.toMatch(/storedName|previousFile/);

    // Le téléchargement rend le nouveau contenu, y compris pour qui a un droit sur le document.
    const dl = await download(tGest, id).expect(200);
    expect(Buffer.compare(dl.body as Buffer, v2)).toBe(0);
    expect(Buffer.compare((await download(tUser2, id).expect(200)).body as Buffer, v2)).toBe(0);

    // Un fichier de plus sur le disque : l'ancien est conservé, aucune route ne le sert.
    const filesAfter = await storedFiles();
    expect(filesAfter).toHaveLength(filesBefore.length + 1);

    // Journal : qui, avant/après, et le fichier conservé.
    const [entry] = await auditOf(`action=DOCUMENT_REPLACED&entityId=${id}`);
    expect(entry.actorId).toBe(ids.gest);
    expect(entry.beforeData).toMatchObject({ fileSizeBytes: created.body.fileSizeBytes });
    expect(entry.afterData).toMatchObject({ fileSizeBytes: v2.length });
    const kept = entry.beforeData?.previousFile as string;
    expect(kept).toMatch(/^[0-9a-f-]{36}\.pdf$/);
    expect(filesAfter).toContain(kept);

    // Le type suit le nouveau fichier (PDF -> DOCX), l'extension du téléchargement aussi.
    const word = await replace(tGest, id, ooxml('word/'), 'rapport.docx').expect(200);
    expect(word.body.fileType).toContain('wordprocessingml');
    expect(String((await download(tGest, id)).headers['content-disposition'])).toMatch(/\.docx/);
    await revokeDocument(docGrant);
  });

  it('validates a replacement like an upload and leaves the document untouched on failure', async () => {
    const created = await upload(tAdmin, ids.root, pdf('intact'), { name: `${tag} Intact` }).expect(201);
    const id = created.body.id as string;
    const filesBefore = await storedFiles();

    const fake = await replace(tAdmin, id, Buffer.from('MZ\x90\x00 pas un pdf'), 'faux.pdf');
    expect(fake.status).toBe(415);
    expect(fake.body.code).toBe('DOCUMENT_TYPE_NOT_ALLOWED');
    const big = await replace(tAdmin, id, Buffer.concat([pdf('big'), Buffer.alloc(MAX_PRIVATE_FILE_BYTES)]));
    expect(big.status).toBe(413);
    const none = await request(app.getHttpServer())
      .put(`/api/v1/documents-prives/files/${id}/file`)
      .set(bearer(tAdmin));
    expect(none.status).toBe(400);
    expect(none.body.code).toBe('DOCUMENT_FILE_REQUIRED');

    expect(await storedFiles()).toEqual(filesBefore);
    expect(Buffer.compare((await download(tAdmin, id).expect(200)).body as Buffer, pdf('intact'))).toBe(0);
    expect(await auditOf(`action=DOCUMENT_REPLACED&entityId=${id}`)).toHaveLength(0);
    await replace(tAdmin, '00000000-0000-4000-8000-000000000000', pdf('x')).expect(404);
  });

  it('requires the right to modify the document to replace its file, and frees nothing for anyone else', async () => {
    const created = await upload(tAdmin, ids.other, pdf('protege'), { name: `${tag} Protégé` }).expect(201);
    const id = created.body.id as string;
    const filesBefore = await storedFiles();

    await request(app.getHttpServer())
      .put(`/api/v1/documents-prives/files/${id}/file`)
      .attach('file', pdf('x'), 'x.pdf')
      .expect(401);
    // Aucun droit sur ce dossier : même 403 qu'ailleurs, Gestionnaire compris.
    for (const token of [tGest, tUser2]) {
      const res = await replace(token, id, pdf('intrus'));
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('DOCUMENT_ACCESS_FORBIDDEN');
    }
    // Lecture seule : l'Utilisateur ne remplace pas, même avec un droit de dossier.
    const grant = await grantFolder(ids.other, ids.user1);
    const readOnly = await replace(tUser1, id, pdf('lecteur'));
    expect(readOnly.status).toBe(403);
    expect(readOnly.body.code).toBe('DOCUMENT_WRITE_FORBIDDEN');
    await revokeFolder(grant);

    expect(await storedFiles()).toEqual(filesBefore);
    expect(Buffer.compare((await download(tAdmin, id).expect(200)).body as Buffer, pdf('protege'))).toBe(0);
    const denied = (await auditOf(`action=DOCUMENT_ACCESS_DENIED&entityId=${id}`)).filter((e) =>
      [ids.gest, ids.user2, ids.user1].includes(e.actorId as string),
    );
    expect(denied.length).toBeGreaterThanOrEqual(3);
  });

  it('refuses to replace an archived document until it is restored, and a deleted one', async () => {
    const created = await upload(tAdmin, ids.root, pdf('archive'), { name: `${tag} Archivé` }).expect(201);
    const id = created.body.id as string;
    await send('post', tAdmin, `/documents-prives/files/${id}/archive`).expect(200);
    const refused = await replace(tAdmin, id, pdf('apres-archivage'));
    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe('DOCUMENT_ARCHIVED');
    await send('post', tAdmin, `/documents-prives/files/${id}/restore`).expect(200);
    await replace(tAdmin, id, pdf('apres-restauration')).expect(200);

    await send('delete', tAdmin, `/documents-prives/files/${id}`).expect(204);
    await replace(tAdmin, id, pdf('apres-suppression')).expect(404);
  });
});
