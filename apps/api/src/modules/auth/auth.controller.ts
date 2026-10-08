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
import { AcceptInvitationDto } from '../users/dto/accept-invitation.dto.js';
import { InvitationTokenDto } from '../users/dto/invitation-token.dto.js';

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
    return this.authService.login(
      dto.email,
      dto.password,
      requestContext(req),
      dto.replacesRefreshToken,
    );
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

  @Post('invitations/inspect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Aperçu d’une invitation (page d’activation, sans authentification)',
  })
  // Le jeton fait 256 bits : la limite sert surtout à décourager le bruit, pas à protéger le secret.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  inspectInvitation(@Body() dto: InvitationTokenDto) {
    return this.authService.inspectInvitation(dto.token);
  }

  @Post('invitations/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Activer un compte invité en choisissant son mot de passe',
  })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  acceptInvitation(
    @Body() dto: AcceptInvitationDto,
    @Req() req: Request,
  ): Promise<AuthTokensDto> {
    return this.authService.acceptInvitation(
      dto.token,
      dto.password,
      requestContext(req),
      dto.replacesRefreshToken,
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Révocation de la session courante' })
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }
}
