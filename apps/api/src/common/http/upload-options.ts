import type { FileInterceptor } from '@nestjs/platform-express';

type MulterOptions = NonNullable<Parameters<typeof FileInterceptor>[1]>;

/**
 * Options Multer communes à tous les téléversements (un seul fichier, champ `file`).
 *
 * `defParamCharset: 'utf8'` : sans cela, busboy décode le nom du fichier en
 * latin1 alors que les navigateurs l'envoient en UTF-8 (« Pôle Eau.png »
 * deviendrait « PÃ´le Eau.png »). Toute nouvelle route d'upload doit passer
 * par cette fonction plutôt que de recréer ses options.
 */
export function singleFileUploadOptions(maxBytes: number): MulterOptions {
  return {
    defParamCharset: 'utf8',
    limits: { fileSize: maxBytes, files: 1 },
  };
}
