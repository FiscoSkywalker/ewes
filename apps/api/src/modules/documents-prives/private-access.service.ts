import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import {
  buildScope,
  canReadDocument,
  canReadFolder,
  canWriteDocument,
  canWriteFolder,
  type AccessScope,
} from './access-policy.js';

const folderForbidden = () =>
  new ForbiddenException({
    code: 'FOLDER_ACCESS_FORBIDDEN',
    message: 'Vous n’avez pas accès à ce dossier.',
    details: [],
  });

const documentForbidden = () =>
  new ForbiddenException({
    code: 'DOCUMENT_ACCESS_FORBIDDEN',
    message: 'Vous n’avez pas accès à ce document.',
    details: [],
  });

const writeForbidden = () =>
  new ForbiddenException({
    code: 'DOCUMENT_WRITE_FORBIDDEN',
    message: 'Vous n’avez pas le droit de modifier ce contenu.',
    details: [],
  });

const folderNotFound = () =>
  new NotFoundException({
    code: 'FOLDER_NOT_FOUND',
    message: 'Dossier introuvable.',
    details: [],
  });

const documentNotFound = () =>
  new NotFoundException({
    code: 'DOCUMENT_NOT_FOUND',
    message: 'Document introuvable.',
    details: [],
  });

/**
 * Applique la politique d'accès (`access-policy.ts`) aux requêtes. Un
 * utilisateur non administrateur reçoit le même 403 qu'une ressource existe
 * ou non : l'existence d'un dossier ou d'un document hors de son périmètre ne
 * se devine jamais. Seul l'Administrateur obtient un 404 explicite.
 */
@Injectable()
export class PrivateAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Périmètre de l'utilisateur courant : 3 requêtes, calculé une fois par requête HTTP. */
  async scopeFor(user: AuthenticatedUser): Promise<AccessScope> {
    const isAdmin = user.role === 'ADMINISTRATEUR';
    const [folders, folderGrants, documentGrants] = await Promise.all([
      this.prisma.folder.findMany({
        select: { id: true, parentId: true, confidentiality: true },
      }),
      isAdmin
        ? []
        : this.prisma.folderAccessGrant.findMany({
            where: { userId: user.id },
            select: { folderId: true },
          }),
      isAdmin
        ? []
        : this.prisma.documentAccessGrant.findMany({
            where: { userId: user.id },
            select: { privateDocumentId: true },
          }),
    ]);
    return buildScope({
      userId: user.id,
      role: user.role,
      folders,
      grantedFolderIds: folderGrants.map((g) => g.folderId),
      grantedDocumentIds: documentGrants.map((g) => g.privateDocumentId),
    });
  }

  /**
   * Trace un refus d'accès (tentative d'exploration ou droit révoqué) puis le
   * relance : un refus répété sur des identifiants différents se repère dans
   * le journal. L'identifiant demandé est consigné tel quel, jamais le contenu.
   */
  private async deny(
    scope: AccessScope,
    entityType: 'Folder' | 'PrivateDocument',
    entityId: string,
    error: Error,
  ): Promise<never> {
    await this.audit.record({
      actorId: scope.userId,
      action:
        entityType === 'Folder'
          ? 'FOLDER_ACCESS_DENIED'
          : 'DOCUMENT_ACCESS_DENIED',
      entityType,
      entityId,
    });
    throw error;
  }

  async assertReadFolder(scope: AccessScope, folderId: string): Promise<void> {
    if (canReadFolder(scope, folderId)) {
      // Administrateur : encore faut-il que le dossier existe.
      if (scope.isAdmin && !scope.folderLevels.has(folderId)) {
        throw folderNotFound();
      }
      return;
    }
    await this.deny(scope, 'Folder', folderId, folderForbidden());
  }

  async assertWriteFolder(scope: AccessScope, folderId: string): Promise<void> {
    if (!canReadFolder(scope, folderId)) {
      await this.deny(scope, 'Folder', folderId, folderForbidden());
    }
    if (scope.isAdmin && !scope.folderLevels.has(folderId)) {
      throw folderNotFound();
    }
    if (!canWriteFolder(scope, folderId)) {
      await this.deny(scope, 'Folder', folderId, writeForbidden());
    }
  }

  /** Charge un document non supprimé et vérifie le droit de lecture. */
  async readableDocument(scope: AccessScope, id: string) {
    const document = await this.prisma.privateDocument.findFirst({
      where: { id, deletedAt: null },
      include: { folder: { select: { id: true, name: true } } },
    });
    if (!document) {
      if (scope.isAdmin) throw documentNotFound();
      return this.deny(scope, 'PrivateDocument', id, documentForbidden());
    }
    if (!canReadDocument(scope, document)) {
      return this.deny(scope, 'PrivateDocument', id, documentForbidden());
    }
    return document;
  }

  /** Charge un document et vérifie le droit d'écriture (lecture + écriture sur le dossier). */
  async writableDocument(scope: AccessScope, id: string) {
    const document = await this.readableDocument(scope, id);
    if (!canWriteDocument(scope, document)) {
      return this.deny(scope, 'PrivateDocument', id, writeForbidden());
    }
    return document;
  }
}
