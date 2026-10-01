import { Module } from '@nestjs/common';
import { RevalidationModule } from '../../common/revalidation/revalidation.module.js';
import { ServicesService } from './services.service.js';
import { ServicesController } from './services.controller.js';
import { AdminServicesController } from './admin-services.controller.js';

@Module({
  imports: [RevalidationModule],
  controllers: [ServicesController, AdminServicesController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}
