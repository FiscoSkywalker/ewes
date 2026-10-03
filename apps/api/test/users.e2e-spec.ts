import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import * as argon2 from 'argon2';
import { Role } from '@prisma/client';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { GlobalHttpExceptionFilter } from './../src/common/filters/http-exception.filter.js';
import { createValidationPipe } from './../src/common/pipes/validation.pipe.js';
import { NOTIFICATION_RETRY_POLICY } from './../src/modules/notifications/mail-provider.js';
import { RESEND_COOLDOWN_MS } from './../src/modules/users/invitations.service.js';
import { SmtpSink } from './support/smtp-sink.js';

/**
 * Cas de régression : seul l'Administrateur gère les comptes, le rôle d'un
 * compte vient toujours du serveur (jamais de la personne qui s'active),
 * le jeton d'invitation est à usage unique et conservé haché, changement de
 * rôle et désactivation sont audités et coupent les sessions
 * (blueprint/10_Security.md §2 et §6, 14 §4).
 */
describe('Utilisateurs et rôles (e2e)', () => {
  const sink = new SmtpSink();
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const password = 'correct horse battery staple';
  const stamp = Date.now();
  const tag = `e2e-users-${stamp}`;
  const adminEmail = `${tag}-admin@ewes.example`;
  const gestEmail = `${tag}-gest@ewes.example`;
  const userEmail = `${tag}-user@ewes.example`;
  let seq = 0;
  /** Adresse d'invité distincte par test, retrouvable pour le nettoyage. */
  const invitee = () => `${tag}-invite${++seq}@ewes.example`;
  let admin: { id: string; auth: { Authorization: string } };
  let gestAuth: { Authorization: string };
  let userAuth: { Authorization: string };

  /** IP distincte par requête (proxy de confiance) : la limite de fréquence par IP ne gêne pas les autres tests. */
  let ipSeq = 0;
  const ip = () => `10.${(ipSeq >> 8) & 255}.${ipSeq & 255}.${++ipSeq & 255}`;
  const api = () => ({
    get: (url: string) =>
      request(app.getHttpServer()).get(url).set('X-Forwarded-For', ip()),
    post: (url: string) =>
      request(app.getHttpServer()).post(url).set('X-Forwarded-For', ip()),
    patch: (url: string) =>
      request(app.getHttpServer()).patch(url).set('X-Forwarded-For', ip()),
    delete: (url: string) =>
      request(app.getHttpServer()).delete(url).set('X-Forwarded-For', ip()),
  });
  const as = (auth: { Authorization: string }) => ({
    get: (url: string) => api().get(`/api/v1${url}`).set(auth),
    post: (url: string, body?: object) =>
      api().post(`/api/v1${url}`).set(auth).send(body),
    patch: (url: string, body?: object) =>
      api().patch(`/api/v1${url}`).set(auth).send(body),
    delete: (url: string) => api().delete(`/api/v1${url}`).set(auth),
  });

  async function login(email: string) {
    const res = await api()
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return res.body as { accessToken: string; refreshToken: string };
  }

  const invite = (over: Record<string, unknown> = {}) =>
    as(admin.auth).post('/admin/users/invitations', {
      fullName: 'Grâce Mutombo',
      email: invitee(),
      role: Role.UTILISATEUR,
      ...over,
    });

  /** Jeton contenu dans un lien d'activation (dans le fragment). */
  const tokenOf = (url: string) => url.split('#')[1];

  const waitFor = async <T>(
    read: () => Promise<T>,
    done: (v: T) => boolean,
    ms = 8_000,
  ) => {
    const start = Date.now();
    for (;;) {
      const value = await read();
      if (done(value)) return value;
      if (Date.now() - start > ms) {
        throw new Error(`Condition non atteinte : ${JSON.stringify(value)}`);
      }
      await new Promise((r) => setTimeout(r, 50));
    }
  };

  const auditOf = (entityId: string, action: string) =>
    prisma.auditLog.findMany({
      where: { entityId, action },
      orderBy: { createdAt: 'asc' },
    });

  /** Crée un compte directement en base (hors invitation) pour tester rôle et désactivation. */
  const makeUser = (name: string, role: Role = Role.GESTIONNAIRE) =>
    argon2.hash(password, { type: argon2.argon2id }).then((passwordHash) =>
      prisma.user.create({
        data: {
          email: `${tag}-${name}@ewes.example`,
          passwordHash,
          fullName: `E2E ${name}`,
          role,
        },
      }),
    );

  beforeAll(async () => {
    await sink.start();
    process.env.SMTP_HOST = '127.0.0.1';
    process.env.SMTP_PORT = String(sink.port);
    process.env.SMTP_USER = '';
    process.env.SMTP_PASSWORD = '';
    process.env.SMTP_FROM = 'EWES <no-reply@ewes.example>';
    process.env.WEB_APP_URL = 'https://portail.ewes.example';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(NOTIFICATION_RETRY_POLICY)
      .useValue({ delaysMs: [0, 30, 60] })
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new GlobalHttpExceptionFilter());
    app.useGlobalPipes(createValidationPipe());
    // Comme en production derrière Nginx (TRUST_PROXY_HOPS=1) : l'IP vient de X-Forwarded-For.
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
    await app.init();
    prisma = app.get(PrismaService);

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const created = await Promise.all(
      [
        [adminEmail, Role.ADMINISTRATEUR],
        [gestEmail, Role.GESTIONNAIRE],
        [userEmail, Role.UTILISATEUR],
      ].map(([email, role]) =>
        prisma.user.create({
          data: {
            email: email as string,
            passwordHash,
            fullName: `E2E ${role}`,
            role: role as Role,
          },
        }),
      ),
    );
    admin = {
      id: created[0].id,
      auth: {
        Authorization: `Bearer ${(await login(adminEmail)).accessToken}`,
      },
    };
    gestAuth = {
      Authorization: `Bearer ${(await login(gestEmail)).accessToken}`,
    };
    userAuth = {
      Authorization: `Bearer ${(await login(userEmail)).accessToken}`,
    };
  });

  afterAll(async () => {
    const likeTag = { contains: tag };
    const users = await prisma.user.findMany({
      where: { email: likeTag },
      select: { id: true },
    });
    const ids = users.map((user) => user.id);
    const invitations = await prisma.userInvitation.findMany({
      where: { email: likeTag },
      select: { id: true },
    });
    // Le journal d'audit est inaltérable : on ne le nettoie pas (les lignes de test y restent, rattachées à des identifiants jetables).
    await prisma.notification.deleteMany({
      where: { recipientEmail: likeTag },
    });
    await prisma.userInvitation.deleteMany({
      where: { id: { in: invitations.map((i) => i.id) } },
    });
    await prisma.loginFailure.deleteMany({ where: { email: likeTag } });
    await prisma.session.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await app.close();
    await sink.stop();
  });

  describe('accès', () => {
    it('refuses anonymous callers and any role but Administrateur', async () => {
      await api().get('/api/v1/admin/users').expect(401);
      for (const auth of [gestAuth, userAuth]) {
        await as(auth).get('/admin/users').expect(403);
        await as(auth).get('/admin/users/invitations').expect(403);
        await as(auth)
          .post('/admin/users/invitations', {
            fullName: 'X Y',
            email: invitee(),
            role: Role.ADMINISTRATEUR,
          })
          .expect(403);
        await as(auth)
          .patch(`/admin/users/${admin.id}/role`, { role: Role.UTILISATEUR })
          .expect(403);
        await as(auth).post(`/admin/users/${admin.id}/deactivate`).expect(403);
      }
    });

    it('lists accounts without ever exposing a password hash or token', async () => {
      const res = await as(admin.auth).get('/admin/users').expect(200);
      const emails = (res.body as { email: string }[]).map((u) => u.email);
      expect(emails).toEqual(expect.arrayContaining([adminEmail, gestEmail]));
      const raw = JSON.stringify(res.body);
      expect(raw).not.toMatch(/passwordHash|argon2|refreshToken|tokenHash/i);
      const me = (
        res.body as { email: string; lastActiveAt: string | null }[]
      ).find((u) => u.email === adminEmail);
      expect(me?.lastActiveAt).not.toBeNull();
    });
  });

  describe('invitation', () => {
    it('creates an invitation (not an account), mails a one-time link, stores only its hash and audits', async () => {
      const email = invitee();
      const res = await invite({ email, role: Role.GESTIONNAIRE }).expect(201);
      const token = tokenOf(res.body.activationUrl as string);
      expect(res.body.activationUrl).toBe(
        `https://portail.ewes.example/admin/invitation#${token}`,
      );
      expect(res.body.invitation).toMatchObject({
        email,
        fullName: 'Grâce Mutombo',
        role: Role.GESTIONNAIRE,
        status: 'PENDING',
        invitedBy: { id: admin.id },
      });

      // Aucun compte avant l'acceptation.
      expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
      // Jeton jamais en clair en base.
      const stored = await prisma.userInvitation.findFirstOrThrow({
        where: { email },
      });
      expect(stored.tokenHash).not.toContain(token);
      expect(JSON.stringify(stored)).not.toContain(token);

      const notification = await waitFor(
        () =>
          prisma.notification.findFirstOrThrow({
            where: { recipientEmail: email },
          }),
        (n) => Boolean(n.sentAt),
      );
      const mail = sink.messages.find((m) => m.to.includes(email))!;
      expect(mail.subject).toBe('Invitation au portail d’administration EWES');
      expect(mail.body).toContain('Bonjour Grâce Mutombo');
      expect(mail.body).toContain('« Gestionnaire »');
      expect(mail.body).toContain(res.body.activationUrl);
      // Une fois parti, le texte (qui porte le lien) est effacé de la base.
      const payload = notification.payload as { subject: string; text: string };
      expect(payload.subject).toBe(mail.subject);
      expect(payload.text).not.toContain(token);

      const audit = await auditOf(stored.id, 'USER_INVITED');
      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({
        actorId: admin.id,
        entityType: 'UserInvitation',
        afterData: { email, role: Role.GESTIONNAIRE },
      });
      expect(JSON.stringify(audit[0])).not.toContain(token);

      const list = await as(admin.auth)
        .get('/admin/users/invitations')
        .expect(200);
      expect(
        (list.body as { email: string }[]).some((i) => i.email === email),
      ).toBe(true);
    });

    it('rejects an address that already has an account or a pending invitation, and malformed input', async () => {
      const taken = await invite({ email: gestEmail }).expect(409);
      expect(taken.body.code).toBe('USER_EMAIL_TAKEN');
      // Insensible à la casse.
      await invite({ email: gestEmail.toUpperCase() }).expect(409);

      const email = invitee();
      await invite({ email }).expect(201);
      const pending = await invite({ email }).expect(409);
      expect(pending.body.code).toBe('INVITATION_PENDING');

      const bad = await invite({ email: 'pas-un-email', fullName: ' ' }).expect(
        400,
      );
      const fields = (bad.body.details as { field: string }[]).map(
        (d) => d.field,
      );
      expect(fields).toEqual(expect.arrayContaining(['email', 'fullName']));
      await invite({ role: 'SUPERADMIN' }).expect(400);
    });

    it('lets a person activate once, with the role the administrator chose, and signs them in', async () => {
      const email = invitee();
      const res = await invite({ email, role: Role.GESTIONNAIRE }).expect(201);
      const token = tokenOf(res.body.activationUrl as string);

      const preview = await api()
        .post('/api/v1/auth/invitations/inspect')
        .send({ token })
        .expect(200);
      expect(preview.body).toMatchObject({
        email,
        fullName: 'Grâce Mutombo',
        role: Role.GESTIONNAIRE,
      });

      // Mot de passe trop court, et rôle imposé par le client : refusés.
      await api()
        .post('/api/v1/auth/invitations/accept')
        .send({ token, password: 'trop court' })
        .expect(400);
      await api()
        .post('/api/v1/auth/invitations/accept')
        .send({
          token,
          password: 'a long enough passphrase',
          role: Role.ADMINISTRATEUR,
        })
        .expect(400);
      expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
      // Le mot de passe ne peut pas être l'adresse e-mail.
      await api()
        .post('/api/v1/auth/invitations/accept')
        .send({ token, password: email })
        .expect(400);

      const accepted = await api()
        .post('/api/v1/auth/invitations/accept')
        .send({ token, password })
        .expect(200);
      expect(accepted.body.user).toMatchObject({
        email,
        fullName: 'Grâce Mutombo',
        role: Role.GESTIONNAIRE,
      });
      expect(accepted.body.accessToken).toBeTruthy();
      // Sa session ouverte vaut le rôle du serveur.
      const me = await api()
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${accepted.body.accessToken as string}`)
        .expect(200);
      expect(me.body.role).toBe(Role.GESTIONNAIRE);
      await login(email);

      // À usage unique.
      const again = await api()
        .post('/api/v1/auth/invitations/accept')
        .send({ token, password })
        .expect(410);
      expect(again.body.code).toBe('INVITATION_USED');
      const inspectAgain = await api()
        .post('/api/v1/auth/invitations/inspect')
        .send({ token })
        .expect(410);
      expect(inspectAgain.body.code).toBe('INVITATION_USED');

      const created = await prisma.user.findUniqueOrThrow({ where: { email } });
      const audit = await auditOf(created.id, 'USER_INVITATION_ACCEPTED');
      expect(audit).toHaveLength(1);
      expect(audit[0].actorId).toBe(created.id);
      // Plus d'invitation en attente pour cette adresse.
      const list = await as(admin.auth)
        .get('/admin/users/invitations')
        .expect(200);
      expect(
        (list.body as { email: string }[]).some((i) => i.email === email),
      ).toBe(false);
    });

    it('answers the same way for an unknown token and a malformed one', async () => {
      const unknown = await api()
        .post('/api/v1/auth/invitations/inspect')
        .send({ token: 'A'.repeat(43) })
        .expect(404);
      expect(unknown.body.code).toBe('INVITATION_INVALID');
      await api()
        .post('/api/v1/auth/invitations/inspect')
        .send({ token: 'court' })
        .expect(400);
      await api()
        .post('/api/v1/auth/invitations/accept')
        .send({ token: 'A'.repeat(43), password })
        .expect(404);
    });

    it('resends with a new link (the old one stops working), after a short pause only', async () => {
      const email = invitee();
      const first = await invite({ email }).expect(201);
      const id = first.body.invitation.id as string;
      const oldToken = tokenOf(first.body.activationUrl as string);

      const tooSoon = await as(admin.auth)
        .post(`/admin/users/invitations/${id}/resend`)
        .expect(429);
      expect(tooSoon.body.code).toBe('INVITATION_RECENTLY_SENT');

      await prisma.userInvitation.update({
        where: { id },
        data: { lastSentAt: new Date(Date.now() - RESEND_COOLDOWN_MS - 1_000) },
      });
      const resent = await as(admin.auth)
        .post(`/admin/users/invitations/${id}/resend`)
        .expect(200);
      const newToken = tokenOf(resent.body.activationUrl as string);
      expect(newToken).not.toBe(oldToken);

      await api()
        .post('/api/v1/auth/invitations/inspect')
        .send({ token: oldToken })
        .expect(404);
      await api()
        .post('/api/v1/auth/invitations/inspect')
        .send({ token: newToken })
        .expect(200);

      await waitFor(
        () =>
          prisma.notification.count({
            where: { recipientEmail: email, sentAt: { not: null } },
          }),
        (count) => count === 2,
      );
      expect(await auditOf(id, 'USER_INVITATION_RESENT')).toHaveLength(1);
    });

    it('revokes an invitation (audited) and treats an expired one as replaceable', async () => {
      const email = invitee();
      const created = await invite({ email }).expect(201);
      const id = created.body.invitation.id as string;
      const token = tokenOf(created.body.activationUrl as string);

      await as(admin.auth).delete(`/admin/users/invitations/${id}`).expect(204);
      await api()
        .post('/api/v1/auth/invitations/inspect')
        .send({ token })
        .expect(404);
      await as(admin.auth).delete(`/admin/users/invitations/${id}`).expect(404);
      const revoked = await auditOf(id, 'USER_INVITATION_REVOKED');
      expect(revoked).toHaveLength(1);
      expect(revoked[0].beforeData).toMatchObject({ email });

      // Expirée : le lien le dit, la liste le montre, et la même adresse peut être réinvitée.
      const again = await invite({ email }).expect(201);
      const againId = again.body.invitation.id as string;
      const againToken = tokenOf(again.body.activationUrl as string);
      await prisma.userInvitation.update({
        where: { id: againId },
        data: { expiresAt: new Date(Date.now() - 1_000) },
      });
      const expired = await api()
        .post('/api/v1/auth/invitations/inspect')
        .send({ token: againToken })
        .expect(410);
      expect(expired.body.code).toBe('INVITATION_EXPIRED');
      await api()
        .post('/api/v1/auth/invitations/accept')
        .send({ token: againToken, password })
        .expect(410);
      const list = await as(admin.auth)
        .get('/admin/users/invitations')
        .expect(200);
      expect(
        (list.body as { id: string; status: string }[]).find(
          (i) => i.id === againId,
        )?.status,
      ).toBe('EXPIRED');

      const replaced = await invite({ email }).expect(201);
      expect(replaced.body.invitation.id).not.toBe(againId);
      const stale = await prisma.userInvitation.findUniqueOrThrow({
        where: { id: againId },
      });
      expect(stale.revokedAt).not.toBeNull();
    });
  });

  describe('rôle', () => {
    it('changes a role, audits before/after, and closes the account sessions', async () => {
      const target = await makeUser('role');
      const session = await login(target.email);

      const res = await as(admin.auth)
        .patch(`/admin/users/${target.id}/role`, { role: Role.UTILISATEUR })
        .expect(200);
      expect(res.body).toMatchObject({ id: target.id, role: Role.UTILISATEUR });

      const audit = await auditOf(target.id, 'USER_ROLE_CHANGED');
      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({
        actorId: admin.id,
        entityType: 'User',
        beforeData: { role: Role.GESTIONNAIRE },
        afterData: { role: Role.UTILISATEUR },
      });

      // Sessions coupées : le jeton de rafraîchissement ne vaut plus rien.
      await api()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: session.refreshToken })
        .expect(401);
      // À la reconnexion, le nouveau rôle s'applique.
      const again = await login(target.email);
      const me = await api()
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${again.accessToken}`)
        .expect(200);
      expect(me.body.role).toBe(Role.UTILISATEUR);
    });

    it('refuses an unchanged role, an unknown account, an unknown role, and changing one’s own role', async () => {
      const target = await makeUser('role2');
      const same = await as(admin.auth)
        .patch(`/admin/users/${target.id}/role`, { role: Role.GESTIONNAIRE })
        .expect(400);
      expect(same.body.code).toBe('ROLE_UNCHANGED');
      expect(await auditOf(target.id, 'USER_ROLE_CHANGED')).toHaveLength(0);

      await as(admin.auth)
        .patch(`/admin/users/${target.id}/role`, { role: 'ROOT' })
        .expect(400);
      await as(admin.auth)
        .patch('/admin/users/00000000-0000-4000-8000-000000000000/role', {
          role: Role.UTILISATEUR,
        })
        .expect(404);
      await as(admin.auth)
        .patch('/admin/users/pas-un-uuid/role', { role: Role.UTILISATEUR })
        .expect(400);

      const self = await as(admin.auth)
        .patch(`/admin/users/${admin.id}/role`, { role: Role.UTILISATEUR })
        .expect(403);
      expect(self.body.code).toBe('CANNOT_CHANGE_OWN_ROLE');
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { id: admin.id } })).role,
      ).toBe(Role.ADMINISTRATEUR);
    });
  });

  describe('désactivation', () => {
    it('deactivates (no login, no refresh), reactivates, audits each change once', async () => {
      const target = await makeUser('off', Role.UTILISATEUR);
      const session = await login(target.email);

      const off = await as(admin.auth)
        .post(`/admin/users/${target.id}/deactivate`)
        .expect(200);
      expect(off.body).toMatchObject({ isActive: false });
      expect(off.body.activeSessions).toBe(0);

      await api()
        .post('/api/v1/auth/login')
        .send({ email: target.email, password })
        .expect(401);
      await api()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: session.refreshToken })
        .expect(401);

      // Idempotent : rien de plus dans l'audit.
      await as(admin.auth)
        .post(`/admin/users/${target.id}/deactivate`)
        .expect(200);
      const deactivated = await auditOf(target.id, 'USER_DEACTIVATED');
      expect(deactivated).toHaveLength(1);
      expect(deactivated[0]).toMatchObject({
        actorId: admin.id,
        beforeData: { isActive: true },
        afterData: { isActive: false },
      });

      const on = await as(admin.auth)
        .post(`/admin/users/${target.id}/reactivate`)
        .expect(200);
      expect(on.body.isActive).toBe(true);
      await login(target.email);
      expect(await auditOf(target.id, 'USER_REACTIVATED')).toHaveLength(1);
      // L'historique et les droits d'un compte désactivé restent : la fiche l'indique.
      expect(on.body.grants).toEqual({ folders: 0, documents: 0 });
    });

    it('never lets an administrator deactivate their own account', async () => {
      const res = await as(admin.auth)
        .post(`/admin/users/${admin.id}/deactivate`)
        .expect(403);
      expect(res.body.code).toBe('CANNOT_DEACTIVATE_SELF');
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { id: admin.id } }))
          .isActive,
      ).toBe(true);
    });
  });
  describe('historique d’un compte (journal d’audit)', () => {
    it('paginates, filters by action and period, and searches by author or action', async () => {
      const target = await makeUser('history', Role.UTILISATEUR);
      // 5 entrées : 2 changements de rôle, 1 désactivation, 1 réactivation (+ aucune autre).
      const send = (path: string, body?: object) =>
        as(admin.auth)
          .patch(`/admin/users/${target.id}/${path}`, body)
          .expect(200);
      await send('role', { role: Role.GESTIONNAIRE });
      await send('role', { role: Role.UTILISATEUR });
      await as(admin.auth)
        .post(`/admin/users/${target.id}/deactivate`)
        .expect(200);
      await as(admin.auth)
        .post(`/admin/users/${target.id}/reactivate`)
        .expect(200);

      const history = (query = '') =>
        as(admin.auth)
          .get(
            `/admin/audit-logs?entityType=User&entityId=${target.id}${query}`,
          )
          .expect(200)
          .then(
            (res) =>
              res.body as {
                data: {
                  action: string;
                  createdAt: string;
                  actor: { fullName: string } | null;
                }[];
                meta: { page: number; limit: number; total: number };
              },
          );

      const all = await history();
      expect(all.meta.total).toBe(4);
      // Du plus récent au plus ancien.
      expect(all.data.map((e) => e.action)).toEqual([
        'USER_REACTIVATED',
        'USER_DEACTIVATED',
        'USER_ROLE_CHANGED',
        'USER_ROLE_CHANGED',
      ]);

      // Pagination : pages de 3, total inchangé, aucun doublon entre pages.
      const first = await history('&limit=3&page=1');
      const second = await history('&limit=3&page=2');
      expect(first.data).toHaveLength(3);
      expect(second.data).toHaveLength(1);
      expect(second.meta).toMatchObject({ page: 2, limit: 3, total: 4 });
      expect(second.data[0].action).toBe('USER_ROLE_CHANGED');
      expect((await history('&limit=3&page=3')).data).toHaveLength(0);

      // Filtre par action : le total suit le filtre.
      const roles = await history('&action=USER_ROLE_CHANGED');
      expect(roles.meta.total).toBe(2);

      // Recherche : auteur (casse ignorée), code d'action avec espaces, rien de trouvé.
      expect((await history('&q=e2e%20administrateur')).meta.total).toBe(4);
      expect((await history('&q=role%20changed')).meta.total).toBe(2);
      expect((await history('&q=REACTIVATED')).meta.total).toBe(1);
      expect((await history('&q=personne-ne-porte-ce-nom')).meta.total).toBe(0);
      // Un « % » saisi est cherché littéralement, il ne ramène pas tout.
      expect((await history('&q=%25')).meta.total).toBe(0);
      expect(
        (await history('&q=role%20changed&action=USER_REACTIVATED')).meta.total,
      ).toBe(0);

      // Période : jour inclus, bornes UTC.
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86_400_000)
        .toISOString()
        .slice(0, 10);
      const tomorrow = new Date(Date.now() + 86_400_000)
        .toISOString()
        .slice(0, 10);
      expect((await history(`&from=${today}&to=${today}`)).meta.total).toBe(4);
      expect((await history(`&to=${yesterday}`)).meta.total).toBe(0);
      expect((await history(`&from=${tomorrow}`)).meta.total).toBe(0);
    });

    it('rejects malformed paging, search and period parameters', async () => {
      const get = (query: string) =>
        as(admin.auth).get(`/admin/audit-logs${query}`);
      await get('?limit=101').expect(400);
      await get('?page=0').expect(400);
      await get('?from=hier').expect(400);
      await get('?to=2026-02-31').expect(400);
      await get(`?q=${'x'.repeat(101)}`).expect(400);
      await as(gestAuth).get('/admin/audit-logs?q=a').expect(403);
    });
  });

  describe('verrouillage après échecs de connexion', () => {
    const MAX = 3;
    let previous: string | undefined;

    beforeAll(() => {
      previous = process.env.LOGIN_LOCKOUT_MAX_FAILURES;
      process.env.LOGIN_LOCKOUT_MAX_FAILURES = String(MAX);
    });
    afterAll(() => {
      if (previous === undefined) delete process.env.LOGIN_LOCKOUT_MAX_FAILURES;
      else process.env.LOGIN_LOCKOUT_MAX_FAILURES = previous;
    });

    const attempt = (who: string, secret: string) =>
      api().post('/api/v1/auth/login').send({ email: who, password: secret });
    const failures = (who: string) =>
      prisma.loginFailure.count({ where: { email: who.toLowerCase() } });
    const events = (entityId: string, action: string) =>
      prisma.auditLog.findMany({ where: { entityId, action } });
    const failN = async (who: string, n: number) => {
      for (let i = 0; i < n; i++)
        await attempt(who, 'mauvais-mot-de-passe').expect(401);
    };

    it('locks after repeated failures — even the right password is refused — and traces the lock once', async () => {
      const user = await makeUser('lock1', Role.UTILISATEUR);
      await failN(user.email, MAX);

      const refused = await attempt(user.email, password).expect(429);
      expect(refused.body.code).toBe('LOGIN_LOCKED');
      expect(refused.body.message).toMatch(/Réessayez dans \d+ minutes?/);

      // Tentatives refusées : ni comptées (le verrou ne se prolonge pas), ni tracées une à une.
      await attempt(user.email, 'encore-un-essai').expect(429);
      expect(await failures(user.email)).toBe(MAX);
      expect(await events(user.id, 'AUTH_LOGIN_FAILED')).toHaveLength(MAX);
      const locked = await events(user.id, 'AUTH_ACCOUNT_LOCKED');
      expect(locked).toHaveLength(1);
      expect(locked[0]).toMatchObject({
        actorId: null,
        afterData: { email: user.email, failures: MAX },
      });
      expect(JSON.stringify(locked[0])).not.toContain('mauvais-mot-de-passe');
      // Aucune session ouverte pendant le verrou.
      expect(await prisma.session.count({ where: { userId: user.id } })).toBe(
        0,
      );
    });

    it('answers an unknown address exactly like a known one (no account discovery)', async () => {
      const user = await makeUser('lock2', Role.UTILISATEUR);
      const ghost = `${tag}-fantome@ewes.example`;
      await failN(user.email, MAX);
      await failN(ghost, MAX);

      const known = await attempt(user.email, password).expect(429);
      const unknown = await attempt(ghost, password).expect(429);
      expect(unknown.body.code).toBe(known.body.code);
      expect(unknown.body.message).toBe(known.body.message);
      // Même la trace de bascule existe pour l'adresse inconnue, sans compte visé.
      const row = await prisma.auditLog.findFirst({
        where: {
          action: 'AUTH_ACCOUNT_LOCKED',
          afterData: { path: ['email'], equals: ghost },
        },
      });
      expect(row).toMatchObject({ entityId: null, actorId: null });
    });

    it('resets the counter on a successful login', async () => {
      const user = await makeUser('lock3', Role.UTILISATEUR);
      await failN(user.email, MAX - 1);
      await attempt(user.email, password).expect(200);
      expect(await failures(user.email)).toBe(0);
      // Il faut de nouveau MAX échecs pour verrouiller.
      await failN(user.email, MAX - 1);
      await attempt(user.email, password).expect(200);
    });

    it('lets the lock lapse by itself once the window has passed', async () => {
      const user = await makeUser('lock4', Role.UTILISATEUR);
      await failN(user.email, MAX);
      await attempt(user.email, password).expect(429);
      await prisma.loginFailure.updateMany({
        where: { email: user.email },
        data: { createdAt: new Date(Date.now() - 16 * 60_000) },
      });
      await attempt(user.email, password).expect(200);
    });

    it('shows who is locked to the Administrateur, who can unlock (audited once) — nobody else can', async () => {
      const user = await makeUser('lock5', Role.GESTIONNAIRE);
      const calm = await makeUser('calm', Role.UTILISATEUR);
      await failN(user.email, MAX);

      const detail = await as(admin.auth)
        .get(`/admin/users/${user.id}`)
        .expect(200);
      expect(detail.body.lockedUntil).toEqual(expect.any(String));
      expect(
        new Date(detail.body.lockedUntil as string).getTime(),
      ).toBeGreaterThan(Date.now());
      expect(detail.body.recentFailures).toBe(MAX);
      const list = (await as(admin.auth).get('/admin/users').expect(200))
        .body as {
        id: string;
        lockedUntil: string | null;
      }[];
      expect(list.find((u) => u.id === user.id)!.lockedUntil).not.toBeNull();
      expect(list.find((u) => u.id === calm.id)!.lockedUntil).toBeNull();

      // La personne verrouillée ni personne d'autre que l'Administrateur ne lève le verrou.
      await as(gestAuth).post(`/admin/users/${user.id}/unlock`).expect(403);
      await api().post(`/api/v1/admin/users/${user.id}/unlock`).expect(401);
      await attempt(user.email, password).expect(429);

      const unlocked = await as(admin.auth)
        .post(`/admin/users/${user.id}/unlock`)
        .expect(200);
      expect(unlocked.body).toMatchObject({
        lockedUntil: null,
        recentFailures: 0,
      });
      await attempt(user.email, password).expect(200);

      const audit = await events(user.id, 'USER_UNLOCKED');
      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({
        actorId: admin.id,
        beforeData: { locked: true },
        afterData: { locked: false },
      });
      // Déverrouiller un compte qui ne l'est pas : sans effet, sans trace de plus.
      await as(admin.auth).post(`/admin/users/${user.id}/unlock`).expect(200);
      expect(await events(user.id, 'USER_UNLOCKED')).toHaveLength(1);
      await as(admin.auth)
        .post('/admin/users/00000000-0000-4000-8000-000000000000/unlock')
        .expect(404);
    });
  });
});
