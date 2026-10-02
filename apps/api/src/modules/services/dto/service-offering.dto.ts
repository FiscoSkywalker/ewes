import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
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

export class CreateServiceOfferingDto {
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
  descriptionFr!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({
    description:
      'Pictogramme choisi dans la liste du site (ex. `droplets`) ; absent ou inconnu du site, un pictogramme par défaut est affiché.',
    example: 'droplets',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Matches(SLUG_PATTERN, {
    message: 'Le pictogramme doit être en minuscules, chiffres et tirets.',
  })
  icon?: string;

  @ApiPropertyOptional({
    description:
      'Position dans le service (croissant) ; absente, la prestation est ajoutée en dernier.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateServiceOfferingDto extends PartialType(
  CreateServiceOfferingDto,
) {}
