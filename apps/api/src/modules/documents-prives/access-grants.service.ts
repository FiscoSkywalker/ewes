import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import type { ListGrantsDto } from './dto/access-grant.dto.js';

const grantNotFound = () =>
  new NotFoundException({
    code: 'ACCESS_GRANT_NOT_FOUND',
    message: 'Droit d’accès introuvable.',
    details: [],
  });

const USER_VIEW = {
  select: { id: true, email: true, fullName: true, role: true },
} satisfies Prisma.UserDefaultArgs;

/** Document d'un droit isolé, avec de quoi le situer (dossier, confidentialité, état). */
const DOCUMENT_VIEW = {
  select: {
    id: true,
    name: true,
    fileType: true,
    status: true,
    confidentiality: true,
    folder: { select: { id: true, name: true, confidentiality: true } },
  },
} satisfies Prisma.PrivateDocumentDefaultArgs;

/**
 * Gouvernance des droits documentaires (blueprint/09 §5) : seul
 * l'Administrateur (contrôleur) crée ou révoque un droit, toujours nominatif
 * et toujours audité avec sa valeur avant/après.
 */
@Injectable()
export class AccessGrantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Un droit se donne à un compte actif non administrateur (l'Administrateur a déjà tout). */
  private async assertGrantable(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, isActive: true, role: true },
    });
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur introuvable.',
        details: [],
      });
    }
    if (!user.isActive || user.role === Role.ADMINISTRATEUR) {
      throw new BadRequestException({
        code: 'GRANT_NOT_APPLICABLE',
        message:
          'Un droit ne se donne qu’à un compte actif de rôle Gestionnaire ou Utilisateur.',
        details: ['userId'],
      });
    }
  }

  async listFolderGrants(query: ListGrantsDto) {
    const data = await this.prisma.folderAccessGrant.findMany({
      where: {
        ...(query.folderId && { folderId: query.folderId }),
        ...(query.userId && { userId: query.userId }),
      },
      include: { user: USER_VIEW, folder: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return { data };
  }

  async createFolderGrant(
    actor: AuthenticatedUser,
    folderId: string,
    userId: string,
  ) {
    await this.assertGrantable(userId);
    const folder = await this.prisma.folder.findUnique({
      where: { id: folderId },
      select: { id: true, name: true },
    });
    if (!folder) {
      throw new NotFoundException({
        code: 'FOLDER_NOT_FOUND',
        message: 'Dossier introuvable.',
        details: [],
      });
    }
    let grant;
    try {
      grant = await this.prisma.folderAccessGrant.create({
        data: { folderId, userId, grantedById: actor.id },
        include: { user: USER_VIEW, folder: { select: { id: true, name: true } } },
      });
    } catch (error) {
      throw this.translateDuplicate(error);
    }
    await this.audit.record({
      actorId: actor.id,
      action: 'ACCESS_GRANTED',
      entityType: 'Folder',
      entityId: folderId,
      after: { userId, folderId, scope: 'folder' },
    });
    return grant;
  }

  async revokeFolderGrant(actor: AuthenticatedUser, id: string) {
    const grant = await this.prisma.folderAccessGrant.findUnique({ where: { id } });
    if (!grant) throw grantNotFound();
    await this.prisma.folderAccessGrant.delete({ where: { id } });
    await this.audit.record({
      actorId: actor.id,
      action: 'ACCESS_REVOKED',
      entityType: 'Folder',
      entityId: grant.folderId,
      before: { userId: grant.userId, folderId: grant.folderId, scope: 'folder' },
    });
  }

  async listDocumentGrants(query: ListGrantsDto) {
    const data = await this.prisma.documentAccessGrant.findMany({
      where: {
        ...(query.documentId && { privateDocumentId: query.documentId }),
        ...(query.userId && { userId: query.userId }),
        // Un document supprimé n'est plus atteignable : son droit n'a plus d'objet.
        privateDocument: { deletedAt: null },
      },
      include: { user: USER_VIEW, privateDocument: DOCUMENT_VIEW },
      orderBy: { createdAt: 'desc' },
    });
    return { data };
  }

  async createDocumentGrant(
    actor: AuthenticatedUser,
    documentId: string,
    userId: string,
  ) {
    await this.assertGrantable(userId);
    const document = await this.prisma.privateDocument.findFirst({
      where: { id: documentId, deletedAt: null },
      select: { id: true },
    });
    if (!document) {
      throw new NotFoundException({
        code: 'DOCUMENT_NOT_FOUND',
        message: 'Document introuvable.',
        details: [],
      });
    }
    let grant;
    try {
      grant = await this.prisma.documentAccessGrant.create({
        data: { privateDocumentId: documentId, userId, grantedById: actor.id },
        include: { user: USER_VIEW, privateDocument: DOCUMENT_VIEW },
      });
    } catch (error) {
      throw this.translateDuplicate(error);
    }
    await this.audit.record({
      actorId: actor.id,
      action: 'ACCESS_GRANTED',
      entityType: 'PrivateDocument',
      entityId: documentId,
      after: { userId, documentId, scope: 'document' },
    });
    return grant;
  }

  async revokeDocumentGrant(actor: AuthenticatedUser, id: string) {
    const grant = await this.prisma.documentAccessGrant.findUnique({ where: { id } });
    if (!grant) throw grantNotFound();
    await this.prisma.documentAccessGrant.delete({ where: { id } });
    await this.audit.record({
      actorId: actor.id,
      action: 'ACCESS_REVOKED',
      entityType: 'PrivateDocument',
      entityId: grant.privateDocumentId,
      before: {
        userId: grant.userId,
        documentId: grant.privateDocumentId,
        scope: 'document',
      },
    });
  }

  private translateDuplicate(error: unknown): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException({
        code: 'ACCESS_GRANT_EXISTS',
        message: 'Ce droit existe déjà.',
        details: [],
      });
    }
    return error;
  }
}
