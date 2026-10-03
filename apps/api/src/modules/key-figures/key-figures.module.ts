import { Module } from '@nestjs/common';
import { RevalidationModule } from '../../common/revalidation/revalidation.module.js';
import { KeyFiguresService } from './key-figures.service.js';
import { KeyFiguresController } from './key-figures.controller.js';
import { AdminKeyFiguresController } from './admin-key-figures.controller.js';

@Module({
  imports: [RevalidationModule],
  controllers: [KeyFiguresController, AdminKeyFiguresController],
  providers: [KeyFiguresService],
})
export class KeyFiguresModule {}
