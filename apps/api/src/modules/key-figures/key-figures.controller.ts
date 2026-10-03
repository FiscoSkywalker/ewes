import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { KeyFiguresService } from './key-figures.service.js';
import { toPublicView } from './key-figure-views.js';

@ApiTags('key-figures')
@Controller('key-figures')
export class KeyFiguresController {
  constructor(private readonly keyFiguresService: KeyFiguresService) {}

  @Get()
  @ApiOperation({
    summary: 'Chiffres clés visibles, dans l’ordre d’affichage',
  })
  async list() {
    const figures = await this.keyFiguresService.listVisible();
    return { data: figures.map(toPublicView) };
  }
}
