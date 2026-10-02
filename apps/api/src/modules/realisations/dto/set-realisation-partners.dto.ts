import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsString, MaxLength } from 'class-validator';
import {
  MAX_PARTNER_NAME,
  MAX_REALISATION_PARTNERS,
} from '../realisation-types.js';

export class SetRealisationPartnersDto {
  @ApiProperty({
    type: [String],
    description: `Partenaires et bailleurs, dans l'ordre d'affichage (${MAX_REALISATION_PARTNERS} au plus). Les espaces en trop sont retirés ; une même organisation (sans tenir compte de la casse) n'est gardée qu'une fois. Tableau vide : aucun partenaire.`,
  })
  @IsArray()
  @ArrayMaxSize(MAX_REALISATION_PARTNERS)
  @IsString({ each: true })
  @MaxLength(MAX_PARTNER_NAME, { each: true })
  partners!: string[];
}
