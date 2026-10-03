import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

/** Longueur du jeton : 32 octets aléatoires en base64url. */
const TOKEN_FORMAT = /^[A-Za-z0-9_-]{43}$/;

export class InvitationTokenDto {
  @ApiProperty({
    description: 'Jeton reçu dans le lien de l’e-mail d’invitation.',
  })
  @IsString()
  @Matches(TOKEN_FORMAT, { message: 'Jeton d’invitation invalide.' })
  token!: string;
}

/** Règle de mot de passe : la longueur prime (NIST 800-63B), pas de règle de composition. */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;
