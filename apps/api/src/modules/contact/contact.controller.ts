import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ContactService, type SubmitResult } from './contact.service.js';
import { SubmitContactDto } from './dto/submit-contact.dto.js';

const IDEMPOTENCY_KEY_PATTERN = /^[0-9a-f-]{36}$/i;

/** Formulaire public (sans authentification, blueprint/08 §4) : fréquence limitée par IP. */
@ApiTags('contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Envoyer un message de contact' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description:
      'UUID propre à la soumission : un renvoi (double clic, nouvelle tentative) ne crée ni doublon ni notification en double.',
  })
  // blueprint/10_Security.md §3 : 5 messages par IP et par tranche de 10 minutes.
  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  async submit(
    @Body() dto: SubmitContactDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SubmitResult> {
    if (
      idempotencyKey !== undefined &&
      !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)
    ) {
      throw new BadRequestException({
        code: 'IDEMPOTENCY_KEY_INVALID',
        message: 'En-tête Idempotency-Key invalide (UUID attendu).',
        details: ['Idempotency-Key'],
      });
    }
    const result = await this.contact.submit(dto, idempotencyKey);
    // Un doublon reconnu est un succès déjà acquis : 200 plutôt que 201.
    if (result.duplicate) res.status(HttpStatus.OK);
    return result;
  }
}
