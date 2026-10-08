import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';

interface ErrorBody {
  code: string;
  message: string;
  details: unknown[];
}

/**
 * Traduit toute HttpException en contrat d'erreur unique
 * (blueprint/08_API_Specification.md §2) : { code, message, details, requestId }.
 * `code` est dérivé du corps de l'exception s'il en fournit un (ex. lancé
 * manuellement avec `{ code, message, details }`), sinon du nom de la classe
 * d'exception NestJS (ex. `UnauthorizedException` -> `UNAUTHORIZED`).
 */
@Catch(HttpException)
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const payload = exception.getResponse();

    const body = this.toErrorBody(payload, status);

    response.status(status).json({ ...body, requestId: randomUUID() });
  }

  private toErrorBody(payload: unknown, status: number): ErrorBody {
    if (typeof payload === 'object' && payload !== null) {
      const record = payload as Record<string, unknown>;
      if (typeof record.code === 'string') {
        return {
          code: record.code,
          message:
            typeof record.message === 'string'
              ? record.message
              : 'Une erreur est survenue.',
          details: Array.isArray(record.details) ? record.details : [],
        };
      }

      // Réponse par défaut de class-validator / NestJS ({ message, error, statusCode })
      const message = record.message;
      return {
        code: this.statusToCode(status),
        message: Array.isArray(message)
          ? 'Validation échouée.'
          : typeof message === 'string'
            ? message
            : 'Une erreur est survenue.',
        details: Array.isArray(message) ? message : [],
      };
    }

    return {
      code: this.statusToCode(status),
      message:
        typeof payload === 'string' ? payload : 'Une erreur est survenue.',
      details: [],
    };
  }

  private statusToCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'TOO_MANY_REQUESTS';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.PAYLOAD_TOO_LARGE:
        return 'PAYLOAD_TOO_LARGE';
      case HttpStatus.UNSUPPORTED_MEDIA_TYPE:
        return 'UNSUPPORTED_MEDIA_TYPE';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'UNPROCESSABLE_ENTITY';
      default:
        return 'INTERNAL_ERROR';
    }
  }
}
