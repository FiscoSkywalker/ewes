import { OmitType } from '@nestjs/swagger';
import { ListContactsDto } from './list-contacts.dto.js';

/** Mêmes filtres et même tri que la liste ; l'export n'est jamais paginé. */
export class ExportContactsDto extends OmitType(ListContactsDto, [
  'page',
  'limit',
] as const) {}
