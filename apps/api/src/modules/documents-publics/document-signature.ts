/** Taille maximale d'un document public téléversé (blueprint/10_Security.md §3). */
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

export const DOCUMENT_MIME_TYPE = 'application/pdf';

/**
 * Un document public est un PDF, reconnu à sa signature (`%PDF-`) et jamais
 * d'après le nom ou le type MIME déclarés par le client. Les formats
 * bureautiques (conteneurs ZIP) ne sont pas acceptés : leur contenu réel ne
 * se vérifie pas à partir des seuls premiers octets.
 */
export function isPdf(buffer: Buffer): boolean {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString('latin1') === '%PDF-';
}
