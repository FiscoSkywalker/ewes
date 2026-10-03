import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ListAuditLogsDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  actorId?: string;

  @ApiPropertyOptional({ example: 'DOCUMENT_DOWNLOADED' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z_]{1,60}$/)
  action?: string;

  @ApiPropertyOptional({ example: 'PrivateDocument' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{1,60}$/)
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional({
    description:
      'Recherche (insensible à la casse) dans le nom de l’auteur, le code de l’action et le type d’élément.',
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
    description: 'Depuis ce jour inclus (UTC), format AAAA-MM-JJ.',
    example: '2026-10-01',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  from?: string;

  @ApiPropertyOptional({
    description: 'Jusqu’à ce jour inclus (UTC), format AAAA-MM-JJ.',
    example: '2026-10-31',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  to?: string;
}
