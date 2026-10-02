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

  @ApiPropertyOptional({
    description: 'Accroche courte sous le nom du service.',
  })
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

  @ApiPropertyOptional({
    description:
      'Visuel du pôle : adresse d’une image de la médiathèque (`/uploads/<nom>`). `null` : retire le visuel.',
    example: '/uploads/3f2b8c1e-5d4a-4e7b-9c10-2a6f8d1e0b44.jpg',
  })
  @IsOptional()
  @Matches(/^\/uploads\/[0-9a-f-]{36}\.(jpg|png|webp)$/, {
    message: 'L’adresse doit désigner une image de la médiathèque.',
  })
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Texte alternatif du visuel, FR.' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  imageAltFr?: string;

  @ApiPropertyOptional({ description: 'Texte alternatif du visuel, EN.' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  imageAltEn?: string;

  @ApiPropertyOptional({
    description:
      'Position dans la liste (croissant) ; absente, le service est ajouté en dernier.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
