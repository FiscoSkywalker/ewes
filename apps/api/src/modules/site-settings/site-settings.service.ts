import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import { FrontendRevalidator } from '../../common/revalidation/frontend-revalidator.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import type { UpdateGeneralSettingsDto } from './dto/update-general-settings.dto.js';
import type { UpdateMailSettingsDto } from './dto/update-mail-settings.dto.js';
import { DEFAULT_SITE_SETTINGS } from './site-settings.defaults.js';
import { SOCIAL_FIELDS, type CurrentSettings } from './site-settings-views.js';
import { checkSocialUrl } from './social-links.js';

/** Tag de cache du site public. */
export const SITE_SETTINGS_TAG = 'site-settings';

/** Identifiant de l'unique ligne de réglages. */
const SITE_ID = 'site';

/** Tests d'envoi par heure et par compte : de quoi diagnostiquer, pas de quoi arroser une boîte. */
const MAX_TESTS_PER_HOUR = 5;

type SettingsPatch = Partial<Omit<CurrentSettings, 'updatedAt'>>;

interface FieldIssue {
  field: string;
  messages: string[];
}

const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

/**
 * Réglages de la plateforme (blueprint/14_Admin_Backoffice.md, « Paramètres »).
 * Une seule ligne, créée au premier enregistrement ; sans elle, les valeurs
 * d'origine s'appliquent. Aucun secret n'est stocké ici : les identifiants SMTP
 * restent dans l'environnement du serveur.
 */
