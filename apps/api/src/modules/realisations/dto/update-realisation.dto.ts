import { PartialType } from '@nestjs/swagger';
import { CreateRealisationDto } from './create-realisation.dto.js';

/** Le slug d'une réalisation déjà publiée est refusé côté service (liens partagés). */
export class UpdateRealisationDto extends PartialType(CreateRealisationDto) {}
