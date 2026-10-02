import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsUUID,
} from 'class-validator';

export const MAX_BULK_DELETE = 50;

export class DeleteManyMediaDto {
  @ApiProperty({
    type: [String],
    description: `Identifiants des médias à supprimer (${MAX_BULK_DELETE} au plus).`,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_BULK_DELETE)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  ids!: string[];
}
