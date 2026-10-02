import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Besoins proposés par le formulaire (valeurs identiques à celles du site). */
export const CONTACT_SECTORS = [
  'ENVIRONNEMENT',
  'EAU',
  'ANALYSES',
  'GESTION',
  'INGENIERIE',
  'FORMATION',
  'AUTRE',
] as const;

export const CONTACT_LOCALES = ['fr', 'en'] as const;

/** Longueur minimale du message, identique à celle du formulaire du site. */
export const CONTACT_MESSAGE_MIN = 20;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Formulaire public de contact (blueprint/09 §6, 15 §3). Aucun saut de ligne
 * dans les champs repris dans un en-tête d'e-mail (nom, adresse) : pas
 * d'injection d'en-têtes.
 */
export class SubmitContactDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(/^[^\r\n\t]+$/, { message: 'Le nom ne doit pas contenir de saut de ligne.' })
  name!: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Matches(/^[^\r\n\t]+$/, { message: 'L’organisation ne doit pas contenir de saut de ligne.' })
  organization!: string;

  @ApiProperty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @Matches(/^[0-9+().\-\s]{5,40}$/, { message: 'Numéro de téléphone invalide.' })
  phone?: string;

  @ApiProperty({ enum: CONTACT_SECTORS })
  @IsIn(CONTACT_SECTORS)
  sector!: (typeof CONTACT_SECTORS)[number];

  @ApiProperty({ minLength: CONTACT_MESSAGE_MIN, maxLength: 5000 })
  @Transform(trim)
  @IsString()
  @MinLength(CONTACT_MESSAGE_MIN)
  @MaxLength(5000)
  message!: string;

  @ApiPropertyOptional({ enum: CONTACT_LOCALES, default: 'fr' })
  @IsOptional()
  @IsIn(CONTACT_LOCALES)
  locale?: (typeof CONTACT_LOCALES)[number];

  /** Champ piège : invisible pour un humain. Rempli => robot, message écarté. */
  @ApiPropertyOptional({ description: 'Champ piège anti-robot : laisser vide.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;
}
