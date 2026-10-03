import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExpertsService } from './experts.service.js';
import { toPublicView } from './expert-views.js';

@ApiTags('experts')
@Controller('experts')
export class ExpertsController {
  constructor(private readonly expertsService: ExpertsService) {}

  @Get()
  @ApiOperation({ summary: 'Experts publiés, dans l’ordre d’affichage' })
  async list() {
    const experts = await this.expertsService.listPublished();
    return { data: experts.map(toPublicView) };
  }
}
