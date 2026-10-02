import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditContextInterceptor } from './audit-context.interceptor.js';
import { AuditService } from './audit.service.js';
import { AdminAuditController } from './admin-audit.controller.js';

/** Global : tout module qui touche à un droit ou à un contenu sensible peut auditer. */
@Global()
@Module({
  controllers: [AdminAuditController],
  providers: [
    AuditService,
    { provide: APP_INTERCEPTOR, useClass: AuditContextInterceptor },
  ],
  exports: [AuditService],
})
export class AuditModule {}
