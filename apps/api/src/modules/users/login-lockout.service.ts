import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface LockStatus {
  locked: boolean;
  /** Fin du verrouillage ; `null` si le compte n'est pas verrouillé. */
  until: Date | null;
}

/** Normalisation commune : l'adresse saisie sert de clé, qu'elle ait un compte ou non. */
export const lockKey = (email: string) => email.trim().toLowerCase();

/**
 * Verrouillage temporaire après des échecs de connexion répétés
 * (blueprint/10_Security.md §1).
 *
 * - **Par adresse saisie**, compte existant ou non : une adresse inconnue se
 *   verrouille exactement comme une adresse connue, donc le verrouillage ne
 *   révèle pas l'existence d'un compte.
 * - **Glissant** : un compte est verrouillé tant qu'il compte au moins
 *   `LOGIN_LOCKOUT_MAX_FAILURES` échecs dans les `LOGIN_LOCKOUT_MINUTES`
 *   dernières minutes ; il se déverrouille quand le plus ancien de ces échecs
 *   sort de la fenêtre. Une tentative refusée pendant le verrouillage n'est
 *   **pas** comptée : on ne peut pas le prolonger en insistant (limite le
 *   déni de service contre un compte légitime).
 * - Une connexion réussie remet le compte à zéro ; un Administrateur peut
 *   déverrouiller sans attendre.
 */
@Injectable()
export class LoginLockoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Lus à chaque appel : réglables par l'environnement sans redémarrer les tests. */
  get maxFailures(): number {
    return this.positive('LOGIN_LOCKOUT_MAX_FAILURES', 5);
  }

  get windowMs(): number {
    return this.positive('LOGIN_LOCKOUT_MINUTES', 15) * 60_000;
  }

  private positive(key: string, fallback: number): number {
    const value = Number(this.config.get<string>(key));
    return Number.isInteger(value) && value > 0 ? value : fallback;
  }

  async status(email: string): Promise<LockStatus> {
    const map = await this.statusMany([email]);
    const until = map.get(lockKey(email)) ?? null;
    return { locked: until !== null, until };
  }

  /** Fin de verrouillage de chaque adresse verrouillée parmi `emails` (une requête). */
  async statusMany(emails: string[]): Promise<Map<string, Date>> {
    const keys = [...new Set(emails.map(lockKey))];
    const since = new Date(Date.now() - this.windowMs);
    const rows = await this.prisma.loginFailure.findMany({
      where: { email: { in: keys }, createdAt: { gt: since } },
      select: { email: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    const byEmail = new Map<string, Date[]>();
    for (const row of rows) {
      (
        byEmail.get(row.email) ?? byEmail.set(row.email, []).get(row.email)!
      ).push(row.createdAt);
    }
    const max = this.maxFailures;
    const locked = new Map<string, Date>();
    for (const [email, dates] of byEmail) {
      // `dates` est du plus récent au plus ancien : le verrou tient jusqu'à la sortie du N-ième.
      if (dates.length >= max) {
        locked.set(email, new Date(dates[max - 1].getTime() + this.windowMs));
      }
    }
    return locked;
  }

  /**
   * Enregistre un échec. Renvoie `true` si cet échec **fait** basculer
   * l'adresse en verrouillage (pour ne tracer l'événement qu'une fois).
   */
  async recordFailure(email: string): Promise<boolean> {
    const key = lockKey(email);
    const since = new Date(Date.now() - this.windowMs);
    // Purge au fil de l'eau : la table ne garde que la fenêtre utile.
    await this.prisma.loginFailure.deleteMany({
      where: { createdAt: { lte: since } },
    });
    await this.prisma.loginFailure.create({ data: { email: key } });
    const count = await this.prisma.loginFailure.count({
      where: { email: key, createdAt: { gt: since } },
    });
    return count === this.maxFailures;
  }

  /** Remet une adresse à zéro (connexion réussie, déverrouillage). */
  async clear(email: string): Promise<void> {
    await this.prisma.loginFailure.deleteMany({
      where: { email: lockKey(email) },
    });
  }

  /** Nombre d'échecs encore dans la fenêtre. */
  recentFailures(email: string): Promise<number> {
    return this.prisma.loginFailure.count({
      where: {
        email: lockKey(email),
        createdAt: { gt: new Date(Date.now() - this.windowMs) },
      },
    });
  }
}
