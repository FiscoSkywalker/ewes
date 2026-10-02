import { Module } from '@nestjs/common';
import { AdminNotificationsController } from './admin-notifications.controller.js';
import {
  DEFAULT_RETRY_POLICY,
  MAIL_PROVIDER,
  NOTIFICATION_RETRY_POLICY,
} from './mail-provider.js';
import { NotificationsService } from './notifications.service.js';
import { SmtpMailProvider } from './smtp-mail.provider.js';

/** Notifications e-mail (blueprint/13). Fournisseur remplaçable via le jeton `MAIL_PROVIDER`. */
@Module({
  controllers: [AdminNotificationsController],
  providers: [
    { provide: MAIL_PROVIDER, useClass: SmtpMailProvider },
    { provide: NOTIFICATION_RETRY_POLICY, useValue: DEFAULT_RETRY_POLICY },
    NotificationsService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
