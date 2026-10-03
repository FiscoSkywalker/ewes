import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { PagesModule } from './modules/pages/pages.module.js';
import { ServicesModule } from './modules/services/services.module.js';
import { KeyFiguresModule } from './modules/key-figures/key-figures.module.js';
import { RealisationsModule } from './modules/realisations/realisations.module.js';
import { ActualitesModule } from './modules/actualites/actualites.module.js';
import { DocumentsPublicsModule } from './modules/documents-publics/documents-publics.module.js';
import { DocumentsPrivesModule } from './modules/documents-prives/documents-prives.module.js';
import { ContactModule } from './modules/contact/contact.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { MediaModule } from './modules/media/media.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { HealthModule } from './modules/health/health.module.js';

/**
 * Frontières de modules figées par blueprint/06_Application_Architecture.md §3.
 * Chaque module reste un squelette vide jusqu'à son implémentation en
 * Phase 02-04 (blueprint/21_Backlog_and_Session_Handoff.md) — la structure
 * est posée maintenant pour que les futures sessions/outils (Claude Code,
 * Cursor) n'aient pas à redécider les frontières.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Limitation de fréquence globale par défaut (blueprint/10_Security.md §3) ;
    // les endpoints sensibles (ex. /auth/login) resserrent la limite via @Throttle().
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    PagesModule,
    ServicesModule,
    KeyFiguresModule,
    RealisationsModule,
    ActualitesModule,
    DocumentsPublicsModule,
    DocumentsPrivesModule,
    ContactModule,
    NotificationsModule,
    MediaModule,
    AuditModule,
    AdminModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
