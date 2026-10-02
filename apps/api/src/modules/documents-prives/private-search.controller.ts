import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { SearchPrivateDocumentsDto } from './dto/private-document.dto.js';
import { PrivateDocumentsService } from './private-documents.service.js';

@ApiTags('documents-prives/search')
@ApiBearerAuth()
@Controller('documents-prives/search')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PrivateSearchController {
  constructor(private readonly documents: PrivateDocumentsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Recherche plein texte, limitée aux documents auxquels vous avez droit',
  })
  search(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SearchPrivateDocumentsDto,
  ) {
    return this.documents.search(user, query);
  }
}
