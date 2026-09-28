import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

/**
 * Module global : chaque module métier (blueprint/06_Application_Architecture.md §3)
 * a besoin de l'accès aux données sans réimporter PrismaModule partout.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
