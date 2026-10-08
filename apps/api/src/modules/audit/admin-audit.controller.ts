import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AuditService } from './audit.service.js';
import {
  FacetsAuditLogsDto,
  ListAuditLogsDto,
} from './dto/list-audit-logs.dto.js';

/** Consultation seule : l'audit n'est ni modifiable ni supprimable via l'API. */
@ApiTags('admin/audit-logs')
@ApiBearerAuth()
@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMINISTRATEUR)
export class AdminAuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('facets')
  @ApiOperation({
    summary:
      'Actions, types d’éléments et auteurs présents dans le journal (filtres)',
  })
  facets(@Query() query: FacetsAuditLogsDto) {
    return this.auditService.facets(query.archived ?? false);
  }

  @Get()
  @ApiOperation({ summary: 'Journal d’audit (Administrateur uniquement)' })
  list(@Query() query: ListAuditLogsDto) {
    return this.auditService.list(query);
  }
}
