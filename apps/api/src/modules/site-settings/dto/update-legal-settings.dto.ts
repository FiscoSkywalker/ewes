import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

/** Une chaîne vide efface la mention (la saisie vide d'un formulaire n'est pas une valeur). */
const blankToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;

/**
 * Mentions légales et informations de protection des données (Code du
 * numérique, art. 52 et 186). Tous les champs sont facultatifs : un champ
 * absent reste inchangé, un champ vide efface la mention, que le site
 * n'affiche alors plus.
 */
export class UpdateLegalSettingsDto {
  @ApiPropertyOptional({
    nullable: true,
    example: 'Prénom Nom',
    description:
      'Représentant légal, cité comme responsable de la publication.',
  })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(120)
  legalRepresentative?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 'CD/LSH/RCCM/XX-X-00000',
    description: 'Numéro du Registre du Commerce et du Crédit Mobilier.',
  })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(80)
  legalRccm?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Numéro d’identification nationale.',
  })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(80)
  legalIdNat?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Numéro d’impôt (NIF).',
  })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(80)
  legalNif?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: '10 000 USD',
    description: 'Capital social, tel qu’il doit s’afficher.',
  })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(80)
  legalCapital?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Nom de l’hébergeur du site.',
  })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(160)
  hostingName?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Adresse et pays de l’hébergeur.',
  })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(300)
  hostingAddress?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Adresse où exercer ses droits sur ses données ; vide, l’e-mail public s’applique.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() || null : value,
  )
  @IsEmail({}, { message: 'Saisissez une adresse e-mail valide.' })
  @MaxLength(254)
  privacyEmail?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Référence du récépissé de déclaration à l’Autorité de protection des données.',
  })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(120)
  apdReceipt?: string | null;
}
