import { Module } from '@nestjs/common';
import { RevalidationModule } from '../../common/revalidation/revalidation.module.js';
import { DocumentStorageService } from './document-storage.service.js';
import { DocumentsPublicsService } from './documents-publics.service.js';
import { DocumentsPublicsController } from './documents-publics.controller.js';
import { AdminDocumentsPublicsController } from './admin-documents-publics.controller.js';

@Module({
  imports: [RevalidationModule],
  controllers: [DocumentsPublicsController, AdminDocumentsPublicsController],
  providers: [DocumentStorageService, DocumentsPublicsService],
  exports: [DocumentsPublicsService],
})
export class DocumentsPublicsModule {}
