/** Longueur visée pour la description affichée par les moteurs de recherche. */
export const META_DESCRIPTION_LENGTH = 160;

/**
 * Coupe un texte à `max` caractères au plus, sur une fin de mot, avec une
 * ellipse (un extrait de résultat de recherche ne s'arrête pas en plein mot).
 * Partagé par le site public (description d'une page sans description
 * propre) et l'aperçu du portail : les deux doivent produire le même texte.
 */
export function excerpt(text: string, max = META_DESCRIPTION_LENGTH) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.–-]+$/, '')}…`;
}
