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

/**
 * Recadrage d'une photo de groupe sur un visage : point focal (en %) et
 * zoom. Sert aux portraits provisoires ci-dessous ; une photo d'identité
 * fournie par l'API s'affiche sans recadrage.
 */
export interface PortraitCrop {
  src: string;
  x: number;
  y: number;
  zoom: number;
}

/**
 * PROVISOIRE — profils fictifs illustrés par des visuels générés (aucune
 * personne réelle), à remplacer par l'équipe réelle d'EWES avant la mise
 * en ligne.
 */
export const EXPERT_PLACEHOLDER_PORTRAITS: Record<string, PortraitCrop> = {
  'expert-1': {
    src: '/assets/images/ewes-apropos-equipe.webp',
    x: 45,
    y: 24,
    zoom: 2.6,
  },
  'expert-2': {
    src: '/assets/images/ewes-apropos-equipe.webp',
    x: 83,
    y: 28,
    zoom: 2.4,
  },
  'expert-3': {
    src: '/assets/images/ewes-training-session.jpg',
    x: 53,
    y: 28,
    zoom: 3,
  },
  'expert-4': {
    src: '/assets/images/ewes-apropos-equipe.webp',
    x: 21,
    y: 38,
    zoom: 2.4,
  },
  'expert-5': {
    src: '/assets/images/ewes-laboratory-cinematic.png',
    x: 57,
    y: 28,
    zoom: 2.4,
  },
  'expert-6': {
    src: '/assets/images/ewes-apropos-equipe.webp',
    x: 65,
    y: 30,
    zoom: 2.6,
  },
};
