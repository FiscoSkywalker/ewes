import { Module } from '@nestjs/common';
import { RevalidationModule } from '../../common/revalidation/revalidation.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { AdminSiteSettingsController } from './admin-site-settings.controller.js';
import { SiteSettingsController } from './site-settings.controller.js';
import { SiteSettingsService } from './site-settings.service.js';

@Module({
  imports: [RevalidationModule, NotificationsModule],
  controllers: [SiteSettingsController, AdminSiteSettingsController],
  providers: [SiteSettingsService],
  exports: [SiteSettingsService],
})
export class SiteSettingsModule {}
