export type ExpertPole = 'env' | 'eau' | 'ing';

/**
 * Expert présenté sur /a-propos : celui du portail (`GET /experts`,
 * `lib/api/public-experts.ts`) ou, si l'API est injoignable, un profil
 * provisoire des messages (`AboutPage.team.experts`).
 */
export interface Expert {
  /** Identifiant d'affichage (ancres, onglets) ; sans lien avec la base. */
  id: string;
  name: string;
  role: string;
  /** Pôle de rattachement ; `null` : aucun (accent neutre, pas de pastille de pôle). */
  pole: ExpertPole | null;
  specialties: string[];
  /** Années d'expérience ; `null` : non renseignées (rien n'est affiché). */
  years: number | null;
  /** Présentation courte ; vide : rien n'est affiché. */
  bio: string;
  /** Portrait ; absent, un monogramme. */
  photo?: string;
  /** Point focal du portrait (% de l'image) ; absent, cadrage par défaut. */
  focal?: { x: number; y: number };
}
