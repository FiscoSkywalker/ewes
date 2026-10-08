import type { ContactMessage } from '@prisma/client';
import { toCsv } from '../../common/utils/csv.js';

/** Au-delà, l'export est refusé : mieux vaut affiner la recherche que produire un fichier ingérable. */
export const MAX_EXPORT_ROWS = 10_000;

/** Libellés français des besoins du formulaire (mêmes que ceux du portail). */
const SECTOR_LABELS: Record<string, string> = {
  ENVIRONNEMENT: 'Étude d’impact / audit environnemental',
  EAU: 'Eau (adduction, traitement, épuration)',
  ANALYSES: 'Analyses',
  GESTION: 'Gestion',
  INGENIERIE: 'Ingénierie',
  FORMATION: 'Formation',
  AUTRE: 'Autre',
};

const STATUS_LABELS: Record<ContactMessage['status'], string> = {
  NOUVEAU: 'À traiter',
  TRAITE: 'Traité',
};

const HEADERS = [
  'Date de réception',
  'Nom',
  'Organisation',
  'E-mail',
  'Téléphone',
  'Besoin',
  'Objet',
  'Message',
  'Langue',
  'Statut',
  'Dernière mise à jour',
] as const;

/**
 * Fichier CSV des messages : uniquement les champs saisis par l'expéditeur et
 * le suivi de l'équipe (jamais l'empreinte ni la clé d'idempotence). Dates en
 * ISO 8601 (UTC).
 */
export function contactsToCsv(messages: readonly ContactMessage[]): string {
  return toCsv(
    HEADERS,
    messages.map((m) => [
      m.createdAt,
      m.name,
      m.organization,
      m.email,
      m.phone,
      m.sector ? (SECTOR_LABELS[m.sector] ?? m.sector) : null,
      m.subject,
      m.message,
      m.locale,
      STATUS_LABELS[m.status],
      m.updatedAt,
    ]),
  );
}
