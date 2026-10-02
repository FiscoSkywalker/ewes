import {
  Injectable,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { isPdf } from './document-signature.js';

/** Fichier reçu de multer (stockage mémoire) — seuls les champs utilisés. */
export interface UploadedDocument {
  buffer: Buffer;
  originalname: string;
  size: number;
}

/** Forme d'un nom stocké : uuid + `.pdf` (protège du path traversal). */
export const DOCUMENT_STORED_NAME_PATTERN = /^[0-9a-f-]{36}\.pdf$/;

/** URL publique relative (même origine que le site, réécrite vers l'API). */
export const documentFileUrl = (storedName: string) => `/files/${storedName}`;

/** Stockage disque des documents publics : `PUBLIC_MEDIA_PATH/documents`. */
@Injectable()
export class DocumentStorageService {
  constructor(private readonly config: ConfigService) {}

  private get directory() {
    return resolve(
      this.config.get<string>('PUBLIC_MEDIA_PATH', './storage/public'),
      'documents',
    );
  }

  /** Chemin disque d'un nom stocké ; le motif strict interdit toute traversée. */
  pathOf(storedName: string) {
    if (!DOCUMENT_STORED_NAME_PATTERN.test(storedName)) {
      throw new NotFoundException({
        code: 'DOCUMENT_FILE_NOT_FOUND',
        message: 'Fichier introuvable.',
        details: [],
      });
    }
    return join(this.directory, storedName);
  }

  /** Vérifie la signature PDF puis écrit le fichier sous un nom aléatoire. */
  async save(file: UploadedDocument) {
    if (!isPdf(file.buffer)) {
      throw new UnsupportedMediaTypeException({
        code: 'DOCUMENT_TYPE_NOT_ALLOWED',
        message: 'Seuls les fichiers PDF sont acceptés.',
        details: [],
      });
    }
    const storedName = `${randomUUID()}.pdf`;
    await mkdir(this.directory, { recursive: true });
    // 'wx' : n'écrase jamais un fichier existant.
    await writeFile(this.pathOf(storedName), file.buffer, { flag: 'wx' });
    return storedName;
  }

  async exists(storedName: string) {
    try {
      await stat(this.pathOf(storedName));
      return true;
    } catch {
      return false;
    }
  }

  async remove(storedName: string) {
    try {
      await unlink(this.pathOf(storedName));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}
