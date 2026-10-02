import { Module } from '@nestjs/common';
import { MediaService } from './media.service.js';
import { MediaController } from './media.controller.js';
import { AdminMediaController } from './admin-media.controller.js';

@Module({
  controllers: [MediaController, AdminMediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
