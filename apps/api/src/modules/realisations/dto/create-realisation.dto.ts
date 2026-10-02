import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SLUG_PATTERN } from '../../../common/utils/slug.js';
import { REALISATION_TYPES } from '../realisation-types.js';

/**
 * Le statut n'est jamais accepté ici : la publication est une action
 * explicite. `year`/`projectType` peuvent manquer en brouillon mais sont
 * exigés à la publication (12_Realisations_Portfolio_System.md §3-4).
 */
export class CreateRealisationDto {
  @ApiProperty({ example: 'metalkol-carbone-2024' })
  @IsString()
  @MaxLength(120)
  @Matches(SLUG_PATTERN, {
    message: 'Le slug doit être en minuscules, chiffres et tirets.',
  })
  slug!: string;

  @ApiProperty({ description: 'Intitulé de la mission.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  titleFr!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  titleEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  clientName?: string;

  @ApiPropertyOptional({
    description: 'Le client n’est exposé publiquement que si ce champ est vrai.',
  })
  @IsOptional()
  @IsBoolean()
  isClientPublic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({ description: 'Année de fin pour une mission pluriannuelle.' })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  yearEnd?: number;

  @ApiPropertyOptional({ enum: REALISATION_TYPES })
  @IsOptional()
  @IsIn(REALISATION_TYPES)
  projectType?: (typeof REALISATION_TYPES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionFr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  objectivesFr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  objectivesEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resultsFr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resultsEn?: string;

  @ApiPropertyOptional({ description: 'Service (domaine) rattaché, facultatif.' })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional({ description: 'Mise en avant sur l’Accueil (nombre limité).' })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
