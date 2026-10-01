import { Module } from '@nestjs/common';
import { PagesService } from './pages.service.js';
import { PagesController } from './pages.controller.js';
import { AdminPagesController } from './admin-pages.controller.js';
import { RevalidationModule } from '../../common/revalidation/revalidation.module.js';

@Module({
  imports: [RevalidationModule],
  controllers: [PagesController, AdminPagesController],
  providers: [PagesService],
  exports: [PagesService],
})
export class PagesModule {}
