import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SiteSettingsService } from './site-settings.service.js';
import { toPublicView } from './site-settings-views.js';

@ApiTags('site-settings')
@Controller('site-settings')
export class SiteSettingsController {
  constructor(private readonly settings: SiteSettingsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Coordonnées, horaires et réseaux sociaux affichés sur le site public',
  })
  async get() {
    return { data: toPublicView(await this.settings.current()) };
  }
}
