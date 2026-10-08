import { Module } from '@nestjs/common';
import { RetentionService } from './retention.service.js';

/** Durées de conservation (blueprint/07 §6) : archivage de l'audit, purge des messages de contact. */
@Module({
  providers: [RetentionService],
  exports: [RetentionService],
})
export class RetentionModule {}
