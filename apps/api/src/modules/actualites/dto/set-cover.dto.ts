import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class SetCoverDto {
  @ApiProperty({ description: 'Identifiant d’un média téléversé (POST /admin/media).' })
  @IsUUID()
  mediaId!: string;

  @ApiPropertyOptional({ description: 'Texte alternatif (accessibilité), FR.' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  altFr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  altEn?: string;
}
