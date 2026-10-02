import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { Role } from '@prisma/client';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { GlobalHttpExceptionFilter } from './../src/common/filters/http-exception.filter.js';
import { createValidationPipe } from './../src/common/pipes/validation.pipe.js';
import { NOTIFICATION_RETRY_POLICY } from './../src/modules/notifications/mail-provider.js';
import { SmtpSink } from './support/smtp-sink.js';

/**
 * Cas de régression : double soumission sans doublon de notification
 * (blueprint/17_Testing_Strategy.md §3), succès annoncé seulement une fois le
 * message enregistré, échec d'envoi jamais silencieux (13 §5).
 */
describe('Contact (e2e)', () => {
  const sink = new SmtpSink();
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const apps: INestApplication[] = [];

  const password = 'correct horse battery staple';
  const stamp = Date.now();
  const tag = `e2e-contact-${stamp}`;
  const teamAddress = `${tag}-team@ewes.example`;
  const adminEmail = `${tag}-admin@ewes.example`;
  const userEmail = `${tag}-user@ewes.example`;
  let seq = 0;
  /** Une adresse d'expéditeur distincte par test, retrouvable pour le nettoyage. */
  const sender = () => `${tag}-s${++seq}@ewes.example`;
  /** IP distincte par requête (proxy de confiance) : la limite par IP ne gêne pas les autres tests. */
  const ip = () => `10.${(seq >> 8) & 255}.${seq & 255}.${(++seq) & 255}`;
  let tAdmin: string;

  const body = (over: Record<string, unknown> = {}) => ({
    name: 'Aimé Kalala',
    organization: 'Société Minière du Katanga',
    email: sender(),
    phone: '+243 81 000 00 00',
    sector: 'ENVIRONNEMENT',
    message: 'Nous souhaitons une étude d’impact environnemental pour notre projet.',
    locale: 'fr',
    ...over,
  });

  const post = (payload: object, headers: Record<string, string> = {}) =>
    request(app.getHttpServer())
      .post('/api/v1/contact')
      .set({ 'X-Forwarded-For': ip(), ...headers })
      .send(payload);

  const waitFor = async <T>(read: () => Promise<T>, done: (v: T) => boolean, ms = 8_000) => {
    const start = Date.now();
    for (;;) {
      const value = await read();
      if (done(value)) return value;
      if (Date.now() - start > ms) throw new Error(`Condition non atteinte : ${JSON.stringify(value)}`);
      await new Promise((r) => setTimeout(r, 50));
    }
  };
  const notificationsFor = (recipient: string) =>
    prisma.notification.findMany({ where: { recipientEmail: recipient }, orderBy: { createdAt: 'asc' } });
  const settle = (recipient: string, count: number) =>
    waitFor(
      () => notificationsFor(recipient),
      (rows) => rows.length >= count && rows.every((n) => n.sentAt || n.failedAt),
    );

  /** Attend la fin de tous les envois en cours : un test ne doit pas hériter des envois d'un autre. */
  const idle = () =>
    waitFor(
      () =>
        prisma.notification.count({
          where: {
            OR: [{ recipientEmail: { startsWith: tag } }, { recipientEmail: teamAddress }],
            sentAt: null,
            failedAt: null,
          },
        }),
      (pending) => pending === 0,
    );

  async function createApp() {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(NOTIFICATION_RETRY_POLICY)
      .useValue({ delaysMs: [0, 30, 60] })
      .compile();
    const instance = moduleRef.createNestApplication<INestApplication<App>>();
    instance.setGlobalPrefix('api/v1');
    instance.useGlobalFilters(new GlobalHttpExceptionFilter());
    // Même pipe qu'en production (contrat d'erreur de validation par champ).
    instance.useGlobalPipes(createValidationPipe());
    // Comme en production derrière Nginx (TRUST_PROXY_HOPS=1) : l'IP vient de X-Forwarded-For.
    instance.getHttpAdapter().getInstance().set('trust proxy', 1);
    await instance.init();
    apps.push(instance);
    return instance;
  }

  beforeAll(async () => {
    await sink.start();
    process.env.SMTP_HOST = '127.0.0.1';
    process.env.SMTP_PORT = String(sink.port);
    process.env.SMTP_USER = '';
    process.env.SMTP_PASSWORD = '';
    process.env.SMTP_FROM = 'EWES <no-reply@ewes.example>';
    process.env.CONTACT_NOTIFICATION_EMAIL = teamAddress;

    app = await createApp();
    prisma = app.get(PrismaService);
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    await prisma.user.create({
      data: { email: adminEmail, passwordHash, fullName: 'E2E Contact Admin', role: Role.ADMINISTRATEUR },
    });
    await prisma.user.create({
      data: { email: userEmail, passwordHash, fullName: 'E2E Contact User', role: Role.UTILISATEUR },
    });
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password })
      .expect(200);
    tAdmin = login.body.accessToken as string;
  });

  afterAll(async () => {
    await prisma.contactMessage.deleteMany({ where: { email: { startsWith: tag } } });
    await prisma.notification.deleteMany({
      where: { OR: [{ recipientEmail: { startsWith: tag } }, { recipientEmail: teamAddress }] },
    });
    await prisma.session.deleteMany({ where: { user: { email: { in: [adminEmail, userEmail] } } } });
    await prisma.user.deleteMany({ where: { email: { in: [adminEmail, userEmail] } } });
    for (const instance of apps) await instance.close();
    await sink.stop();
  });

  it('stores the message, tells the truth, and sends the team notification and the acknowledgement', async () => {
    const payload = body();
    const key = randomUUID();
    const res = await post(payload, { 'Idempotency-Key': key });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ status: 'received', duplicate: false });
    // Rien de l'enregistrement interne ne fuit vers un visiteur.
    expect(JSON.stringify(res.body)).not.toMatch(/id|hash|key/i);

    const stored = await prisma.contactMessage.findUniqueOrThrow({ where: { submissionKey: key } });
    expect(stored).toMatchObject({
      name: 'Aimé Kalala',
      organization: 'Société Minière du Katanga',
      email: payload.email,
      sector: 'ENVIRONNEMENT',
      locale: 'fr',
      status: 'NOUVEAU',
    });

    await settle(teamAddress, 1);
    const acks = await settle(payload.email as string, 1);
    expect(acks[0].sentAt).not.toBeNull();

    const team = sink.messages.find((m) => m.to.includes(teamAddress) && m.body.includes(stored.id))!;
    expect(team.subject).toBe('[Site EWES] Nouveau message de Aimé Kalala — Étude d’impact / audit');
    expect(team.replyTo).toContain(payload.email as string);
    expect(team.body).toContain('Nous souhaitons une étude d’impact');
    expect(team.body).toContain(`Référence : ${stored.id}`);

    const ack = sink.messages.find((m) => m.to.includes(payload.email as string))!;
    expect(ack.subject).toBe('Nous avons bien reçu votre message — EWES');
    expect(ack.body).toContain('Bonjour Aimé Kalala');
    expect(ack.body).toContain(stored.id);
    // L'accusé ne répète jamais le contenu saisi (pas de relais de texte vers un tiers).
    expect(ack.body).not.toContain('étude d’impact environnemental');
    expect(ack.replyTo).toBeNull();
  });

  it('acknowledges in English when the visitor wrote from the English site', async () => {
    const payload = body({ locale: 'en', name: 'Jane Doe' });
    await post(payload).expect(201);
    await settle(payload.email as string, 1);
    const ack = sink.messages.find((m) => m.to.includes(payload.email as string))!;
    expect(ack.subject).toBe('We have received your message — EWES');
    expect(ack.body).toContain('Hello Jane Doe');
  });

  it('never duplicates a message or a notification on a repeated submission', async () => {
    const payload = body();
    const key = randomUUID();
    await post(payload, { 'Idempotency-Key': key }).expect(201);
    await settle(payload.email as string, 1);
    const sentBefore = sink.messages.length;

    // Même clé (double clic, nouvelle tentative réseau) : succès reconnu, rien de plus.
    const again = await post(payload, { 'Idempotency-Key': key });
    expect(again.status).toBe(200);
    expect(again.body).toEqual({ status: 'received', duplicate: true });
    // Même contenu sans clé, depuis un autre navigateur : reconnu aussi.
    const noKey = await post(payload);
    expect(noKey.status).toBe(200);
    expect(noKey.body.duplicate).toBe(true);

    await new Promise((r) => setTimeout(r, 300));
    expect(await prisma.contactMessage.count({ where: { email: payload.email as string } })).toBe(1);
    expect(await notificationsFor(payload.email as string)).toHaveLength(1);
    expect(sink.messages.length).toBe(sentBefore);

    // Un message différent du même expéditeur est bien un nouveau message.
    await post({ ...payload, message: 'Un tout autre besoin : analyses d’eau potable, svp.' }).expect(201);
    expect(await prisma.contactMessage.count({ where: { email: payload.email as string } })).toBe(2);

    // Clé simultanée : un seul enregistrement malgré deux requêtes concurrentes.
    const racePayload = body();
    const raceKey = randomUUID();
    const results = await Promise.all([
      post(racePayload, { 'Idempotency-Key': raceKey }),
      post(racePayload, { 'Idempotency-Key': raceKey }),
    ]);
    expect(results.map((r) => r.status).sort((a, b) => a - b)).toEqual([200, 201]);
    expect(await prisma.contactMessage.count({ where: { email: racePayload.email as string } })).toBe(1);
    await new Promise((r) => setTimeout(r, 300));
    expect(await notificationsFor(racePayload.email as string)).toHaveLength(1);
  });

  it('silently drops robot submissions without storing or notifying', async () => {
    const payload = body({ website: 'http://spam.example' });
    const before = await prisma.contactMessage.count();
    const res = await post(payload);
    expect(res.status).toBe(201);
    await new Promise((r) => setTimeout(r, 200));
    expect(await prisma.contactMessage.count()).toBe(before);
    expect(await notificationsFor(payload.email as string)).toHaveLength(0);
  });

  it('rejects invalid input with usable field details and stores nothing', async () => {
    const cases: [string, Record<string, unknown>, string][] = [
      ['name', { name: '' }, 'name'],
      ['name (saut de ligne : injection d’en-tête)', { name: 'Eve\r\nBcc: victime@example.com' }, 'name'],
      ['organization', { organization: '   ' }, 'organization'],
      ['email', { email: 'pas-un-email' }, 'email'],
      ['message trop court', { message: 'Trop court' }, 'message'],
      ['message trop long', { message: 'x'.repeat(5001) }, 'message'],
      ['besoin inconnu', { sector: 'PIRATAGE' }, 'sector'],
      ['téléphone', { phone: 'appelez-moi !' }, 'phone'],
      ['langue', { locale: 'zz' }, 'locale'],
      ['champ inconnu', { status: 'TRAITE' }, 'status'],
    ];
    const before = await prisma.contactMessage.count();
    for (const [label, over, field] of cases) {
      const res = await post(body(over));
      expect(res.status, label).toBe(400);
      expect(res.body.code, label).toBe('BAD_REQUEST');
      expect(res.body.details.map((d: { field: string }) => d.field), label).toContain(field);
      expect(res.body.details[0].messages.length, label).toBeGreaterThan(0);
    }
    const badKey = await post(body(), { 'Idempotency-Key': 'pas-un-uuid' });
    expect(badKey.status).toBe(400);
    expect(badKey.body.code).toBe('IDEMPOTENCY_KEY_INVALID');
    expect(await prisma.contactMessage.count()).toBe(before);
  });

  it('limits submissions per IP address', async () => {
    const fixed = '203.0.113.77';
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      const res = await request(app.getHttpServer())
        .post('/api/v1/contact')
        .set('X-Forwarded-For', fixed)
        .send(body({ message: `Demande numéro ${i} : étude d’impact et audit environnemental.` }));
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 5)).toEqual([201, 201, 201, 201, 201]);
    expect(statuses.slice(5)).toEqual([429, 429]);
  });

  it('retries a failing SMTP server and ends up delivered', async () => {
    await idle();
    const payload = body();
    sink.failNext = 2;
    await post(payload).expect(201);
    const team = await settle(teamAddress, (await notificationsFor(teamAddress)).length);
    const acks = await settle(payload.email as string, 1);
    expect(acks[0].sentAt).not.toBeNull();
    expect(acks[0].failedAt).toBeNull();
    // 2 refus temporaires répartis sur les deux e-mails + 2 envois réussis = 4 tentatives.
    const mine = [...team.slice(-1), ...acks];
    expect(mine.every((n) => n.sentAt)).toBe(true);
    expect(mine.reduce((sum, n) => sum + n.attempts, 0)).toBe(4);
    expect(sink.failNext).toBe(0);
  });

  it('keeps a definitive failure visible to the administrator and lets them replay it', async () => {
    await idle();
    const payload = body();
    sink.failNext = 1_000;
    const res = await post(payload);
    // Le message est enregistré : le visiteur est informé de la vérité, pas d'une erreur d'e-mail.
    expect(res.status).toBe(201);
    const [failedAck] = await settle(payload.email as string, 1);
    expect(failedAck.sentAt).toBeNull();
    expect(failedAck.failedAt).not.toBeNull();
    expect(failedAck.attempts).toBe(3);
    expect(failedAck.lastError).toMatch(/451|temporary/i);
    expect(await prisma.contactMessage.count({ where: { email: payload.email as string } })).toBe(1);

    const failed = await request(app.getHttpServer())
      .get('/api/v1/admin/notifications?status=failed&type=CONTACT_ACKNOWLEDGEMENT&limit=100')
      .set('Authorization', `Bearer ${tAdmin}`)
      .expect(200);
    const listed = failed.body.data.find((n: { id: string }) => n.id === failedAck.id);
    expect(listed).toMatchObject({ status: 'failed', attempts: 3, recipientEmail: payload.email });
    expect(listed.subject).toBe('Nous avons bien reçu votre message — EWES');
    // Le texte (données personnelles) n'est pas exposé dans la liste.
    expect(JSON.stringify(failed.body)).not.toContain('Bonjour');

    sink.failNext = 0;
    const replay = await request(app.getHttpServer())
      .post(`/api/v1/admin/notifications/${failedAck.id}/retry`)
      .set('Authorization', `Bearer ${tAdmin}`)
      .expect(200);
    expect(replay.body.status).toBe('sent');
    expect(replay.body.attempts).toBe(4);
    expect(sink.messages.some((m) => m.to.includes(payload.email as string))).toBe(true);
  });

  it('records a not-configured mail setup as a visible failure instead of faking success', async () => {
    await idle();
    const saved = { host: process.env.SMTP_HOST, team: process.env.CONTACT_NOTIFICATION_EMAIL };
    process.env.SMTP_HOST = '';
    process.env.CONTACT_NOTIFICATION_EMAIL = '';
    try {
      const unconfigured = await createApp();
      const payload = body();
      const res = await request(unconfigured.getHttpServer())
        .post('/api/v1/contact')
        .set('X-Forwarded-For', ip())
        .send(payload);
      expect(res.status).toBe(201);
      const [ack] = await settle(payload.email as string, 1);
      expect(ack.sentAt).toBeNull();
      expect(ack.failedAt).not.toBeNull();
      // Pas de nouvelles tentatives inutiles tant que l'environnement n'est pas complété.
      expect(ack.attempts).toBe(1);
      expect(ack.lastError).toContain('MAIL_NOT_CONFIGURED');
    } finally {
      process.env.SMTP_HOST = saved.host;
      process.env.CONTACT_NOTIFICATION_EMAIL = saved.team;
    }
  });

  it('caps acknowledgements per address while still notifying the team', async () => {
    const address = sender();
    for (let i = 0; i < 4; i++) {
      await post(body({ email: address, message: `Message distinct numéro ${i} concernant une étude d’impact.` })).expect(201);
    }
    const acks = await waitFor(
      () => notificationsFor(address),
      (rows) => rows.length >= 3 && rows.every((n) => n.sentAt || n.failedAt),
    );
    await new Promise((r) => setTimeout(r, 300));
    expect(await prisma.contactMessage.count({ where: { email: address } })).toBe(4);
    expect((await notificationsFor(address)).length).toBe(3);
    expect(acks.every((n) => n.type === 'CONTACT_ACKNOWLEDGEMENT')).toBe(true);
  });

  it('lets staff follow messages up, changes only the status, and audits it', async () => {
    await request(app.getHttpServer()).get('/api/v1/admin/contacts').expect(401);
    const userToken = (
      await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: userEmail, password }).expect(200)
    ).body.accessToken as string;
    await request(app.getHttpServer())
      .get('/api/v1/admin/contacts')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/admin/notifications')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    const payload = body({ organization: 'Entreprise Suivi' });
    await post(payload).expect(201);
    const auth = { Authorization: `Bearer ${tAdmin}` };
    const list = await request(app.getHttpServer())
      .get('/api/v1/admin/contacts?status=NOUVEAU&limit=100')
      .set(auth)
      .expect(200);
    const found = list.body.data.find((m: { email: string }) => m.email === payload.email);
    expect(found).toMatchObject({ organization: 'Entreprise Suivi', status: 'NOUVEAU', locale: 'fr' });
    expect(JSON.stringify(list.body)).not.toMatch(/contentHash|submissionKey/);

    const done = await request(app.getHttpServer())
      .patch(`/api/v1/admin/contacts/${found.id}/status`)
      .set(auth)
      .send({ status: 'TRAITE' })
      .expect(200);
    expect(done.body.status).toBe('TRAITE');
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/contacts/${found.id}/status`)
      .set(auth)
      .send({ status: 'ARCHIVE' })
      .expect(400);

    // Un message reçu n'est jamais réécrit : aucune route de modification du contenu.
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/contacts/${found.id}`)
      .set(auth)
      .send({ message: 'réécrit' })
      .expect(404);
    expect((await prisma.contactMessage.findUniqueOrThrow({ where: { id: found.id } })).message).toBe(payload.message);

    const audit = await request(app.getHttpServer())
      .get(`/api/v1/admin/audit-logs?action=CONTACT_STATUS_CHANGED&entityId=${found.id}`)
      .set(auth)
      .expect(200);
    expect(audit.body.data[0]).toMatchObject({
      beforeData: { status: 'NOUVEAU' },
      afterData: { status: 'TRAITE' },
    });
    // Le journal nomme l'acteur (tableau de bord) sans exposer son e-mail.
    expect(audit.body.data[0].actor).toEqual({
      id: expect.any(String),
      fullName: expect.any(String),
    });
    await request(app.getHttpServer())
      .get('/api/v1/admin/contacts/00000000-0000-4000-8000-000000000000')
      .set(auth)
      .expect(404);
  });
  it('searches without regard to case or wildcards, sorts with a stable order, and rejects bad parameters', async () => {
    const needle = `srch${stamp}`;
    const row = (name: string, organization: string | null, minutesAgo: number, message = 'Message de test pour la recherche.') =>
      prisma.contactMessage.create({
        data: {
          name: `${name} ${needle}`,
          organization,
          email: sender(),
          sector: 'AUTRE',
          message,
          createdAt: new Date(Date.now() - minutesAgo * 60_000),
        },
      });
    await row('Zoé', 'Alpha', 30);
    await row('Alice', null, 20);
    await row('Bob', 'Zeta', 10, 'Remise de 100%_exacte demandée.');
    const get = (query: string) =>
      request(app.getHttpServer()).get(`/api/v1/admin/contacts?${query}`).set('Authorization', `Bearer ${tAdmin}`);
    const names = (res: request.Response) => (res.body.data as { name: string }[]).map((m) => m.name.split(' ')[0]);

    // Insensible à la casse ; le total reflète la recherche, pas la table entière.
    const found = await get(`q=${needle.toUpperCase()}`).expect(200);
    expect(found.body.meta.total).toBe(3);
    // Par défaut : plus récent d'abord.
    expect(names(found)).toEqual(['Bob', 'Alice', 'Zoé']);

    // `%` et `_` sont cherchés littéralement, jamais comme jokers.
    const literal = await get('q=%25').expect(200);
    expect((literal.body.data as { message: string }[]).every((m) => m.message.includes('%'))).toBe(true);
    expect(names(literal)).toContain('Bob');
    expect((await get('q=100%25_exacte').expect(200)).body.meta.total).toBe(1);
    expect((await get('q=100%25Xexacte').expect(200)).body.meta.total).toBe(0);

    // Tri : par nom, par organisation (sans organisation toujours en dernier), dans les deux sens.
    expect(names(await get(`q=${needle}&sort=name&order=asc`).expect(200))).toEqual(['Alice', 'Bob', 'Zoé']);
    expect(names(await get(`q=${needle}&sort=name&order=desc`).expect(200))).toEqual(['Zoé', 'Bob', 'Alice']);
    expect(names(await get(`q=${needle}&sort=organization&order=asc`).expect(200))).toEqual(['Zoé', 'Bob', 'Alice']);
    expect(names(await get(`q=${needle}&sort=organization&order=desc`).expect(200))).toEqual(['Bob', 'Zoé', 'Alice']);
    expect(names(await get(`q=${needle}&sort=createdAt&order=asc`).expect(200))).toEqual(['Zoé', 'Alice', 'Bob']);

    // Tri + pagination : chaque ligne apparaît une fois.
    const page = (n: number) => get(`q=${needle}&sort=name&order=asc&limit=1&page=${n}`).expect(200);
    expect([names(await page(1)), names(await page(2)), names(await page(3))]).toEqual([['Alice'], ['Bob'], ['Zoé']]);

    // Paramètres refusés avec le champ fautif ; aucune injection par le champ de tri.
    for (const bad of ['sort=email', 'sort=name;drop', 'order=sideways', `q=${'x'.repeat(101)}`]) {
      const res = await get(bad).expect(400);
      expect(res.body.details[0].field).toBe(bad.split('=')[0]);
    }
  });
});
