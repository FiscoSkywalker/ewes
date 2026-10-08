import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContentStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { REALISATION_TYPES } from '../realisation-types.js';

/** Pagination et filtres communs (08_API_Specification.md §1). */
export class ListRealisationsDto {
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

  @ApiPropertyOptional({ enum: REALISATION_TYPES })
  @IsOptional()
  @IsIn(REALISATION_TYPES)
  projectType?: (typeof REALISATION_TYPES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;
}

export const REALISATION_SORT_FIELDS = [
  'titleFr',
  'year',
  'projectType',
  'updatedAt',
] as const;
export type RealisationSortField = (typeof REALISATION_SORT_FIELDS)[number];

/** Statut, recherche et tri, réservés à l'administration. */
export class ListAdminRealisationsDto extends ListRealisationsDto {
  @ApiPropertyOptional({ enum: ContentStatus })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @ApiPropertyOptional({
    description:
      'Recherche (sans casse) dans le titre, le client, le lieu et le slug.',
    maxLength: 100,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({
    enum: REALISATION_SORT_FIELDS,
    description: 'Sans tri explicite : année la plus récente d’abord.',
  })
  @IsOptional()
  @IsIn(REALISATION_SORT_FIELDS)
  sort?: RealisationSortField;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';
}
