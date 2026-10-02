/**
 * Concatène des classes en ignorant les valeurs vides. Pas de fusion des
 * conflits Tailwind (aucune dépendance ajoutée) : le `className` passé à un
 * composant du kit sert à la mise en page (marges, largeur), pas à
 * redéfinir ses variantes.
 */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/** Anneau de focus clavier commun à tous les contrôles du portail. */
export const focusRing =
  'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';
