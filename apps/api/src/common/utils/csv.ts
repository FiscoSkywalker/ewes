/**
 * Export CSV destiné à Excel en français : séparateur `;`, fins de ligne CRLF
 * (RFC 4180) et BOM UTF-8 (sans lui, Excel lit les accents en ANSI).
 */
export const CSV_SEPARATOR = ';';
const BOM = '﻿';

/** Une cellule qui commence ainsi serait exécutée comme une formule par un tableur. */
const FORMULA_START = /^[=+\-@\t\r]/;
/** Numéro de téléphone : « +243 81 000 00 00 » est du texte, pas une formule. */
const PHONE_LIKE = /^[+-][\d\s().-]+$/;

/**
 * Valeur d'une cellule. Le texte saisi par un visiteur ne doit jamais être
 * interprété comme une formule (`=HYPERLINK(...)`, `@SUM(...)`) à l'ouverture
 * du fichier : on préfixe d'une apostrophe, que les tableurs n'affichent pas
 * (injection CSV, OWASP). Les champs contenant séparateur, guillemet ou saut
 * de ligne sont entre guillemets.
 */
export function csvCell(
  value: string | number | Date | null | undefined,
): string {
  if (value === null || value === undefined) return '';
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (FORMULA_START.test(text) && !PHONE_LIKE.test(text)) text = `'${text}`;
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Fichier CSV complet (en-tête puis lignes), prêt à être envoyé. */
export function toCsv(
  headers: readonly string[],
  rows: readonly (readonly (string | number | Date | null | undefined)[])[],
): string {
  const line = (
    cells: readonly (string | number | Date | null | undefined)[],
  ) => cells.map(csvCell).join(CSV_SEPARATOR);
  return `${BOM}${[headers, ...rows].map(line).join('\r\n')}\r\n`;
}
