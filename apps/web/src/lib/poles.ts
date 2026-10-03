/**
 * Identité des trois pôles d'expertise EWES — source unique partagée par le
 * site public et le portail (blueprint/05_UI_UX_System.md §3) : un même pôle
 * garde le même accent minéral, le même code et le même visuel de repli
 * partout, et c'est son slug en base qui le relie à cette identité.
 */
export type PoleKey = 'env' | 'eau' | 'ing';

/** Ordre d'origine du site (celui du portail l'emporte dès qu'il est défini). */
export const POLE_KEYS: readonly PoleKey[] = ['env', 'eau', 'ing'];

/** Slug du service en base pour chaque pôle affiché sur le site. */
export const POLE_SLUGS: Record<PoleKey, string> = {
  env: 'environnement',
  eau: 'eau',
  ing: 'ingenierie',
};

/** Code court affiché sur les chapitres du site et les cartes du portail. */
export const POLE_CODES: Record<PoleKey, string> = {
  env: 'ENV',
  eau: 'H₂O',
  ing: 'ING',
};

/** Sur-titre d'un chapitre de pôle : « ENV · Environnement ». Le nom vient du portail. */
export const poleEyebrow = (pole: PoleKey, name: string) =>
  `${POLE_CODES[pole]} · ${name}`;

/** Accent minéral : malachite (Environnement), bleu acier (Eau), cuivre (Ingénierie). */
export const POLE_ACCENT_NAMES: Record<PoleKey, string> = {
  env: 'Malachite',
  eau: 'Bleu acier',
  ing: 'Cuivre',
};

/** Visuel d'origine de chaque pôle, tant qu'aucune image n'est choisie dans le portail. */
export const POLE_DEFAULT_IMAGES: Record<PoleKey, string> = {
  env: '/assets/images/ewes-environment-field.png',
  eau: '/assets/images/ewes-water-standpipe.jpg',
  ing: '/assets/images/ewes-laboratory-cinematic.png',
};

/** Pôle du site correspondant à un slug de service, ou `null` s'il n'a pas de chapitre. */
export function poleOfSlug(slug: string): PoleKey | null {
  return POLE_KEYS.find((pole) => POLE_SLUGS[pole] === slug) ?? null;
}
