import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import {
  mkdir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { escapeLike } from '../../common/utils/like.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import type { ListMediaDto } from './dto/list-media.dto.js';
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

/** Côté le plus long d'une vignette (px) : net sur une tuile de 200 px à 2x. */
const THUMB_SIZE = 640;
/** Garde-fou contre les images « bombes » (peu d'octets, des milliards de pixels). */
const MAX_INPUT_PIXELS = 100_000_000;

const NAME_COLLATOR = new Intl.Collator('fr', {
  sensitivity: 'base',
  numeric: true,
});

/** Vignette servie par la même route que l'original (`?size=thumb`). */
export const thumbUrl = (storedName: string) =>
  `${mediaUrl(storedName)}?size=thumb`;

const URL_PREFIX = '/uploads/';
const storedNameOf = (url: string) =>
  url.startsWith(URL_PREFIX) ? url.slice(URL_PREFIX.length) : url;

/** Contenu qui affiche une image : un article, une réalisation non supprimé ou un pôle. */
export interface MediaUsage {
  type: 'ARTICLE' | 'REALISATION' | 'SERVICE' | 'EXPERT';
  id: string;
  title: string;
}

type MediaRow = Prisma.MediaGetPayload<{
  include: { uploadedBy: { select: { fullName: true } } };
}>;

const WITH_UPLOADER = {
  uploadedBy: { select: { fullName: true } },
} satisfies Prisma.MediaInclude;

/** Résultat d'une suppression groupée : rien n'est tout-ou-rien, chaque média est jugé seul. */
export interface RemoveManyResult {
  deleted: string[];
  blocked: { id: string; reason: 'IN_USE' | 'NOT_FOUND' }[];
}

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
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

  /** Chemin disque de la vignette d'un nom stocké (WebP, dans `thumbs/`). */
  thumbPathOf(storedName: string) {
    this.pathOf(storedName); // refuse tout nom hors motif (traversée)
    return join(
      this.directory,
      'thumbs',
      `${storedName.slice(0, storedName.lastIndexOf('.'))}.webp`,
    );
  }

  /**
   * Fabrique la vignette (redressée selon l'EXIF, métadonnées retirées, WebP) :
   * écrite dans un fichier temporaire puis renommée, pour qu'une lecture
   * simultanée ne voie jamais un fichier à moitié écrit.
   */
  private async makeThumbnail(storedName: string, source?: Buffer) {
    const target = this.thumbPathOf(storedName);
    const input = source ?? (await readFile(this.pathOf(storedName)));
    const buffer = await sharp(input, {
      failOn: 'none',
      limitInputPixels: MAX_INPUT_PIXELS,
    })
      .rotate()
      .resize({
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 76 })
      .toBuffer();
    await mkdir(join(this.directory, 'thumbs'), { recursive: true });
    const temporary = `${target}.${randomUUID()}.tmp`;
    await writeFile(temporary, buffer);
    await rename(temporary, target);
    return target;
  }

  /**
   * Vignette d'une image : celle déjà fabriquée, sinon fabriquée maintenant
   * (images téléversées avant l'existence des vignettes).
   */
  async thumbnail(storedName: string) {
    const target = this.thumbPathOf(storedName);
    try {
      await stat(target);
      return target;
    } catch {
      try {
        return await this.makeThumbnail(storedName);
      } catch {
        // Original absent ou illisible : pour le visiteur, une image introuvable.
        throw new NotFoundException(MEDIA_NOT_FOUND);
      }
    }
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
      // Fabriquer la vignette prouve aussi que l'image se décode : une
      // signature valide ne suffit pas à accepter un fichier corrompu.
      try {
        await this.makeThumbnail(storedName, file.buffer);
      } catch {
        throw new UnsupportedMediaTypeException({
          code: 'MEDIA_UNREADABLE',
          message: 'Cette image est illisible ou corrompue.',
          details: [],
        });
      }
      const media = await this.prisma.media.create({
        data: {
          storedName,
          mimeType: image.mimeType,
          sizeBytes: file.size,
          originalName: file.originalname.slice(0, 255),
          uploadedById,
        },
        include: WITH_UPLOADER,
      });
      return this.toView(media, []);
    } catch (error) {
      await this.removeFile(storedName);
      throw error;
    }
  }

  /**
   * Images servant à des contenus non supprimés, par nom stocké. Une image
   * dont le seul contenu a été supprimé est de nouveau libre.
   */
  private async usageByStoredName(
    storedNames?: string[],
  ): Promise<Map<string, MediaUsage[]>> {
    const urls = storedNames && { in: storedNames.map(mediaUrl) };
    const [articles, realisations, services, experts] = await Promise.all([
      this.prisma.articleImage.findMany({
        where: { ...(urls && { url: urls }), article: { deletedAt: null } },
        select: { url: true, article: { select: { id: true, titleFr: true } } },
      }),
      this.prisma.realisationImage.findMany({
        where: {
          ...(urls && { url: urls }),
          realisation: { deletedAt: null },
        },
        select: {
          url: true,
          realisation: { select: { id: true, titleFr: true } },
        },
      }),
      this.prisma.service.findMany({
        where: urls ? { imageUrl: urls } : { imageUrl: { not: null } },
        select: { id: true, nameFr: true, imageUrl: true },
      }),
      this.prisma.expert.findMany({
        where: urls ? { photoUrl: urls } : { photoUrl: { not: null } },
        select: { id: true, fullName: true, photoUrl: true },
      }),
    ]);

    const usage = new Map<string, MediaUsage[]>();
    const add = (url: string, entry: MediaUsage) => {
      const key = storedNameOf(url);
      const list = usage.get(key) ?? [];
      // Une même image peut figurer deux fois dans un contenu : une seule ligne.
      if (!list.some((u) => u.type === entry.type && u.id === entry.id)) {
        list.push(entry);
      }
      usage.set(key, list);
    };
    for (const row of articles) {
      add(row.url, {
        type: 'ARTICLE',
        id: row.article.id,
        title: row.article.titleFr,
      });
    }
    for (const row of realisations) {
      add(row.url, {
        type: 'REALISATION',
        id: row.realisation.id,
        title: row.realisation.titleFr,
      });
    }
    for (const row of services) {
      if (!row.imageUrl) continue;
      add(row.imageUrl, { type: 'SERVICE', id: row.id, title: row.nameFr });
    }
    for (const row of experts) {
      if (!row.photoUrl) continue;
      add(row.photoUrl, { type: 'EXPERT', id: row.id, title: row.fullName });
    }
    return usage;
  }

  /**
   * Médiathèque : recherche, tri, filtre « utilisées / non utilisées » et, pour
   * chaque image, les contenus où elle apparaît. `meta.usage` donne les effectifs
   * (hors filtre d'usage, recherche comprise) pour les onglets de l'écran.
   */
  async list(query: ListMediaDto) {
    const { page, limit, q, usage, sort, order } = query;

    const usedNames = [...(await this.usageByStoredName()).keys()];
    const search: Prisma.MediaWhereInput = q
      ? { originalName: { contains: escapeLike(q), mode: 'insensitive' } }
      : {};
    const where: Prisma.MediaWhereInput = {
      ...search,
      ...(usage === 'used' && { storedName: { in: usedNames } }),
      ...(usage === 'unused' && { storedName: { notIn: usedNames } }),
    };

    const [{ rows, total }, all, used] = await Promise.all([
      sort === 'originalName'
        ? this.pageByName(where, order, page, limit)
        : this.pageByColumn(where, sort, order, page, limit),
      this.prisma.media.count({ where: search }),
      this.prisma.media.count({
        where: { ...search, storedName: { in: usedNames } },
      }),
    ]);

    const usages = await this.usageByStoredName(rows.map((m) => m.storedName));
    return {
      data: rows.map((m) => this.toView(m, usages.get(m.storedName) ?? [])),
      meta: {
        page,
        limit,
        total,
        usage: { all, used, unused: all - used },
      },
    };
  }

  /** Tri par date ou par poids : délégué à PostgreSQL. */
  private async pageByColumn(
    where: Prisma.MediaWhereInput,
    sort: 'createdAt' | 'sizeBytes',
    order: 'asc' | 'desc',
    page: number,
    limit: number,
  ) {
    const [rows, total] = await Promise.all([
      this.prisma.media.findMany({
        where,
        // Départage stable : une pagination ne répète ni n'oublie aucune ligne.
        orderBy: [{ [sort]: order }, { createdAt: 'desc' }, { id: 'asc' }],
        include: WITH_UPLOADER,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.media.count({ where }),
    ]);
    return { rows, total };
  }

  /**
   * Tri par nom : fait ici plutôt que par PostgreSQL, dont l'ordre des majuscules
   * et des accents dépend de la collation du serveur. Comparaison française
   * insensible à la casse et aux accents, chiffres en ordre naturel (« 2 » avant
   * « 10 »), noms absents toujours en dernier. Une médiathèque V1 se compte en
   * centaines d'images : seuls id et nom sont chargés avant de trancher la page.
   */
  private async pageByName(
    where: Prisma.MediaWhereInput,
    order: 'asc' | 'desc',
    page: number,
    limit: number,
  ) {
    const names = await this.prisma.media.findMany({
      where,
      select: { id: true, originalName: true, createdAt: true },
    });
    const sign = order === 'asc' ? 1 : -1;
    names.sort((a, b) => {
      if (a.originalName === null || b.originalName === null) {
        if (a.originalName !== b.originalName) {
          return a.originalName === null ? 1 : -1;
        }
      } else {
        const byName = NAME_COLLATOR.compare(a.originalName, b.originalName);
        if (byName !== 0) return sign * byName;
      }
      return (
        b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? -1 : 1)
      );
    });

    const ids = names.slice((page - 1) * limit, page * limit).map((m) => m.id);
    const found = await this.prisma.media.findMany({
      where: { id: { in: ids } },
      include: WITH_UPLOADER,
    });
    const byId = new Map(found.map((m) => [m.id, m]));
    return {
      rows: ids.flatMap((id) => byId.get(id) ?? []),
      total: names.length,
    };
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

  /** Média d'une adresse publique `/uploads/<nom>` ; 404 si elle n'en désigne aucun. */
  findByUrl(url: string) {
    return this.findByStoredName(storedNameOf(url));
  }

  async findById(id: string) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException(MEDIA_NOT_FOUND);
    return media;
  }

  /** Supprime un média, sauf s'il illustre encore un contenu. */
  async remove(id: string, actor: AuthenticatedUser) {
    const media = await this.findById(id);
    const usages = (await this.usageByStoredName([media.storedName])).get(
      media.storedName,
    );
    if (usages?.length) {
      throw new ConflictException({
        code: 'MEDIA_IN_USE',
        message: 'Ce média illustre encore un contenu : retirez-le d’abord.',
        details: [],
      });
    }
    await this.delete(media, actor);
  }

  /**
   * Suppression de plusieurs médias : chacun est jugé séparément (un média
   * utilisé ou déjà supprimé n'empêche pas les autres) et le résultat dit
   * lequel est passé ou non.
   */
  async removeMany(
    ids: string[],
    actor: AuthenticatedUser,
  ): Promise<RemoveManyResult> {
    const found = await this.prisma.media.findMany({
      where: { id: { in: ids } },
    });
    const byId = new Map(found.map((m) => [m.id, m]));
    const usage = await this.usageByStoredName(found.map((m) => m.storedName));

    const result: RemoveManyResult = { deleted: [], blocked: [] };
    for (const id of ids) {
      const media = byId.get(id);
      if (!media) {
        result.blocked.push({ id, reason: 'NOT_FOUND' });
      } else if (usage.get(media.storedName)?.length) {
        result.blocked.push({ id, reason: 'IN_USE' });
      } else {
        await this.delete(media, actor);
        result.deleted.push(id);
      }
    }
    return result;
  }

  /** Suppression auditée : l'entrée est écrite avant que le fichier ne disparaisse. */
  private async delete(
    media: {
      id: string;
      storedName: string;
      mimeType: string;
      sizeBytes: number;
      originalName: string | null;
    },
    actor: AuthenticatedUser,
  ) {
    await this.audit.record({
      actorId: actor.id,
      action: 'MEDIA_DELETED',
      entityType: 'Media',
      entityId: media.id,
      before: {
        originalName: media.originalName,
        mimeType: media.mimeType,
        sizeBytes: media.sizeBytes,
      },
    });
    await this.prisma.media.delete({ where: { id: media.id } });
    await this.removeFile(media.storedName);
  }

  private async removeFile(storedName: string) {
    for (const path of [
      this.pathOf(storedName),
      this.thumbPathOf(storedName),
    ]) {
      try {
        await unlink(path);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
  }

  private toView(media: MediaRow, usages: MediaUsage[]) {
    return {
      id: media.id,
      url: mediaUrl(media.storedName),
      thumbUrl: thumbUrl(media.storedName),
      mimeType: media.mimeType,
      sizeBytes: media.sizeBytes,
      originalName: media.originalName,
      createdAt: media.createdAt,
      // Nom seul : de quoi afficher « par … » sans exposer l'e-mail.
      uploadedByName: media.uploadedBy?.fullName ?? null,
      usages,
    };
  }
}
