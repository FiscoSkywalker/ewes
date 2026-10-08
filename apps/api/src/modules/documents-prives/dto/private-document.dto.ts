import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConfidentialityLevel, DocumentLifecycleStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Tris proposés par la liste (colonne Prisma). */
export const DOCUMENT_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'name',
  'fileSizeBytes',
] as const;
export type DocumentSortField = (typeof DOCUMENT_SORT_FIELDS)[number];

/** Familles de fichiers proposées en filtre de recherche. */
export const DOCUMENT_TYPE_FAMILIES = [
  'pdf',
  'image',
  'word',
  'excel',
  'powerpoint',
] as const;
export type DocumentTypeFamily = (typeof DOCUMENT_TYPE_FAMILIES)[number];

/** Champs du formulaire multipart de téléversement (le fichier est le champ `file`). */
export class UploadPrivateDocumentDto {
  @ApiProperty({
    description: 'Dossier de destination (droit d’écriture requis).',
  })
  @IsUUID()
  folderId!: string;

  @ApiPropertyOptional({
    description: 'Par défaut : nom du fichier sans extension.',
  })
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
    description:
      'Déplacer vers un autre dossier (droit d’écriture sur les deux).',
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

  @ApiPropertyOptional({
    enum: ['isolated'],
    description:
      '`isolated` : uniquement les documents partagés un par un, dont le dossier ne vous est pas ouvert.',
  })
  @IsOptional()
  @IsIn(['isolated'])
  scope?: 'isolated';

  @ApiPropertyOptional({ enum: DOCUMENT_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(DOCUMENT_SORT_FIELDS)
  sort: DocumentSortField = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';
}

export class SearchPrivateDocumentsDto {
  @ApiProperty({
    description:
      'Termes recherchés (nom, description, catégorie, projet, département).',
  })
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

  @ApiPropertyOptional({ enum: DocumentLifecycleStatus })
  @IsOptional()
  @IsEnum(DocumentLifecycleStatus)
  status?: DocumentLifecycleStatus;

  @ApiPropertyOptional({ enum: DOCUMENT_TYPE_FAMILIES })
  @IsOptional()
  @IsIn(DOCUMENT_TYPE_FAMILIES)
  type?: DocumentTypeFamily;

  @ApiPropertyOptional({ description: 'Catégorie du dossier (valeur exacte).' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ description: 'Année du dossier.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  year?: number;
}
