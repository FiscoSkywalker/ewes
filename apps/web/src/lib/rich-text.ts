/**
 * Texte enrichi des actualités : un HTML réduit (titres h2/h3, gras, italique,
 * listes, citation, liens, images de la médiathèque), nettoyé par l'API à
 * chaque enregistrement (`apps/api/src/common/utils/rich-text.ts`, qui fait
 * foi). Les articles écrits avant l'éditeur sont du texte brut — paragraphes
 * séparés par une ligne vide — et le restent en base tant qu'ils ne sont pas
 * rouverts : ces deux formats doivent donc être lisibles partout.
 */

/** Un contenu qui commence par une balise de bloc est du HTML ; sinon, de l'ancien texte brut. */
const BLOCK_START = /^\s*<(?:p|h[1-6]|ul|ol|blockquote|img|figure|div)\b/i;

export const isRichHtml = (content: string): boolean =>
  BLOCK_START.test(content);

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Paragraphes d'un ancien texte brut (séparés par une ligne vide). */
export const plainTextParagraphs = (text: string): string[] =>
  text
    .split(/\r?\n[^\S\r\n]*\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

/** Contenu de n'importe quel format -> HTML (ouverture d'un ancien article dans l'éditeur). */
export function toRichHtml(content: string): string {
  if (!content.trim() || isRichHtml(content)) return content;
  return plainTextParagraphs(content)
    .map((p) => `<p>${escapeHtml(p).replace(/\r?\n/g, '<br>')}</p>`)
    .join('');
}

/** Nombre de mots visibles d'un contenu HTML (balises ignorées). */
export function countWords(html: string): number {
  const text = html
    .replace(/<\/(?:p|h[1-6]|li|blockquote)>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
  return text ? text.split(/\s+/).length : 0;
}
