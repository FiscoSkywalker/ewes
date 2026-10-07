import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtStrategy } from './jwt.strategy.js';

describe('JwtStrategy', () => {
  let findUnique: ReturnType<typeof vi.fn>;
  let strategy: JwtStrategy;

  beforeEach(() => {
    findUnique = vi.fn();
    strategy = new JwtStrategy(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { getOrThrow: () => 'test-access-secret' } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { user: { findUnique } } as any,
    );
  });

  const payload = {
    sub: 'user-1',
    role: Role.ADMINISTRATEUR,
    sid: 'session-1',
  };

  it('accepts an active account and applies its current role, not the token’s', async () => {
    findUnique.mockResolvedValue({
      role: Role.UTILISATEUR,
      isActive: true,
      deletedAt: null,
    });
    await expect(strategy.validate(payload)).resolves.toMatchObject({
      id: 'user-1',
      role: Role.UTILISATEUR,
      sessionId: 'session-1',
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { role: true, isActive: true, deletedAt: true },
    });
  });

  it.each([
    [
      'deactivated',
      { role: Role.ADMINISTRATEUR, isActive: false, deletedAt: null },
    ],
    [
      'deleted',
      { role: Role.ADMINISTRATEUR, isActive: true, deletedAt: new Date() },
    ],
    ['missing', null],
  ])(
    'refuses a %s account with the same 401 as an invalid token',
    async (_label, row) => {
      findUnique.mockResolvedValue(row);
      await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    },
  );

  it('refuses a malformed payload without reading the database', async () => {
    await expect(
      strategy.validate({ role: Role.ADMINISTRATEUR } as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(findUnique).not.toHaveBeenCalled();
  });
});
