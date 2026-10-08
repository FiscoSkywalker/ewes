import { describe, expect, it } from 'vitest';
import { monthsBefore } from './months.js';

const at = (iso: string) => new Date(iso);

describe('monthsBefore', () => {
  it('goes back whole calendar months, keeping the time of day', () => {
    expect(monthsBefore(at('2026-10-08T14:30:15.123Z'), 12)).toEqual(
      at('2025-10-08T14:30:15.123Z'),
    );
    expect(monthsBefore(at('2026-10-08T00:00:00.000Z'), 24)).toEqual(
      at('2024-10-08T00:00:00.000Z'),
    );
  });

  it('crosses a year boundary', () => {
    expect(monthsBefore(at('2026-02-10T08:00:00.000Z'), 3)).toEqual(
      at('2025-11-10T08:00:00.000Z'),
    );
    expect(monthsBefore(at('2026-01-31T08:00:00.000Z'), 1)).toEqual(
      at('2025-12-31T08:00:00.000Z'),
    );
  });

  it('clamps to the last day of a shorter month, like PostgreSQL intervals', () => {
    // 29 février 2028 - 12 mois : le 28 février 2027, pas le 1er mars.
    expect(monthsBefore(at('2028-02-29T10:00:00.000Z'), 12)).toEqual(
      at('2027-02-28T10:00:00.000Z'),
    );
    expect(monthsBefore(at('2026-03-31T10:00:00.000Z'), 1)).toEqual(
      at('2026-02-28T10:00:00.000Z'),
    );
    expect(monthsBefore(at('2026-05-31T10:00:00.000Z'), 1)).toEqual(
      at('2026-04-30T10:00:00.000Z'),
    );
  });
});
