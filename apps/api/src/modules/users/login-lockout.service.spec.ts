import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginLockoutService } from './login-lockout.service.js';

interface Row {
  email: string;
  createdAt: Date;
}

/** Base simulée minimale : juste de quoi éprouver la fenêtre glissante. */
function fakePrisma(rows: Row[]) {
  return {
    loginFailure: {
      findMany: vi.fn(
        async ({
          where,
        }: {
          where: { email: { in: string[] }; createdAt: { gt: Date } };
        }) =>
          rows
            .filter(
              (r) =>
                where.email.in.includes(r.email) &&
                r.createdAt > where.createdAt.gt,
            )
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      ),
      deleteMany: vi.fn(
        async ({
          where,
        }: {
          where: { email?: string; createdAt?: { lte: Date } };
        }) => {
          for (let i = rows.length - 1; i >= 0; i--) {
            const hit = where.email
              ? rows[i].email === where.email
              : rows[i].createdAt <= where.createdAt!.lte;
            if (hit) rows.splice(i, 1);
          }
        },
      ),
      create: vi.fn(async ({ data }: { data: { email: string } }) => {
        rows.push({ email: data.email, createdAt: new Date() });
      }),
      count: vi.fn(
        async ({
          where,
        }: {
          where: { email: string; createdAt: { gt: Date } };
        }) =>
          rows.filter(
            (r) => r.email === where.email && r.createdAt > where.createdAt.gt,
          ).length,
      ),
    },
  };
}

const config = (env: Record<string, string> = {}) => ({
  get: (key: string) => env[key],
});

describe('LoginLockoutService', () => {
  const NOW = new Date('2026-10-03T12:00:00Z').getTime();
  let rows: Row[];
  let service: LoginLockoutService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    rows = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new LoginLockoutService(fakePrisma(rows) as any, config() as any);
  });
  afterEach(() => vi.useRealTimers());

  const minutesAgo = (n: number) => new Date(NOW - n * 60_000);

  it('defaults to 5 failures in 15 minutes and reads the environment', () => {
    expect(service.maxFailures).toBe(5);
    expect(service.windowMs).toBe(15 * 60_000);
    const custom = new LoginLockoutService(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fakePrisma([]) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config({
        LOGIN_LOCKOUT_MAX_FAILURES: '3',
        LOGIN_LOCKOUT_MINUTES: '30',
      }) as any,
    );
    expect(custom.maxFailures).toBe(3);
    expect(custom.windowMs).toBe(30 * 60_000);
    // Valeur absurde : on retombe sur le défaut plutôt que de désactiver la protection.
    for (const bad of ['0', '-2', 'abc', '2.5', '']) {
      const broken = new LoginLockoutService(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fakePrisma([]) as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        config({ LOGIN_LOCKOUT_MAX_FAILURES: bad }) as any,
      );
      expect(broken.maxFailures).toBe(5);
    }
  });

  it('does not lock below the threshold, and locks at it — until the oldest leaves the window', async () => {
    for (let i = 0; i < 4; i++) await service.recordFailure('a@ewes.example');
    expect((await service.status('a@ewes.example')).locked).toBe(false);

    // Le 5e échec fait basculer ; un 6e (impossible en pratique) ne rebascule pas.
    expect(await service.recordFailure('a@ewes.example')).toBe(true);
    const status = await service.status('a@ewes.example');
    expect(status.locked).toBe(true);
    expect(status.until!.getTime()).toBe(NOW + 15 * 60_000);

    // Fenêtre glissante : 14 minutes plus tard, encore verrouillé ; 16 minutes, libre.
    vi.setSystemTime(NOW + 14 * 60_000);
    expect((await service.status('a@ewes.example')).locked).toBe(true);
    vi.setSystemTime(NOW + 16 * 60_000);
    expect((await service.status('a@ewes.example')).locked).toBe(false);
  });

  it('unlocks as soon as enough old failures age out, not all of them', async () => {
    rows.push(
      ...[14, 10, 8, 3, 1].map((m) => ({
        email: 'b@ewes.example',
        createdAt: minutesAgo(m),
      })),
    );
    const first = await service.status('b@ewes.example');
    // Le plus ancien (il y a 14 min) sort dans 1 minute.
    expect(first.until!.getTime()).toBe(NOW + 60_000);
    vi.setSystemTime(NOW + 61_000);
    expect((await service.status('b@ewes.example')).locked).toBe(false);
  });

  it('treats addresses case- and space-insensitively, and an unknown address like any other', async () => {
    for (let i = 0; i < 5; i++)
      await service.recordFailure('  Nobody@EWES.example ');
    expect((await service.status('nobody@ewes.example')).locked).toBe(true);
    expect((await service.status('somebody@ewes.example')).locked).toBe(false);
  });

  it('answers for many addresses at once', async () => {
    for (let i = 0; i < 5; i++) await service.recordFailure('x@ewes.example');
    await service.recordFailure('y@ewes.example');
    const map = await service.statusMany([
      'X@ewes.example',
      'y@ewes.example',
      'z@ewes.example',
    ]);
    expect([...map.keys()]).toEqual(['x@ewes.example']);
  });

  it('clears an address, and purges stale rows when recording', async () => {
    for (let i = 0; i < 5; i++) await service.recordFailure('c@ewes.example');
    await service.clear('C@ewes.example');
    expect((await service.status('c@ewes.example')).locked).toBe(false);

    rows.push({ email: 'old@ewes.example', createdAt: minutesAgo(40) });
    await service.recordFailure('d@ewes.example');
    expect(rows.some((r) => r.email === 'old@ewes.example')).toBe(false);
  });
});
