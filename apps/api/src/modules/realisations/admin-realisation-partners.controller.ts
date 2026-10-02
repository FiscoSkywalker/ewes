import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import {
  ListPartnersDto,
  RemovePartnerDto,
  RenamePartnerDto,
} from './dto/partner-directory.dto.js';
import { RealisationsService } from './realisations.service.js';

/** Annuaire des partenaires et bailleurs cités dans les réalisations. */
@ApiTags('admin/realisation-partners')
@ApiBearerAuth()
@Controller('admin/realisation-partners')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMINISTRATEUR, Role.GESTIONNAIRE)
export class AdminRealisationPartnersController {
  constructor(private readonly realisationsService: RealisationsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Partenaires cités (une fois chacun, casse ignorée) avec les réalisations qui les citent',
  })
  list(@Query() query: ListPartnersDto) {
    return this.realisationsService.listPartners(query.q);
  }

  @Post('rename')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Renommer ou fusionner un partenaire dans toutes les réalisations',
  })
  rename(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: RenamePartnerDto,
  ) {
    return this.realisationsService.renamePartner(actor, dto.from, dto.to);
  }

  @Post('remove')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retirer un partenaire de toutes les réalisations' })
  remove(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: RemovePartnerDto,
  ) {
    return this.realisationsService.removePartner(actor, dto.name);
  }
}
