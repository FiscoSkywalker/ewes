import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { auditContextStorage } from './audit-context.js';

/**
 * Pose l'adresse IP et le navigateur de la requête dans un contexte
 * asynchrone : les services n'ont rien à propager, `AuditService.record`
 * les retrouve. Sans effet hors requête HTTP.
 */
@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const request = context.switchToHttp().getRequest<Request>();
    const store = {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    };
    return new Observable((subscriber) =>
      auditContextStorage.run(store, () => {
        next.handle().subscribe(subscriber);
      }),
    );
  }
}
