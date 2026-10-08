import { describe, expect, it, vi } from 'vitest';
import type { ContactMessage } from '@prisma/client';
import { MAX_EXPORT_ROWS, contactsToCsv } from './contact-export.js';
import { ContactService } from './contact.service.js';

const message = (over: Partial<ContactMessage> = {}): ContactMessage => ({
  id: 'msg-1',
  name: 'Aimé Kalala',
  organization: 'Société Minière',
  email: 'aime@example.org',
  phone: '+243 81 000 00 00',
  sector: 'EAU',
  subject: null,
  message: 'Bonjour, nous souhaitons un devis.',
  locale: 'fr',
  submissionKey: 'secret-key',
  contentHash: 'secret-hash',
  status: 'NOUVEAU',
  createdAt: new Date('2026-10-08T14:03:00.000Z'),
  updatedAt: new Date('2026-10-09T08:00:00.000Z'),
  ...over,
});

describe('contactsToCsv', () => {
  it('writes labelled columns and never the idempotency fields', () => {
    const csv = contactsToCsv([message()]);
    const [header, row] = csv.replace('﻿', '').split('\r\n');
    expect(header).toBe(
      'Date de réception;Nom;Organisation;E-mail;Téléphone;Besoin;Objet;Message;Langue;Statut;Dernière mise à jour',
    );
    expect(row).toBe(
      '2026-10-08T14:03:00.000Z;Aimé Kalala;Société Minière;aime@example.org;+243 81 000 00 00;Eau (adduction, traitement, épuration);;Bonjour, nous souhaitons un devis.;fr;À traiter;2026-10-09T08:00:00.000Z',
    );
    expect(csv).not.toMatch(/secret-key|secret-hash/);
  });

  it('keeps an unknown need as is and labels a handled message', () => {
    const csv = contactsToCsv([
      message({ sector: 'NOUVEAU_BESOIN', status: 'TRAITE' }),
    ]);
    expect(csv).toContain(';NOUVEAU_BESOIN;');
    expect(csv).toContain(';Traité;');
  });
});

describe('ContactService.exportCsv', () => {
  const actor = { id: 'user-1' } as never;
  const build = (rows: ContactMessage[]) => {
    const prisma = {
      contactMessage: { findMany: vi.fn().mockResolvedValue(rows) },
    };
    const audit = { record: vi.fn().mockResolvedValue(undefined) };
    const service = new ContactService(
      prisma as never,
      {} as never,
      audit as never,
      {} as never,
    );
    return { service, prisma, audit };
  };

  it('refuses an export above the cap, without auditing a file that was never produced', async () => {
    const rows = Array.from({ length: MAX_EXPORT_ROWS + 1 }, () => message());
    const { service, audit } = build(rows);
    await expect(
      service.exportCsv(actor, { sort: 'createdAt', order: 'desc' }),
    ).rejects.toMatchObject({
      response: { code: 'CONTACT_EXPORT_TOO_LARGE' },
    });
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('audits the count and filters, never the content of the messages', async () => {
    const { service, audit } = build([message(), message({ id: 'msg-2' })]);
    const result = await service.exportCsv(actor, {
      status: 'NOUVEAU',
      q: ' devis ',
      sort: 'createdAt',
      order: 'desc',
    });
    expect(result.filename).toMatch(
      /^messages-contact-\d{4}-\d{2}-\d{2}\.csv$/,
    );
    expect(audit.record).toHaveBeenCalledWith({
      actorId: 'user-1',
      action: 'CONTACT_EXPORTED',
      entityType: 'ContactMessage',
      after: { count: 2, status: 'NOUVEAU', searched: true },
    });
  });
});
