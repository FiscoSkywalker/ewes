import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import * as argon2 from 'argon2';
import { Role } from '@prisma/client';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { GlobalHttpExceptionFilter } from './../src/common/filters/http-exception.filter.js';
import { createValidationPipe } from './../src/common/pipes/validation.pipe.js';

/**
 * Cas de régression : « Mon profil » n'agit que sur la personne du jeton, le
 * mot de passe actuel est redemandé et ses échecs comptent dans le
 * verrouillage de la connexion, un changement ferme les autres sessions sans
 * toucher la courante, la photo est ré-encodée (jamais conservée telle
 * quelle) et privée (blueprint/10_Security.md §1, §3 et §6, 14 §3).
 */
describe('Profil (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let storageDir: string;

  const password = 'correct horse battery staple';
  const stamp = Date.now();
  const tag = `e2e-profile-${stamp}`;
  const emailOf = (name: string) => `${tag}-${name}@ewes.example`;

  /** IP distincte par requête (proxy de confiance) : la limite par IP ne gêne pas les autres scénarios. */
  let ipSeq = 0;
  const ip = () => `10.${(ipSeq >> 8) & 255}.${ipSeq & 255}.${++ipSeq & 255}`;
  const http = () => request(app.getHttpServer());
  const as = (token: string) => ({
    get: (url: string) =>
      http()
        .get(`/api/v1${url}`)
        .set('X-Forwarded-For', ip())
        .set('Authorization', `Bearer ${token}`),
    post: (url: string, body?: object) =>
      http()
        .post(`/api/v1${url}`)
        .set('X-Forwarded-For', ip())
        .set('Authorization', `Bearer ${token}`)
        .send(body),
    patch: (url: string, body?: object) =>
      http()
        .patch(`/api/v1${url}`)
        .set('X-Forwarded-For', ip())
        .set('Authorization', `Bearer ${token}`)
        .send(body),
    put: (url: string, body?: object) =>
      http()
        .put(`/api/v1${url}`)
        .set('X-Forwarded-For', ip())
        .set('Authorization', `Bearer ${token}`)
        .send(body),
    delete: (url: string) =>
      http()
        .delete(`/api/v1${url}`)
        .set('X-Forwarded-For', ip())
        .set('Authorization', `Bearer ${token}`),
  });

  async function login(email: string, pass = password) {
    const res = await http()
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', ip())
      .send({ email, password: pass });
    return res;
  }
  async function open(email: string) {
    const res = await login(email);
    expect(res.status).toBe(200);
    return res.body as { accessToken: string; refreshToken: string };
  }
  const refresh = (refreshToken: string) =>
    http()
      .post('/api/v1/auth/refresh')
      .set('X-Forwarded-For', ip())
      .send({ refreshToken });

  const makeUser = async (name: string, role: Role = Role.UTILISATEUR) =>
    prisma.user.create({
      data: {
        email: emailOf(name),
        passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
        fullName: `E2E ${name}`,
        role,
      },
    });

  /** Image PNG réelle (couleur unie) aux dimensions voulues. */
  const png = (width: number, height: number) =>
    sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 57, g: 113, b: 135 },
      },
    })
      .png()
      .toBuffer();

  const auditOf = (entityId: string, action: string) =>
    prisma.auditLog.findMany({
      where: { entityId, action },
      orderBy: { createdAt: 'asc' },
    });

  beforeAll(async () => {
    // Stockage isolé : aucune photo de test dans le dossier de développement.
    storageDir = await mkdtemp(join(tmpdir(), 'ewes-profile-e2e-'));
    process.env.PRIVATE_STORAGE_PATH = storageDir;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new GlobalHttpExceptionFilter());
    app.useGlobalPipes(createValidationPipe());
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    const likeTag = { contains: tag };
    const users = await prisma.user.findMany({
      where: { email: likeTag },
      select: { id: true },
    });
    const ids = users.map((user) => user.id);
    // Le journal d'audit est inaltérable : ses lignes de test y restent.
    await prisma.notification.deleteMany({
      where: { recipientEmail: likeTag },
    });
    await prisma.loginFailure.deleteMany({ where: { email: likeTag } });
    await prisma.session.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await app.close();
    await rm(storageDir, { recursive: true, force: true });
  });

  it('refuse toute route du profil sans jeton', async () => {
    await http().get('/api/v1/me').expect(401);
    await http().patch('/api/v1/me').send({ fullName: 'X' }).expect(401);
    await http().get('/api/v1/me/account').expect(401);
    await http().get('/api/v1/me/avatar').expect(401);
    await http()
      .post('/api/v1/me/password')
      .send({ currentPassword: 'a', newPassword: 'b' })
      .expect(401);
  });

  describe('identité et nom', () => {
    it('ne rend que l’identité, jamais le hash, et tous les rôles y ont accès', async () => {
      for (const role of [
        Role.ADMINISTRATEUR,
        Role.GESTIONNAIRE,
        Role.UTILISATEUR,
      ]) {
        const user = await makeUser(`id-${role.toLowerCase()}`, role);
        const { accessToken } = await open(user.email);
        const res = await as(accessToken).get('/me').expect(200);
        expect(res.body).toEqual({
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role,
          avatarVersion: null,
        });
      }
    });

    it('change le nom, l’audite avant/après, sans toucher e-mail ni rôle', async () => {
      const user = await makeUser('rename');
      const { accessToken } = await open(user.email);

      const res = await as(accessToken)
        .patch('/me', { fullName: '  Grâce Mutombo  ' })
        .expect(200);
      expect(res.body.fullName).toBe('Grâce Mutombo');
      expect(res.body.role).toBe(Role.UTILISATEUR);

      const [entry] = await auditOf(user.id, 'USER_PROFILE_UPDATED');
      expect(entry.actorId).toBe(user.id);
      expect(entry.beforeData).toEqual({ fullName: 'E2E rename' });
      expect(entry.afterData).toEqual({ fullName: 'Grâce Mutombo' });

      // Le même nom n'écrit pas de trace de plus.
      await as(accessToken)
        .patch('/me', { fullName: 'Grâce Mutombo' })
        .expect(200);
      expect(await auditOf(user.id, 'USER_PROFILE_UPDATED')).toHaveLength(1);
    });

    it('refuse de changer rôle, e-mail ou identifiant, et un nom vide ou trop long', async () => {
      const user = await makeUser('forbidden');
      const { accessToken } = await open(user.email);

      for (const body of [
        { fullName: 'Ok', role: Role.ADMINISTRATEUR },
        { fullName: 'Ok', email: `${tag}-autre@ewes.example` },
        { fullName: 'Ok', id: '00000000-0000-0000-0000-000000000000' },
        { fullName: '   ' },
        { fullName: 'x'.repeat(121) },
      ]) {
        await as(accessToken).patch('/me', body).expect(400);
      }
      const after = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(after.role).toBe(Role.UTILISATEUR);
      expect(after.email).toBe(user.email);
      expect(after.fullName).toBe(user.fullName);
    });

    it('n’ouvre plus rien à un compte désactivé, même avec un jeton encore valide', async () => {
      const user = await makeUser('disabled');
      const { accessToken } = await open(user.email);
      await prisma.user.update({
        where: { id: user.id },
        data: { isActive: false },
      });
      await as(accessToken).get('/me').expect(404);
      await as(accessToken).patch('/me', { fullName: 'Pirate' }).expect(404);
      await as(accessToken).get('/me/account').expect(404);
    });
  });

  describe('mot de passe', () => {
    const change = (
      token: string,
      currentPassword: string,
      newPassword: string,
    ) => as(token).post('/me/password', { currentPassword, newPassword });

    it('redemande l’actuel : un mot de passe faux est refusé, tracé, et rien ne change', async () => {
      const user = await makeUser('wrong');
      const { accessToken } = await open(user.email);

      const res = await change(
        accessToken,
        'pas le bon mot de passe',
        'a brand new passphrase',
      );
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('CURRENT_PASSWORD_INCORRECT');
      expect(res.body.details).toEqual([
        {
          field: 'currentPassword',
          messages: ['Mot de passe actuel incorrect.'],
        },
      ]);

      expect((await login(user.email)).status).toBe(200);
      const [trace] = await auditOf(user.id, 'AUTH_PASSWORD_CHANGE_FAILED');
      expect(trace.actorId).toBe(user.id);
      expect(JSON.stringify(trace)).not.toContain('pas le bon mot de passe');
      expect(JSON.stringify(trace)).not.toContain('a brand new passphrase');
    });

    it('applique les règles du nouveau mot de passe', async () => {
      const user = await makeUser('rules');
      const { accessToken } = await open(user.email);

      const short = await change(accessToken, password, 'trop court');
      expect(short.status).toBe(400);
      expect(short.body.details[0].field).toBe('newPassword');

      const same = await change(accessToken, password, password);
      expect(same.status).toBe(400);
      expect(same.body.code).toBe('PASSWORD_UNCHANGED');

      const asEmail = await change(
        accessToken,
        password,
        user.email.toUpperCase(),
      );
      expect(asEmail.status).toBe(400);
      expect(asEmail.body.details[0].field).toBe('newPassword');

      const empty = await as(accessToken).post('/me/password', {
        newPassword: 'a brand new passphrase',
      });
      expect(empty.status).toBe(400);
      expect(empty.body.details[0].field).toBe('currentPassword');

      // Rien n'a bougé : l'ancien mot de passe ouvre toujours.
      expect((await login(user.email)).status).toBe(200);
    });

    it('change le mot de passe, ferme les autres sessions, garde la courante et prévient par e-mail', async () => {
      const user = await makeUser('change');
      const other = await open(user.email); // un autre appareil
      const here = await open(user.email); // l'appareil qui change
      const next = 'a brand new passphrase 2026';

      const res = await change(here.accessToken, password, next).expect(200);
      expect(res.body.sessionsClosed).toBe(1);
      expect(typeof res.body.passwordChangedAt).toBe('string');
      // Ni l'ancien ni le nouveau mot de passe dans la réponse.
      expect(JSON.stringify(res.body)).not.toContain(next);

      expect((await login(user.email, password)).status).toBe(401);
      expect((await login(user.email, next)).status).toBe(200);

      // L'autre appareil est déconnecté, celui-ci continue.
      expect((await refresh(other.refreshToken)).status).toBe(401);
      expect((await refresh(here.refreshToken)).status).toBe(200);

      const stored = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(stored.passwordChangedAt).not.toBeNull();
      expect(stored.passwordHash.startsWith('$argon2id$')).toBe(true);

      const [entry] = await auditOf(user.id, 'USER_PASSWORD_CHANGED');
      expect(entry.afterData).toEqual({ sessionsClosed: 1 });
      expect(JSON.stringify(entry)).not.toContain(next);
      expect(JSON.stringify(entry)).not.toContain(password);

      const mails = await prisma.notification.findMany({
        where: { recipientEmail: user.email, type: 'PASSWORD_CHANGED' },
      });
      expect(mails).toHaveLength(1);
      expect(JSON.stringify(mails[0].payload)).not.toContain(next);
    });

    it('partage le verrouillage de la connexion : des essais ratés verrouillent le compte', async () => {
      const user = await makeUser('lock');
      const { accessToken } = await open(user.email);

      for (let i = 0; i < 5; i += 1) {
        const res = await change(
          accessToken,
          `faux mot de passe ${i}`,
          'a brand new passphrase',
        );
        expect(res.body.code).toBe('CURRENT_PASSWORD_INCORRECT');
      }
      // Même le bon mot de passe est refusé, ici comme à la connexion.
      const locked = await change(
        accessToken,
        password,
        'a brand new passphrase',
      );
      expect(locked.status).toBe(429);
      expect(locked.body.code).toBe('LOGIN_LOCKED');
      expect((await login(user.email)).status).toBe(429);
      expect(await auditOf(user.id, 'AUTH_ACCOUNT_LOCKED')).toHaveLength(1);
    });
  });

  describe('cloche : repère « lu » partagé entre appareils', () => {
    const seen = async (token: string) =>
      (await as(token).get('/me/notifications-seen').expect(200)).body as {
        seenAt: string | null;
      };

    it('part de « rien de lu », puis se lit depuis n’importe quel appareil de la personne', async () => {
      const user = await makeUser('bell1');
      const pc = (await open(user.email)).accessToken;
      const phone = (await open(user.email)).accessToken;
      expect((await seen(pc)).seenAt).toBeNull();

      const before = Date.now();
      const marked = await as(pc).put('/me/notifications-seen', {}).expect(200);
      const after = Date.now();
      const at = new Date(marked.body.seenAt as string).getTime();
      expect(at).toBeGreaterThanOrEqual(before);
      expect(at).toBeLessThanOrEqual(after);
      // Le téléphone voit la même chose, et l'inverse aussi.
      expect((await seen(phone)).seenAt).toBe(marked.body.seenAt);
    });

    it('avance jusqu’à l’horodatage demandé, ne recule jamais et ne dépasse pas maintenant', async () => {
      const user = await makeUser('bell2');
      const { accessToken } = await open(user.email);
      const put = (seenAt: string) =>
        as(accessToken).put('/me/notifications-seen', { seenAt });

      const early = new Date(Date.now() - 3_600_000).toISOString();
      const later = new Date(Date.now() - 60_000).toISOString();
      expect((await put(early).expect(200)).body.seenAt).toBe(early);
      expect((await put(later).expect(200)).body.seenAt).toBe(later);
      // Un appareil en retard n'efface pas une lecture plus récente.
      expect((await put(early).expect(200)).body.seenAt).toBe(later);

      // Un horodatage futur est ramené à maintenant : impossible de « tout lire d'avance ».
      const future = new Date(Date.now() + 86_400_000).toISOString();
      const clamped = (await put(future).expect(200)).body.seenAt as string;
      expect(new Date(clamped).getTime()).toBeLessThanOrEqual(Date.now());
      expect(new Date(clamped).getTime()).toBeGreaterThan(Date.now() - 60_000);
    });

    it('refuse un horodatage mal formé et une clé inconnue', async () => {
      const user = await makeUser('bell3');
      const { accessToken } = await open(user.email);
      await as(accessToken)
        .put('/me/notifications-seen', { seenAt: 'hier' })
        .expect(400);
      await as(accessToken)
        .put('/me/notifications-seen', { userId: user.id })
        .expect(400);
      expect((await seen(accessToken)).seenAt).toBeNull();
    });

    it('reste propre à la personne : jamais celui d’une autre, et sans jeton rien', async () => {
      const a = await makeUser('bell4a');
      const b = await makeUser('bell4b');
      const tokenA = (await open(a.email)).accessToken;
      const tokenB = (await open(b.email)).accessToken;
      await as(tokenA).put('/me/notifications-seen', {}).expect(200);
      expect((await seen(tokenB)).seenAt).toBeNull();
      await http().get('/api/v1/me/notifications-seen').expect(401);
      await http().put('/api/v1/me/notifications-seen').expect(401);
    });

    it('ne laisse aucune trace d’audit (simple état d’affichage)', async () => {
      const user = await makeUser('bell5');
      const { accessToken } = await open(user.email);
      await as(accessToken).put('/me/notifications-seen', {}).expect(200);
      expect(await prisma.auditLog.count({ where: { entityId: user.id, action: { contains: 'NOTIFICATION' } } })).toBe(0);
    });
  });

  describe('photo de profil', () => {
    it('ré-encode en WebP carré, la rend à son seul propriétaire et remplace l’ancienne', async () => {
      const user = await makeUser('avatar');
      const other = await makeUser('avatar-other');
      const { accessToken } = await open(user.email);
      const otherToken = (await open(other.email)).accessToken;
      await as(accessToken).get('/me/avatar').expect(404);

      const first = await as(accessToken)
        .put('/me/avatar')
        .attach('file', await png(1200, 600), 'photo.png')
        .expect(200);
      expect(first.body.avatarVersion).toMatch(/^[0-9a-f-]{36}$/);
      // Aucun chemin ni nom de fichier de stockage dans la réponse.
      expect(JSON.stringify(first.body)).not.toContain('.webp');

      const image = await as(accessToken)
        .get('/me/avatar')
        .buffer(true)
        .parse((res, done) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => done(null, Buffer.concat(chunks)));
        })
        .expect(200);
      expect(image.headers['content-type']).toContain('image/webp');
      expect(image.headers['cache-control']).toContain('private');
      const meta = await sharp(image.body as Buffer).metadata();
      expect(meta.format).toBe('webp');
      expect([meta.width, meta.height]).toEqual([512, 512]);

      // Une autre personne n'a pas de route pour voir cette photo : la sienne seule.
      await as(otherToken).get('/me/avatar').expect(404);

      const second = await as(accessToken)
        .put('/me/avatar')
        .attach('file', await png(300, 300), 'autre.png')
        .expect(200);
      expect(second.body.avatarVersion).not.toBe(first.body.avatarVersion);
      const files = await readdir(join(storageDir, 'avatars'));
      expect(files.filter((name) => name.endsWith('.webp'))).toEqual([
        `${second.body.avatarVersion}.webp`,
      ]);
      expect(await auditOf(user.id, 'USER_AVATAR_CHANGED')).toHaveLength(2);
    });

    it('juge le fichier sur son contenu et refuse ce qui n’est pas une image lisible', async () => {
      const user = await makeUser('avatar-bad');
      const { accessToken } = await open(user.email);

      const fake = await as(accessToken)
        .put('/me/avatar')
        .attach('file', Buffer.from('<?php echo "pwned"; ?>'), 'shell.png');
      expect(fake.status).toBe(415);
      expect(fake.body.code).toBe('MEDIA_TYPE_NOT_ALLOWED');

      const svg = await as(accessToken)
        .put('/me/avatar')
        .attach(
          'file',
          Buffer.from(
            '<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>',
          ),
          'logo.svg',
        );
      expect(svg.status).toBe(415);

      // Signature PNG valide, contenu corrompu.
      const corrupt = await as(accessToken)
        .put('/me/avatar')
        .attach(
          'file',
          Buffer.concat([
            Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
            Buffer.from('pas une image'),
          ]),
          'corrompu.png',
        );
      expect(corrupt.status).toBe(415);
      expect(corrupt.body.code).toBe('MEDIA_UNREADABLE');

      const none = await as(accessToken).put('/me/avatar');
      expect(none.status).toBe(400);
      expect(none.body.code).toBe('MEDIA_FILE_REQUIRED');

      const stored = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(stored.avatarName).toBeNull();
    });

    it('retire la photo : le fichier disparaît et la route répond 404', async () => {
      const user = await makeUser('avatar-remove');
      const { accessToken } = await open(user.email);
      const set = await as(accessToken)
        .put('/me/avatar')
        .attach('file', await png(100, 100), 'p.png')
        .expect(200);

      const res = await as(accessToken).delete('/me/avatar').expect(200);
      expect(res.body.avatarVersion).toBeNull();
      await as(accessToken).get('/me/avatar').expect(404);
      const files = await readdir(join(storageDir, 'avatars'));
      expect(files).not.toContain(`${set.body.avatarVersion}.webp`);
      expect(await auditOf(user.id, 'USER_AVATAR_REMOVED')).toHaveLength(1);

      // Retirer sans photo : sans effet, sans trace de plus.
      await as(accessToken).delete('/me/avatar').expect(200);
      expect(await auditOf(user.id, 'USER_AVATAR_REMOVED')).toHaveLength(1);
    });
  });

  describe('sessions', () => {
    it('liste ses sessions en désignant celle-ci, sans en-tête brut', async () => {
      const user = await makeUser('sessions');
      await open(user.email);
      const here = await open(user.email);

      const res = await as(here.accessToken).get('/me/account').expect(200);
      expect(res.body.passwordChangedAt).toBeNull();
      expect(typeof res.body.createdAt).toBe('string');
      expect(res.body.sessions).toHaveLength(2);
      expect(
        res.body.sessions.filter((s: { current: boolean }) => s.current),
      ).toHaveLength(1);
      expect(res.body.sessions[0].current).toBe(true);
      for (const session of res.body.sessions) {
        expect(Object.keys(session).sort()).toEqual([
          'current',
          'device',
          'expiresAt',
          'id',
          'ipAddress',
          'lastActiveAt',
        ]);
      }
    });

    it('ferme les autres sessions sans fermer la courante, et jamais celles d’un autre compte', async () => {
      const user = await makeUser('revoke');
      const stranger = await makeUser('revoke-stranger');
      const first = await open(user.email);
      const here = await open(user.email);
      const strangerSession = await open(stranger.email);

      const before = await as(here.accessToken).get('/me/account').expect(200);
      const other = before.body.sessions.find(
        (s: { current: boolean }) => !s.current,
      );

      // Ni la courante, ni celle d'un autre compte.
      const current = before.body.sessions.find(
        (s: { current: boolean }) => s.current,
      );
      const refused = await as(here.accessToken).delete(
        `/me/sessions/${current.id}`,
      );
      expect(refused.status).toBe(400);
      expect(refused.body.code).toBe('CANNOT_REVOKE_CURRENT_SESSION');
      const strangerRow = await prisma.session.findFirstOrThrow({
        where: { userId: stranger.id },
      });
      await as(here.accessToken)
        .delete(`/me/sessions/${strangerRow.id}`)
        .expect(404);
      expect((await refresh(strangerSession.refreshToken)).status).toBe(200);

      await as(here.accessToken).delete(`/me/sessions/${other.id}`).expect(204);
      expect((await refresh(first.refreshToken)).status).toBe(401);
      await as(here.accessToken).delete(`/me/sessions/${other.id}`).expect(404);

      // Tout fermer : la courante reste ouverte.
      await open(user.email);
      await open(user.email);
      const res = await as(here.accessToken)
        .post('/me/sessions/revoke-others')
        .expect(200);
      expect(res.body.closed).toBe(2);
      expect((await refresh(here.refreshToken)).status).toBe(200);
      expect(await auditOf(user.id, 'USER_SESSIONS_CLOSED')).toHaveLength(2);
    });
  });

  describe('photo vue par l’administrateur', () => {
    it('la lit chez n’importe quel compte, jamais pour un autre rôle, sans exposer le nom du fichier', async () => {
      const admin = await makeUser('viewer-admin', Role.ADMINISTRATEUR);
      const gest = await makeUser('viewer-gest', Role.GESTIONNAIRE);
      const target = await makeUser('viewer-target');
      const bare = await makeUser('viewer-bare');
      const adminToken = (await open(admin.email)).accessToken;
      const gestToken = (await open(gest.email)).accessToken;
      const targetToken = (await open(target.email)).accessToken;
      const set = await as(targetToken)
        .put('/me/avatar')
        .attach('file', await png(200, 200), 'p.png')
        .expect(200);

      const image = await as(adminToken)
        .get(`/admin/users/${target.id}/avatar`)
        .buffer(true)
        .parse((res, done) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => done(null, Buffer.concat(chunks)));
        })
        .expect(200);
      expect(image.headers['content-type']).toContain('image/webp');
      expect(image.headers['cache-control']).toContain('private');
      expect((await sharp(image.body as Buffer).metadata()).format).toBe(
        'webp',
      );

      await http().get(`/api/v1/admin/users/${target.id}/avatar`).expect(401);
      await as(gestToken).get(`/admin/users/${target.id}/avatar`).expect(403);
      await as(targetToken).get(`/admin/users/${target.id}/avatar`).expect(403);
      await as(adminToken).get(`/admin/users/${bare.id}/avatar`).expect(404);
      await as(adminToken)
        .get('/admin/users/00000000-0000-4000-8000-000000000000/avatar')
        .expect(404);

      const list = await as(adminToken).get('/admin/users').expect(200);
      const row = list.body.find((u: { id: string }) => u.id === target.id);
      expect(row.avatarVersion).toBe(set.body.avatarVersion);
      expect(
        list.body.find((u: { id: string }) => u.id === bare.id).avatarVersion,
      ).toBeNull();
      expect(JSON.stringify(list.body)).not.toContain('avatarName');
      const detail = await as(adminToken)
        .get(`/admin/users/${target.id}`)
        .expect(200);
      expect(detail.body.avatarVersion).toBe(set.body.avatarVersion);
      expect(JSON.stringify(detail.body)).not.toContain('.webp');
    });
  });
});
