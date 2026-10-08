import {
  assertProductionSecrets,
  productionSecretProblems,
} from './production-secrets.js';

const strong = (seed: string) => seed.repeat(40).slice(0, 48);

const GOOD = {
  NODE_ENV: 'production',
  JWT_ACCESS_SECRET: strong('a1b2'),
  JWT_REFRESH_SECRET: strong('c3d4'),
  REVALIDATE_SECRET: strong('e5f6'),
  WEB_REVALIDATE_URL: 'http://web:3000/api/revalidate',
  DATABASE_URL: 'postgresql://ewes:Zk7qPz9vLm2xQw4R@postgres:5432/ewes',
};

describe('productionSecretProblems', () => {
  it('accepts a configuration with strong, distinct secrets', () => {
    expect(productionSecretProblems(GOOD)).toEqual([]);
  });

  it('refuses example values, short secrets and missing ones, naming the variable only', () => {
    const problems = productionSecretProblems({
      ...GOOD,
      JWT_ACCESS_SECRET: 'change-me',
      JWT_REFRESH_SECRET: 'tooshort',
      REVALIDATE_SECRET: undefined,
    });
    expect(problems).toHaveLength(3);
    expect(problems.join(' ')).not.toContain('tooshort');
    expect(problems[0]).toContain('JWT_ACCESS_SECRET');
  });

  it('refuses the same secret for access and refresh tokens', () => {
    const problems = productionSecretProblems({
      ...GOOD,
      JWT_REFRESH_SECRET: GOOD.JWT_ACCESS_SECRET,
    });
    expect(problems).toEqual([
      'JWT_ACCESS_SECRET et JWT_REFRESH_SECRET doivent être différents.',
    ]);
  });

  it('refuses a weak or example database password and a missing revalidation URL', () => {
    expect(
      productionSecretProblems({
        ...GOOD,
        DATABASE_URL: 'postgresql://ewes:change-me@postgres:5432/ewes',
        WEB_REVALIDATE_URL: undefined,
      }),
    ).toHaveLength(2);
    expect(
      productionSecretProblems({
        ...GOOD,
        DATABASE_URL: 'postgresql://ewes:ewes@postgres:5432/ewes',
      }),
    ).toHaveLength(1);
  });
});

describe('assertProductionSecrets', () => {
  it('does nothing outside production', () => {
    expect(() =>
      assertProductionSecrets({ NODE_ENV: 'development' }),
    ).not.toThrow();
  });

  it('throws in production with every problem listed', () => {
    expect(() => assertProductionSecrets({ NODE_ENV: 'production' })).toThrow(
      /JWT_ACCESS_SECRET[\s\S]*REVALIDATE_SECRET/,
    );
  });

  it('accepts a sound production configuration', () => {
    expect(() => assertProductionSecrets(GOOD)).not.toThrow();
  });
});
