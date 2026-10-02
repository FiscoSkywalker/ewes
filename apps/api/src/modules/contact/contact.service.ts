import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContactMessage, ContactMessageStatus, Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { escapeLike } from '../../common/utils/like.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { acknowledgement, teamNotification } from './contact-emails.js';
import type { ListContactsDto } from './dto/list-contacts.dto.js';
import type { SubmitContactDto } from './dto/submit-contact.dto.js';

/** Fenêtre de détection d'un double envoi du même message (sans clé d'idempotence). */
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

/** Accusés de réception envoyés à une même adresse par heure (anti-abus de relais). */
const MAX_ACKS_PER_ADDRESS_PER_HOUR = 3;

export interface SubmitResult {
  /** Toujours « received » : le message est enregistré (ou reconnu comme doublon). */
  status: 'received';
  duplicate: boolean;
}

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  private hashOf(email: string, message: string) {
    const normalized = message.toLowerCase().replace(/\s+/g, ' ').trim();
    return createHash('sha256').update(`${email}\n${normalized}`).digest('hex');
  }

  /**
   * Enregistre un message de contact puis déclenche ses notifications.
   * Idempotent : la même soumission (clé `Idempotency-Key`, ou même e-mail et
   * même message dans les 10 minutes) ne crée ni doublon ni notification en
   * double. Le succès n'est annoncé qu'après l'enregistrement en base ; l'envoi
   * des e-mails est indépendant et son échec reste visible de l'Administrateur.
   */
  async submit(dto: SubmitContactDto, idempotencyKey?: string): Promise<SubmitResult> {
    // Robot (champ piège rempli) : écarté sans rien enregistrer ni notifier.
    if (dto.website && dto.website.trim() !== '') {
      this.logger.warn('Soumission de contact écartée (champ piège rempli).');
      return { status: 'received', duplicate: false };
    }

    const contentHash = this.hashOf(dto.email, dto.message);

    if (idempotencyKey) {
      const existing = await this.prisma.contactMessage.findUnique({
        where: { submissionKey: idempotencyKey },
        select: { id: true },
      });
      if (existing) return { status: 'received', duplicate: true };
    } else {
      const recent = await this.prisma.contactMessage.findFirst({
        where: {
          email: dto.email,
          contentHash,
          createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
        },
        select: { id: true },
      });
      if (recent) return { status: 'received', duplicate: true };
    }

    let message: ContactMessage;
    try {
      message = await this.prisma.contactMessage.create({
        data: {
          name: dto.name,
          organization: dto.organization,
          email: dto.email,
          phone: dto.phone || null,
          sector: dto.sector,
          message: dto.message,
          locale: dto.locale ?? 'fr',
          submissionKey: idempotencyKey,
          contentHash,
        },
      });
    } catch (error) {
      // Deux requêtes simultanées avec la même clé : la seconde est un doublon.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return { status: 'received', duplicate: true };
      }
      throw error;
    }

    await this.notify(message);
    return { status: 'received', duplicate: false };
  }

  /** Notification interne + accusé de réception ; chacun avec sa clé d'idempotence. */
  private async notify(message: ContactMessage) {
    const team = this.config.get<string>('CONTACT_NOTIFICATION_EMAIL')?.trim();
    // Sans destinataire configuré, la notification est tout de même enregistrée :
    // elle apparaît « échouée » (non configuré) dans le suivi des envois.
    const teamMail = teamNotification(message);
    await this.notifications.enqueue({
      type: 'CONTACT_RECEIVED',
      to: team || 'non-configure@invalid',
      subject: teamMail.subject,
      text: teamMail.text,
      replyTo: message.email,
      idempotencyKey: `contact:${message.id}:team`,
    });

    const recentAcks = await this.notifications.countRecent(
      'CONTACT_ACKNOWLEDGEMENT',
      message.email,
      new Date(Date.now() - 60 * 60 * 1000),
    );
    if (recentAcks >= MAX_ACKS_PER_ADDRESS_PER_HOUR) {
      this.logger.warn('Accusé de réception non envoyé : limite horaire atteinte pour cette adresse.');
      return;
    }
    const ack = acknowledgement(message);
    await this.notifications.enqueue({
      type: 'CONTACT_ACKNOWLEDGEMENT',
      to: message.email,
      subject: ack.subject,
      text: ack.text,
      idempotencyKey: `contact:${message.id}:ack`,
    });
  }

  async list(query: ListContactsDto) {
    const search = query.q?.trim() ? escapeLike(query.q.trim()) : undefined;
    const where: Prisma.ContactMessageWhereInput = {
      ...(query.status && { status: query.status }),
      ...(search && {
        OR: (['name', 'organization', 'email', 'phone', 'message'] as const).map((field) => ({
          [field]: { contains: search, mode: 'insensitive' as const },
        })),
      }),
    };
    // Organisation facultative : les messages sans organisation passent toujours en dernier.
    const primary: Prisma.ContactMessageOrderByWithRelationInput =
      query.sort === 'organization'
        ? { organization: { sort: query.order, nulls: 'last' } }
        : { [query.sort]: query.order };
    const [data, total] = await Promise.all([
      this.prisma.contactMessage.findMany({
        where,
        // `id` départage les ex æquo : une page ne doit ni répéter ni sauter de ligne.
        orderBy: [primary, { createdAt: 'desc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.contactMessage.count({ where }),
    ]);
    return {
      data: data.map(({ contentHash: _hash, submissionKey: _key, ...rest }) => rest),
      meta: { page: query.page, limit: query.limit, total },
    };
  }

  async get(id: string) {
    const message = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!message) {
      throw new NotFoundException({
        code: 'CONTACT_MESSAGE_NOT_FOUND',
        message: 'Message introuvable.',
        details: [],
      });
    }
    const { contentHash: _hash, submissionKey: _key, ...rest } = message;
    return rest;
  }

  /** Seul le statut de suivi se modifie : un message reçu n'est jamais réécrit. */
  async setStatus(actor: AuthenticatedUser, id: string, status: ContactMessageStatus) {
    const current = await this.get(id);
    if (current.status === status) return current;
    await this.prisma.contactMessage.update({ where: { id }, data: { status } });
    await this.audit.record({
      actorId: actor.id,
      action: 'CONTACT_STATUS_CHANGED',
      entityType: 'ContactMessage',
      entityId: id,
      before: { status: current.status },
      after: { status },
    });
    return this.get(id);
  }
}
