import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KeyFigureSource } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Valeur maximale d'un chiffre clé (un compteur de présentation, pas un entrepôt de données). */
export const MAX_KEY_FIGURE_VALUE = 1_000_000;

export class CreateKeyFigureDto {
  @ApiPropertyOptional({
    enum: KeyFigureSource,
    default: KeyFigureSource.FIXED,
    description:
      'D’où vient la valeur : `FIXED` (nombre saisi), `YEARS_SINCE` (années écoulées depuis `sinceYear`), `MISSIONS` (réalisations publiées) ou `TRAININGS` (réalisations publiées de type Formation), ces deux dernières comptées en direct.',
  })
  @IsOptional()
  @IsEnum(KeyFigureSource)
  source?: KeyFigureSource;

  @ApiProperty({
    description:
      'Valeur saisie, lue seulement pour la source `FIXED` (0 pour les autres).',
    example: 10,
  })
  @IsInt()
  @Min(0)
  @Max(MAX_KEY_FIGURE_VALUE)
  value!: number;

  @ApiPropertyOptional({
    description:
      'Année de départ de la source `YEARS_SINCE` (obligatoire pour elle) ; ignorée pour les autres.',
    example: 2008,
  })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  sinceYear?: number;

  @ApiPropertyOptional({
    description: 'Texte après la valeur, FR (ex. « pays », « ans », « + »).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  suffixFr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  suffixEn?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  labelFr!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  labelEn?: string;

  @ApiPropertyOptional({ description: 'Précision sous le libellé, FR.' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  subtextFr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  subtextEn?: string;

  @ApiPropertyOptional({
    description: 'Masqué (`false`), le chiffre est conservé mais pas affiché.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}
