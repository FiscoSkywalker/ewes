import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { MAX_PARTNER_NAME } from '../realisation-types.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

export class ListPartnersDto {
  @ApiPropertyOptional({
    description: 'Recherche dans le nom (sans casse ni accents).',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  q?: string;
}

export class RenamePartnerDto {
  @ApiProperty({
    description:
      'Nom actuel (n’importe quelle graphie : la casse est ignorée).',
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_PARTNER_NAME)
  from!: string;

  @ApiProperty({
    description:
      'Nouveau nom. S’il existe déjà, les deux sont fusionnés (une réalisation qui les citait tous deux ne le cite plus qu’une fois).',
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_PARTNER_NAME)
  to!: string;
}

export class RemovePartnerDto {
  @ApiProperty({ description: 'Nom à retirer de toutes les réalisations.' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_PARTNER_NAME)
  name!: string;
}
