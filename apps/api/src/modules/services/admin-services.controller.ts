import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { ReorderDto } from './dto/reorder.dto.js';
import { ServicesService } from './services.service.js';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { UpdateServiceDto } from './dto/update-service.dto.js';
import {
  CreateServiceOfferingDto,
  UpdateServiceOfferingDto,
} from './dto/service-offering.dto.js';

@ApiTags('admin/services')
@ApiBearerAuth()
@Controller('admin/services')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMINISTRATEUR, Role.GESTIONNAIRE)
export class AdminServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister tous les services (tous statuts)' })
  list() {
    return this.servicesService.list();
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un service (toujours en brouillon)' })
  create(@Body() dto: CreateServiceDto) {
    return this.servicesService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.servicesService.update(id, dto);
  }

  @Post(':id/offerings')
  @ApiOperation({ summary: 'Ajouter une prestation à un service' })
  addOffering(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateServiceOfferingDto,
  ) {
    return this.servicesService.addOffering(id, dto);
  }

  @Put(':id/offerings/order')
  @ApiOperation({
    summary: 'Ordre des prestations d’un service (liste complète)',
  })
  reorderOfferings(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderDto,
  ) {
    return this.servicesService.reorderOfferings(id, dto.ids);
  }

  @Patch(':id/offerings/:offeringId')
  updateOffering(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('offeringId', ParseUUIDPipe) offeringId: string,
    @Body() dto: UpdateServiceOfferingDto,
  ) {
    return this.servicesService.updateOffering(id, offeringId, dto);
  }

  @Delete(':id/offerings/:offeringId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeOffering(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('offeringId', ParseUUIDPipe) offeringId: string,
  ) {
    await this.servicesService.removeOffering(actor, id, offeringId);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publier explicitement un service' })
  publish(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.servicesService.publish(actor, id);
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dépublier un service (retour en brouillon)' })
  unpublish(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.servicesService.unpublish(actor, id);
  }
}
