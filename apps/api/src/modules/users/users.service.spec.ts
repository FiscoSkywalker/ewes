import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '@prisma/client';
import { UsersService } from './users.service.js';

/**
 * Règle du dernier administrateur : il doit toujours en rester un actif, sinon
 * plus personne ne peut gérer les comptes. Éprouvée ici avec une base simulée
 * (en e2e, la base partagée contient d'autres administrateurs).
 */
describe('UsersService — dernier administrateur', () => {
  const actor = {
    id: 'actor',
    email: '',
    fullName: '',
    role: Role.ADMINISTRATEUR,
  };
  const target = {
    id: 'target',
    email: 'cible@ewes.example',
    role: Role.ADMINISTRATEUR,
    isActive: true,
    deletedAt: null,
  };

  let others: number;
  let tx: {
    user: {
      findFirst: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    session: { updateMany: ReturnType<typeof vi.fn> };
  };
  let audit: { record: ReturnType<typeof vi.fn> };
  let service: UsersService;

  beforeEach(() => {
    others = 0;
    tx = {
      user: {
        findFirst: vi.fn(async () => target),
        count: vi.fn(async () => others),
        update: vi.fn(async ({ data }) => ({ ...target, ...data })),
      },
      session: { updateMany: vi.fn() },
    };
    audit = { record: vi.fn() };
    const prisma = {
      $transaction: vi.fn(async (work: (t: typeof tx) => unknown) => work(tx)),
      user: { findFirst: vi.fn(async () => target) },
      session: {
        aggregate: vi.fn(async () => ({ _max: { createdAt: null } })),
        count: vi.fn(async () => 0),
      },
      folderAccessGrant: { count: vi.fn(async () => 0) },
      documentAccessGrant: { count: vi.fn(async () => 0) },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new UsersService(
      prisma as any,
      audit as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {
        statusMany: vi.fn(async () => new Map()),
        status: vi.fn(async () => ({ locked: false, until: null })),
        recentFailures: vi.fn(async () => 0),
        clear: vi.fn(),
      } as any,
    );
  });

  it('refuses to demote the only active administrator', async () => {
    await expect(
      service.changeRole(actor, 'target', Role.GESTIONNAIRE),
    ).rejects.toMatchObject({ response: { code: 'LAST_ADMINISTRATOR' } });
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('refuses to deactivate the only active administrator', async () => {
    await expect(
      service.setActive(actor, 'target', false),
    ).rejects.toMatchObject({ response: { code: 'LAST_ADMINISTRATOR' } });
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.session.updateMany).not.toHaveBeenCalled();
  });

  it('allows it once another active administrator exists, and counts only the others', async () => {
    others = 1;
    await service.changeRole(actor, 'target', Role.GESTIONNAIRE);
    expect(tx.user.count).toHaveBeenCalledWith({
      where: {
        role: Role.ADMINISTRATEUR,
        isActive: true,
        deletedAt: null,
        id: { not: 'target' },
      },
    });
    expect(tx.user.update).toHaveBeenCalledOnce();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'USER_ROLE_CHANGED',
        before: { role: Role.ADMINISTRATEUR, email: target.email },
        after: { role: Role.GESTIONNAIRE, email: target.email },
      }),
    );
  });

  it('does not apply the rule to a non-administrator', async () => {
    tx.user.findFirst.mockResolvedValue({ ...target, role: Role.GESTIONNAIRE });
    await service.setActive(actor, 'target', false);
    expect(tx.user.count).not.toHaveBeenCalled();
    expect(tx.user.update).toHaveBeenCalledOnce();
  });
});
