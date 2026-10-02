import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import {
  MailNotConfiguredError,
  type MailMessage,
  type MailProvider,
} from './mail-provider.js';

/**
 * Adaptateur SMTP (nodemailer). Configuré par `SMTP_HOST`, `SMTP_PORT`,
 * `SMTP_USER`, `SMTP_PASSWORD` et `SMTP_FROM` : si `SMTP_HOST` ou `SMTP_FROM`
 * manque, l'envoi échoue explicitement (`MailNotConfiguredError`) au lieu de
 * simuler un succès. Le port 465 utilise TLS implicite ; sur les autres ports
 * STARTTLS est négocié quand le serveur le propose.
 */
@Injectable()
export class SmtpMailProvider implements MailProvider {
  private transporter?: Transporter;

  constructor(private readonly config: ConfigService) {}

  private getTransporter(): { transporter: Transporter; from: string } {
    const host = this.config.get<string>('SMTP_HOST')?.trim();
    const from = this.config.get<string>('SMTP_FROM')?.trim();
    if (!host) throw new MailNotConfiguredError('SMTP_HOST');
    if (!from) throw new MailNotConfiguredError('SMTP_FROM');

    if (!this.transporter) {
      const port = Number(this.config.get<string>('SMTP_PORT', '587'));
      const user = this.config.get<string>('SMTP_USER')?.trim();
      const pass = this.config.get<string>('SMTP_PASSWORD');
      this.transporter = createTransport({
        host,
        port,
        secure: port === 465,
        ...(user && { auth: { user, pass: pass ?? '' } }),
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
      });
    }
    return { transporter: this.transporter, from };
  }

  async send(message: MailMessage): Promise<void> {
    const { transporter, from } = this.getTransporter();
    await transporter.sendMail({
      from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      replyTo: message.replyTo,
    });
  }
}
