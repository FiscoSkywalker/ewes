import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import {
  InvitationTokenDto,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from './invitation-token.dto.js';

export class AcceptInvitationDto extends InvitationTokenDto {
  @ApiProperty({
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
    description: 'Mot de passe choisi par la personne invitée.',
  })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`,
  })
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;

  @ApiPropertyOptional({
    description:
      'Jeton de rafraîchissement que le navigateur détient encore : sa session est fermée une fois la nouvelle ouverte.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  replacesRefreshToken?: string;
}
