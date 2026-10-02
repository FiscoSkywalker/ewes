import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class PublishArticleDto {
  @ApiPropertyOptional({
    description:
      'Date de publication ISO 8601 ; une date future programme la parution. Par défaut : maintenant.',
  })
  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}
