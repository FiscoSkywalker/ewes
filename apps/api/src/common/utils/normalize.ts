/**
 * Texte prêt à être comparé pour une recherche : sans accents ni casse, avec
 * l'apostrophe typographique ramenée à un espace (« l’eau » = « l eau »).
 */
export const normalizeSearch = (text: string): string =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ').toLowerCase();
