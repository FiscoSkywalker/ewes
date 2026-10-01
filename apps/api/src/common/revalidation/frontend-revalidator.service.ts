import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Demande au site public d'invalider le cache d'un contenu (tag `page:<slug>`,
 * `service:<slug>`…) (revalidation ISR à
 * la demande, blueprint/09_Business_Rules.md : une dépublication retire le
 * contenu immédiatement). Best-effort : un échec est journalisé mais ne fait
 * jamais échouer la mutation — le cache expirera au plus tard à sa durée de
 * repli côté Next.js.
 */
@Injectable()
export class FrontendRevalidator {
  private readonly logger = new Logger(FrontendRevalidator.name);

  constructor(private readonly config: ConfigService) {}

  async revalidate(tag: string): Promise<void> {
    const baseUrl = this.config.get<string>('WEB_REVALIDATE_URL');
    const secret = this.config.get<string>('REVALIDATE_SECRET');
    if (!baseUrl || !secret) {
      this.logger.warn(
        'WEB_REVALIDATE_URL/REVALIDATE_SECRET non définis : revalidation du site public ignorée.',
      );
      return;
    }

    try {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-revalidate-secret': secret,
        },
        body: JSON.stringify({ tag }),
        signal: AbortSignal.timeout(5_000),
      });
      if (!res.ok) {
        this.logger.warn(`Revalidation de ${tag} refusée (${res.status}).`);
      }
    } catch (error) {
      this.logger.warn(
        `Revalidation de ${tag} impossible : ${error instanceof Error ? error.message : 'erreur inconnue'}`,
      );
    }
  }
}
