import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class CreateFolderGrantDto {
  @ApiProperty()
  @IsUUID()
  folderId!: string;

  @ApiProperty()
  @IsUUID()
  userId!: string;
}

export class CreateDocumentGrantDto {
  @ApiProperty()
  @IsUUID()
  documentId!: string;

  @ApiProperty()
  @IsUUID()
  userId!: string;
}

export class ListGrantsDto {
  @ApiPropertyOptional({
    description: 'Filtrer par dossier (droits de dossier).',
  })
  @IsOptional()
  @IsUUID()
  folderId?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par document (droits de document).',
  })
  @IsOptional()
  @IsUUID()
  documentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;
}
