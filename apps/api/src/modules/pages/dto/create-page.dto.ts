import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

import { SLUG_PATTERN } from '../../../common/utils/slug.js';

/**
 * Le statut n'est volontairement pas accepté ici : la publication est une
 * action explicite (blueprint/09_Business_Rules.md, 08_API_Specification.md §4).
 */
export class CreatePageDto {
  @ApiProperty({ example: 'a-propos' })
  @IsString()
  @MaxLength(100)
  @Matches(SLUG_PATTERN, {
    message: 'Le slug doit être en minuscules, chiffres et tirets.',
  })
  slug!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  titleFr!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titleEn?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  contentFr!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contentEn?: string;

  @ApiPropertyOptional({
    description:
      'Description affichée par les moteurs de recherche (≈ 160 caractères) ; absente, le site reprend l’introduction.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  metaDescriptionFr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  metaDescriptionEn?: string;
}
