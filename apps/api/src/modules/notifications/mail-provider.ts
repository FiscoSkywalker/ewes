/** Message prêt à envoyer. Texte brut uniquement : aucun HTML, donc rien à injecter. */
export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  /** Adresse de réponse (validée en amont) ; jamais construite à partir d'une saisie non validée. */
  replyTo?: string;
}

/** Erreur « fournisseur non configuré » : inutile de réessayer tant que l'environnement n'est pas complété. */
export class MailNotConfiguredError extends Error {
  constructor(missing: string) {
    super(`MAIL_NOT_CONFIGURED: ${missing}`);
    this.name = 'MailNotConfiguredError';
  }
}

/**
 * Port d'envoi d'e-mails (blueprint/13_Notification_System.md §3). L'adaptateur
 * SMTP est le seul en V1 ; le fournisseur définitif reste à confirmer par EWES
 * et se règle par variables d'environnement, sans changement de code.
 */
export interface MailProvider {
  send(message: MailMessage): Promise<void>;
  /** Configuration actuelle, sans jamais exposer le mot de passe. */
  status(): MailTransportStatus;
}

/** Ce que le portail peut dire de l'envoi d'e-mails sans rien divulguer de secret. */
export interface MailTransportStatus {
  /** Les variables indispensables à un envoi sont renseignées. */
  configured: boolean;
  host: string | null;
  port: number | null;
  /** `tls` : TLS implicite (port 465) ; `starttls` : négocié quand le serveur le propose. */
  security: 'tls' | 'starttls' | null;
  /** Adresse d'expéditeur (`SMTP_FROM`). */
  from: string | null;
  /** Un identifiant de connexion est défini (`SMTP_USER`) ; le mot de passe n'est jamais exposé. */
  authenticated: boolean;
  /** Variables d'environnement indispensables encore absentes. */
  missing: string[];
}

export const MAIL_PROVIDER = Symbol('MAIL_PROVIDER');

/** Politique de nouvelles tentatives : un délai (ms) avant chaque tentative. */
export interface RetryPolicy {
  delaysMs: readonly number[];
}

export const NOTIFICATION_RETRY_POLICY = Symbol('NOTIFICATION_RETRY_POLICY');

/** 3 tentatives, backoff court (blueprint/13 §3). */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  delaysMs: [0, 1_000, 3_000],
};
