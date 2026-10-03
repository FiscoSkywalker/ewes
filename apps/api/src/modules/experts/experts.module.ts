import { Module } from '@nestjs/common';
import { RevalidationModule } from '../../common/revalidation/revalidation.module.js';
import { MediaModule } from '../media/media.module.js';
import { ExpertsService } from './experts.service.js';
import { ExpertsController } from './experts.controller.js';
import { AdminExpertsController } from './admin-experts.controller.js';

@Module({
  imports: [RevalidationModule, MediaModule],
  controllers: [ExpertsController, AdminExpertsController],
  providers: [ExpertsService],
})
export class ExpertsModule {}
