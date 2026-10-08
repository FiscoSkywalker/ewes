/**
 * Échappe `\`, `%` et `_` d'une saisie destinée à un `contains` Prisma : Prisma
 * ne le fait pas, et un `%` tapé dans une recherche ferait sinon correspondre
 * toutes les lignes.
 */
export const escapeLike = (text: string): string =>
  text.replace(/[\\%_]/g, '\\$&');
