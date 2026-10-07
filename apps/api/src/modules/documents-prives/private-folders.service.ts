import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ConfidentialityLevel,
  DocumentLifecycleStatus,
  Folder,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import {
  canReadFolder,
  canWriteFolder,
  readableDocumentWhere,
  visibleParentId,
  type AccessScope,
} from './access-policy.js';
import type { CreateFolderDto, UpdateFolderDto } from './dto/folder.dto.js';
import { PrivateAccessService } from './private-access.service.js';

/** Champs d'un dossier propres au classement (modifiables par un Gestionnaire autorisé). */
const CLASSIFICATION_FIELDS = [
  'name',
  'category',
  'subCategory',
  'projectRef',
  'year',
  'department',
] as const;

const folderNotFound = () =>
  new NotFoundException({
    code: 'FOLDER_NOT_FOUND',
    message: 'Dossier introuvable.',
    details: [],
  });

const adminOnly = (message: string) =>
  new ForbiddenException({
    code: 'FORBIDDEN_ROLE',
    message,
    details: [],
  });

@Injectable()
export class PrivateFoldersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: PrivateAccessService,
    private readonly audit: AuditService,
  ) {}

  /** Vue d'un dossier : le parent n'est révélé que s'il est lui-même lisible. */
  private view(scope: AccessScope, folder: Folder, documentCount = 0) {
    return {
      id: folder.id,
      name: folder.name,
      category: folder.category,
      subCategory: folder.subCategory,
      projectRef: folder.projectRef,
      year: folder.year,
      department: folder.department,
      confidentiality: folder.confidentiality,
      parentId: visibleParentId(scope, folder.parentId),
      canWrite: canWriteFolder(scope, folder.id),
      documentCount,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    };
  }

  /**
   * Nombre de documents actifs par dossier, limité à ceux que l'utilisateur
   * peut lire : un document plus confidentiel que son dossier n'est pas compté
   * pour qui ne le verrait pas.
   */
  private async documentCounts(scope: AccessScope, folderIds?: string[]) {
    const rows = await this.prisma.privateDocument.groupBy({
      by: ['folderId'],
      where: {
        AND: [
          readableDocumentWhere(scope),
          {
            status: DocumentLifecycleStatus.ACTIVE,
            ...(folderIds && { folderId: { in: folderIds } }),
          },
        ],
      },
      _count: { _all: true },
    });
    return new Map(rows.map((row) => [row.folderId, row._count._all]));
  }

  /** Arborescence à plat : uniquement les nœuds auxquels l'utilisateur a droit. */
  async list(user: AuthenticatedUser) {
    const scope = await this.access.scopeFor(user);
    const folders = await this.prisma.folder.findMany({
      where: scope.isAdmin ? {} : { id: { in: [...scope.readableFolderIds] } },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    const counts = await this.documentCounts(scope);
    // Un document partagé isolément ne doit pas trahir son dossier : seuls les
    // dossiers de la liste (donc lisibles) reçoivent un compte.
    return {
      data: folders.map((f) => this.view(scope, f, counts.get(f.id) ?? 0)),
    };
  }

  /** Un dossier lisible, avec ses sous-dossiers lisibles. */
  async get(user: AuthenticatedUser, id: string) {
    const scope = await this.access.scopeFor(user);
    await this.access.assertReadFolder(scope, id);
    const folder = await this.prisma.folder.findUniqueOrThrow({
      where: { id },
    });
    const children = await this.prisma.folder.findMany({
      where: {
        parentId: id,
        ...(scope.isAdmin ? {} : { id: { in: [...scope.readableFolderIds] } }),
      },
      orderBy: { name: 'asc' },
    });
    const counts = await this.documentCounts(scope, [
      id,
      ...children.map((c) => c.id),
    ]);
    return {
      ...this.view(scope, folder, counts.get(id) ?? 0),
      children: children.map((c) => this.view(scope, c, counts.get(c.id) ?? 0)),
    };
  }

  async create(user: AuthenticatedUser, dto: CreateFolderDto) {
    const scope = await this.access.scopeFor(user);

    let parentLevel: ConfidentialityLevel | undefined;
    if (dto.parentId) {
      await this.access.assertWriteFolder(scope, dto.parentId);
      parentLevel = scope.folderLevels.get(dto.parentId);
    } else if (!scope.isAdmin) {
      // Seul un Administrateur crée un dossier de premier niveau (09 §4).
      throw adminOnly(
        'Seul un Administrateur peut créer un dossier de premier niveau.',
      );
    }
    if (dto.confidentiality && !scope.isAdmin) {
      throw adminOnly(
        'Seul un Administrateur définit la confidentialité d’un dossier.',
      );
    }

    const folder = await this.prisma.folder.create({
      data: {
        name: dto.name,
        category: dto.category,
        subCategory: dto.subCategory,
        projectRef: dto.projectRef,
        year: dto.year,
        department: dto.department,
        parentId: dto.parentId,
        confidentiality:
          dto.confidentiality ?? parentLevel ?? ConfidentialityLevel.RESTREINT,
      },
    });
    await this.audit.record({
      actorId: user.id,
      action: 'FOLDER_CREATED',
      entityType: 'Folder',
      entityId: folder.id,
      after: {
        name: folder.name,
        parentId: folder.parentId,
        confidentiality: folder.confidentiality,
      },
    });
    return this.view(scope, folder);
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateFolderDto) {
    const scope = await this.access.scopeFor(user);
    await this.access.assertWriteFolder(scope, id);
    if (dto.confidentiality !== undefined && !scope.isAdmin) {
      throw adminOnly(
        'Seul un Administrateur modifie la confidentialité d’un dossier.',
      );
    }

    const before = await this.prisma.folder.findUniqueOrThrow({
      where: { id },
    });
    const data: Prisma.FolderUpdateInput = {
      confidentiality: dto.confidentiality,
    };
    for (const field of CLASSIFICATION_FIELDS) {
      if (dto[field] !== undefined)
        Object.assign(data, { [field]: dto[field] });
    }
    const folder = await this.prisma.folder.update({ where: { id }, data });

    const changed: Record<string, unknown> = {};
    const previous: Record<string, unknown> = {};
    for (const field of [
      ...CLASSIFICATION_FIELDS,
      'confidentiality',
    ] as const) {
      if (folder[field] !== before[field]) {
        previous[field] = before[field];
        changed[field] = folder[field];
      }
    }
    if (Object.keys(changed).length > 0) {
      await this.audit.record({
        actorId: user.id,
        action: 'FOLDER_UPDATED',
        entityType: 'Folder',
        entityId: id,
        before: previous as Prisma.InputJsonObject,
        after: changed as Prisma.InputJsonObject,
      });
    }
    const counts = await this.documentCounts(scope, [id]);
    return this.view(scope, folder, counts.get(id) ?? 0);
  }

  /** Suppression réservée à l'Administrateur ; refusée tant que le dossier n'est pas vide. */
  async remove(user: AuthenticatedUser, id: string) {
    const scope = await this.access.scopeFor(user);
    await this.access.assertReadFolder(scope, id);
    const folder = await this.prisma.folder.findUniqueOrThrow({
      where: { id },
    });

    const [children, documents] = await Promise.all([
      this.prisma.folder.count({ where: { parentId: id } }),
      // Y compris les documents supprimés logiquement : leur trace reste liée au dossier.
      this.prisma.privateDocument.count({ where: { folderId: id } }),
    ]);
    if (children > 0 || documents > 0) {
      throw new ConflictException({
        code: 'FOLDER_NOT_EMPTY',
        message:
          'Ce dossier contient encore des sous-dossiers ou des documents.',
        details: [],
      });
    }
    try {
      await this.prisma.folder.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException({
          code: 'FOLDER_IN_USE',
          message: 'Ce dossier est encore référencé.',
          details: [],
        });
      }
      throw error;
    }
    await this.audit.record({
      actorId: user.id,
      action: 'FOLDER_DELETED',
      entityType: 'Folder',
      entityId: id,
      before: { name: folder.name, parentId: folder.parentId },
    });
  }

  /**
   * Déplace un dossier (avec tout son contenu) sous un autre parent, ou au
   * premier niveau. **Administrateur seul** : les droits suivent l'arborescence
   * (un droit sur un dossier couvre ses descendants), donc déplacer un dossier
   * change qui peut le voir — c'est une modification de droits (blueprint/11 §3 :
   * « seul un Administrateur crée ou modifie un droit »). Le dossier garde sa
   * confidentialité et ses droits directs ; ses documents ne bougent pas.
   * Refusé sous lui-même ou sous un de ses descendants (cycle).
   */
  async move(user: AuthenticatedUser, id: string, parentId: string | null) {
    const scope = await this.access.scopeFor(user);
    if (!scope.isAdmin) {
      throw adminOnly('Seul un Administrateur peut déplacer un dossier.');
    }
    await this.access.assertReadFolder(scope, id);

    // Lecture de l'arbre et écriture dans la même transaction sérialisable : deux
    // déplacements simultanés ne peuvent pas, ensemble, fermer une boucle.
    const { before, folder, parentName, previousParentName } =
      await this.prisma.$transaction(
        async (tx) => {
          const nodes = await tx.folder.findMany({
            select: { id: true, name: true, parentId: true },
          });
          const byId = new Map(nodes.map((n) => [n.id, n]));
          const current = byId.get(id);
          if (!current) throw folderNotFound();
          if (parentId !== null && !byId.has(parentId)) throw folderNotFound();

          for (
            let cursor = parentId ? byId.get(parentId) : undefined, hops = 0;
            cursor && hops <= nodes.length;
            cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined,
              hops += 1
          ) {
            if (cursor.id === id) {
              throw new ConflictException({
                code: 'FOLDER_MOVE_INVALID',
                message:
                  'Un dossier ne peut pas être déplacé dans lui-même ni dans l’un de ses sous-dossiers.',
                details: [],
              });
            }
          }

          const previous = byId.get(current.parentId ?? '');
          const target = parentId ? byId.get(parentId) : undefined;
          const folder =
            current.parentId === parentId
              ? await tx.folder.findUniqueOrThrow({ where: { id } })
              : await tx.folder.update({ where: { id }, data: { parentId } });
          return {
            before: current,
            folder,
            parentName: target?.name ?? null,
            previousParentName: previous?.name ?? null,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

    if (before.parentId !== folder.parentId) {
      await this.audit.record({
        actorId: user.id,
        action: 'FOLDER_MOVED',
        entityType: 'Folder',
        entityId: id,
        before: {
          name: folder.name,
          parentId: before.parentId,
          parentName: previousParentName,
        },
        after: { name: folder.name, parentId: folder.parentId, parentName },
      });
    }
    const counts = await this.documentCounts(scope, [id]);
    return this.view(scope, folder, counts.get(id) ?? 0);
  }

  /** Utilisé par les documents : dossier lisible ou 403. */
  canRead(scope: AccessScope, folderId: string) {
    return canReadFolder(scope, folderId);
  }
}
