import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { ConfidentialityLevel } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateFolderDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'Administratif' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  subCategory?: string;

  @ApiPropertyOptional({ description: 'Référence de projet (facultatif).' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  projectRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional({
    enum: ConfidentialityLevel,
    description:
      'Administrateur uniquement. Par défaut : celui du dossier parent, sinon RESTREINT.',
  })
  @IsOptional()
  @IsEnum(ConfidentialityLevel)
  confidentiality?: ConfidentialityLevel;

  @ApiPropertyOptional({
    description:
      'Dossier parent. Absent = dossier de premier niveau (Administrateur uniquement).',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}

/** Un dossier ne change pas de parent (pas de déplacement d'arborescence en V1). */
export class UpdateFolderDto extends PartialType(
  OmitType(CreateFolderDto, ['parentId'] as const),
) {}
