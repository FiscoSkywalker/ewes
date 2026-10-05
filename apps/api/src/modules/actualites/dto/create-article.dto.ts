import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArticleType, DatePrecision } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { SLUG_PATTERN } from '../../../common/utils/slug.js';

/**
 * Le statut n'est jamais accepté ici : la publication est une action
 * explicite. La date de publication se fixe à la publication, pas à l'édition.
 */
export class CreateArticleDto {
  @ApiProperty({ example: 'metalkol-carbone-2024' })
  @IsString()
  @MaxLength(120)
  @Matches(SLUG_PATTERN, {
    message: 'Le slug doit être en minuscules, chiffres et tirets.',
  })
  slug!: string;

  @ApiProperty({ enum: ArticleType })
  @IsEnum(ArticleType)
  type!: ArticleType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  titleFr!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  titleEn?: string;

  @ApiPropertyOptional({ description: 'Résumé affiché dans les listes.' })
  @IsOptional()
  @IsString()
  excerptFr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  excerptEn?: string;

  @ApiPropertyOptional({ description: 'Lieu, client ou contexte (ligne courte).' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  contextFr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  contextEn?: string;

  @ApiPropertyOptional({
    description:
      'Corps en HTML restreint (titres h2/h3, gras, italique, listes, citation, liens, images /uploads/*), nettoyé à l’enregistrement. Un texte brut (paragraphes séparés par une ligne vide) est converti en paragraphes.',
  })
  @IsOptional()
  @IsString()
  contentFr?: string;

  @ApiPropertyOptional({ description: 'Même format que `contentFr`.' })
  @IsOptional()
  @IsString()
  contentEn?: string;

  @ApiPropertyOptional({ enum: DatePrecision, default: DatePrecision.DAY })
  @IsOptional()
  @IsEnum(DatePrecision)
  datePrecision?: DatePrecision;
}
