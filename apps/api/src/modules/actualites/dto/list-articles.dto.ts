import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArticleType, ContentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
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

/** Filtre de statut, réservé à l'administration. */
export class ListAdminArticlesDto extends ListArticlesDto {
  @ApiPropertyOptional({ enum: ContentStatus })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;
}
