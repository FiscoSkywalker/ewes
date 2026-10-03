import {
  BadRequestException,
  ConflictException,
  GoneException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, type User, type UserInvitation } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import type { InviteUserDto } from './dto/invite-user.dto.js';
import { invitationEmail } from './invitation-emails.js';
import {
  toInvitationView,
  type InvitationView,
  type InvitationWithSender,
} from './user-views.js';

/** Validité d'un lien d'invitation. */
export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Délai minimal entre deux envois du même lien (anti-rafale, anti-relais d'e-mails). */
export const RESEND_COOLDOWN_MS = 60 * 1000;

const SENDER = { select: { id: true, fullName: true } } as const;

const INVITATION_NOT_FOUND = {
  code: 'INVITATION_NOT_FOUND',
  message: 'Invitation introuvable ou déjà traitée.',
  details: [],
};

const INVITATION_INVALID = {
  code: 'INVITATION_INVALID',
  message: 'Ce lien d’invitation n’est pas valide.',
  details: [],
};

const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

/** Jeton d'invitation : 32 octets aléatoires (256 bits), donc inutile de ralentir son hachage. */
const newToken = () => randomBytes(32).toString('base64url');

export interface InviteResult {
  invitation: InvitationView;
  /**
   * Lien d'activation, renvoyé **une seule fois** à l'administrateur qui
   * invite (il peut le transmettre lui-même si l'e-mail n'arrive pas). Il
   * n'est jamais relisible ensuite : seul son hachage est conservé.
   */
  activationUrl: string;
}

export interface AcceptedInvitation {
  user: Pick<User, 'id' | 'email' | 'fullName' | 'role'>;
}

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  /** Invitations en attente (y compris expirées, à renvoyer ou retirer), les plus récentes d'abord. */
  async list(): Promise<InvitationView[]> {
    const now = new Date();
    const rows = await this.prisma.userInvitation.findMany({
      where: { acceptedAt: null, revokedAt: null },
      include: { invitedBy: SENDER },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => toInvitationView(row, now));
  }

  async invite(
    actor: AuthenticatedUser,
    dto: InviteUserDto,
  ): Promise<InviteResult> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException({
        code: 'USER_EMAIL_TAKEN',
        message: 'Un compte existe déjà avec cette adresse e-mail.',
        details: [],
      });
    }

    const pending = await this.prisma.userInvitation.findFirst({
      where: { email: dto.email, acceptedAt: null, revokedAt: null },
    });
    if (pending && pending.expiresAt > new Date()) {
      throw new ConflictException({
        code: 'INVITATION_PENDING',
        message:
          'Une invitation est déjà en attente pour cette adresse. Renvoyez-la depuis la liste des invitations.',
        details: [],
      });
    }

    const token = newToken();
    const created = await this.prisma.$transaction(async (tx) => {
      // Une invitation expirée est remplacée par la nouvelle : une seule à la fois par adresse.
      if (pending) {
        await tx.userInvitation.update({
          where: { id: pending.id },
          data: { revokedAt: new Date() },
        });
      }
      return tx.userInvitation.create({
        data: {
          email: dto.email,
          fullName: dto.fullName,
          role: dto.role,
          tokenHash: hashToken(token),
          invitedById: actor.id,
          expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
        },
        include: { invitedBy: SENDER },
      });
    });

    await this.audit.record({
      actorId: actor.id,
      action: 'USER_INVITED',
      entityType: 'UserInvitation',
      entityId: created.id,
      after: { email: created.email, role: created.role },
    });
    return this.deliver(created, token);
  }

  async resend(actor: AuthenticatedUser, id: string): Promise<InviteResult> {
    const invitation = await this.requirePending(id);
    const wait =
      invitation.lastSentAt.getTime() + RESEND_COOLDOWN_MS - Date.now();
    if (wait > 0) {
      throw new HttpException(
        {
          code: 'INVITATION_RECENTLY_SENT',
          message: `Cette invitation vient d’être envoyée. Réessayez dans ${Math.ceil(wait / 1000)} secondes.`,
          details: [],
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Nouveau jeton : le lien précédent cesse de fonctionner.
    const token = newToken();
    const updated = await this.prisma.userInvitation.update({
      where: { id },
      data: {
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
        lastSentAt: new Date(),
      },
      include: { invitedBy: SENDER },
    });
    await this.audit.record({
      actorId: actor.id,
      action: 'USER_INVITATION_RESENT',
      entityType: 'UserInvitation',
      entityId: id,
      after: { email: updated.email, role: updated.role },
    });
    return this.deliver(updated, token, actor.fullName);
  }

  async revoke(actor: AuthenticatedUser, id: string): Promise<void> {
    const invitation = await this.requirePending(id);
    await this.prisma.userInvitation.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    await this.audit.record({
      actorId: actor.id,
      action: 'USER_INVITATION_REVOKED',
      entityType: 'UserInvitation',
      entityId: id,
      before: { email: invitation.email, role: invitation.role },
    });
  }

  // --- Côté personne invitée (public, limité en fréquence) ---

  /** Ce que la page d'activation affiche avant que la personne ne choisisse son mot de passe. */
  async inspect(token: string) {
    const invitation = await this.requireUsable(token);
    return {
      email: invitation.email,
      fullName: invitation.fullName,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    };
  }

  /**
   * Crée le compte avec le mot de passe choisi. Le jeton est à usage unique :
   * deux activations simultanées ne créent qu'un compte (e-mail unique).
   */
  async accept(token: string, password: string): Promise<AcceptedInvitation> {
    const invitation = await this.requireUsable(token);
    if (password.trim().toLowerCase() === invitation.email) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Validation échouée.',
        details: [
          {
            field: 'password',
            messages: [
              'Le mot de passe ne peut pas être votre adresse e-mail.',
            ],
          },
        ],
      });
    }
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
    });

    let user: User;
    try {
      user = await this.prisma.$transaction(async (tx) => {
        // Garde atomique : un seul appel peut faire passer l'invitation à « acceptée ».
        const claimed = await tx.userInvitation.updateMany({
          where: { id: invitation.id, acceptedAt: null, revokedAt: null },
          data: { acceptedAt: new Date() },
        });
        if (claimed.count !== 1) throw new GoneException(this.used());
        const created = await tx.user.create({
          data: {
            email: invitation.email,
            fullName: invitation.fullName,
            role: invitation.role,
            passwordHash,
          },
        });
        // Toute autre invitation en attente pour cette adresse devient sans objet.
        await tx.userInvitation.updateMany({
          where: {
            email: invitation.email,
            acceptedAt: null,
            revokedAt: null,
          },
          data: { revokedAt: new Date() },
        });
        return created;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'USER_EMAIL_TAKEN',
          message: 'Un compte existe déjà avec cette adresse e-mail.',
          details: [],
        });
      }
      throw error;
    }

    await this.audit.record({
      actorId: user.id,
      action: 'USER_INVITATION_ACCEPTED',
      entityType: 'User',
      entityId: user.id,
      after: { email: user.email, role: user.role },
    });
    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  // --- Internes ---

  private async requirePending(id: string): Promise<InvitationWithSender> {
    const invitation = await this.prisma.userInvitation.findFirst({
      where: { id, acceptedAt: null, revokedAt: null },
      include: { invitedBy: SENDER },
    });
    if (!invitation) throw new NotFoundException(INVITATION_NOT_FOUND);
    return invitation;
  }

  /**
   * Invitation correspondant au jeton, encore utilisable. Un jeton inconnu ou
   * retiré ne dit rien de plus qu'« invalide » ; « expiré » et « déjà utilisé »
   * ne sont dits qu'à qui détient le vrai jeton, pour l'orienter.
   */
  private async requireUsable(token: string): Promise<UserInvitation> {
    const invitation = await this.prisma.userInvitation.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!invitation || invitation.revokedAt) {
      throw new NotFoundException(INVITATION_INVALID);
    }
    if (invitation.acceptedAt) throw new GoneException(this.used());
    if (invitation.expiresAt <= new Date()) {
      throw new GoneException({
        code: 'INVITATION_EXPIRED',
        message:
          'Ce lien d’invitation a expiré. Demandez à un administrateur de vous en envoyer un nouveau.',
        details: [],
      });
    }
    return invitation;
  }

  private used() {
    return {
      code: 'INVITATION_USED',
      message: 'Ce lien d’invitation a déjà été utilisé. Connectez-vous.',
      details: [],
    };
  }

  /** Met l'e-mail en file (son échec n'annule pas l'invitation) et prépare le lien montré à l'administrateur. */
  private async deliver(
    invitation: InvitationWithSender,
    token: string,
    inviterName?: string,
  ): Promise<InviteResult> {
    const base = this.config
      .get<string>('WEB_APP_URL', 'http://localhost:3000')
      .replace(/\/+$/, '');
    // Dans le fragment (#) : le jeton ne part jamais dans les journaux du serveur ni dans un en-tête Referer.
    const activationUrl = `${base}/admin/invitation#${token}`;
    const mail = invitationEmail({
      fullName: invitation.fullName,
      role: invitation.role,
      inviterName: inviterName ?? invitation.invitedBy?.fullName ?? null,
      url: activationUrl,
      expiresAt: invitation.expiresAt,
    });
    await this.notifications.enqueue({
      type: 'USER_INVITATION',
      to: invitation.email,
      subject: mail.subject,
      text: mail.text,
      sensitive: true,
      idempotencyKey: `invitation:${invitation.id}:${hashToken(token).slice(0, 16)}`,
    });
    return { invitation: toInvitationView(invitation), activationUrl };
  }
}
