/**
 * Garde-fou de démarrage (blueprint/10_Security.md, revue du 2026-10-08) : en
 * production, l'API refuse de démarrer avec un secret resté à sa valeur
 * d'exemple, trop court ou réutilisé. Fonction pure : elle ne renvoie que des
 * messages nommant les variables, jamais leurs valeurs.
 */

export const MIN_SECRET_LENGTH = 32;

const PLACEHOLDER = /change-?me|example|placeholder|your-/i;
const WEAK_DATABASE_PASSWORDS = new Set([
  'ewes',
  'postgres',
  'password',
  'admin',
]);

type Env = Record<string, string | undefined>;

function secretProblem(name: string, value: string | undefined) {
  if (!value) return `${name} est absent.`;
  if (PLACEHOLDER.test(value)) return `${name} a gardé sa valeur d'exemple.`;
  if (value.length < MIN_SECRET_LENGTH) {
    return `${name} doit compter au moins ${MIN_SECRET_LENGTH} caractères.`;
  }
  return undefined;
}

function databasePasswordOf(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return decodeURIComponent(new URL(url).password);
  } catch {
    return undefined;
  }
}

export function productionSecretProblems(env: Env): string[] {
  const problems: string[] = [];
  for (const name of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    const problem = secretProblem(name, env[name]);
    if (problem) problems.push(problem);
  }
  if (
    env.JWT_ACCESS_SECRET &&
    env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET
  ) {
    problems.push(
      'JWT_ACCESS_SECRET et JWT_REFRESH_SECRET doivent être différents.',
    );
  }

  // Sans ces deux variables, les publications n'atteignent jamais le site public.
  if (!env.WEB_REVALIDATE_URL) {
    problems.push('WEB_REVALIDATE_URL est absent.');
  }
  const revalidate = secretProblem('REVALIDATE_SECRET', env.REVALIDATE_SECRET);
  if (revalidate) problems.push(revalidate);

  const databasePassword = databasePasswordOf(env.DATABASE_URL);
  if (
    databasePassword !== undefined &&
    (WEAK_DATABASE_PASSWORDS.has(databasePassword.toLowerCase()) ||
      PLACEHOLDER.test(databasePassword) ||
      databasePassword.length < 12)
  ) {
    problems.push(
      'Le mot de passe de DATABASE_URL est faible ou resté à sa valeur d’exemple.',
    );
  }
  return problems;
}

/** Lève une erreur listant tous les problèmes ; sans effet hors production. */
export function assertProductionSecrets(env: Env): void {
  if (env.NODE_ENV !== 'production') return;
  const problems = productionSecretProblems(env);
  if (problems.length > 0) {
    throw new Error(
      `Configuration de production refusée :\n- ${problems.join('\n- ')}`,
    );
  }
}
