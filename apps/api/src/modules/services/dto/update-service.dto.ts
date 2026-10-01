import { PartialType } from '@nestjs/swagger';
import { CreateServiceDto } from './create-service.dto.js';

/** Le slug d'un service déjà publié est refusé côté service (liens partagés). */
export class UpdateServiceDto extends PartialType(CreateServiceDto) {}
