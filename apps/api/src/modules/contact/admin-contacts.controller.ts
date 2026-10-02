import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { ContactMessageStatus, Role } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { ContactService } from './contact.service.js';

class ListContactsDto {
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

  @ApiPropertyOptional({ enum: ContactMessageStatus })
  @IsOptional()
  @IsEnum(ContactMessageStatus)
  status?: ContactMessageStatus;
}

class SetContactStatusDto {
  @ApiProperty({ enum: ContactMessageStatus })
  @IsEnum(ContactMessageStatus)
  status!: ContactMessageStatus;
}

/** Messages reçus : consultables, seul le statut de suivi est modifiable (blueprint/09 §6). */
@ApiTags('admin/contacts')
@ApiBearerAuth()
@Controller('admin/contacts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMINISTRATEUR, Role.GESTIONNAIRE)
export class AdminContactsController {
  constructor(private readonly contact: ContactService) {}

  @Get()
  @ApiOperation({ summary: 'Messages de contact reçus (plus récents d’abord)' })
  list(@Query() query: ListContactsDto) {
    return this.contact.list(query);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.contact.get(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Marquer un message nouveau / traité' })
  setStatus(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetContactStatusDto,
  ) {
    return this.contact.setStatus(actor, id, dto.status);
  }
}
