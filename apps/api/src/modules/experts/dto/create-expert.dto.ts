import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
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

/** Nombre de spécialités affichées en pastilles sur la fiche. */
export const MAX_EXPERT_SPECIALTIES = 12;

/**
 * Le statut n'est volontairement pas accepté ici : un profil est une personne,
 * sa publication est une action explicite (blueprint/09_Business_Rules.md).
 */
export class CreateExpertDto {
  @ApiProperty({ example: 'Grâce Mutombo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName!: string;

  @ApiProperty({ description: 'Fonction, FR.', example: 'Hydrogéologue' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  roleFr!: string;

  @ApiPropertyOptional({ description: 'Fonction, EN.' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  roleEn?: string;

  @ApiPropertyOptional({ description: 'Présentation courte, FR.' })
  @IsOptional()
  @IsString()
  @MaxLength(1200)
  bioFr?: string;

  @ApiPropertyOptional({ description: 'Présentation courte, EN.' })
  @IsOptional()
  @IsString()
  @MaxLength(1200)
  bioEn?: string;

  @ApiPropertyOptional({
    type: [String],
    description: `Spécialités FR (${MAX_EXPERT_SPECIALTIES} au plus, 40 caractères chacune) ; nettoyées, doublons écartés.`,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_EXPERT_SPECIALTIES)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  specialtiesFr?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Spécialités EN.' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_EXPERT_SPECIALTIES)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  specialtiesEn?: string[];

  @ApiPropertyOptional({ description: 'Années d’expérience.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(70)
  yearsOfExperience?: number;

  @ApiPropertyOptional({
    description:
      'Pôle de rattachement (identifiant d’un service). `null` : aucun.',
  })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional({
    description:
      'Portrait : adresse d’une image de la médiathèque (`/uploads/<nom>`). `null` : retire la photo (un monogramme s’affiche).',
    example: '/uploads/3f2b8c1e-5d4a-4e7b-9c10-2a6f8d1e0b44.jpg',
  })
  @IsOptional()
  @Matches(/^\/uploads\/[0-9a-f-]{36}\.(jpg|png|webp)$/, {
    message: 'L’adresse doit désigner une image de la médiathèque.',
  })
  photoUrl?: string;
}
