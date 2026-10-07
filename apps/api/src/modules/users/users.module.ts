import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { AccountLockedNotifier } from './account-locked-notifier.service.js';
import { AvatarStorageService } from './avatar-storage.service.js';
import { AdminUsersController } from './admin-users.controller.js';
import { InvitationsService } from './invitations.service.js';
import { LoginLockoutService } from './login-lockout.service.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [NotificationsModule],
  controllers: [AdminUsersController],
  providers: [
    UsersService,
    InvitationsService,
    LoginLockoutService,
    AvatarStorageService,
    AccountLockedNotifier,
  ],
  exports: [
    UsersService,
    InvitationsService,
    LoginLockoutService,
    AvatarStorageService,
    AccountLockedNotifier,
  ],
})
export class UsersModule {}
