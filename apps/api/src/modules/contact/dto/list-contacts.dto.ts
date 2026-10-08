import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContactMessageStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const CONTACT_SORT_FIELDS = [
  'createdAt',
  'name',
  'organization',
] as const;
export type ContactSortField = (typeof CONTACT_SORT_FIELDS)[number];

export class ListContactsDto {
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

  @ApiPropertyOptional({ enum: ContactMessageStatus })
  @IsOptional()
  @IsEnum(ContactMessageStatus)
  status?: ContactMessageStatus;

  @ApiPropertyOptional({
    description:
      'Recherche (sans casse) dans le nom, l’organisation, l’e-mail, le téléphone et le message.',
    maxLength: 100,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: CONTACT_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(CONTACT_SORT_FIELDS)
  sort: ContactSortField = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';
}
