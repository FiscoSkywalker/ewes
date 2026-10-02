import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module.js';
import { RevalidationModule } from '../../common/revalidation/revalidation.module.js';
import { ActualitesService } from './actualites.service.js';
import { ActualitesController } from './actualites.controller.js';
import { AdminArticlesController } from './admin-articles.controller.js';

@Module({
  imports: [RevalidationModule, MediaModule],
  controllers: [ActualitesController, AdminArticlesController],
  providers: [ActualitesService],
  exports: [ActualitesService],
})
export class ActualitesModule {}
