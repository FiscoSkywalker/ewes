import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConfidentialityLevel, DocumentLifecycleStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Champs du formulaire multipart de téléversement (le fichier est le champ `file`). */
export class UploadPrivateDocumentDto {
  @ApiProperty({ description: 'Dossier de destination (droit d’écriture requis).' })
  @IsUUID()
  folderId!: string;

  @ApiPropertyOptional({ description: 'Par défaut : nom du fichier sans extension.' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    enum: ConfidentialityLevel,
    description:
      'Surcharge de la confidentialité du dossier. Hors Administrateur : au moins aussi stricte que le dossier.',
  })
  @IsOptional()
  @IsEnum(ConfidentialityLevel)
  confidentiality?: ConfidentialityLevel;
}

/**
 * `null` explicite = effacer (description) ou revenir à la confidentialité du
 * dossier (réservé à l'Administrateur si cela abaisse la confidentialité).
 */
export class UpdatePrivateDocumentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({ enum: ConfidentialityLevel, nullable: true })
  @IsOptional()
  @IsEnum(ConfidentialityLevel)
  confidentiality?: ConfidentialityLevel | null;

  @ApiPropertyOptional({
    description: 'Déplacer vers un autre dossier (droit d’écriture sur les deux).',
  })
  @IsOptional()
  @IsUUID()
  folderId?: string;
}

export class ListPrivateDocumentsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 50, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 50;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  folderId?: string;

  @ApiPropertyOptional({ enum: DocumentLifecycleStatus })
  @IsOptional()
  @IsEnum(DocumentLifecycleStatus)
  status?: DocumentLifecycleStatus;
}

export class SearchPrivateDocumentsDto {
  @ApiProperty({ description: 'Termes recherchés (nom, description, catégorie, projet, département).' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  q!: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
