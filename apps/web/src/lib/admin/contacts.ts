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
