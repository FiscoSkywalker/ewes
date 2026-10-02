/** Demande de contact, telle qu'elle est envoyée à l'API (`POST /contact`). */
export interface ContactRequest {
  name: string;
  organization: string;
  email: string;
  phone: string;
  /** Code du besoin (ENVIRONNEMENT, EAU, …), identique à celui attendu par l'API. */
  sector: string;
  message: string;
}

export type ContactField = keyof ContactRequest;

/** Longueur minimale du message (évite les demandes vides de sens). */
export const CONTACT_MESSAGE_MIN = 20;

export type ContactFieldError = 'required' | 'email' | 'messageShort' | 'invalid';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

/** Délai maximal d'attente de l'API avant de signaler une panne réseau. */
const REQUEST_TIMEOUT_MS = 15_000;

const FIELDS: readonly ContactField[] = [
  'name',
  'organization',
  'email',
  'phone',
  'sector',
  'message',
];

/**
 * Validation côté client, pour guider l'utilisateur champ par champ
 * (blueprint/15 §3). Simple confort : l'API revalide tout côté serveur
 * (blueprint/10_Security.md — aucune confiance dans le client).
 */
export function validateContactRequest(
  data: ContactRequest,
): Partial<Record<ContactField, ContactFieldError>> {
  const errors: Partial<Record<ContactField, ContactFieldError>> = {};
  if (!data.name.trim()) errors.name = 'required';
  if (!data.organization.trim()) errors.organization = 'required';
  if (!data.email.trim()) errors.email = 'required';
  else if (!EMAIL_PATTERN.test(data.email.trim())) errors.email = 'email';
  if (!data.message.trim()) errors.message = 'required';
  else if (data.message.trim().length < CONTACT_MESSAGE_MIN)
    errors.message = 'messageShort';
  return errors;
}

/** Résultat d'un envoi : le succès n'est annoncé que si l'API a enregistré le message. */
export type ContactOutcome =
  | { kind: 'success' }
  /** L'API a refusé des champs : à afficher champ par champ. */
  | { kind: 'invalid'; fields: ContactField[] }
  | { kind: 'rateLimited' }
  | { kind: 'network' }
  | { kind: 'server' };

/**
 * Envoie la demande à l'API (`POST /contact`). `idempotencyKey` identifie la
 * soumission : un renvoi (double clic, nouvelle tentative après coupure) ne
 * crée ni doublon ni notification en double côté serveur.
 */
export async function sendContactRequest(
  data: ContactRequest,
  options: { locale: string; idempotencyKey: string },
): Promise<ContactOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_URL}/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': options.idempotencyKey,
      },
      body: JSON.stringify({
        name: data.name,
        organization: data.organization,
        email: data.email,
        // Facultatif : un champ vide est omis plutôt qu'envoyé vide.
        ...(data.phone.trim() && { phone: data.phone }),
        sector: data.sector,
        message: data.message,
        locale: options.locale === 'en' ? 'en' : 'fr',
      }),
      signal: controller.signal,
    });

    if (response.ok) return { kind: 'success' };
    if (response.status === 429) return { kind: 'rateLimited' };
    if (response.status === 400) {
      const body = (await response.json().catch(() => null)) as {
        details?: { field?: string }[];
      } | null;
      const fields = (body?.details ?? [])
        .map((detail) => detail.field)
        .filter((field): field is ContactField =>
          FIELDS.includes(field as ContactField),
        );
      if (fields.length > 0) return { kind: 'invalid', fields };
    }
    return { kind: 'server' };
  } catch {
    // Coupure réseau, API injoignable, délai dépassé.
    return { kind: 'network' };
  } finally {
    clearTimeout(timer);
  }
}
