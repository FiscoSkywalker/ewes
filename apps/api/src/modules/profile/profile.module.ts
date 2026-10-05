import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { UsersModule } from '../users/users.module.js';
import { AvatarStorageService } from './avatar-storage.service.js';
import { MeController } from './me.controller.js';
import { ProfileService } from './profile.service.js';

/** Profil de la personne connectée : nom, mot de passe, photo, sessions (blueprint/14 §3). */
@Module({
  imports: [UsersModule, NotificationsModule],
  controllers: [MeController],
  providers: [ProfileService, AvatarStorageService],
})
export class ProfileModule {}
