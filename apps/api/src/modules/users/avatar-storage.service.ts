import {
  Injectable,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { createReadStream, type ReadStream } from 'node:fs';
import { mkdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { detectImage } from '../media/image-signature.js';

/** Fichier reçu de multer (stockage mémoire) — seuls les champs utilisés. */
export interface UploadedAvatar {
  buffer: Buffer;
}

/** Forme d'un nom stocké : uuid + `.webp` (protège du path traversal). */
const STORED_NAME_PATTERN = /^[0-9a-f-]{36}\.webp$/;

/** Côté de la photo enregistrée (px) : net à 96 px d'affichage en 2x ou 3x. */
export const AVATAR_SIZE = 512;

/** Garde-fou contre les images « bombes » (peu d'octets, des milliards de pixels). */
const MAX_INPUT_PIXELS = 100_000_000;

const AVATAR_NOT_FOUND = {
  code: 'AVATAR_NOT_FOUND',
  message: 'Aucune photo de profil.',
  details: [],
};

/**
 * Photos de profil, dans `avatars/` sous `PRIVATE_STORAGE_PATH` : hors de toute
 * racine servie, donc lues uniquement par l'API après authentification (une
 * photo de profil n'est pas un contenu public). Le dossier suit les
 * sauvegardes de l'espace privé sans variable d'environnement de plus.
 *
 * Chaque photo est ré-encodée : l'image reçue n'est jamais conservée telle
 * quelle (métadonnées EXIF et GPS retirées, orientation appliquée, recadrée
 * au carré), quoi que le fichier contienne d'autre.
 */
@Injectable()
export class AvatarStorageService {
  constructor(private readonly config: ConfigService) {}

  private get directory() {
    return resolve(
      this.config.get<string>('PRIVATE_STORAGE_PATH', './storage/private'),
      'avatars',
    );
  }

  private pathOf(storedName: string) {
    if (!STORED_NAME_PATTERN.test(storedName))
      throw new NotFoundException(AVATAR_NOT_FOUND);
    return join(this.directory, storedName);
  }

  /** Vérifie le type réel, recadre au carré, ré-encode en WebP, écrit sous un nom aléatoire. */
  async save(file: UploadedAvatar): Promise<string> {
    if (!detectImage(file.buffer)) {
      throw new UnsupportedMediaTypeException({
        code: 'MEDIA_TYPE_NOT_ALLOWED',
        message: 'Seules les images JPEG, PNG et WebP sont acceptées.',
        details: [],
      });
    }

    let encoded: Buffer;
    try {
      encoded = await sharp(file.buffer, {
        failOn: 'none',
        limitInputPixels: MAX_INPUT_PIXELS,
      })
        .rotate()
        .resize({ width: AVATAR_SIZE, height: AVATAR_SIZE, fit: 'cover' })
        .webp({ quality: 84 })
        .toBuffer();
    } catch {
      // Une signature valide ne suffit pas : l'image doit se décoder.
      throw new UnsupportedMediaTypeException({
        code: 'MEDIA_UNREADABLE',
        message: 'Cette image est illisible ou corrompue.',
        details: [],
      });
    }

    const storedName = `${randomUUID()}.webp`;
    const target = this.pathOf(storedName);
    await mkdir(this.directory, { recursive: true });
    // Écrit puis renommé : une lecture simultanée ne voit jamais un fichier à moitié écrit.
    const temporary = `${target}.${randomUUID()}.tmp`;
    await writeFile(temporary, encoded, { flag: 'wx' });
    await rename(temporary, target);
    return storedName;
  }

  /** Ouvre la photo pour la renvoyer ; l'appelant a déjà vérifié que c'est la sienne. */
  async open(
    storedName: string,
  ): Promise<{ stream: ReadStream; size: number }> {
    const path = this.pathOf(storedName);
    try {
      const { size } = await stat(path);
      return { stream: createReadStream(path), size };
    } catch {
      throw new NotFoundException(AVATAR_NOT_FOUND);
    }
  }

  /** Supprime une photo ; sans erreur si elle a déjà disparu. */
  async remove(storedName: string): Promise<void> {
    try {
      await unlink(this.pathOf(storedName));
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        (error as NodeJS.ErrnoException).code === 'ENOENT'
      ) {
        return;
      }
      throw error;
    }
  }
}
