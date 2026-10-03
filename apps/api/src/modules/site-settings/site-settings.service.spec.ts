import { describe, expect, it, vi } from 'vitest';
import { SiteSettingsService } from './site-settings.service.js';
import { DEFAULT_SITE_SETTINGS } from './site-settings.defaults.js';
import { checkSocialUrl } from './social-links.js';
import { mapsUrl, phoneHref } from './site-settings-views.js';

const actor = {
  id: 'admin-1',
  email: '',
  fullName: '',
  role: 'ADMINISTRATEUR' as const,
};

/** Service sur base simulée : une ligne de réglages en mémoire, ou aucune. */
function build(options: { row?: Record<string, unknown>; env?: string } = {}) {
  const prisma = {
    siteSettings: {
      findUnique: vi
        .fn()
        .mockResolvedValue(options.row ? { id: 'site', ...options.row } : null),
      upsert: vi.fn().mockResolvedValue({}),
    },
  };
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  const revalidator = { revalidate: vi.fn().mockResolvedValue(undefined) };
  const notifications = {
    summary: vi.fn().mockResolvedValue({}),
    transportStatus: vi.fn().mockReturnValue({ configured: true }),
  };
  const config = { get: vi.fn().mockReturnValue(options.env) };
  const service = new SiteSettingsService(
    prisma as never,
    revalidator as never,
    audit as never,
    notifications as never,
    config as never,
  );
  return { service, prisma, audit, revalidator };
}

const stored = (over: Record<string, unknown> = {}) => ({
  ...DEFAULT_SITE_SETTINGS,
  updatedAt: new Date(),
  ...over,
});

describe('SiteSettingsService — destinataire des messages de contact', () => {
  it('préfère le réglage du portail à la variable d’environnement', async () => {
    const { service } = build({
      row: stored({ contactRecipientEmail: 'portail@ewes.example' }),
      env: 'serveur@ewes.example',
    });
    await expect(service.contactRecipient()).resolves.toBe(
      'portail@ewes.example',
    );
  });

  it('retombe sur la variable d’environnement quand le réglage est vide', async () => {
    const { service } = build({ row: stored(), env: ' serveur@ewes.example ' });
    await expect(service.contactRecipient()).resolves.toBe(
      'serveur@ewes.example',
    );
  });

  it('renvoie null quand rien n’est défini nulle part', async () => {
    const { service } = build({ env: '' });
    await expect(service.contactRecipient()).resolves.toBeNull();
  });

  it('indique d’où vient le destinataire effectif', async () => {
    const fromEnv = build({ env: 'serveur@ewes.example' });
    expect((await fromEnv.service.mailOverview()).recipient).toEqual({
      address: 'serveur@ewes.example',
      source: 'environment',
    });
    const fromSettings = build({
      row: stored({ contactRecipientEmail: 'portail@ewes.example' }),
      env: 'serveur@ewes.example',
    });
    expect((await fromSettings.service.mailOverview()).recipient).toEqual({
      address: 'portail@ewes.example',
      source: 'settings',
    });
    const none = build();
    expect((await none.service.mailOverview()).recipient).toEqual({
      address: null,
      source: 'none',
    });
  });
});

describe('SiteSettingsService — enregistrement', () => {
  it('crée la ligne à partir des valeurs d’origine et ne trace que les champs modifiés', async () => {
    const { service, prisma, audit } = build();
    await service.updateMail(actor, {
      contactRecipientEmail: 'equipe@ewes.example',
      contactAutoReply: true,
    });
    const call = prisma.siteSettings.upsert.mock.calls[0][0] as {
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    };
    // Le reste de la ligne naît des valeurs d'origine ; seul ce qui change est mis à jour.
    expect(call.create).toMatchObject({
      id: 'site',
      phone: DEFAULT_SITE_SETTINGS.phone,
      contactRecipientEmail: 'equipe@ewes.example',
    });
    expect(call.update).toEqual({
      contactRecipientEmail: 'equipe@ewes.example',
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SETTINGS_MAIL_UPDATED',
        entityType: 'SiteSettings',
        before: { contactRecipientEmail: null },
        after: { contactRecipientEmail: 'equipe@ewes.example' },
      }),
    );
  });

  it('n’écrit, ne trace et n’invalide rien quand rien ne change', async () => {
    const { service, prisma, audit, revalidator } = build({ row: stored() });
    await service.updateGeneral(actor, {
      phone: DEFAULT_SITE_SETTINGS.phone,
      officeDays: [...DEFAULT_SITE_SETTINGS.officeDays],
    });
    expect(prisma.siteSettings.upsert).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
    expect(revalidator.revalidate).not.toHaveBeenCalled();
  });

  it('invalide le cache du site public pour un réglage public, pas pour la messagerie', async () => {
    const general = build({ row: stored() });
    await general.service.updateGeneral(actor, { phone: '+243 99 111 22 33' });
    expect(general.revalidator.revalidate).toHaveBeenCalledWith(
      'site-settings',
    );
    const mail = build({ row: stored() });
    await mail.service.updateMail(actor, { contactAutoReply: false });
    expect(mail.revalidator.revalidate).not.toHaveBeenCalled();
  });

  it('rejette des horaires incohérents sans rien écrire', async () => {
    const { service, prisma } = build({ row: stored() });
    await expect(
      service.updateGeneral(actor, { opensAt: '18:00' }),
    ).rejects.toMatchObject({
      response: { details: [{ field: 'closesAt' }] },
    });
    expect(prisma.siteSettings.upsert).not.toHaveBeenCalled();
  });
});

describe('checkSocialUrl', () => {
  it('normalise une adresse valide', () => {
    expect(
      checkSocialUrl('linkedin', ' https://www.linkedin.com/company/ewes '),
    ).toEqual({ url: 'https://www.linkedin.com/company/ewes' });
    expect(checkSocialUrl('youtube', 'https://youtu.be/abc')).toEqual({
      url: 'https://youtu.be/abc',
    });
  });

  it.each([
    ['javascript:alert(1)'],
    ['http://www.linkedin.com/company/ewes'],
    ['https://linkedin.com.evil.example/ewes'],
    ['https://evillinkedin.com/ewes'],
    ['https://user:pass@www.linkedin.com/ewes'],
    ['pas une adresse'],
  ])('refuse %s', (value) => {
    expect(checkSocialUrl('linkedin', value)).toHaveProperty('error');
  });

  it('refuse un lien qui mène à un autre réseau', () => {
    expect(checkSocialUrl('facebook', 'https://x.com/ewes')).toHaveProperty(
      'error',
    );
  });
});

describe('valeurs dérivées publiques', () => {
  it('déduit le lien téléphonique et l’itinéraire', () => {
    expect(phoneHref('+243 81 81 53 110')).toBe('tel:+243818153110');
    expect(phoneHref('(081) 818-1531')).toBe('tel:0818181531');
    expect(mapsUrl('1809, Av. Araucarias')).toBe(
      'https://www.google.com/maps/search/?api=1&query=1809%2C%20Av.%20Araucarias',
    );
  });
});
