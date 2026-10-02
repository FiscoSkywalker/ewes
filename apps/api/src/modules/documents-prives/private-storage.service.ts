import {
  Injectable,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { createReadStream, type ReadStream } from 'node:fs';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  detectPrivateFile,
  type DetectedPrivateFile,
} from './private-file-signature.js';

/** Fichier reçu de multer (stockage mémoire) — seuls les champs utilisés. */
export interface UploadedPrivateFile {
  buffer: Buffer;
  originalname: string;
  size: number;
}

/** Forme d'un nom stocké : uuid + extension autorisée (protège du path traversal). */
const STORED_NAME_PATTERN = /^[0-9a-f-]{36}\.(pdf|png|jpg|webp|docx|xlsx|pptx)$/;

/**
 * Stockage disque des documents privés sous `PRIVATE_STORAGE_PATH`, hors de
 * toute racine servie (blueprint/11 §6) : aucun chemin ni nom de stockage
 * n'est jamais renvoyé à un client ; la lecture passe par `openStream`,
 * appelée uniquement après vérification du droit.
 */
@Injectable()
export class PrivateStorageService {
  constructor(private readonly config: ConfigService) {}

  private get directory() {
    return resolve(
      this.config.get<string>('PRIVATE_STORAGE_PATH', './storage/private'),
    );
  }

  private pathOf(storedName: string) {
    if (!STORED_NAME_PATTERN.test(storedName)) {
      throw new NotFoundException({
        code: 'DOCUMENT_FILE_NOT_FOUND',
        message: 'Fichier introuvable.',
        details: [],
      });
    }
    return join(this.directory, storedName);
  }

  /** Vérifie le type réel puis écrit le fichier sous un nom aléatoire. */
  async save(file: UploadedPrivateFile): Promise<{
    storedName: string;
    detected: DetectedPrivateFile;
  }> {
    const detected = detectPrivateFile(file.buffer);
    if (!detected) {
      throw new UnsupportedMediaTypeException({
        code: 'DOCUMENT_TYPE_NOT_ALLOWED',
        message:
          'Formats acceptés : PDF, JPEG, PNG, WebP, DOCX, XLSX et PPTX.',
        details: [],
      });
    }
    const storedName = `${randomUUID()}.${detected.extension}`;
    await mkdir(this.directory, { recursive: true });
    // 'wx' : n'écrase jamais un fichier existant.
    await writeFile(this.pathOf(storedName), file.buffer, { flag: 'wx' });
    return { storedName, detected };
  }

  async exists(storedName: string) {
    try {
      await stat(this.pathOf(storedName));
      return true;
    } catch {
      return false;
    }
  }

  openStream(storedName: string): ReadStream {
    return createReadStream(this.pathOf(storedName));
  }

  async remove(storedName: string) {
    try {
      await unlink(this.pathOf(storedName));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}
