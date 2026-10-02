import { PartialType } from '@nestjs/swagger';
import { CreateArticleDto } from './create-article.dto.js';

/** Le slug d'un article déjà publié est refusé côté service (liens partagés). */
export class UpdateArticleDto extends PartialType(CreateArticleDto) {}
