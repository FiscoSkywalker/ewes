import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Notification, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  MAIL_PROVIDER,
  MailNotConfiguredError,
  NOTIFICATION_RETRY_POLICY,
  type MailProvider,
  type RetryPolicy,
} from './mail-provider.js';

export interface NotificationRequest {
  /** Type métier stable, ex. `CONTACT_RECEIVED`. */
  type: string;
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  /** Un même événement (ex. `contact:<id>:team`) ne produit jamais deux notifications. */
  idempotencyKey: string;
}

interface StoredMail {
  subject: string;
  text: string;
  replyTo?: string;
}

const sleep = (ms: number) =>
  ms > 0 ? new Promise<void>((resolve) => setTimeout(resolve, ms)) : Promise.resolve();

/**
 * E-mails transactionnels (blueprint/13_Notification_System.md) : chaque envoi
 * est enregistré avant d'être tenté (clé d'idempotence unique), tenté jusqu'à
 * 3 fois avec un court backoff, et un échec définitif reste visible
 * (`failedAt`, `lastError`) et rejouable par l'Administrateur — jamais
 * d'échec silencieux. L'envoi ne bloque pas la requête qui l'a déclenché.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(MAIL_PROVIDER) private readonly mail: MailProvider,
    @Inject(NOTIFICATION_RETRY_POLICY) private readonly retry: RetryPolicy,
  ) {}

  /**
   * Enregistre la notification puis lance son envoi en arrière-plan.
   * Renvoie `null` si la clé d'idempotence existe déjà (événement dupliqué).
   */
  async enqueue(request: NotificationRequest): Promise<Notification | null> {
    const payload: StoredMail = {
      subject: request.subject,
      text: request.text,
      replyTo: request.replyTo,
    };
    let notification: Notification;
    try {
      notification = await this.prisma.notification.create({
        data: {
          type: request.type,
          recipientEmail: request.to,
          idempotencyKey: request.idempotencyKey,
          payload: payload as unknown as Prisma.InputJsonObject,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return null;
      }
      throw error;
    }
    // Hors requête : un échec d'envoi n'annule jamais l'événement métier déjà enregistré.
    void this.deliver(notification.id).catch((error: unknown) =>
      this.logger.error(
        `Envoi de la notification ${notification.id} interrompu : ${String(error)}`,
      ),
    );
    return notification;
  }

  /** Nombre de notifications d'un type adressées à une adresse depuis `since` (limite anti-abus). */
  countRecent(type: string, to: string, since: Date) {
    return this.prisma.notification.count({
      where: { type, recipientEmail: to, createdAt: { gte: since } },
    });
  }

  /** Tente l'envoi (jusqu'à `delaysMs.length` fois) et consigne le résultat. */
  async deliver(id: string): Promise<Notification> {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) throw this.notFound();
    if (notification.sentAt) return notification;

    const stored = notification.payload as unknown as StoredMail;
    let attempts = notification.attempts;
    let lastError = 'unknown';

    for (const delay of this.retry.delaysMs) {
      await sleep(delay);
      attempts += 1;
      try {
        await this.mail.send({
          to: notification.recipientEmail,
          subject: stored.subject,
          text: stored.text,
          replyTo: stored.replyTo,
        });
        return this.prisma.notification.update({
          where: { id },
          data: { sentAt: new Date(), failedAt: null, lastError: null, attempts },
        });
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        // Non configuré : réessayer ne servirait à rien tant que l'environnement n'est pas complété.
        if (error instanceof MailNotConfiguredError) break;
      }
    }

    this.logger.warn(
      `Notification ${id} (${notification.type}) non envoyée après ${attempts - notification.attempts} tentative(s) : ${lastError}`,
    );
    return this.prisma.notification.update({
      where: { id },
      data: { failedAt: new Date(), lastError: lastError.slice(0, 500), attempts },
    });
  }

  /** Rejoue un envoi non abouti (Administrateur). */
  async retryNotification(id: string): Promise<Notification> {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) throw this.notFound();
    return this.deliver(id);
  }

  async list(query: {
    page: number;
    limit: number;
    status?: 'sent' | 'failed' | 'pending';
    type?: string;
  }) {
    const where: Prisma.NotificationWhereInput = {
      ...(query.type && { type: query.type }),
      ...(query.status === 'sent' && { sentAt: { not: null } }),
      ...(query.status === 'failed' && { sentAt: null, failedAt: { not: null } }),
      ...(query.status === 'pending' && { sentAt: null, failedAt: null }),
    };
    const [rows, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return {
      // Le sujet suffit à l'administration ; le texte (données personnelles) reste en base.
      data: rows.map((n) => this.view(n)),
      meta: { page: query.page, limit: query.limit, total },
    };
  }

  view(n: Notification) {
    const stored = n.payload as unknown as StoredMail | null;
    return {
      id: n.id,
      type: n.type,
      recipientEmail: n.recipientEmail,
      subject: stored?.subject ?? null,
      status: n.sentAt ? 'sent' : n.failedAt ? 'failed' : 'pending',
      attempts: n.attempts,
      lastError: n.lastError,
      sentAt: n.sentAt,
      failedAt: n.failedAt,
      createdAt: n.createdAt,
    };
  }

  private notFound() {
    return new NotFoundException({
      code: 'NOTIFICATION_NOT_FOUND',
      message: 'Notification introuvable.',
      details: [],
    });
  }
}
