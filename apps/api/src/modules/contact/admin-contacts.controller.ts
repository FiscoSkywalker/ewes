import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { ContactMessageStatus, Role } from '@prisma/client';
import { IsEnum } from 'class-validator';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { ContactService } from './contact.service.js';
import { ExportContactsDto } from './dto/export-contacts.dto.js';
import { ListContactsDto } from './dto/list-contacts.dto.js';

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
  @ApiOperation({
    summary:
      'Messages de contact reçus (recherche `q`, tri `sort`/`order` ; plus récents d’abord par défaut)',
  })
  list(@Query() query: ListContactsDto) {
    return this.contact.list(query);
  }

  /** Déclarée avant `:id`, sinon « export » serait lu comme un identifiant. */
  @Get('export')
  @ApiOperation({
    summary:
      'Export CSV des messages (mêmes filtres `status`, `q` et tri que la liste ; audité ; 10 000 messages au plus)',
  })
  async export(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: ExportContactsDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { filename, csv } = await this.contact.exportCsv(actor, query);
    // Données personnelles : ni cache navigateur, ni cache intermédiaire.
    res.set({
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(Buffer.from(csv, 'utf8'), {
      type: 'text/csv; charset=utf-8',
      disposition: `attachment; filename="${filename}"`,
    });
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
