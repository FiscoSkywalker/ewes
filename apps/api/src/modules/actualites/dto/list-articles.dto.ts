import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArticleType, ContentStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SLUG_PATTERN } from '../../../common/utils/slug.js';

/** Pagination et filtre de rubrique (08_API_Specification.md §1). */
export class ListArticlesDto {
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

  @ApiPropertyOptional({ enum: ArticleType })
  @IsOptional()
  @IsEnum(ArticleType)
  type?: ArticleType;
}

/** Liste publique : peut écarter un article déjà affiché à part (« à la une »). */
export class ListPublishedArticlesDto extends ListArticlesDto {
  @ApiPropertyOptional({
    description:
      'Slug d’un article à exclure de la liste et du total (ex. article à la une).',
  })
  @IsOptional()
  @MaxLength(120)
  @Matches(SLUG_PATTERN)
  exclude?: string;
}

export const ARTICLE_SORT_FIELDS = ['titleFr', 'type', 'publishedAt', 'updatedAt'] as const;
export type ArticleSortField = (typeof ARTICLE_SORT_FIELDS)[number];

/** Statut, recherche et tri, réservés à l'administration. */
export class ListAdminArticlesDto extends ListArticlesDto {
  @ApiPropertyOptional({ enum: ContentStatus })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @ApiPropertyOptional({
    description: 'Recherche (sans casse) dans les titres, le slug, les résumés et le contexte FR/EN.',
    maxLength: 100,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({
    enum: ARTICLE_SORT_FIELDS,
    description: 'Sans tri explicite : parutions les plus récentes d’abord.',
  })
  @IsOptional()
  @IsIn(ARTICLE_SORT_FIELDS)
  sort?: ArticleSortField;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';
}
