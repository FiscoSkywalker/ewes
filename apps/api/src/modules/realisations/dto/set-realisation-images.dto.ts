import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { MAX_REALISATION_IMAGES } from '../realisation-types.js';

export class RealisationImageDto {
  @ApiProperty({
    description: 'Adresse d’une image de la médiathèque (`/uploads/<nom>`).',
    example: '/uploads/3f2b8c1e-5d4a-4e7b-9c10-2a6f8d1e0b44.jpg',
  })
  @Matches(/^\/uploads\/[0-9a-f-]{36}\.(jpg|png|webp)$/, {
    message: 'L’adresse doit désigner une image de la médiathèque.',
  })
  url!: string;

  @ApiPropertyOptional({ description: 'Texte alternatif (accessibilité), FR.' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  altFr?: string;

  @ApiPropertyOptional({ description: 'Texte alternatif (accessibilité), EN.' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  altEn?: string;
}

export class SetRealisationImagesDto {
  @ApiProperty({
    type: [RealisationImageDto],
    description: `Galerie complète, dans l'ordre d'affichage (${MAX_REALISATION_IMAGES} au plus) ; la première est l'image principale. Tableau vide : aucune image.`,
  })
  @IsArray()
  @ArrayMaxSize(MAX_REALISATION_IMAGES)
  @ValidateNested({ each: true })
  @Type(() => RealisationImageDto)
  images!: RealisationImageDto[];
}
