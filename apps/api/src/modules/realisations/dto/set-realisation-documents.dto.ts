import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';
import { MAX_REALISATION_DOCUMENTS } from '../realisation-types.js';

export class SetRealisationDocumentsDto {
  @ApiProperty({
    type: [String],
    description: `Identifiants de documents publics (GET /admin/documents-publics), dans l'ordre d'affichage (${MAX_REALISATION_DOCUMENTS} au plus). Un document en brouillon ou archivé peut être associé : le site ne le montre qu'une fois publié. Tableau vide : aucun document.`,
  })
  @IsArray()
  @ArrayMaxSize(MAX_REALISATION_DOCUMENTS)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  documentIds!: string[];
}
