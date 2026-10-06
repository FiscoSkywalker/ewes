import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export const MAX_ALT_LENGTH = 300;

export class UpdateMediaDto {
  @ApiPropertyOptional({
    nullable: true,
    description:
      'Texte alternatif par défaut (FR). Absent : inchangé ; vide ou null : effacé.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_ALT_LENGTH)
  altFr?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Texte alternatif par défaut (EN). Absent : inchangé ; vide ou null : effacé.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_ALT_LENGTH)
  altEn?: string | null;
}
