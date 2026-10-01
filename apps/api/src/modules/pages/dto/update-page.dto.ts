import { PartialType } from '@nestjs/swagger';
import { CreatePageDto } from './create-page.dto.js';

/** Le slug d'une page déjà publiée est refusé côté service (liens partagés). */
export class UpdatePageDto extends PartialType(CreatePageDto) {}
