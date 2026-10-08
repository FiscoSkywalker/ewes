/** Taille maximale d'un document privé téléversé (blueprint/10_Security.md §3). */
export const MAX_PRIVATE_FILE_BYTES = 25 * 1024 * 1024;

export interface DetectedPrivateFile {
  mimeType: string;
  extension: 'pdf' | 'png' | 'jpg' | 'webp' | 'docx' | 'xlsx' | 'pptx';
}

const OOXML_MIME = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
} as const;

/**
 * Type réel d'un fichier privé, déduit de son contenu (jamais du nom ni du
 * type MIME déclarés). PDF, images JPEG/PNG/WebP, et Office OOXML (DOCX, XLSX,
 * PPTX : archive ZIP dont les entrées `[Content_Types].xml` et `word/`, `xl/`
 * ou `ppt/` sont présentes). Ces fichiers ne sont jamais servis en ligne ni à
 * un visiteur anonyme : toujours en téléchargement authentifié, `nosniff`.
 */
export function detectPrivateFile(buffer: Buffer): DetectedPrivateFile | null {
  if (
    buffer.length >= 5 &&
    buffer.subarray(0, 5).toString('latin1') === '%PDF-'
  ) {
    return { mimeType: 'application/pdf', extension: 'pdf' };
  }
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { mimeType: 'image/jpeg', extension: 'jpg' };
  }
  if (
    buffer.length >= 8 &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { mimeType: 'image/png', extension: 'png' };
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { mimeType: 'image/webp', extension: 'webp' };
  }
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04 &&
    buffer.includes('[Content_Types].xml')
  ) {
    for (const [extension, folder] of [
      ['docx', 'word/'],
      ['xlsx', 'xl/'],
      ['pptx', 'ppt/'],
    ] as const) {
      if (buffer.includes(folder)) {
        return { mimeType: OOXML_MIME[extension], extension };
      }
    }
  }
  return null;
}
