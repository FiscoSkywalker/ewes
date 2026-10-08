import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
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
