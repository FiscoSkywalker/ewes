import { EWES_CONTACT } from '@/data/contact';

/** Demande de contact, telle qu'elle sera envoyée au module NestJS `contact`. */
export interface ContactRequest {
  name: string;
  organization: string;
  email: string;
  phone: string;
  sector: string;
  message: string;
}

export type ContactField = keyof ContactRequest;

/** Longueur minimale du message (évite les demandes vides de sens). */
export const CONTACT_MESSAGE_MIN = 20;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Validation côté client, pour guider l'utilisateur champ par champ
 * (blueprint/15 §3). Simple confort : l'API revalidera tout côté serveur
 * (blueprint/10_Security.md — aucune confiance dans le client).
 */
export function validateContactRequest(
  data: ContactRequest,
): Partial<Record<ContactField, 'required' | 'email' | 'messageShort'>> {
  const errors: Partial<
    Record<ContactField, 'required' | 'email' | 'messageShort'>
  > = {};
  if (!data.name.trim()) errors.name = 'required';
  if (!data.organization.trim()) errors.organization = 'required';
  if (!data.email.trim()) errors.email = 'required';
  else if (!EMAIL_PATTERN.test(data.email.trim())) errors.email = 'email';
  if (!data.message.trim()) errors.message = 'required';
  else if (data.message.trim().length < CONTACT_MESSAGE_MIN)
    errors.message = 'messageShort';
  return errors;
}

/**
 * Point d'envoi unique des demandes de contact. Le module NestJS `contact`
 * n'existant pas encore, la demande ouvre la messagerie de l'utilisateur
 * avec le message pré-rempli — aucune confirmation d'envoi simulée
 * (blueprint/19 §7). À remplacer par `POST /contact` sans toucher aux
 * formulaires : ils n'appellent que cette fonction.
 */
export async function sendContactRequest(
  data: ContactRequest,
  labels: Record<ContactField, string> & { subject: string },
): Promise<void> {
  const body = [
    `${labels.name}: ${data.name}`,
    `${labels.organization}: ${data.organization}`,
    `${labels.email}: ${data.email}`,
    `${labels.phone}: ${data.phone}`,
    `${labels.sector}: ${data.sector}`,
    '',
    data.message,
  ].join('\n');

  window.location.assign(
    `mailto:${EWES_CONTACT.email}?subject=${encodeURIComponent(labels.subject)}&body=${encodeURIComponent(body)}`,
  );
}
