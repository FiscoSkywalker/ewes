import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ConfidentialityLevel,
  DocumentLifecycleStatus,
  Prisma,
  PrivateDocument,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import {
  canReadFolder,
  canWriteDocument,
  confidentialityRank,
  readableDocumentWhere,
  type AccessScope,
} from './access-policy.js';
import type {
  ListPrivateDocumentsDto,
  SearchPrivateDocumentsDto,
  UpdatePrivateDocumentDto,
  UploadPrivateDocumentDto,
} from './dto/private-document.dto.js';
import { PrivateAccessService } from './private-access.service.js';
import {
  PrivateStorageService,
  type UploadedPrivateFile,
} from './private-storage.service.js';

/** Plafond de candidats retournés par la recherche avant filtrage par droit. */
const SEARCH_CANDIDATE_LIMIT = 500;

type DocumentWithFolder = PrivateDocument & {
  folder: { id: string; name: string };
};

const adminOnly = (message: string) =>
  new ForbiddenException({ code: 'FORBIDDEN_ROLE', message, details: [] });

/** Nom de fichier de téléchargement : ASCII sûr + forme UTF-8 (RFC 5987) pour les accents. */
function contentDisposition(name: string, extension: string) {
  const base = name.replace(/[\\/:*?"<>|\r\n\t]+/g, ' ').trim().slice(0, 150) || 'document';
  const ascii = base.normalize('NFD').replace(/[^\x20-\x7e]/g, '').replace(/"/g, '') || 'document';
  const encoded = encodeURIComponent(`${base}.${extension}`);
  return `attachment; filename="${ascii}.${extension}"; filename*=UTF-8''${encoded}`;
}

@Injectable()
export class PrivateDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: PrivateAccessService,
    private readonly storage: PrivateStorageService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Vue d'un document : jamais de nom de stockage ni de chemin ; le dossier
   * n'est nommé que s'il est lui-même lisible (un droit isolé sur un fichier
   * ne révèle pas son dossier).
   */
  private view(scope: AccessScope, document: DocumentWithFolder) {
    const folderVisible = canReadFolder(scope, document.folderId);
    const folderLevel = scope.folderLevels.get(document.folderId);
    return {
      id: document.id,
      name: document.name,
      description: document.description,
      folderId: folderVisible ? document.folderId : null,
      folderName: folderVisible ? document.folder.name : null,
      fileType: document.fileType,
      fileSizeBytes: document.fileSizeBytes,
      confidentiality: document.confidentiality ?? folderLevel ?? null,
      confidentialityOverride: document.confidentiality,
      status: document.status,
      canWrite: canWriteDocument(scope, document),
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }

  async list(user: AuthenticatedUser, query: ListPrivateDocumentsDto) {
    const scope = await this.access.scopeFor(user);
    const where: Prisma.PrivateDocumentWhereInput = {
      AND: [
        readableDocumentWhere(scope),
        {
          ...(query.folderId && { folderId: query.folderId }),
          ...(query.status && { status: query.status }),
        },
      ],
    };
    const [documents, total] = await Promise.all([
      this.prisma.privateDocument.findMany({
        where,
        include: { folder: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.privateDocument.count({ where }),
    ]);
    return {
      data: documents.map((d) => this.view(scope, d)),
      meta: { page: query.page, limit: query.limit, total },
    };
  }

  async get(user: AuthenticatedUser, id: string) {
    const scope = await this.access.scopeFor(user);
    return this.view(scope, await this.access.readableDocument(scope, id));
  }

  /** Téléverse un fichier dans un dossier où l'utilisateur a le droit d'écrire. */
  async upload(
    user: AuthenticatedUser,
    dto: UploadPrivateDocumentDto,
    file: UploadedPrivateFile,
  ) {
    const scope = await this.access.scopeFor(user);
    await this.access.assertWriteFolder(scope, dto.folderId);

    // Hors Administrateur, une surcharge ne peut qu'égaler ou durcir le dossier.
    const folderLevel = scope.folderLevels.get(dto.folderId)!;
    if (
      dto.confidentiality &&
      !scope.isAdmin &&
      confidentialityRank(dto.confidentiality) < confidentialityRank(folderLevel)
    ) {
      throw adminOnly(
        'Seul un Administrateur peut abaisser la confidentialité sous celle du dossier.',
      );
    }

    const { storedName, detected } = await this.storage.save(file);
    const name =
      dto.name ?? (file.originalname.replace(/\.[^.]*$/, '').slice(0, 200) || 'document');
    let document;
    try {
      document = await this.prisma.privateDocument.create({
        data: {
          folderId: dto.folderId,
          name,
          description: dto.description,
          storedName,
          fileType: detected.mimeType,
          fileSizeBytes: file.size,
          confidentiality: dto.confidentiality,
          uploadedById: user.id,
        },
        include: { folder: { select: { id: true, name: true } } },
      });
      await this.audit.record({
        actorId: user.id,
        action: 'DOCUMENT_UPLOADED',
        entityType: 'PrivateDocument',
        entityId: document.id,
        after: {
          name,
          folderId: dto.folderId,
          fileType: detected.mimeType,
          fileSizeBytes: file.size,
          confidentiality: dto.confidentiality ?? null,
        },
      });
    } catch (error) {
      // Rien ne doit subsister d'un téléversement non enregistré.
      await this.storage.remove(storedName);
      throw error;
    }
    return this.view(scope, document);
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdatePrivateDocumentDto,
  ) {
    const scope = await this.access.scopeFor(user);
    const current = await this.access.writableDocument(scope, id);

    const targetFolderId = dto.folderId ?? current.folderId;
    if (dto.folderId && dto.folderId !== current.folderId) {
      await this.access.assertWriteFolder(scope, dto.folderId);
    }

    // Abaisser la confidentialité effective (retrait ou assouplissement de la
    // surcharge, déplacement vers un dossier moins strict) : Administrateur seul.
    const level = (folderId: string, override: ConfidentialityLevel | null) =>
      confidentialityRank(
        override ?? scope.folderLevels.get(folderId) ?? ConfidentialityLevel.CONFIDENTIEL,
      );
    const newOverride =
      dto.confidentiality === undefined ? current.confidentiality : dto.confidentiality;
    if (
      !scope.isAdmin &&
      level(targetFolderId, newOverride) < level(current.folderId, current.confidentiality)
    ) {
      throw adminOnly('Seul un Administrateur peut abaisser la confidentialité d’un document.');
    }

    const updated = await this.prisma.privateDocument.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        confidentiality: dto.confidentiality,
        folderId: dto.folderId,
      },
      include: { folder: { select: { id: true, name: true } } },
    });

    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    for (const field of ['name', 'description', 'confidentiality', 'folderId'] as const) {
      if (updated[field] !== current[field]) {
        before[field] = current[field];
        after[field] = updated[field];
      }
    }
    if (Object.keys(after).length > 0) {
      await this.audit.record({
        actorId: user.id,
        action: 'DOCUMENT_UPDATED',
        entityType: 'PrivateDocument',
        entityId: id,
        before: before as Prisma.InputJsonObject,
        after: after as Prisma.InputJsonObject,
      });
    }
    return this.view(scope, updated);
  }

  /** Archive (reste consultable selon droit) ou restaure un document. */
  async setStatus(
    user: AuthenticatedUser,
    id: string,
    status: DocumentLifecycleStatus,
  ) {
    const scope = await this.access.scopeFor(user);
    const current = await this.access.writableDocument(scope, id);
    if (current.status === status) return this.view(scope, current);

    const updated = await this.prisma.privateDocument.update({
      where: { id },
      data: { status },
      include: { folder: { select: { id: true, name: true } } },
    });
    await this.audit.record({
      actorId: user.id,
      action:
        status === DocumentLifecycleStatus.ARCHIVED
          ? 'DOCUMENT_ARCHIVED'
          : 'DOCUMENT_RESTORED',
      entityType: 'PrivateDocument',
      entityId: id,
      before: { status: current.status },
      after: { status },
    });
    return this.view(scope, updated);
  }

  /**
   * Suppression logique, réservée à l'Administrateur (contrôleur) et tracée.
   * Le fichier est conservé sur le disque, inatteignable.
   */
  async remove(user: AuthenticatedUser, id: string) {
    const scope = await this.access.scopeFor(user);
    const current = await this.access.readableDocument(scope, id);
    await this.prisma.privateDocument.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.audit.record({
      actorId: user.id,
      action: 'DOCUMENT_DELETED',
      entityType: 'PrivateDocument',
      entityId: id,
      before: {
        name: current.name,
        folderId: current.folderId,
        status: current.status,
      },
    });
  }

  /**
   * Prépare un téléchargement : le droit est vérifié ici, à chaque requête,
   * puis l'événement est audité AVANT d'ouvrir le flux (pas de téléchargement
   * sans trace).
   */
  async prepareDownload(user: AuthenticatedUser, id: string) {
    const scope = await this.access.scopeFor(user);
    const document = await this.access.readableDocument(scope, id);
    if (!(await this.storage.exists(document.storedName))) {
      throw new NotFoundException({
        code: 'DOCUMENT_FILE_MISSING',
        message: 'Le fichier de ce document est introuvable.',
        details: [],
      });
    }
    await this.audit.record({
      actorId: user.id,
      action: 'DOCUMENT_DOWNLOADED',
      entityType: 'PrivateDocument',
      entityId: id,
      after: { fileType: document.fileType, fileSizeBytes: document.fileSizeBytes },
    });
    const extension = document.storedName.split('.').pop()!;
    return {
      stream: this.storage.openStream(document.storedName),
      mimeType: document.fileType,
      disposition: contentDisposition(document.name, extension),
    };
  }

  /**
   * Recherche plein texte PostgreSQL (nom, description, catégorie, projet,
   * département) restreinte au périmètre de l'utilisateur. Étape 1 : SQL
   * paramétré renvoyant des identifiants candidats classés par pertinence ;
   * étape 2 : lecture Prisma avec le filtre de droits appliqué EN BASE — un
   * candidat hors périmètre n'en ressort jamais.
   */
  async search(user: AuthenticatedUser, query: SearchPrivateDocumentsDto) {
    const scope = await this.access.scopeFor(user);
    const term = query.q.trim();
    const like = `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

    const candidates = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT d.id
      FROM private_documents d
      JOIN folders f ON f.id = d."folderId"
      WHERE d."deletedAt" IS NULL
        AND (
          to_tsvector('simple',
            coalesce(d.name, '') || ' ' || coalesce(d.description, '') || ' ' ||
            coalesce(f.name, '') || ' ' || coalesce(f.category, '') || ' ' ||
            coalesce(f."subCategory", '') || ' ' || coalesce(f."projectRef", '') || ' ' ||
            coalesce(f.department, ''))
          @@ websearch_to_tsquery('simple', ${term})
          OR d.name ILIKE ${like}
          OR f."projectRef" ILIKE ${like}
        )
      ORDER BY ts_rank(
          to_tsvector('simple', coalesce(d.name, '') || ' ' || coalesce(d.description, '')),
          websearch_to_tsquery('simple', ${term})) DESC,
        d."createdAt" DESC
      LIMIT ${SEARCH_CANDIDATE_LIMIT}
    `);

    const rank = new Map(candidates.map((c, i) => [c.id, i]));
    const readable = await this.prisma.privateDocument.findMany({
      where: {
        AND: [
          readableDocumentWhere(scope),
          { id: { in: candidates.map((c) => c.id) } },
        ],
      },
      include: { folder: { select: { id: true, name: true } } },
    });
    readable.sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);

    const start = (query.page - 1) * query.limit;
    return {
      data: readable
        .slice(start, start + query.limit)
        .map((d) => this.view(scope, d)),
      meta: { page: query.page, limit: query.limit, total: readable.length },
    };
  }
}
