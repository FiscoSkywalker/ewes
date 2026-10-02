import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const MEDIA_SORT_FIELDS = [
  'createdAt',
  'originalName',
  'sizeBytes',
] as const;
export type MediaSortField = (typeof MEDIA_SORT_FIELDS)[number];

export const MEDIA_USAGE_FILTERS = ['used', 'unused'] as const;
export type MediaUsageFilter = (typeof MEDIA_USAGE_FILTERS)[number];

export class ListMediaDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 30, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 30;

  @ApiPropertyOptional({
    description: 'Recherche (sans casse) dans le nom d’origine du fichier.',
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
    enum: MEDIA_USAGE_FILTERS,
    description:
      'Seulement les images qui illustrent un contenu, ou celles qui n’en illustrent aucun.',
  })
  @IsOptional()
  @IsIn(MEDIA_USAGE_FILTERS)
  usage?: MediaUsageFilter;

  @ApiPropertyOptional({
    enum: MEDIA_SORT_FIELDS,
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(MEDIA_SORT_FIELDS)
  sort: MediaSortField = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';
}
