import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { SLUG_PATTERN } from '../../../common/utils/slug.js';

/** Le statut n'est pas accepté ici : la publication est une action explicite. */
export class CreateServiceDto {
  @ApiProperty({ example: 'eau' })
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
  nameFr!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameEn?: string;

  @ApiPropertyOptional({ description: 'Accroche courte sous le nom du service.' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  taglineFr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  taglineEn?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  descriptionFr!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Position dans la liste (croissant).' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
