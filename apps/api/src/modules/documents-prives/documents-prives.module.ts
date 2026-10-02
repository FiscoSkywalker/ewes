import { Module } from '@nestjs/common';
import { AccessGrantsController } from './access-grants.controller.js';
import { AccessGrantsService } from './access-grants.service.js';
import { PrivateAccessService } from './private-access.service.js';
import { PrivateDocumentsService } from './private-documents.service.js';
import { PrivateFilesController } from './private-files.controller.js';
import { PrivateFoldersController } from './private-folders.controller.js';
import { PrivateFoldersService } from './private-folders.service.js';
import { PrivateSearchController } from './private-search.controller.js';
import { PrivateStorageService } from './private-storage.service.js';

/** Espace documentaire privé (blueprint/11_Document_Management_System.md). L'audit est global. */
@Module({
  controllers: [
    PrivateFoldersController,
    PrivateFilesController,
    PrivateSearchController,
    AccessGrantsController,
  ],
  providers: [
    PrivateAccessService,
    PrivateStorageService,
    PrivateFoldersService,
    PrivateDocumentsService,
    AccessGrantsService,
  ],
})
export class DocumentsPrivesModule {}
