import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
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

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  descriptionFr!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionEn?: string;
}
