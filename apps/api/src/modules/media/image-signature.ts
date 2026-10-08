export interface DetectedImage {
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  extension: 'jpg' | 'png' | 'webp';
}

/** Taille maximale d'une image téléversée (blueprint/10_Security.md §3). */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Détermine le type réel d'une image d'après ses premiers octets, jamais
 * d'après le nom ou le type MIME déclarés par le client (falsifiables).
 * SVG volontairement exclu : il peut embarquer du script.
 */
export function detectImage(buffer: Buffer): DetectedImage | null {
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
  return null;
}
