import { Module } from '@nestjs/common';
import { FrontendRevalidator } from './frontend-revalidator.service.js';
import { ScheduledPublicationWatcher } from './scheduled-publication.watcher.js';

@Module({
  providers: [FrontendRevalidator, ScheduledPublicationWatcher],
  exports: [FrontendRevalidator],
})
export class RevalidationModule {}
