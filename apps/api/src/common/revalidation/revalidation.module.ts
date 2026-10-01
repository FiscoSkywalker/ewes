import { Module } from '@nestjs/common';
import { FrontendRevalidator } from './frontend-revalidator.service.js';

@Module({
  providers: [FrontendRevalidator],
  exports: [FrontendRevalidator],
})
export class RevalidationModule {}
