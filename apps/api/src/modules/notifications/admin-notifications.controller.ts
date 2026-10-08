import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { NotificationsService } from './notifications.service.js';

class ListNotificationsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 50, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 50;

  @ApiPropertyOptional({ enum: ['sent', 'failed', 'pending'] })
  @IsOptional()
  @IsIn(['sent', 'failed', 'pending'])
  status?: 'sent' | 'failed' | 'pending';

  @ApiPropertyOptional({ example: 'CONTACT_RECEIVED' })
  @IsOptional()
  @Matches(/^[A-Z_]{1,60}$/)
  type?: string;
}

/** Suivi des envois : un échec n'est jamais silencieux (blueprint/13 §5). */
@ApiTags('admin/notifications')
@ApiBearerAuth()
@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMINISTRATEUR)
export class AdminNotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Envois d’e-mails et leur état (Administrateur)' })
  list(@Query() query: ListNotificationsDto) {
    return this.notifications.list(query);
  }

  @Post(':id/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rejouer un envoi non abouti' })
  async retry(@Param('id', ParseUUIDPipe) id: string) {
    return this.notifications.view(
      await this.notifications.retryNotification(id),
    );
  }
}
