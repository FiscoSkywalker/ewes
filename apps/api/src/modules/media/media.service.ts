import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { PrismaService } from '../../prisma/prisma.service.js';
import { detectImage } from './image-signature.js';

/** Fichier reçu de multer (stockage mémoire) — seuls les champs utilisés. */
export interface UploadedImage {
  buffer: Buffer;
  originalname: string;
  size: number;
}

/** Forme d'un nom stocké : uuid + extension autorisée (protège du path traversal). */
export const STORED_NAME_PATTERN = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

const MEDIA_NOT_FOUND = {
  code: 'MEDIA_NOT_FOUND',
  message: 'Média introuvable.',
  details: [],
};

/** URL publique relative (même origine que le site, réécrite vers l'API). */
export const mediaUrl = (storedName: string) => `/uploads/${storedName}`;

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get directory() {
    return resolve(
      this.config.get<string>('PUBLIC_MEDIA_PATH', './storage/public'),
    );
  }

  /** Chemin disque d'un nom stocké ; le motif strict interdit toute traversée. */
  pathOf(storedName: string) {
    if (!STORED_NAME_PATTERN.test(storedName)) {
      throw new NotFoundException(MEDIA_NOT_FOUND);
    }
    return join(this.directory, storedName);
  }

  async upload(file: UploadedImage, uploadedById: string) {
    const image = detectImage(file.buffer);
    if (!image) {
      throw new UnsupportedMediaTypeException({
        code: 'MEDIA_TYPE_NOT_ALLOWED',
        message: 'Seules les images JPEG, PNG et WebP sont acceptées.',
        details: [],
      });
    }

    const storedName = `${randomUUID()}.${image.extension}`;
    await mkdir(this.directory, { recursive: true });
    // 'wx' : n'écrase jamais un fichier existant.
    await writeFile(this.pathOf(storedName), file.buffer, { flag: 'wx' });

    try {
      const media = await this.prisma.media.create({
        data: {
          storedName,
          mimeType: image.mimeType,
          sizeBytes: file.size,
          originalName: file.originalname.slice(0, 255),
          uploadedById,
        },
      });
      return this.toView(media);
    } catch (error) {
      await this.removeFile(storedName);
      throw error;
    }
  }

  async list(page: number, limit: number) {
    const [data, total] = await Promise.all([
      this.prisma.media.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.media.count(),
    ]);
    return { data: data.map((m) => this.toView(m)), meta: { page, limit, total } };
  }

  /** Média enregistré, par nom stocké (seuls les fichiers connus sont servis). */
  async findByStoredName(storedName: string) {
    if (!STORED_NAME_PATTERN.test(storedName)) {
      throw new NotFoundException(MEDIA_NOT_FOUND);
    }
    const media = await this.prisma.media.findUnique({ where: { storedName } });
    if (!media) throw new NotFoundException(MEDIA_NOT_FOUND);
    return media;
  }

  async findById(id: string) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException(MEDIA_NOT_FOUND);
    return media;
  }

  /** Supprime un média, sauf s'il illustre encore un contenu. */
  async remove(id: string) {
    const media = await this.findById(id);
    const url = mediaUrl(media.storedName);
    const [articles, realisations] = await Promise.all([
      this.prisma.articleImage.count({ where: { url } }),
      this.prisma.realisationImage.count({ where: { url } }),
    ]);
    if (articles + realisations > 0) {
      throw new ConflictException({
        code: 'MEDIA_IN_USE',
        message: 'Ce média illustre encore un contenu : retirez-le d’abord.',
        details: [],
      });
    }
    await this.prisma.media.delete({ where: { id } });
    await this.removeFile(media.storedName);
  }

  private async removeFile(storedName: string) {
    try {
      await unlink(this.pathOf(storedName));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }

  private toView(media: {
    id: string;
    storedName: string;
    mimeType: string;
    sizeBytes: number;
    originalName: string | null;
    createdAt: Date;
  }) {
    return {
      id: media.id,
      url: mediaUrl(media.storedName),
      mimeType: media.mimeType,
      sizeBytes: media.sizeBytes,
      originalName: media.originalName,
      createdAt: media.createdAt,
    };
  }
}
