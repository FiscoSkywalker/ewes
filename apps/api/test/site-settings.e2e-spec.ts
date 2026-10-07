import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import * as argon2 from 'argon2';
import { Role, type SiteSettings } from '@prisma/client';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { GlobalHttpExceptionFilter } from './../src/common/filters/http-exception.filter.js';
import { createValidationPipe } from './../src/common/pipes/validation.pipe.js';
import { DEFAULT_SITE_SETTINGS } from './../src/modules/site-settings/site-settings.defaults.js';
import { SmtpSink } from './support/smtp-sink.js';

/**
 * Cas de régression : les réglages sont réservés à l'Administrateur, le site
 * public n'en voit que la partie publique, chaque modification est tracée
 * (avant/après des seuls champs changés), les adresses de réseaux sociaux
 * ne peuvent pas devenir des liens piégés, et le test d'envoi rend le
 * résultat réel (blueprint/14 §2, 10 §3, 13 §5).
 */
describe('Site settings (e2e)', () => {
  const sink = new SmtpSink();
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const password = 'correct horse battery staple';
  const stamp = Date.now();
  const tag = `e2e-settings-${stamp}`;
  const adminEmail = `${tag}-admin@ewes.example`;
  const gestionnaireEmail = `${tag}-gest@ewes.example`;
  let admin: { Authorization: string };
  let gestionnaire: { Authorization: string };
  /** Ligne de réglages d'avant les tests, rétablie à la fin (la base de développement est partagée). */
  let saved: SiteSettings | null = null;
  const saved_env: Record<string, string | undefined> = {};

  const login = async (email: string) => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return { Authorization: `Bearer ${res.body.accessToken as string}` };
  };

  /** IP distincte par appel (proxy de confiance) : on teste la limite horaire du service, pas celle du limiteur. */
  let hop = 0;
  const postTest = () =>
    request(app.getHttpServer())
      .post('/api/v1/admin/settings/mail/test')
      .set({
        ...admin,
        'X-Forwarded-For': `10.9.${(hop >> 8) & 255}.${++hop & 255}`,
      });
  const getPublic = () =>
    request(app.getHttpServer()).get('/api/v1/site-settings').expect(200);
  const patchGeneral = (body: Record<string, unknown>) =>
    request(app.getHttpServer())
      .patch('/api/v1/admin/settings/general')
      .set(admin)
      .send(body);
  const patchMail = (body: Record<string, unknown>) =>
    request(app.getHttpServer())
      .patch('/api/v1/admin/settings/mail')
      .set(admin)
      .send(body);
  const auditRows = (action: string) =>
    prisma.auditLog.findMany({
      where: { action, actor: { email: adminEmail } },
      orderBy: { createdAt: 'asc' },
    });

  beforeAll(async () => {
    await sink.start();
    for (const key of [
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_USER',
      'SMTP_FROM',
      'CONTACT_NOTIFICATION_EMAIL',
    ]) {
      saved_env[key] = process.env[key];
    }
    process.env.SMTP_HOST = '127.0.0.1';
    process.env.SMTP_PORT = String(sink.port);
    process.env.SMTP_USER = '';
    process.env.SMTP_FROM = 'EWES <no-reply@ewes.example>';
    process.env.CONTACT_NOTIFICATION_EMAIL = `${tag}-env@ewes.example`;

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
    saved = await prisma.siteSettings.findUnique({ where: { id: 'site' } });
    await prisma.siteSettings.deleteMany();

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        fullName: 'E2E Settings Admin',
        role: Role.ADMINISTRATEUR,
      },
    });
    await prisma.user.create({
      data: {
        email: gestionnaireEmail,
        passwordHash,
        fullName: 'E2E Settings Gest',
        role: Role.GESTIONNAIRE,
      },
    });
    admin = await login(adminEmail);
    gestionnaire = await login(gestionnaireEmail);
  });

  afterAll(async () => {
    await prisma.siteSettings.deleteMany();
    if (saved) await prisma.siteSettings.create({ data: saved });
    await prisma.notification.deleteMany({
      where: { recipientEmail: adminEmail },
    });
    await prisma.session.deleteMany({
      where: { user: { email: { in: [adminEmail, gestionnaireEmail] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [adminEmail, gestionnaireEmail] } },
    });
    for (const [key, value] of Object.entries(saved_env)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await app.close();
    await sink.stop();
  });

  it('keeps every settings route behind the Administrateur role, but leaves the public read open', async () => {
    const routes = [
      ['get', '/api/v1/admin/settings/general'],
      ['patch', '/api/v1/admin/settings/general'],
      ['get', '/api/v1/admin/settings/legal'],
      ['patch', '/api/v1/admin/settings/legal'],
      ['get', '/api/v1/admin/settings/mail'],
      ['patch', '/api/v1/admin/settings/mail'],
      ['post', '/api/v1/admin/settings/mail/test'],
    ] as const;
    for (const [method, url] of routes) {
      await request(app.getHttpServer())[method](url).expect(401);
      await request(app.getHttpServer())
        [method](url)
        .set(gestionnaire)
        .send({})
        .expect(403);
    }
    await getPublic();
  });

  it('serves the original values until something is saved, with derived links', async () => {
    const { body } = await getPublic();
    expect(body.data).toMatchObject({
      phone: DEFAULT_SITE_SETTINGS.phone,
      phoneHref: 'tel:+243818153110',
      email: DEFAULT_SITE_SETTINGS.email,
      officeDays: [1, 2, 3, 4, 5],
      opensAt: '08:00',
      closesAt: '17:00',
      timeZone: 'Africa/Lubumbashi',
      social: { linkedin: null, facebook: null, x: null, youtube: null },
    });
    expect(body.data.mapsUrl).toContain('google.com/maps/search');
    // Rien de la messagerie n'est public.
    expect(JSON.stringify(body)).not.toMatch(
      /contactRecipient|contactAutoReply|SMTP/i,
    );
  });

  it('saves a change, shows it on the public site, and audits only the changed fields', async () => {
    const res = await patchGeneral({
      phone: ' +243 99 111 22 33 ',
      officeDays: [5, 1, 3],
      opensAt: '07:30',
      linkedinUrl: 'https://www.linkedin.com/company/ewes',
    }).expect(200);
    expect(res.body).toMatchObject({
      phone: '+243 99 111 22 33',
      officeDays: [1, 3, 5],
      opensAt: '07:30',
      linkedinUrl: 'https://www.linkedin.com/company/ewes',
      // Ce qui n'a pas été envoyé reste inchangé.
      email: DEFAULT_SITE_SETTINGS.email,
      closesAt: '17:00',
    });

    const { body } = await getPublic();
    expect(body.data.phoneHref).toBe('tel:+243991112233');
    expect(body.data.social.linkedin).toBe(
      'https://www.linkedin.com/company/ewes',
    );

    const [entry] = await auditRows('SETTINGS_GENERAL_UPDATED');
    expect(entry.entityType).toBe('SiteSettings');
    expect(entry.beforeData).toMatchObject({
      phone: DEFAULT_SITE_SETTINGS.phone,
      linkedinUrl: null,
    });
    expect(entry.afterData).toMatchObject({
      phone: '+243 99 111 22 33',
      opensAt: '07:30',
    });
    expect(Object.keys(entry.afterData as object)).not.toContain('email');
  });

  it('writes nothing and audits nothing when nothing changed', async () => {
    const before = (await auditRows('SETTINGS_GENERAL_UPDATED')).length;
    await patchGeneral({
      phone: '+243 99 111 22 33',
      officeDays: [3, 1, 5],
    }).expect(200);
    expect((await auditRows('SETTINGS_GENERAL_UPDATED')).length).toBe(before);
  });

  it('clears an optional field sent empty, and falls back to the French address without an English one', async () => {
    await patchGeneral({ linkedinUrl: '', addressEn: '' }).expect(200);
    const { body } = await getPublic();
    expect(body.data.social.linkedin).toBeNull();
    expect(body.data.addressEn).toBeNull();
  });

  it('refuses invalid values field by field', async () => {
    const field = async (body: Record<string, unknown>) => {
      const res = await patchGeneral(body).expect(400);
      return (res.body.details as { field: string; messages: string[] }[]).map(
        (d) => d.field,
      );
    };
    expect(await field({ phone: 'appelez-moi' })).toContain('phone');
    expect(await field({ email: 'pas-un-email' })).toContain('email');
    expect(await field({ officeDays: [] })).toContain('officeDays');
    expect(await field({ officeDays: [1, 9] })).toContain('officeDays');
    expect(await field({ opensAt: '8h' })).toContain('opensAt');
    // Fermeture avant ouverture (valeurs courantes : 07:30 – 17:00).
    expect(await field({ closesAt: '07:00' })).toContain('closesAt');
    expect(await field({ opensAt: '18:00' })).toContain('closesAt');
    // Champ inconnu refusé.
    expect(await field({ role: 'ADMINISTRATEUR' })).toContain('role');
  });

  it('only accepts https links that really lead to the announced network', async () => {
    const refused = async (body: Record<string, unknown>) => {
      const res = await patchGeneral(body).expect(400);
      return (res.body.details as { field: string }[]).map((d) => d.field);
    };
    expect(await refused({ linkedinUrl: 'javascript:alert(1)' })).toContain(
      'linkedinUrl',
    );
    expect(
      await refused({ linkedinUrl: 'http://www.linkedin.com/company/ewes' }),
    ).toContain('linkedinUrl');
    expect(
      await refused({ facebookUrl: 'https://facebook.com.evil.example/ewes' }),
    ).toContain('facebookUrl');
    expect(
      await refused({ xUrl: 'https://www.linkedin.com/company/ewes' }),
    ).toContain('xUrl');
    expect(
      await refused({ youtubeUrl: 'https://user:pass@youtube.com/@ewes' }),
    ).toContain('youtubeUrl');
    // Plusieurs fautes : toutes sont signalées d'un coup.
    expect(await refused({ linkedinUrl: 'nope', facebookUrl: 'nope' })).toEqual(
      expect.arrayContaining(['linkedinUrl', 'facebookUrl']),
    );

    await patchGeneral({
      facebookUrl: 'https://www.facebook.com/ewes.cd',
      xUrl: 'https://twitter.com/ewes',
      youtubeUrl: 'https://youtu.be/abc',
    }).expect(200);
    const { body } = await getPublic();
    expect(body.data.social).toMatchObject({
      facebook: 'https://www.facebook.com/ewes.cd',
      x: 'https://twitter.com/ewes',
      youtube: 'https://youtu.be/abc',
    });
  });

  it('keeps the legal notices editable, empty by default, and shows them publicly with the e-mail fallback', async () => {
    const patchLegal = (body: Record<string, unknown>) =>
      request(app.getHttpServer())
        .patch('/api/v1/admin/settings/legal')
        .set(admin)
        .send(body);
    const before = await request(app.getHttpServer())
      .get('/api/v1/admin/settings/legal')
      .set(admin)
      .expect(200);
    // Seul le représentant légal du contrat est connu ; le reste reste à saisir par EWES.
    expect(before.body).toMatchObject({
      legalRepresentative: DEFAULT_SITE_SETTINGS.legalRepresentative,
      legalRccm: null,
      hostingName: null,
      privacyEmail: null,
    });
    const publicBefore = (await getPublic()).body.data.legal;
    expect(publicBefore.rccm).toBeNull();
    // Sans adresse dédiée, les droits sur les données passent par l'e-mail public.
    expect(publicBefore.privacyEmail).toBe((await getPublic()).body.data.email);

    const res = await patchLegal({
      legalRccm: '  CD/LSH/RCCM/00-X-0000  ',
      legalCapital: '10 000 USD',
      hostingName: 'Hébergeur Exemple',
      privacyEmail: ' Donnees@EWES.example ',
      apdReceipt: '',
    }).expect(200);
    expect(res.body).toMatchObject({
      legalRccm: 'CD/LSH/RCCM/00-X-0000',
      privacyEmail: 'donnees@ewes.example',
      apdReceipt: null,
    });
    const publicAfter = (await getPublic()).body.data.legal;
    expect(publicAfter).toMatchObject({
      rccm: 'CD/LSH/RCCM/00-X-0000',
      capital: '10 000 USD',
      hostingName: 'Hébergeur Exemple',
      privacyEmail: 'donnees@ewes.example',
    });

    // Une mention vidée disparaît ; un e-mail invalide est refusé champ par champ.
    await patchLegal({ legalRccm: '' }).expect(200);
    expect((await getPublic()).body.data.legal.rccm).toBeNull();
    const refused = await patchLegal({ privacyEmail: 'pas-un-email' }).expect(
      400,
    );
    expect(
      (refused.body.details as { field: string }[]).map((d) => d.field),
    ).toContain('privacyEmail');

    const entries = await auditRows('SETTINGS_LEGAL_UPDATED');
    expect(entries.length).toBeGreaterThanOrEqual(2);
    expect(entries[0].beforeData).toMatchObject({ legalRccm: null });
  });

  it('reports the mail setup without ever exposing a secret', async () => {
    process.env.SMTP_PASSWORD = 'super-secret-password';
    const { body } = await request(app.getHttpServer())
      .get('/api/v1/admin/settings/mail')
      .set(admin)
      .expect(200);
    delete process.env.SMTP_PASSWORD;

    expect(body.transport).toMatchObject({
      configured: true,
      host: '127.0.0.1',
      security: 'starttls',
      from: 'EWES <no-reply@ewes.example>',
      authenticated: false,
      missing: [],
    });
    expect(JSON.stringify(body)).not.toContain('super-secret-password');
    expect(body.contactAutoReply).toBe(true);
    expect(body.recipient).toEqual({
      address: `${tag}-env@ewes.example`,
      source: 'environment',
    });
    expect(body.summary).toEqual(
      expect.objectContaining({
        sentLast30Days: expect.any(Number),
        failed: expect.any(Number),
        pending: expect.any(Number),
      }),
    );
  });

  it('refuses an invalid recipient and leaves the mail settings untouched', async () => {
    // Pas de modification réelle du destinataire ni de l'accusé de réception ici : ces réglages pilotent le
    // formulaire de contact et la ligne est partagée avec les autres suites e2e (voir site-settings.service.spec.ts).
    await patchMail({ contactRecipientEmail: 'pas-un-email' }).expect(400);
    await patchMail({ contactAutoReply: 'oui' }).expect(400);
    await patchMail({ inconnu: true }).expect(400);
    const before = (await auditRows('SETTINGS_MAIL_UPDATED')).length;
    // Valeurs identiques à celles enregistrées : rien n'est écrit ni tracé.
    const current = await request(app.getHttpServer())
      .get('/api/v1/admin/settings/mail')
      .set(admin)
      .expect(200);
    await patchMail({
      contactRecipientEmail: current.body.contactRecipientEmail,
      contactAutoReply: current.body.contactAutoReply,
    }).expect(200);
    expect((await auditRows('SETTINGS_MAIL_UPDATED')).length).toBe(before);
  });

  it('sends a real test e-mail to the signed-in administrator only, and returns the real outcome', async () => {
    const before = sink.messages.length;
    const res = await postTest().expect(200);
    expect(res.body).toMatchObject({
      status: 'sent',
      recipientEmail: adminEmail,
      type: 'MAIL_TEST',
    });
    expect(sink.messages.length).toBe(before + 1);
    expect(sink.messages.at(-1)?.to).toEqual([adminEmail]);

    const [entry] = await auditRows('MAIL_TEST_REQUESTED');
    expect(entry.afterData).toEqual({ recipient: adminEmail, outcome: 'sent' });

    // Le destinataire ne se choisit pas : une adresse glissée dans la requête est ignorée.
    const count = sink.messages.length;
    await postTest().send({ to: 'victime@example.org' }).expect(200);
    expect(sink.messages.slice(count).flatMap((m) => m.to)).toEqual([
      adminEmail,
    ]);
  });

  it('says so, instead of pretending, when the mail server is down or not configured', async () => {
    sink.failNext = 3;
    const failed = await postTest().expect(200);
    expect(failed.body.status).toBe('failed');
    expect(failed.body.lastError).toBeTruthy();
    sink.failNext = 0;

    const host = process.env.SMTP_HOST;
    process.env.SMTP_HOST = '';
    const res = await postTest();
    expect(res.status, JSON.stringify(res.body)).toBe(409);
    expect(res.body.code).toBe('MAIL_NOT_CONFIGURED');
    expect(res.body.message).toContain('SMTP_HOST');
    const overview = await request(app.getHttpServer())
      .get('/api/v1/admin/settings/mail')
      .set(admin)
      .expect(200);
    expect(overview.body.transport).toMatchObject({
      configured: false,
      missing: ['SMTP_HOST'],
    });
    process.env.SMTP_HOST = host;
  });

  it('limits the number of test e-mails per hour', async () => {
    let last = 200;
    for (let i = 0; i < 6; i += 1) {
      last = (await postTest()).status;
      if (last === 429) break;
    }
    expect(last).toBe(429);
  });
});
