import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthService, type IssuedTokens } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { AuthTokensDto } from './dto/auth-tokens.dto.js';

function requestContext(req: Request) {
  return {
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion par e-mail/mot de passe' })
  // blueprint/10_Security.md §3 : les endpoints d'authentification sont limités en fréquence.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthTokensDto> {
    return this.authService.login(dto.email, dto.password, requestContext(req));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotation du jeton de rafraîchissement' })
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
  ): Promise<IssuedTokens> {
    return this.authService.refresh(dto.refreshToken, requestContext(req));
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Révocation de la session courante' })
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }
}
