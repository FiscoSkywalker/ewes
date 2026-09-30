export type ExpertPole = 'env' | 'eau' | 'ing';

/**
 * Expert présenté sur /a-propos (textes dans `messages/*.json` →
 * `AboutPage.team.experts`). Forme calquée sur le futur module API
 * « équipe » : `photo` sera l'URL fournie par l'API.
 */
export interface Expert {
  id: string;
  name: string;
  role: string;
  pole: ExpertPole;
  specialties: string[];
  /** Années d'expérience. */
  years: number;
  bio: string;
  photo?: string;
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
  'expert-1': { src: '/assets/images/ewes-apropos-equipe.webp', x: 45, y: 24, zoom: 2.6 },
  'expert-2': { src: '/assets/images/ewes-apropos-equipe.webp', x: 83, y: 28, zoom: 2.4 },
  'expert-3': { src: '/assets/images/ewes-training-session.jpg', x: 53, y: 28, zoom: 3 },
  'expert-4': { src: '/assets/images/ewes-apropos-equipe.webp', x: 21, y: 38, zoom: 2.4 },
  'expert-5': { src: '/assets/images/ewes-laboratory-cinematic.png', x: 57, y: 28, zoom: 2.4 },
  'expert-6': { src: '/assets/images/ewes-apropos-equipe.webp', x: 65, y: 30, zoom: 2.6 },
};
