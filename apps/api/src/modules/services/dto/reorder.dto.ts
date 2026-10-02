import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

/** Ordre d'affichage complet : tous les éléments, une fois chacun, du premier au dernier. */
export class ReorderDto {
  @ApiProperty({
    type: [String],
    description: 'Identifiants dans le nouvel ordre d’affichage.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  ids!: string[];
}