@Injectable()
export class SiteSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidator: FrontendRevalidator,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  /** Réglages en vigueur : la ligne enregistrée, ou les valeurs d'origine. */
  async current(): Promise<CurrentSettings> {
    const row = await this.prisma.siteSettings.findUnique({
      where: { id: SITE_ID },
    });
    if (!row) {
      return {
        ...DEFAULT_SITE_SETTINGS,
        officeDays: [...DEFAULT_SITE_SETTINGS.officeDays],
        updatedAt: null,
      };
    }
    const { id: _id, ...settings } = row;
    return settings;
  }

  async updateGeneral(actor: AuthenticatedUser, dto: UpdateGeneralSettingsDto) {
    const current = await this.current();
    const patch: SettingsPatch = {
      phone: dto.phone,
      email: dto.email,
      addressFr: dto.addressFr,
      addressEn: dto.addressEn,
      officeDays: dto.officeDays && [...dto.officeDays].sort((a, b) => a - b),
      opensAt: dto.opensAt,
      closesAt: dto.closesAt,
      linkedinUrl: dto.linkedinUrl,
      facebookUrl: dto.facebookUrl,
      xUrl: dto.xUrl,
      youtubeUrl: dto.youtubeUrl,
    };
    this.validate(current, patch);
    return this.save(actor, 'SETTINGS_GENERAL_UPDATED', current, patch, true);
  }

  async updateMail(actor: AuthenticatedUser, dto: UpdateMailSettingsDto) {
    const current = await this.current();
    return this.save(
      actor,
      'SETTINGS_MAIL_UPDATED',
      current,
      {
        contactRecipientEmail: dto.contactRecipientEmail,
        contactAutoReply: dto.contactAutoReply,
      },
      false,
    );
  }

  /** Écran Messagerie : réglages, destinataire effectif, état du transport et synthèse des envois. */
  async mailOverview() {
    const [settings, summary] = await Promise.all([
      this.current(),
      this.notifications.summary(),
    ]);
    const fromEnvironment =
      this.config.get<string>('CONTACT_NOTIFICATION_EMAIL')?.trim() || null;
    const recipient = settings.contactRecipientEmail
      ? { address: settings.contactRecipientEmail, source: 'settings' as const }
      : fromEnvironment
        ? { address: fromEnvironment, source: 'environment' as const }
        : { address: null, source: 'none' as const };
    return {
      contactRecipientEmail: settings.contactRecipientEmail,
      contactAutoReply: settings.contactAutoReply,
      recipient,
      transport: this.notifications.transportStatus(),
      summary,
      updatedAt: settings.updatedAt,
    };
  }

  /** Destinataire effectif des messages de contact, ou `null` s'il n'y en a aucun. */
  async contactRecipient(): Promise<string | null> {
    const settings = await this.current();
    return (
      settings.contactRecipientEmail ||
      this.config.get<string>('CONTACT_NOTIFICATION_EMAIL')?.trim() ||
      null
    );
  }

  /**
   * E-mail de test adressé à **l'administrateur connecté** (jamais à une
   * adresse saisie : l'écran ne peut pas servir de relais). Le résultat
   * renvoyé est celui de l'envoi réel, pas une promesse.
   */
  async sendTest(actor: AuthenticatedUser) {
    // Le jeton d'accès ne porte ni e-mail ni nom : on relit le compte connecté.
    const account = await this.prisma.user.findUnique({
      where: { id: actor.id },
      select: { email: true, fullName: true },
    });
    if (!account) throw new UnauthorizedException();
    const transport = this.notifications.transportStatus();
    if (!transport.configured) {
      throw new ConflictException({
        code: 'MAIL_NOT_CONFIGURED',
        message: `L’envoi d’e-mails n’est pas configuré : il manque ${transport.missing.join(', ')} dans l’environnement du serveur.`,
        details: [],
      });
    }
    const recent = await this.notifications.countRecent(
      'MAIL_TEST',
      account.email,
      new Date(Date.now() - 60 * 60 * 1000),
    );
    if (recent >= MAX_TESTS_PER_HOUR) {
      throw new HttpException(
        {
          code: 'MAIL_TEST_RATE_LIMITED',
          message: `Déjà ${MAX_TESTS_PER_HOUR} tests d’envoi cette heure : réessayez plus tard, ou consultez le suivi des e-mails.`,
          details: [],
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const sent = await this.notifications.sendNow({
      type: 'MAIL_TEST',
      to: account.email,
      subject: 'Test d’envoi — portail EWES',
      text: [
        `Bonjour ${account.fullName},`,
        '',
        'Ce message confirme que le portail EWES sait envoyer des e-mails.',
        'Vous l’avez demandé depuis Paramètres > Messagerie ; aucune action n’est nécessaire.',
      ].join('\n'),
      idempotencyKey: `mail-test:${randomUUID()}`,
    });
    // La clé est unique à chaque appel : `null` n'arrive pas, mais le type l'exige.
    if (!sent)
      throw new ConflictException({
        code: 'MAIL_TEST_DUPLICATE',
        message: 'Test déjà envoyé.',
        details: [],
      });
    const view = this.notifications.view(sent);
    await this.audit.record({
      actorId: actor.id,
      action: 'MAIL_TEST_REQUESTED',
      entityType: 'SiteSettings',
      entityId: SITE_ID,
      after: { recipient: account.email, outcome: view.status },
    });
    return view;
  }

  /** Refus par champ (`details: [{ field, messages }]`) : le portail les place sous les champs. */
  private validate(current: CurrentSettings, patch: SettingsPatch) {
    const issues: FieldIssue[] = [];
    const opensAt = patch.opensAt ?? current.opensAt;
    const closesAt = patch.closesAt ?? current.closesAt;
    if (closesAt <= opensAt) {
      issues.push({
        field: 'closesAt',
        messages: ['La fermeture doit être après l’ouverture.'],
      });
    }
    for (const [network, field] of Object.entries(SOCIAL_FIELDS) as [
      keyof typeof SOCIAL_FIELDS,
      (typeof SOCIAL_FIELDS)[keyof typeof SOCIAL_FIELDS],
    ][]) {
      const value = patch[field];
      if (!value) continue;
      const checked = checkSocialUrl(network, value);
      if ('error' in checked) {
        issues.push({ field, messages: [checked.error] });
      } else {
        patch[field] = checked.url;
      }
    }
    if (issues.length > 0) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Validation échouée.',
        details: issues,
      });
    }
  }

  /**
   * Enregistre uniquement ce qui change et trace l'avant/après de ces seuls
   * champs. Rien n'a changé : aucune écriture, aucune entrée d'audit, aucune
   * invalidation du cache du site.
   */
  private async save(
    actor: AuthenticatedUser,
    action: string,
    current: CurrentSettings,
    patch: SettingsPatch,
    publicChange: boolean,
  ) {
    const changed = (Object.keys(patch) as (keyof SettingsPatch)[]).filter(
      (key) => patch[key] !== undefined && !same(patch[key], current[key]),
    );
    if (changed.length === 0) return this.current();

    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    const update: Record<string, unknown> = {};
    for (const key of changed) {
      before[key] = current[key];
      after[key] = patch[key];
      update[key] = patch[key];
    }
    const { updatedAt: _updatedAt, ...base } = current;
    await this.prisma.siteSettings.upsert({
      where: { id: SITE_ID },
      create: {
        id: SITE_ID,
        ...base,
        ...update,
      } as Prisma.SiteSettingsCreateInput,
      update: update as Prisma.SiteSettingsUpdateInput,
    });
    await this.audit.record({
      actorId: actor.id,
      action,
      entityType: 'SiteSettings',
      entityId: SITE_ID,
      before: before as Prisma.InputJsonObject,
      after: after as Prisma.InputJsonObject,
    });
    if (publicChange) await this.revalidator.revalidate(SITE_SETTINGS_TAG);
    return this.current();
  }
}
