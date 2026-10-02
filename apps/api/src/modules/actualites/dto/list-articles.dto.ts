import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArticleType, ContentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

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

/** Filtre de statut, réservé à l'administration. */
export class ListAdminArticlesDto extends ListArticlesDto {
  @ApiPropertyOptional({ enum: ContentStatus })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;
}
