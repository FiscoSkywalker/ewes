import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Une chaîne vide efface le champ facultatif (la saisie vide d'un formulaire n'est pas une valeur). */
const blankToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;

const HOUR = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

/** Tous les champs sont facultatifs : un champ absent reste inchangé. */
export class UpdateGeneralSettingsDto {
  @ApiPropertyOptional({
    example: '+243 81 81 53 110',
    description:
      'Téléphone tel qu’affiché (7 à 15 chiffres, « + » initial permis).',
  })
  @IsOptional()
  @Transform(trim)
  @Matches(/^\+?(?:\d[ ().-]?){6,14}\d$/, {
    message: 'Saisissez un numéro valide, par exemple +243 81 81 53 110.',
  })
  phone?: string;

  @ApiPropertyOptional({ example: 'contact@ewes.cd' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Saisissez une adresse e-mail valide.' })
  @MaxLength(254)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'L’adresse est obligatoire.' })
  @MaxLength(300)
  addressFr?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(300)
  addressEn?: string | null;

  @ApiPropertyOptional({
    type: [Number],
    example: [1, 2, 3, 4, 5],
    description: 'Jours d’ouverture, 0 = dimanche … 6 = samedi.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Choisissez au moins un jour d’ouverture.' })
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  officeDays?: number[];

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @Matches(HOUR, { message: 'Saisissez une heure au format HH:MM.' })
  opensAt?: string;

  @ApiPropertyOptional({ example: '17:00' })
  @IsOptional()
  @Matches(HOUR, { message: 'Saisissez une heure au format HH:MM.' })
  closesAt?: string;

  @ApiPropertyOptional({
    nullable: true,
    example: 'https://www.linkedin.com/company/ewes',
  })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(200)
  linkedinUrl?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(200)
  facebookUrl?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(200)
  xUrl?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(200)
  youtubeUrl?: string | null;
}
