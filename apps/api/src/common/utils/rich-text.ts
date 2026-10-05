import sanitizeHtml from 'sanitize-html';

/**
 * Texte enrichi des contenus éditoriaux (corps des actualités) : un HTML
 * volontairement très réduit, nettoyé ici à chaque écriture. Le navigateur
 * n'est jamais cru sur parole : ce que l'éditeur du portail produit n'est
 * qu'une proposition, seul le résultat de `normalizeRichText` est stocké
 * (blueprint/10_Security.md : aucune confiance dans le client).
 *
 * Les balises, attributs et adresses admis sont ceux de l'éditeur
 * (`apps/web/src/components/admin/rich-text/`) ; toute évolution se fait
 * des deux côtés.
 */

const ALLOWED_TAGS = [
  'p',
  'br',
  'h2',
  'h3',
  'strong',
  'em',
  'ul',
  'ol',
  'li',
  'blockquote',
  'a',
  'img',
];

/** Images : uniquement celles de la médiathèque (`/uploads/<fichier>`), jamais une adresse externe. */
const UPLOAD_SRC = /^\/uploads\/[A-Za-z0-9._-]+$/;

const EMPTY_PARAGRAPH = /<p>(?:\s|&nbsp;|<br ?\/?>)*<\/p>/g;

const EXTERNAL_LINK = /^https?:\/\//i;

/** Un contenu qui commence par une balise de bloc est du HTML ; sinon, c'est l'ancien texte brut. */
const BLOCK_START = /^\s*<(?:p|h[1-6]|ul|ol|blockquote|img|figure|div)\b/i;

export const isRichHtml = (content: string): boolean =>
  BLOCK_START.test(content);

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Ancien format (paragraphes séparés par une ligne vide) -> HTML. */
export function plainTextToHtml(text: string): string {
  return text
    .split(/\r?\n[^\S\r\n]*\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p>${escapeHtml(paragraph).replace(/\r?\n/g, '<br>')}</p>`,
    )
    .join('');
}

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: { a: ['href', 'rel', 'target'], img: ['src', 'alt'] },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  transformTags: {
    // Collages (Word, pages web) : on garde l'intention, pas la balise.
    b: 'strong',
    i: 'em',
    h1: 'h2',
    h4: 'h3',
    h5: 'h3',
    h6: 'h3',
    // Seuls `href` (et un `rel`/`target` imposés) survivent ; les liens externes s'ouvrent à part.
    a: (tagName, attribs): sanitizeHtml.Tag => {
      const href = attribs.href;
      if (!href) return { tagName, attribs: {} };
      return {
        tagName,
        attribs: EXTERNAL_LINK.test(href)
          ? { href, rel: 'noopener noreferrer', target: '_blank' }
          : { href },
      };
    },
  },
  exclusiveFilter: (frame) =>
    frame.tag === 'img' && !UPLOAD_SRC.test(frame.attribs.src ?? ''),
};

/** Vrai si le HTML montre quelque chose : du texte ou une image. */
function hasContent(html: string): boolean {
  if (html.includes('<img')) return true;
  const text = html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;|&#160;/g, ' ')
    .trim();
  return text.length > 0;
}

/**
 * Normalise le corps d'un article avant stockage : ancien texte brut converti
 * en paragraphes, HTML nettoyé, contenu vide ramené à `''` (un éditeur vide
 * produit `<p></p>`, qui ne doit pas passer pour un contenu).
 */
export function normalizeRichText(content: string): string {
  const html = isRichHtml(content) ? content : plainTextToHtml(content);
  // Les paragraphes vides (Entrée en trop, fin de texte) ne servent qu'à espacer : l'espacement vient de la charte.
  const clean = sanitizeHtml(html, OPTIONS).replace(EMPTY_PARAGRAPH, '');
  return hasContent(clean) ? clean : '';
}
