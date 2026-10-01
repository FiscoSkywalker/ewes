import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
}
