import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { SiteSettingsModule } from '../site-settings/site-settings.module.js';
import { AdminContactsController } from './admin-contacts.controller.js';
import { ContactController } from './contact.controller.js';
import { ContactService } from './contact.service.js';

@Module({
  imports: [NotificationsModule, SiteSettingsModule],
  controllers: [ContactController, AdminContactsController],
  providers: [ContactService],
})
export class ContactModule {}
