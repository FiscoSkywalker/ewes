import { describe, expect, it, vi } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard.js';

function makeContext(
  user: { role: Role } | undefined,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('RolesGuard', () => {
  it('allows access when no @Roles() metadata is set', () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(undefined) };
    const guard = new RolesGuard(reflector as unknown as Reflector);

    expect(guard.canActivate(makeContext({ role: Role.UTILISATEUR }))).toBe(
      true,
    );
  });

  it('allows access when the user role is in the required list', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([Role.ADMINISTRATEUR]),
    };
    const guard = new RolesGuard(reflector as unknown as Reflector);

    expect(
      guard.canActivate(makeContext({ role: Role.ADMINISTRATEUR })),
    ).toBe(true);
  });

  it('rejects access when the user role is not in the required list', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([Role.ADMINISTRATEUR]),
    };
    const guard = new RolesGuard(reflector as unknown as Reflector);

    expect(() =>
      guard.canActivate(makeContext({ role: Role.UTILISATEUR })),
    ).toThrow(ForbiddenException);
  });
});
