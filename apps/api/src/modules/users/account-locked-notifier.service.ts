import { Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service.js';
import { accountLockedEmail } from './account-locked-email.js';
import { LoginLockoutService } from './login-lockout.service.js';
import { UsersService } from './users.service.js';

/** Au plus un e-mail de verrouillage par personne et par heure (voir `notify`). */
const MIN_INTERVAL_MS = 60 * 60_000;

/**
 * Prévient par e-mail la personne dont le compte vient d'être verrouillé
 * (blueprint/10_Security.md §1, blueprint/13_Notification_System.md).
 *
 * - Seul un compte **existant et actif** reçoit un e-mail : une adresse inconnue
 *   se verrouille sans qu'aucun message parte, et l'envoi ne change rien à la
 *   réponse de la connexion (pas de moyen de révéler l'existence d'un compte).
 * - **Plafonné à un e-mail par heure et par personne** : sans cela, quelqu'un
 *   qui rate volontairement sa connexion toutes les 15 minutes remplirait la
 *   boîte de la victime. Le journal d'audit garde chaque verrouillage.
 * - Ne lève jamais : l'alerte n'annule ni le verrouillage ni l'audit déjà faits.
 */
@Injectable()
export class AccountLockedNotifier {
  private readonly logger = new Logger(AccountLockedNotifier.name);

  constructor(
    private readonly users: UsersService,
    private readonly lockout: LoginLockoutService,
    private readonly notifications: NotificationsService,
  ) {}

  async notify(email: string, until: Date): Promise<void> {
    try {
      const user = await this.users.findByEmail(email);
      if (!user || !user.isActive || user.deletedAt) return;

      const recent = await this.notifications.countRecent(
        'ACCOUNT_LOCKED',
        user.email,
        new Date(Date.now() - MIN_INTERVAL_MS),
      );
      if (recent > 0) return;

      const mail = accountLockedEmail({
        fullName: user.fullName,
        failures: this.lockout.maxFailures,
        until,
      });
      await this.notifications.enqueue({
        type: 'ACCOUNT_LOCKED',
        to: user.email,
        subject: mail.subject,
        text: mail.text,
        idempotencyKey: `account-locked:${user.id}:${until.getTime()}`,
      });
    } catch (error) {
      this.logger.error(
        `Alerte de verrouillage non mise en file : ${String(error)}`,
      );
    }
  }
}
