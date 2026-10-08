import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { createReadStream } from 'node:fs';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { singleFileUploadOptions } from '../../common/http/upload-options.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { MAX_DOCUMENT_BYTES } from './document-signature.js';
import type { UploadedDocument } from './document-storage.service.js';
import { DocumentsPublicsService } from './documents-publics.service.js';
import { CreatePublicDocumentDto } from './dto/create-public-document.dto.js';
import { UpdatePublicDocumentDto } from './dto/update-public-document.dto.js';
import { ListAdminPublicDocumentsDto } from './dto/list-public-documents.dto.js';

const uploadInterceptor = () =>
  FileInterceptor('file', singleFileUploadOptions(MAX_DOCUMENT_BYTES));

function requireFile(file: UploadedDocument | undefined): UploadedDocument {
  if (!file) {
    throw new BadRequestException({
      code: 'DOCUMENT_FILE_REQUIRED',
      message: 'Aucun fichier reçu (champ « file », PDF).',
      details: ['file'],
    });
  }
  return file;
}

@ApiTags('admin/documents-publics')
@ApiBearerAuth()
@Controller('admin/documents-publics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMINISTRATEUR, Role.GESTIONNAIRE)
export class AdminDocumentsPublicsController {
  constructor(private readonly documentsService: DocumentsPublicsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les documents publics (tous statuts)' })
  list(@Query() query: ListAdminPublicDocumentsDto) {
    return this.documentsService.listAdmin(query);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.findById(id);
  }

  @Get(':id/file')
  @ApiOperation({
    summary:
      'Lire le PDF d’un document, brouillon compris (personnel uniquement)',
  })
  async file(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const document = await this.documentsService.findFileForStaff(id);
    // Jamais en cache partagé : un brouillon ne doit pas survivre à une dépublication.
    res.set({
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(
      createReadStream(this.documentsService.pathOf(document.storedName)),
      {
        type: document.fileType,
        // Le slug respecte un motif strict : sans danger dans l'en-tête.
        disposition: `inline; filename="${document.slug}.pdf"`,
      },
    );
  }

  @Post()
  @ApiOperation({
    summary: 'Créer un document (brouillon) avec son PDF, 20 Mo max',
  })
  @ApiConsumes('multipart/form-data')
  // blueprint/10_Security.md §3 : taille/type limités, fréquence limitée.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(uploadInterceptor())
  create(
    @Body() dto: CreatePublicDocumentDto,
    @UploadedFile() file: UploadedDocument | undefined,
  ) {
    return this.documentsService.create(dto, requireFile(file));
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePublicDocumentDto,
  ) {
    return this.documentsService.update(id, dto);
  }

  @Put(':id/file')
  @ApiOperation({ summary: 'Remplacer le PDF d’un document' })
  @ApiConsumes('multipart/form-data')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(uploadInterceptor())
  replaceFile(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: UploadedDocument | undefined,
  ) {
    return this.documentsService.replaceFile(id, requireFile(file));
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publier explicitement un document' })
  publish(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documentsService.publish(actor, id);
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dépublier (retour en brouillon)' })
  unpublish(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documentsService.unpublish(actor, id);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archiver (dépublié, conservé pour l’historique)' })
  archive(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documentsService.archive(actor, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer (suppression logique)' })
  async remove(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.documentsService.remove(actor, id);
  }
}
