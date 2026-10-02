import { PartialType } from '@nestjs/swagger';
import { CreatePublicDocumentDto } from './create-public-document.dto.js';

/** Le slug d'un document déjà publié est refusé côté service (liens partagés). */
export class UpdatePublicDocumentDto extends PartialType(
  CreatePublicDocumentDto,
) {}
