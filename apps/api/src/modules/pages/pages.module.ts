import { Module } from '@nestjs/common';
import { PagesService } from './pages.service.js';
import { PagesController } from './pages.controller.js';
import { AdminPagesController } from './admin-pages.controller.js';
import { FrontendRevalidator } from './frontend-revalidator.service.js';

@Module({
  controllers: [PagesController, AdminPagesController],
  providers: [PagesService, FrontendRevalidator],
  exports: [PagesService],
})
export class PagesModule {}
