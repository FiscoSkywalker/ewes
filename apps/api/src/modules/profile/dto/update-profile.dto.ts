import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Ce que la personne peut changer d'elle-même : son nom. L'adresse e-mail est
 * son identifiant de connexion et son rôle un droit : ni l'une ni l'autre ne
 * passent par ici (l'écriture est refusée par le pipe de validation).
 */
export class UpdateProfileDto {
  @ApiProperty({ example: 'Grâce Mutombo' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Le nom est obligatoire.' })
  @MaxLength(120, { message: '120 caractères au plus.' })
  fullName!: string;
}
