import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../../users/dto/invitation-token.dto.js';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Mot de passe actuel, redemandé à chaque changement.',
  })
  @IsString()
  @IsNotEmpty({ message: 'Saisissez votre mot de passe actuel.' })
  @MaxLength(PASSWORD_MAX_LENGTH)
  currentPassword!: string;

  @ApiProperty({
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
  })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`,
  })
  @MaxLength(PASSWORD_MAX_LENGTH, {
    message: `Le mot de passe ne peut pas dépasser ${PASSWORD_MAX_LENGTH} caractères.`,
  })
  newPassword!: string;
}
