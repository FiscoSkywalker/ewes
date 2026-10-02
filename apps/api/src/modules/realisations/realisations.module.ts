import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module.js';
import { RevalidationModule } from '../../common/revalidation/revalidation.module.js';
import { RealisationsService } from './realisations.service.js';
import { RealisationsController } from './realisations.controller.js';
import { AdminRealisationPartnersController } from './admin-realisation-partners.controller.js';
import { AdminRealisationsController } from './admin-realisations.controller.js';

@Module({
  imports: [RevalidationModule, MediaModule],
  controllers: [
    RealisationsController,
    AdminRealisationsController,
    AdminRealisationPartnersController,
  ],
  providers: [RealisationsService],
  exports: [RealisationsService],
})
export class RealisationsModule {}
