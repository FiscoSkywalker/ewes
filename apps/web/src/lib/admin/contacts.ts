import { adminFetch } from '@/lib/api/admin-fetch';
import { ApiError } from '@/lib/api/backend';

export type ContactStatus = 'NOUVEAU' | 'TRAITE';

/** Message de contact tel que renvoyé par `GET /admin/contacts[/:id]`. */
export interface ContactMessage {
  id: string;
  name: string;
  organization: string | null;
  email: string;
  phone: string | null;
  sector: string | null;
  subject: string | null;
  message: string;
  locale: string;
  status: ContactStatus;
  createdAt: string;
  updatedAt: string;
}

/** Pôles proposés par le formulaire public (`CONTACT_SECTORS` côté API). */
export const SECTOR_LABELS: Record<string, string> = {
  ENVIRONNEMENT: 'Étude d’impact / audit environnemental',
  EAU: 'Eau (adduction, traitement, épuration)',
  ANALYSES: 'Analyses',
  GESTION: 'Gestion',
  INGENIERIE: 'Ingénierie',
  FORMATION: 'Formation',
  AUTRE: 'Autre',
};

export function sectorLabel(sector: string | null): string | null {
  if (!sector) return null;
  return SECTOR_LABELS[sector] ?? sector;
}

/** Objet de la demande, à défaut le pôle concerné. */
export function contactTopic(message: ContactMessage): string | null {
  return message.subject ?? sectorLabel(message.sector);
}

/**
 * Télécharge le CSV des messages correspondant à la liste affichée (mêmes
 * paramètres que `GET /admin/contacts`, sans pagination). Passer par
 * `adminFetch` plutôt que par un lien : une session expirée est renouvelée et
 * un refus (trop de messages, droit retiré) remonte comme une erreur lisible.
 * L'API consigne l'export dans le journal d'audit.
 */
export async function downloadContactsCsv(
  params: URLSearchParams,
): Promise<void> {
  let response: Response;
  try {
    response = await adminFetch(`/api/backend/admin/contacts/export?${params}`);
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Connexion au serveur impossible.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      body?.code ?? 'UNKNOWN_ERROR',
      body?.message ?? 'L’export a échoué.',
      [],
      typeof body?.requestId === 'string' ? body.requestId : undefined,
    );
  }
  const filename =
    response.headers
      .get('content-disposition')
      ?.match(/filename="([^"]+)"/i)?.[1] ?? 'messages-contact.csv';
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Laisse au navigateur le temps de démarrer l'enregistrement.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
