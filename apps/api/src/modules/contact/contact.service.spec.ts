import { describe, expect, it, vi } from 'vitest';
import { ContactService } from './contact.service.js';

/**
 * Les réglages « Messagerie » pilotent le formulaire de contact : le
 * destinataire du portail l'emporte (repli : l'environnement, géré par
 * `SiteSettingsService.contactRecipient`), et l'accusé de réception peut être
 * coupé sans jamais perdre le message ni empêcher la notification de l'équipe.
 */
function build(options: { recipient: string | null; autoReply: boolean }) {
  const created = {
    id: 'msg-1',
    name: 'Aimé Kalala',
    organization: null,
    email: 'aime@example.org',
    phone: null,
    sector: 'EAU',
    message: 'Bonjour, nous souhaitons un devis.',
    locale: 'fr',
  };
  const prisma = {
    contactMessage: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(created),
    },
  };
  const notifications = {
    enqueue: vi.fn().mockResolvedValue({}),
    countRecent: vi.fn().mockResolvedValue(0),
  };
  const siteSettings = {
    contactRecipient: vi.fn().mockResolvedValue(options.recipient),
    current: vi.fn().mockResolvedValue({ contactAutoReply: options.autoReply }),
  };
  const service = new ContactService(
    prisma as never,
    notifications as never,
    {} as never,
    siteSettings as never,
  );
  const types = () =>
    notifications.enqueue.mock.calls.map(
      (call) => (call[0] as { type: string }).type,
    );
  return { service, notifications, types };
}

const payload = {
  name: 'Aimé Kalala',
  email: 'aime@example.org',
  sector: 'EAU',
  message: 'Bonjour, nous souhaitons un devis.',
} as never;

describe('ContactService — réglages de messagerie', () => {
  it('adresse la notification interne au destinataire des réglages', async () => {
    const { service, notifications } = build({
      recipient: 'equipe@ewes.example',
      autoReply: true,
    });
    await service.submit(payload);
    const team = notifications.enqueue.mock.calls[0][0] as {
      type: string;
      to: string;
      replyTo: string;
    };
    expect(team).toMatchObject({
      type: 'CONTACT_RECEIVED',
      to: 'equipe@ewes.example',
      replyTo: 'aime@example.org',
    });
  });

  it('envoie l’accusé de réception quand il est activé', async () => {
    const { service, types } = build({
      recipient: 'equipe@ewes.example',
      autoReply: true,
    });
    await service.submit(payload);
    expect(types()).toEqual(['CONTACT_RECEIVED', 'CONTACT_ACKNOWLEDGEMENT']);
  });

  it('n’envoie pas d’accusé de réception quand il est coupé, mais prévient toujours l’équipe', async () => {
    const { service, types, notifications } = build({
      recipient: 'equipe@ewes.example',
      autoReply: false,
    });
    await expect(service.submit(payload)).resolves.toEqual({
      status: 'received',
      duplicate: false,
    });
    expect(types()).toEqual(['CONTACT_RECEIVED']);
    expect(notifications.countRecent).not.toHaveBeenCalled();
  });

  it('enregistre quand même la notification, en échec visible, sans destinataire', async () => {
    const { service, notifications } = build({
      recipient: null,
      autoReply: true,
    });
    await service.submit(payload);
    expect(notifications.enqueue.mock.calls[0][0]).toMatchObject({
      type: 'CONTACT_RECEIVED',
      to: 'non-configure@invalid',
    });
  });
});
