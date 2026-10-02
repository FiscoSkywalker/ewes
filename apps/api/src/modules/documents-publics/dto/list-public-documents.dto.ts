import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContentStatus, DocumentCategory } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** Pagination et filtres communs (08_API_Specification.md §1). */
export class ListPublicDocumentsDto {
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

  @ApiPropertyOptional({ enum: DocumentCategory })
  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;
}

export const DOCUMENT_SORT_FIELDS = ['titleFr', 'category', 'year', 'updatedAt'] as const;
export type DocumentSortField = (typeof DOCUMENT_SORT_FIELDS)[number];

/** Statut, recherche et tri, réservés à l'administration. */
export class ListAdminPublicDocumentsDto extends ListPublicDocumentsDto {
  @ApiPropertyOptional({ enum: ContentStatus })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @ApiPropertyOptional({
    description: 'Recherche (sans casse) dans les titres, le slug et les descriptions FR/EN.',
    maxLength: 100,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({
    enum: DOCUMENT_SORT_FIELDS,
    description: 'Sans tri explicite : publiés les plus récents d’abord.',
  })
  @IsOptional()
  @IsIn(DOCUMENT_SORT_FIELDS)
  sort?: DocumentSortField;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';
}
