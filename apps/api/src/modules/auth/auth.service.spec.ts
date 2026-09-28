import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service.js';

vi.mock('argon2', () => ({
  verify: vi.fn(),
}));

const CTX = { userAgent: 'vitest', ipAddress: '127.0.0.1' };

const ENV: Record<string, string> = {
  JWT_ACCESS_SECRET: 'test-access-secret',
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_SECRET: 'test-refresh-secret',
  JWT_REFRESH_EXPIRES_IN: '7d',
};

function makeConfigService() {
  return {
    get: vi.fn((key: string, fallback?: unknown) => ENV[key] ?? fallback),
    getOrThrow: vi.fn((key: string) => {
      const value = ENV[key];
      if (!value) throw new Error(`Missing env ${key}`);
      return value;
    }),
  };
}

function makeUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'user-1',
    email: 'admin@ewes.example',
    passwordHash: 'hashed-password',
    fullName: 'Admin EWES',
    role: Role.ADMINISTRATEUR,
    isActive: true,
    deletedAt: null,
    ...overrides,
  };
}

describe('AuthService', () => {
  let prisma: {
    session: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
  };
  let usersService: {
    findByEmail: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
  };
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = {
      session: {
        create: vi.fn(async ({ data }) => ({ ...data, revokedAt: null })),
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
    };
    usersService = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
    };

    service = new AuthService(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prisma as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      usersService as any,
      new JwtService({}),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeConfigService() as any,
    );
  });

  describe('login', () => {
    it('rejects an unknown email with a generic error', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      vi.mocked(argon2.verify).mockResolvedValue(false);

      await expect(
        service.login('nobody@ewes.example', 'wrong-password', CTX),
      ).rejects.toMatchObject({
        response: { code: 'INVALID_CREDENTIALS' },
      });
    });

    it('rejects a disabled account with the same generic error', async () => {
      usersService.findByEmail.mockResolvedValue(makeUser({ isActive: false }));
      vi.mocked(argon2.verify).mockResolvedValue(false);

      await expect(
        service.login('admin@ewes.example', 'irrelevant', CTX),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a wrong password', async () => {
      usersService.findByEmail.mockResolvedValue(makeUser());
      vi.mocked(argon2.verify).mockResolvedValue(false);

      await expect(
        service.login('admin@ewes.example', 'wrong-password', CTX),
      ).rejects.toMatchObject({
        response: { code: 'INVALID_CREDENTIALS' },
      });
    });

    it('issues an access/refresh token pair and creates a session on success', async () => {
      const user = makeUser();
      usersService.findByEmail.mockResolvedValue(user);
      vi.mocked(argon2.verify).mockResolvedValue(true);

      const result = await service.login('admin@ewes.example', 'correct-password', CTX);

      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(result.user).toEqual({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      });
      expect(prisma.session.create).toHaveBeenCalledTimes(1);
      const createArgs = prisma.session.create.mock.calls[0][0];
      expect(createArgs.data.userId).toBe(user.id);
      expect(createArgs.data.userAgent).toBe(CTX.userAgent);
    });
  });

  describe('refresh', () => {
    it('rotates the refresh token and revokes the previous session', async () => {
      const user = makeUser();
      usersService.findByEmail.mockResolvedValue(user);
      vi.mocked(argon2.verify).mockResolvedValue(true);

      const { refreshToken } = await service.login(
        'admin@ewes.example',
        'correct-password',
        CTX,
      );
      const firstSession = prisma.session.create.mock.calls[0][0].data;
      prisma.session.findUnique.mockResolvedValue({
        ...firstSession,
        expiresAt: new Date(Date.now() + 1_000_000),
      });
      usersService.findById.mockResolvedValue(user);

      const rotated = await service.refresh(refreshToken, CTX);

      expect(rotated.refreshToken).not.toBe(refreshToken);
      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: firstSession.id },
        data: { revokedAt: expect.any(Date) },
      });
      expect(prisma.session.create).toHaveBeenCalledTimes(2);
    });

    it('rejects a reused (already rotated) refresh token and revokes the session defensively', async () => {
      const user = makeUser();
      usersService.findByEmail.mockResolvedValue(user);
      vi.mocked(argon2.verify).mockResolvedValue(true);

      const { refreshToken } = await service.login(
        'admin@ewes.example',
        'correct-password',
        CTX,
      );
      const firstSession = prisma.session.create.mock.calls[0][0].data;
      // Le jeton a déjà été roté : la session porte un hash différent.
      prisma.session.findUnique.mockResolvedValue({
        ...firstSession,
        refreshTokenHash: 'stale-hash',
        expiresAt: new Date(Date.now() + 1_000_000),
      });

      await expect(service.refresh(refreshToken, CTX)).rejects.toMatchObject({
        response: { code: 'TOKEN_INVALID' },
      });
      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: firstSession.id },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('rejects a revoked session', async () => {
      const user = makeUser();
      usersService.findByEmail.mockResolvedValue(user);
      vi.mocked(argon2.verify).mockResolvedValue(true);

      const { refreshToken } = await service.login(
        'admin@ewes.example',
        'correct-password',
        CTX,
      );
      const firstSession = prisma.session.create.mock.calls[0][0].data;
      prisma.session.findUnique.mockResolvedValue({
        ...firstSession,
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 1_000_000),
      });

      await expect(service.refresh(refreshToken, CTX)).rejects.toMatchObject({
        response: { code: 'TOKEN_INVALID' },
      });
    });

    it('rejects a malformed/garbage refresh token', async () => {
      await expect(
        service.refresh('not-a-jwt', CTX),
      ).rejects.toMatchObject({ response: { code: 'TOKEN_INVALID' } });
    });
  });

  describe('logout', () => {
    it('revokes the session tied to the refresh token', async () => {
      const user = makeUser();
      usersService.findByEmail.mockResolvedValue(user);
      vi.mocked(argon2.verify).mockResolvedValue(true);

      const { refreshToken } = await service.login(
        'admin@ewes.example',
        'correct-password',
        CTX,
      );
      const firstSession = prisma.session.create.mock.calls[0][0].data;

      await service.logout(refreshToken);

      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: { id: firstSession.id, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('is idempotent for an already-invalid token', async () => {
      await expect(service.logout('garbage')).resolves.toBeUndefined();
      expect(prisma.session.updateMany).not.toHaveBeenCalled();
    });
  });
});
