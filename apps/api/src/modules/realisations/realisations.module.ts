import { Module } from '@nestjs/common';
import { RevalidationModule } from '../../common/revalidation/revalidation.module.js';
import { RealisationsService } from './realisations.service.js';
import { RealisationsController } from './realisations.controller.js';
import { AdminRealisationsController } from './admin-realisations.controller.js';

@Module({
  imports: [RevalidationModule],
  controllers: [RealisationsController, AdminRealisationsController],
  providers: [RealisationsService],
  exports: [RealisationsService],
})
export class RealisationsModule {}
